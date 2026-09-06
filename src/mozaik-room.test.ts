import assert from "node:assert/strict"
import test from "node:test"
import { EventBus } from "./bus.ts"
import { SitroomMozaikRoom } from "./mozaik/room.ts"

test("Mozaik room: join two specialists, leave deploy on kill", () => {
  const bus = new EventBus()
  const room = new SitroomMozaikRoom(bus)
  room.attachToBus(bus)

  bus.publish({
    type: "incident.started",
    at_ms: 0,
    fixture_id: "x",
    title: "x",
  })

  assert.ok(room.participants.has("database"))
  assert.ok(room.participants.has("deploy"))
  assert.equal(room.participants.has("security"), false)

  const dbCtx = room.participants.get("database")!.context
  const deployCtx = room.participants.get("deploy")!.context
  assert.notEqual(dbCtx, deployCtx)

  bus.publish({
    type: "incident.tick",
    at_ms: 12000,
    tick: {
      id: "tick-deploy",
      t_ms: 12000,
      source: "deploy",
      key: "last_deploy_hash",
      value: "unchanged",
      summary: "deploy: last_deploy_hash unchanged since 06:00",
    },
  })
  bus.publish({
    type: "agent.killed",
    at_ms: 12000,
    specialist: "deploy",
    reason: "hash unchanged",
    tick_id: "tick-deploy",
  })

  assert.equal(room.participants.has("deploy"), false)
  assert.ok(room.participants.has("database"))

  bus.publish({
    type: "agent.joined",
    at_ms: 15000,
    specialist: "security",
    reason: "auth spike",
    tick_id: "tick-auth",
  })
  assert.ok(room.participants.has("security"))
})