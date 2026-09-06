import { createSecuritySpecialist } from "./agents/security-specialist.ts"
import type { EventBus } from "./bus.ts"
import type { Specialist } from "./specialist.ts"
import type { IncidentFixture, SpecialistId, Unsubscribe } from "./types.ts"

const factories: Partial<Record<SpecialistId, (tokenGapMs: number) => Specialist>> = {
  security: createSecuritySpecialist,
}

export function attachJoinController(
  bus: EventBus,
  specialists: Specialist[],
  fixture: IncidentFixture,
  tokenGapMs: number,
): Unsubscribe {
  const joined = new Set(specialists.map((s) => s.id))
  const rules = fixture.joins ?? []

  return bus.subscribe((event) => {
    if (event.type !== "incident.tick") return

    for (const rule of rules) {
      if (rule.when_tick_id !== event.tick.id) continue
      if (joined.has(rule.specialist as SpecialistId)) continue

      const factory = factories[rule.specialist as SpecialistId]
      if (!factory) {
        console.error(`[join] no factory for ${rule.specialist}`)
        continue
      }

      const specialist = factory(tokenGapMs)
      specialist.attach(bus)
      specialists.push(specialist)
      joined.add(specialist.id)

      bus.publish({
        type: "agent.joined",
        at_ms: event.at_ms,
        specialist: specialist.id,
        reason: rule.reason,
        tick_id: event.tick.id,
      })

      specialist.pageIn(rule.reason, event.tick)
    }
  })
}