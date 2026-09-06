import { EventBus } from "./bus.ts"
import type { Clock, IncidentFixture } from "./types.ts"
import { wallClock } from "./types.ts"

export type RunFixtureOptions = { bus: EventBus; fixture: IncidentFixture; speed?: number; clock?: Clock }

export async function runFixture(options: RunFixtureOptions): Promise<void> {
  const { bus, fixture } = options
  const speed = options.speed ?? 1
  const clock = options.clock ?? wallClock
  if (!(speed > 0)) throw new Error("speed must be > 0")

  const ticks = [...fixture.ticks].sort((a, b) => a.t_ms - b.t_ms)
  const startedAt = clock.now()

  bus.publish({ type: "incident.started", at_ms: 0, fixture_id: fixture.id, title: fixture.title })

  for (const tick of ticks) {
    const dueIn = tick.t_ms / speed - (clock.now() - startedAt)
    if (dueIn > 0) await clock.sleep(dueIn)
    bus.publish({ type: "incident.tick", at_ms: tick.t_ms, tick })
  }

  const remaining = fixture.duration_ms / speed - (clock.now() - startedAt)
  if (remaining > 0) await clock.sleep(remaining)

  bus.publish({ type: "incident.ended", at_ms: fixture.duration_ms, fixture_id: fixture.id })
}
