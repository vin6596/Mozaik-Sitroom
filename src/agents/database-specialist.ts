import { Specialist } from "../specialist.ts"
import type { IncidentTick } from "../types.ts"

function react(tick: IncidentTick): string {
  if (tick.key === "db_pool_active") {
    return "Pool is at 98 of 100. That matches pool exhaustion. Checkout workers are probably blocked on a connection. I want saturation history and wait time next."
  }
  if (tick.key === "p99_latency_upstream_ms") {
    return "Upstream p99 is 1200ms. That could be a symptom if we are holding pool slots while waiting on a slow dependency. Still looks like pool pressure to me."
  }
  if (tick.key === "last_deploy_hash") {
    return "Deploy hash unchanged. That does not kill the pool theory. A leak can grow without a new release."
  }
  if (tick.key === "auth_error_rate") {
    return "Auth errors are up. A saturated pool can make auth look broken because sessions cannot be written. I am still on pool exhaustion."
  }
  return `New signal: ${tick.summary}. Checking whether it increases pool wait.`
}

export function createDatabaseSpecialist(tokenGapMs: number): Specialist {
  return new Specialist({
    id: "database",
    name: "Database specialist",
    theory: "connection pool exhaustion",
    tokenGapMs,
    opening:
      "Database specialist on the call. Working theory is connection pool exhaustion. I am going to watch active connections, wait time, and whether checkout is blocking on getConnection.",
    react,
  })
}