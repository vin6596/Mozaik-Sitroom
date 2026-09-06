import { killReasonFromRules } from "./kill-gate.ts"
import type { EventBus } from "./bus.ts"
import type { Specialist } from "./specialist.ts"
import type { IncidentFixture, Unsubscribe } from "./types.ts"

export function attachKillController(
  bus: EventBus,
  specialists: Specialist[],
  fixture: IncidentFixture,
): Unsubscribe {
  const byId = new Map(specialists.map((s) => [s.id, s]))
  const rules = fixture.kills ?? []

  return bus.subscribe((event) => {
    if (event.type !== "incident.tick") return
    for (const specialist of specialists) {
      if (specialist.isDead()) continue
      const reason = killReasonFromRules(specialist.id, event.tick, rules)
      if (!reason) continue
      const target = byId.get(specialist.id)
      if (!target) continue
      target.kill(reason, event.tick.id)
    }
  })
}