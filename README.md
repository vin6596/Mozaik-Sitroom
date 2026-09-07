# SITROOM

Simulated incident-response situation room for the JigJoy AI Hackathon.

Several specialists share one incident event bus. Each keeps a private notebook. A specialist whose theory is contradicted is cut off by a plain conditional — not by another model. A new specialist can be paged in mid-incident. Every run is written to JSONL and can be replayed with no agents and no model.

## What judges should see

1. Two voices overlapping on the same wall-clock second.
2. Isolated notebooks: database never stores deploy's internal notes.
3. Deploy dies the instant `last_deploy_hash` is `unchanged`.
4. Security is absent until the auth tick, then speaks immediately.
5. `--replay` reprints the same log without constructing agents.
6. After a live run, deploy is gone from the Mozaik roster; database and security remain.

## $0 stack

- Local Node.js only
- `@mozaik-ai/core@4.0.0` (no `runInference`, no provider key)
- No paid API tier
- No paid hosting
- Demo UI is http://127.0.0.1:8787
- Record the local UI or the CLI for the submission video

## Commands (Windows)

```powershell
cd $HOME\sitroom
npm.cmd install
npx.cmd tsx --test src/kill-gate.test.ts src/specialist-kill.test.ts src/join.test.ts src/log-checks.test.ts src/mozaik-room.test.ts
npx.cmd tsx src/cli.ts --speed 4 --log logs/last.jsonl
npx.cmd tsx src/cli.ts --replay logs/last.jsonl --speed 8
npx.cmd tsx src/ui-server.ts
