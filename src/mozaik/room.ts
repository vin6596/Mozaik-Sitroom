import { ModelContext, UserMessageItem } from "@mozaik-ai/core"
import type { EventBus } from "../bus.ts"
import type { SpecialistId, SitroomEvent } from "../types.ts"

type Seat = {
  id: SpecialistId
  context: ModelContext
}

export class SitroomMozaikRoom {
  readonly participants = new Map<SpecialistId, Seat>()
  private readonly joined = new Set<string>(["mozaik-room"])

  constructor(_bus: EventBus) {}

  readonly observer = {
    roster: () => [...this.joined],
  }

  joinSpecialist(id: SpecialistId): void {
    if (this.participants.has(id)) return
    const context = ModelContext.create()
    this.participants.set(id, { id, context })
    this.joined.add(id)
  }

  leaveSpecialist(id: SpecialistId): void {
    this.participants.delete(id)
    this.joined.delete(id)
  }

  attachToBus(bus: EventBus): void {
    bus.subscribe((event: SitroomEvent) => {
      if (event.type === "incident.started") {
        this.joinSpecialist("database")
        this.joinSpecialist("deploy")
        this.noteAll(`STARTED ${event.title}`)
        return
      }
      if (event.type === "incident.tick") {
        this.noteAll(`TICK ${event.tick.summary}`)
        return
      }
      if (event.type === "agent.joined") {
        this.joinSpecialist(event.specialist)
        this.noteOne(event.specialist, `JOINED ${event.reason}`)
        return
      }
      if (event.type === "agent.killed") {
        this.noteOne(event.specialist, `KILLED ${event.reason}`)
        this.leaveSpecialist(event.specialist)
      }
    })
  }

  private noteAll(text: string): void {
    for (const id of this.participants.keys()) {
      this.noteOne(id, text)
    }
  }

  private noteOne(id: SpecialistId, text: string): void {
    const seat = this.participants.get(id)
    if (!seat) return
    seat.context = seat.context.addItem(UserMessageItem.create(text))
  }
}