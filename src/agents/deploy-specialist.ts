import { Specialist } from "../specialist.ts"
import type { IncidentTick } from "../types.ts"

function react(tick: IncidentTick): string {
  if (tick.key === "db_pool_active") {
    return "Pool looks hot, but a bad deploy can leak connections. I am not dropping the release theory yet."
  }
  if (tick.key === "p99_latency_upstream_ms") {
    return "Upstream latency jumped. That is common after a bad client or retry storm from the last release. Still looks like a deploy to me."
  }
  if (tick.key === "last_deploy_hash") {
    return "Hash unchanged since 06:00. That is awkward for me. I am going to keep talking through rollback options anyway until someone kills this thread."
  }
  if (tick.key === "auth_error_rate") {
    return "Auth spike could still be a flag we shipped earlier today even if the git hash looks stable."
  }
  return `New signal: ${tick.summary}. Mapping it to the last release window.`
}

export function createDeploySpecialist(tokenGapMs: number): Specialist {
  return new Specialist({
    id: "deploy",
    name: "Deploy specialist",
    theory: "a bad recent deploy",
    tokenGapMs,
    opening:
      "Deploy specialist on the call. Working theory is a bad recent deploy. I am going to line up the error spike against the last release hash and changelog.",
    react,
  })
}