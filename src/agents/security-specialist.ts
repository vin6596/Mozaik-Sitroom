import { Specialist } from "../specialist.ts"
import type { IncidentTick } from "../types.ts"

function react(tick: IncidentTick): string {
  if (tick.key === "auth_error_rate") {
    return "Auth error rate 0.42 is an incident-level spike. I am checking token expiry, revoked keys, and whether checkout 500s are failed auth bubbling out as 500s."
  }
  return `New signal: ${tick.summary}. Checking it against the auth path.`
}

export function createSecuritySpecialist(tokenGapMs: number): Specialist {
  return new Specialist({
    id: "security",
    name: "Security specialist",
    theory: "auth failure cascade",
    tokenGapMs,
    opening:
      "Security specialist paged in. Working theory is an auth failure cascade. I am live as of this tick.",
    react,
  })
}