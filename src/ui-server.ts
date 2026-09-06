import { createReadStream } from "node:fs"
import { SitroomMozaikRoom } from "./mozaik/room.ts"
import { createServer } from "node:http"
import { extname, join } from "node:path"
import { createDatabaseSpecialist } from "./agents/database-specialist.ts"
import { createDeploySpecialist } from "./agents/deploy-specialist.ts"
import { EventBus } from "./bus.ts"
import { attachJoinController } from "./join-controller.ts"
import { attachKillController } from "./kill-controller.ts"
import { runFixture } from "./fixture-runner.ts"
import { createJsonlWriter } from "./jsonl.ts"
import { loadFixture } from "./load-fixture.ts"
import type { Specialist } from "./specialist.ts"

const PORT = 8787
const publicDir = join(process.cwd(), "public")
let running = false

function contentType(file: string): string {
  if (file.endsWith(".html")) return "text/html; charset=utf-8"
  return "text/plain; charset=utf-8"
}

async function runIncident(send: (data: string) => void): Promise<void> {
  const fixture = loadFixture("fixtures/incident.checkout-500.json")
  const bus = new EventBus()
    const mozaik = new SitroomMozaikRoom(bus)
  mozaik.attachToBus(bus)
  const logger = createJsonlWriter("logs/last.jsonl")
  const specialists: Specialist[] = [
    createDatabaseSpecialist(35),
    createDeploySpecialist(35),
  ]
  attachKillController(bus, specialists, fixture)
  attachJoinController(bus, specialists, fixture, 35)
  for (const specialist of specialists) specialist.attach(bus)

  bus.subscribe((event) => {
    logger.write(event)
    send(JSON.stringify(event))
  })

  await runFixture({ bus, fixture, speed: 3 })
  for (const specialist of specialists) specialist.detach()
}

const server = createServer((req, res) => {
  if (req.url === "/events") {
    if (running) {
      res.writeHead(409, { "content-type": "text/plain" })
      res.end("run already in progress")
      return
    }
    running = true
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    })
    const send = (data: string) => {
      res.write(`data: ${data}\n\n`)
    }
    runIncident(send)
      .catch((err) => {
        send(JSON.stringify({ type: "incident.ended", at_ms: 0, fixture_id: "error" }))
        console.error(err)
      })
      .finally(() => {
        running = false
        res.end()
      })
    return
  }

  const file = req.url === "/" ? "sitroom.html" : req.url?.replace(/^\//, "") || "sitroom.html"
  const path = join(publicDir, file)
  if (extname(path) !== ".html") {
    res.writeHead(404)
    res.end("not found")
    return
  }
  res.writeHead(200, { "content-type": contentType(path) })
  createReadStream(path).pipe(res)
})

server.listen(PORT, () => {
  console.log(`SITROOM UI  http://127.0.0.1:${PORT}`)
  console.log("Open that URL, click Run incident.")
})
