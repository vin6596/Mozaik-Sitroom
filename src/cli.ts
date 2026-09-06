import { createDatabaseSpecialist } from "./agents/database-specialist.ts"
import { SitroomMozaikRoom } from "./mozaik/room.ts"
import { createDeploySpecialist } from "./agents/deploy-specialist.ts"
import { EventBus } from "./bus.ts"
import { attachJoinController } from "./join-controller.ts"
import { attachKillController } from "./kill-controller.ts"
import { runFixture } from "./fixture-runner.ts"
import { createJsonlWriter, replayJsonl } from "./jsonl.ts"
import { loadFixture } from "./load-fixture.ts"
import type { Specialist } from "./specialist.ts"

function argValue(flag: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index === -1) return fallback
  if (index === process.argv.length - 1) return fallback
  return process.argv[index + 1] ?? fallback
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

const speed = Number(argValue("--speed", "1"))
if (!Number.isFinite(speed) || speed <= 0) {
  console.error("--speed must be a number > 0")
  process.exit(1)
}

const replayPath = argValue("--replay")
if (replayPath) {
  console.log(`SITROOM replay — no agents, no model`)
  console.log(`  file : ${replayPath}`)
  console.log(`  speed: ${speed}x`)
  console.log("")
  await replayJsonl(replayPath, speed)
  process.exit(0)
}

const fixturePath = argValue("--fixture", "fixtures/incident.checkout-500.json")!
const logPath = argValue("--log", "logs/last.jsonl")!
const fixture = loadFixture(fixturePath)
const bus = new EventBus()
const mozaik = new SitroomMozaikRoom(bus)
mozaik.attachToBus(bus)
const logger = createJsonlWriter(logPath)
const tokenGapMs = Math.max(15, Math.round(70 / speed))

const specialists: Specialist[] = [
  createDatabaseSpecialist(tokenGapMs),
  createDeploySpecialist(tokenGapMs),
]

attachKillController(bus, specialists, fixture)
attachJoinController(bus, specialists, fixture, tokenGapMs)
for (const specialist of specialists) {
  specialist.attach(bus)
}

bus.subscribe((event) => {
  logger.write(event)
  const wall = new Date().toISOString().slice(11, 23)
  if (event.type === "incident.started") {
    console.log(`[${wall}] STARTED  ${event.fixture_id} — ${event.title}`)
    return
  }
  if (event.type === "incident.tick") {
    console.log(`[${wall}] TICK     t=${event.at_ms}ms  ${event.tick.summary}`)
    return
  }
  if (event.type === "agent.killed") {
    console.log(
      `[${wall}] TOMBSTONE [${event.specialist}] killed by ${event.tick_id}: ${event.reason}`,
    )
    return
  }
  if (event.type === "agent.joined") {
    console.log(
      `[${wall}] PAGED    [${event.specialist}] on ${event.tick_id}: ${event.reason}`,
    )
    return
  }
  if (event.type === "agent.token") {
    console.log(`[${wall}] [${event.specialist}] ${event.text}`)
    return
  }
  if (event.type === "incident.ended") {
    console.log(`[${wall}] ENDED    ${event.fixture_id}`)
  }
})

console.log(`SITROOM step 5 — jsonl log + replay`)
console.log(`  file : ${fixturePath}`)
console.log(`  log  : ${logPath}`)
console.log(`  ticks: ${fixture.ticks.length}`)
console.log(`  speed: ${speed}x`)
console.log("")

await runFixture({ bus, fixture, speed })

console.log("")
console.log("=== private notebooks ===")
for (const specialist of specialists) {
  const state = specialist.isDead() ? `DEAD (${specialist.getKillReason()})` : "alive"
  console.log(`--- ${specialist.id} ${state} ---`)
  for (const line of specialist.getMemory()) {
    console.log(`  ${line}`)
  }
}

for (const specialist of specialists) {
  specialist.detach()
}

if (hasFlag("--quiet-end") === false) {
  console.log("")
  console.log(`Wrote ${logPath}`)
  console.log(`Replay with: npx tsx src/cli.ts --replay ${logPath} --speed 8`)
}
console.log("")
console.log("=== mozaik roster after run ===")
console.log(`  still joined: ${mozaik.observer.roster().join(", ") || "(none)"}`)
console.log(`  live specialists: ${[...mozaik.participants.keys()].join(", ") || "(none)"}`)