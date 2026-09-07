# SITROOM

Database + Deploy start on one outage → evidence lands → Deploy dies mid-sentence → Security pages in.

On replay, the kill happens while the line is still being written. On live UI, speech is canned on a timer; `kill-gate.ts` runs on the fixture tick that arrives. Deploy goes DEAD when `last_deploy_hash` is unchanged. Security is silent until the auth spike. Commander is not in this build. The kill is a plain conditional: after a contradicted theory exists, that specialist stops emitting tokens. The bus still logs the tombstone.

## Why this is not a chatbot

| Chatbot | SITROOM |
|---|---|
| One agent, turn-taking | Two loops start on one SEV-style pager |
| Reviewer sees a finished answer | Deploy can be cut mid-token |
| Soft disagreement | Kill is deterministic |
| Canned status only | Facts = landed bus events + private notebooks |
| Human is a prompt | Human runs the UI / CLI; kill does not need a model |

## Proof of concurrency

`src/cli.ts` / `src/ui-server.ts` — both specialists `attach(bus)` before the fixture runs. Database and Deploy subscribe to the same bus. No wait between their reactions. Tokens from both appear in the same wall-clock second.

After a live run:

```text
=== mozaik roster after run ===
still joined: mozaik-room, database, security
live specialists: database, security
```

Deploy is gone. That is the leave path after kill.

### Tests

```
npx.cmd tsx --test src/kill-gate.test.ts src/specialist-kill.test.ts src/join.test.ts src/log-checks.test.ts src/mozaik-room.test.ts
```

Overlap, isolation, join latency, replay fingerprint, Mozaik room map.

## Mozaik

Depends on `@mozaik-ai/core@4.0.0-beta.6`.

Each specialist gets its own `ModelContext`. Ticks are stored as `UserMessageItem`s in `src/mozaik/room.ts`. A killed specialist is removed from the room map so that context stops receiving later ticks.

Published `beta.6` does not export `AgenticEnvironment` / `BaseParticipant` / `sendMessage`. We did not invent those names in running code — isolation uses the exports that exist on npm.

Speech does not call `runInference`. Demo stays $0; kill stays a function in `src/kill-gate.ts`.

## Wall

- **Header** — Checkout API 500s, concurrent specialists, deterministic kill.
- **Cards** — Database, Deploy, Security.
- **States** — LIVE / DEAD / WAITING TO BE PAGED.
- **Stream** — full transcript, scrollable.
- **Ticks** — bottom strip is the last landed metric.
- **Replay** — same sequence from `logs/last.jsonl`, no agents, no model.

## Live run (local)

```
cd $HOME\sitroom
npm.cmd install
npx.cmd tsx src/ui-server.ts
```

Open http://127.0.0.1:8787 → Run incident.

### CLI

```
npx.cmd tsx src/cli.ts --speed 4 --log logs/last.jsonl
npx.cmd tsx src/cli.ts --replay logs/last.jsonl --speed 8
```

No API key required for the demo path. Node 18+.

## Disclosure — what is staged

- **Speech is canned.** Fixed lines on a timer. Not an LLM.
- **Kill is not a model decision.** `deploy + last_deploy_hash + unchanged` → kill. Else keep talking.
- **Join is fixture-driven.** Security pages on `tick-auth` because the fixture says so. The join code (`attach` + `pageIn` in the same turn) is real.
- **Replay is the reliability path.** Preferred demo is the live UI. If the laptop hitches, `--replay` is a real engine log, not a hand-written tombstone script.

## What is not faked

- Shared bus
- Isolated per-agent memory
- Concurrent token timestamps
- Dead agent emits zero tokens after kill
- Late joiner starts on the join tick
- JSONL write + identical replay fingerprint
- Per-specialist Mozaik ModelContext

## Layout

```
src/bus.ts
src/fixture-runner.ts
src/specialist.ts
src/kill-gate.ts
src/kill-controller.ts
src/join-controller.ts
src/mozaik/room.ts
src/jsonl.ts
src/cli.ts
src/ui-server.ts
fixtures/incident.checkout-500.json
public/sitroom.html
logs/last.jsonl
```

## Demo order

1. Tests green.
2. UI warm-up click.
3. Record the second click: overlap → Deploy DEAD → Security LIVE.
4. Backup: `npx.cmd tsx src/cli.ts --replay logs/last.jsonl --speed 4`
