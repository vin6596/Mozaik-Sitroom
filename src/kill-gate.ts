import type { IncidentTick, KillRule, SpecialistId } from "./types.ts"

export function killReasonFor(
  specialist: SpecialistId,
  tick: IncidentTick,
): string | null {
  if (
    specialist === "deploy" &&
    tick.key === "last_deploy_hash" &&
    tick.value === "unchanged"
  ) {
    return "last_deploy_hash is unchanged, so a bad recent deploy is contradicted"
  }
  return null
}

export function killReasonFromRules(
  specialist: SpecialistId,
  tick: IncidentTick,
  rules: KillRule[] = [],
): string | null {
  const matched = rules.find(
    (rule) => rule.when_tick_id === tick.id && rule.specialist === specialist,
  )
  if (matched) return matched.reason
  return killReasonFor(specialist, tick)
}