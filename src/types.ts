export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type IncidentTick = {
  id: string
  t_ms: number
  source: string
  key: string
  value: JsonValue
  meta?: { [key: string]: JsonValue }
  summary: string
}

export type KillRule = {
  when_tick_id: string
  specialist: string
  reason: string
}

export type JoinRule = {
  when_tick_id: string
  specialist: string
  reason: string
}

export type IncidentFixture = {
  id: string
  title: string
  duration_ms: number
  ticks: IncidentTick[]
  kills?: KillRule[]
  joins?: JoinRule[]
}

export type SpecialistId = "database" | "deploy" | "network" | "security"

export type SitroomEvent =
  | {
      type: "incident.started"
      at_ms: number
      fixture_id: string
      title: string
    }

  | {
      type: "incident.tick"
      at_ms: number
      tick: IncidentTick
    }
  | {
      type: "incident.ended"
      at_ms: number
      fixture_id: string
    }
  | {
      type: "agent.note"
      at_ms: number
      specialist: SpecialistId
      note: string
    }
  | {
      type: "agent.token"
      at_ms: number
      specialist: SpecialistId
      text: string
    }
  | {
      type: "agent.killed"
      at_ms: number
      specialist: SpecialistId
      reason: string
      tick_id: string
    }
      | {
      type: "agent.joined"
      at_ms: number
      specialist: SpecialistId
      reason: string
      tick_id: string
    }
export type Unsubscribe = () => void

export interface Clock {
  now(): number
  sleep(ms: number): Promise<void>
}

export const wallClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms)
    }),
}