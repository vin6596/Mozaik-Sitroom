import assert from "node:assert/strict"
import test from "node:test"
import { createDatabaseSpecialist } from "./agents/database-specialist.ts"
import { EventBus } from "./bus.ts"
import { attachJoinController } from "./join-controller.ts"
import { loadFixture } from "./load-fixture.ts"
import type { Specialist } from "./specialist.ts"
import type { SitroomEvent } from "./types.ts"

test("Test 6: mid-run join starts immediately", async (t) => {
  t.diagnostic(`cwd=${process.cwd()}`)

  const fixture = loadFixture("fixtures/incident.checkout-500.json")
  const bus = new EventBus()
  const events: SitroomEvent[] = []
  const securityTokens: string[] = []
  let joinedAt: number | null = null
  let firstTokenAt: number | null = null

  bus.subscribe((event) => {
    events.push(event)
    if (event.type === "agent.joined" && event.specialist === "security") {
      joinedAt = Date.now()
    }
    if (event.type === "agent.token" && event.specialist === "security") {
      if (firstTokenAt === null) firstTokenAt = Date.now()
      securityTokens.push(event.text)
    }
  })

  const specialists: Specialist[] = [createDatabaseSpecialist(15)]
  attachJoinController(bus, specialists, fixture, 15)

  const authTick = fixture.ticks.find((tick) => tick.id === "tick-auth")
  assert.ok(authTick, "fixture is missing tick-auth")

  bus.publish({
    type: "incident.started",
    at_ms: 0,
    fixture_id: fixture.id,
    title: fixture.title,
  })
  bus.publish({
    type: "incident.tick",
    at_ms: 0,
    tick: fixture.ticks[0],
  })

  await new Promise((r) => setTimeout(r, 50))
  assert.equal(securityTokens.length, 0, "security must be silent before the join tick")
  assert.equal(
    specialists.some((s) => s.id === "security"),
    false,
  )

  bus.publish({ type: "incident.tick", at_ms: authTick.t_ms, tick: authTick })
  await new Promise((r) => setTimeout(r, 120))

  const joined = events.filter((e) => e.type === "agent.joined")
  t.diagnostic(`joined events=${joined.length} securityTokens=${securityTokens.length}`)

  assert.ok(
    events.some((e) => e.type === "agent.joined" && e.specialist === "security"),
    "expected agent.joined for security",
  )
  assert.ok(specialists.some((s) => s.id === "security"), "security should be on the roster")
  assert.ok(securityTokens.length > 0, "security must start speaking after page-in")
  assert.ok(joinedAt !== null && firstTokenAt !== null)
  assert.ok(
    firstTokenAt - joinedAt < 120,
    `join-to-first-token was ${firstTokenAt! - joinedAt!}ms`,
  )

  for (const s of specialists) s.detach()
})