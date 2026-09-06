import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { IncidentFixture, IncidentTick } from "./types.ts"

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asTick(raw: unknown, index: number): IncidentTick {
  if (!isObject(raw)) {
    throw new Error(`ticks[${index}] must be an object`)
  }
  if (typeof raw.id !== "string" || raw.id.length === 0) {
    throw new Error(`ticks[${index}].id must be a non-empty string`)
  }
  if (typeof raw.t_ms !== "number" || !Number.isFinite(raw.t_ms) || raw.t_ms < 0) {
    throw new Error(`ticks[${index}].t_ms must be a finite number >= 0`)
  }
  if (typeof raw.source !== "string" || typeof raw.key !== "string") {
    throw new Error(`ticks[${index}] needs string source and key`)
  }
  if (!("value" in raw)) {
    throw new Error(`ticks[${index}].value is required`)
  }
  if (typeof raw.summary !== "string" || raw.summary.length === 0) {
    throw new Error(`ticks[${index}].summary must be a non-empty string`)
  }
  return raw as IncidentTick
}

export function loadFixture(filePath: string): IncidentFixture {
  const absolute = resolve(filePath)
  const rawText = readFileSync(absolute, "utf8").replace(/^\uFEFF/, "")
  const parsed: unknown = JSON.parse(rawText)
  if (!isObject(parsed)) {
    throw new Error("fixture root must be an object")
  }
  if (typeof parsed.id !== "string" || typeof parsed.title !== "string") {
    throw new Error("fixture needs string id and title")
  }
  if (typeof parsed.duration_ms !== "number" || parsed.duration_ms < 0) {
    throw new Error("fixture.duration_ms must be a number >= 0")
  }
  if (!Array.isArray(parsed.ticks) || parsed.ticks.length === 0) {
    throw new Error("fixture.ticks must be a non-empty array")
  }
  const ticks = parsed.ticks.map(asTick)
  const ids = new Set<string>()
  for (const tick of ticks) {
    if (ids.has(tick.id)) {
      throw new Error(`duplicate tick id: ${tick.id}`)
    }
    ids.add(tick.id)
  }
  return parsed as IncidentFixture
}