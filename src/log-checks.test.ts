import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { createDatabaseSpecialist } from "./agents/database-specialist.ts"
import { createDeploySpecialist } from "./agents/deploy-specialist.ts"
import { EventBus } from "./bus.ts"
import { fingerprint, readJsonl, replayJsonl } from "./jsonl.ts"
import { attachKillController } from "./kill-controller.ts"
import { loadFixture } from "./load-fixture.ts"
import type { Specialist } from "./specialist.ts"
import type { SitroomEvent } from "./types.ts"

test("Test 3: two specialists emit tokens in the same wall-clock second", async () => {
  const bus = new EventBus()
  const tokens: { specialist: string; wall_ms: number }[] = []

  bus.subscribe((event: SitroomEvent) => {
    if (event.type === "agent.token") {
      tokens.push({ specialist: event.specialist, wall_ms: Date.now() })
    }
  })

  const db = createDatabaseSpecialist(10)
  const deploy = createDeploySpecialist(10)
  db.attach(bus)
  deploy.attach(bus)

  bus.publish({
    type: "incident.started",
    at_ms: 0,
    fixture_id: "overlap",
    title: "overlap",
  })

  await new Promise((resolve) => setTimeout(resolve, 80))

  const sameSecond = tokens.some((a) =>
    tokens.some(
      (b) =>
        a.specialist !== b.specialist &&
        Math.floor(a.wall_ms / 1000) === Math.floor(b.wall_ms / 1000),
    ),
  )

  assert.ok(tokens.some((row) => row.specialist === "database"))
  assert.ok(tokens.some((row) => row.specialist === "deploy"))
  assert.ok(sameSecond, "expected overlapping wall-clock seconds")

  db.detach()
  deploy.detach()
})

test("Test 4: context isolation — no foreign internal notes", async () => {
  const fixture = loadFixture("fixtures/incident.checkout-500.json")
  const bus = new EventBus()
  const specialists: Specialist[] = [
    createDatabaseSpecialist(5),
    createDeploySpecialist(5),
  ]

  attachKillController(bus, specialists, fixture)
  for (const specialist of specialists) {
    specialist.attach(bus)
  }

  bus.publish({
    type: "incident.started",
    at_ms: 0,
    fixture_id: fixture.id,
    title: fixture.title,
  })

  await new Promise((resolve) => setTimeout(resolve, 30))

  const deployTick = fixture.ticks.find((tick) => tick.id === "tick-deploy")
  assert.ok(deployTick)

  bus.publish({
    type: "incident.tick",
    at_ms: deployTick.t_ms,
    tick: deployTick,
  })

  await new Promise((resolve) => setTimeout(resolve, 20))

  const db = specialists.find((specialist) => specialist.id === "database")
  const deploy = specialists.find((specialist) => specialist.id === "deploy")
  assert.ok(db)
  assert.ok(deploy)

  const dbNotes = db.getMemory().join("\n")
  const deployNotes = deploy.getMemory().join("\n")

  assert.match(dbNotes, /connection pool exhaustion/)
  assert.doesNotMatch(dbNotes, /working theory: a bad recent deploy/)
  assert.doesNotMatch(dbNotes, /KILLED:/)
  assert.match(deployNotes, /a bad recent deploy/)
  assert.doesNotMatch(deployNotes, /working theory: connection pool exhaustion/)

  for (const specialist of specialists) {
    specialist.detach()
  }
})

test("Test 5: replay of the same jsonl is identical", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sitroom-"))
  const file = join(dir, "run.jsonl")

  const lines = [
    JSON.stringify({
      seq: 0,
      wall_ms: 1000,
      wall_iso: "2026-09-02T00:00:01.000Z",
      event: {
        type: "incident.started",
        at_ms: 0,
        fixture_id: "x",
        title: "x",
      },
    }),
    JSON.stringify({
      seq: 1,
      wall_ms: 1010,
      wall_iso: "2026-09-02T00:00:01.010Z",
      event: {
        type: "agent.token",
        at_ms: 10,
        specialist: "database",
        text: "Pool ",
      },
    }),
    JSON.stringify({
      seq: 2,
      wall_ms: 1010,
      wall_iso: "2026-09-02T00:00:01.010Z",
      event: {
        type: "agent.token",
        at_ms: 10,
        specialist: "deploy",
        text: "Hash ",
      },
    }),
    JSON.stringify({
      seq: 3,
      wall_ms: 1020,
      wall_iso: "2026-09-02T00:00:01.020Z",
      event: {
        type: "incident.ended",
        at_ms: 20,
        fixture_id: "x",
      },
    }),
  ]

  writeFileSync(file, `${lines.join("\n")}\n`, "utf8")

  const first = fingerprint(await replayJsonl(file, 1000))
  const second = fingerprint(await replayJsonl(file, 1000))
  const fromDisk = fingerprint(readJsonl(file))

  assert.equal(first, second)
  assert.equal(first, fromDisk)
  assert.match(first, /database\|Pool /)
  assert.match(first, /deploy\|Hash /)
})