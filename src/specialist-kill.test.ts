import assert from "node:assert/strict"
import test from "node:test"
import { EventBus } from "./bus.ts"
import { Specialist } from "./specialist.ts"
import type { SitroomEvent } from "./types.ts"

test("Test 2: a killed specialist emits no tokens after death", async () => {
  const bus = new EventBus()
  const tokens: string[] = []
  const events: SitroomEvent[] = []

  const deploy = new Specialist({
    id: "deploy",
    name: "Deploy specialist",
    theory: "a bad recent deploy",
    opening: "one two three four five six seven eight nine ten",
    react: () => "should never speak this",
    tokenGapMs: 20,
  })

  bus.subscribe((event) => {
    events.push(event)
    if (event.type === "agent.token" && event.specialist === "deploy") {
      tokens.push(event.text)
      if (tokens.length === 3) {
        deploy.kill("test kill", "tick-deploy")
      }
    }
  })

  deploy.attach(bus)
  bus.publish({
    type: "incident.started",
    at_ms: 0,
    fixture_id: "test",
    title: "test",
  })

  await new Promise((r) => setTimeout(r, 250))

  assert.ok(events.some((e) => e.type === "agent.killed"))
  assert.equal(deploy.isDead(), true)
  assert.equal(tokens.length, 3, `expected 3 tokens before kill, got ${tokens.length}: ${tokens.join("")}`)
  assert.equal(tokens.join(""), "one two three ")

  bus.publish({
    type: "incident.tick",
    at_ms: 1,
    tick: {
      id: "tick-after",
      t_ms: 1,
      source: "metrics",
      key: "auth_error_rate",
      value: 0.42,
      summary: "auth spike",
    },
  })
  await new Promise((r) => setTimeout(r, 80))

  assert.equal(tokens.length, 3)
  assert.ok(!tokens.join("").includes("should never speak this"))

  deploy.detach()
})