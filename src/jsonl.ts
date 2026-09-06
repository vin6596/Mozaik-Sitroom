import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import type { SitroomEvent } from "./types.ts"

export type LoggedEvent = {
  seq: number
  wall_ms: number
  wall_iso: string
  event: SitroomEvent
}

export function createJsonlWriter(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, "", "utf8")
  let seq = 0

  return {
    path: filePath,
    write(event: SitroomEvent): LoggedEvent {
      const row: LoggedEvent = {
        seq,
        wall_ms: Date.now(),
        wall_iso: new Date().toISOString(),
        event,
      }
      seq += 1
      appendFileSync(filePath, `${JSON.stringify(row)}\n`, "utf8")
      return row
    },
  }
}

export function readJsonl(filePath: string): LoggedEvent[] {
  const text = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parsed: unknown = JSON.parse(line)
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("event" in parsed) ||
        !("seq" in parsed)
      ) {
        throw new Error(`bad jsonl line ${index + 1}`)
      }
      return parsed as LoggedEvent
    })
}

export function printLoggedEvent(row: LoggedEvent): void {
  const wall = row.wall_iso.slice(11, 23)
  const event = row.event
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
}

export async function replayJsonl(
  filePath: string,
  speed = 1,
): Promise<LoggedEvent[]> {
  const rows = readJsonl(filePath)
  if (rows.length === 0) return rows
  const origin = rows[0].wall_ms
  const started = Date.now()
  for (const row of rows) {
    const due = (row.wall_ms - origin) / speed
    const wait = due - (Date.now() - started)
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait))
    }
    printLoggedEvent(row)
  }
  return rows
}

export function fingerprint(rows: LoggedEvent[]): string {
  return rows
    .map((row) => {
      const e = row.event
      if (e.type === "agent.token") return `${e.type}|${e.specialist}|${e.text}`
      if (e.type === "agent.killed") return `${e.type}|${e.specialist}|${e.reason}`
      if (e.type === "agent.joined") return `${e.type}|${e.specialist}|${e.tick_id}`
      if (e.type === "incident.tick") return `${e.type}|${e.tick.id}`
      return e.type
    })
    .join("\n")
}