import assert from "node:assert/strict"
import test from "node:test"
import { killReasonFor, killReasonFromRules } from "./kill-gate.ts"
import type { IncidentTick } from "./types.ts"

const deployTick: IncidentTick = {
  id: "tick-deploy",
  t_ms: 12000,
  source: "deploy",
  key: "last_deploy_hash",
  value: "unchanged",
  summary: "deploy: last_deploy_hash unchanged since 06:00",
}

const poolTick: IncidentTick = {
  id: "tick-db-pool",
  t_ms: 5000,
  source: "metrics",
  key: "db_pool_active",
  value: 98,
  summary: "metrics: db_pool_active = 98/100",
}

test("Test 1: kill is a plain conditional, not an LLM call", () => {
  const reason = killReasonFor("deploy", deployTick)
  assert.equal(typeof reason, "string")
  assert.match(String(reason), /unchanged/)
  assert.equal(killReasonFor("database", deployTick), null)
  assert.equal(killReasonFor("deploy", poolTick), null)
})

test("Test 1b: fixture rule still wins when present", () => {
  const reason = killReasonFromRules("deploy", deployTick, [
    {
      when_tick_id: "tick-deploy",
      specialist: "deploy",
      reason: "fixture says deploy is wrong",
    },
  ])
  assert.equal(reason, "fixture says deploy is wrong")
})