import type { EventBus } from "./bus.ts"
import type { Clock, IncidentTick, SpecialistId, Unsubscribe } from "./types.ts"
import { wallClock } from "./types.ts"

export type SpecialistOptions = {
  id: SpecialistId
  name: string
  theory: string
  opening: string
  react: (tick: IncidentTick) => string
  clock?: Clock
  tokenGapMs?: number
}

export class Specialist {
  readonly id: SpecialistId
  readonly name: string
  readonly theory: string

  private readonly memory: string[] = []
  private readonly react: (tick: IncidentTick) => string
  private readonly opening: string
  private readonly clock: Clock
  private readonly tokenGapMs: number
  private bus: EventBus | null = null
  private unsub: Unsubscribe | null = null
  private startedAt = 0
  private speaking: Promise<void> = Promise.resolve()
  private speakGen = 0
  private dead = false
  private killReason: string | null = null
  private pagedIn = false

  constructor(options: SpecialistOptions) {
    this.id = options.id
    this.name = options.name
    this.theory = options.theory
    this.opening = options.opening
    this.react = options.react
    this.clock = options.clock ?? wallClock
    this.tokenGapMs = options.tokenGapMs ?? 70
  }

  attach(bus: EventBus): void {
    this.bus = bus
    this.unsub = bus.subscribe((event) => {
      if (this.dead) return
      if (event.type === "incident.started") {
        this.startedAt = this.clock.now()
        this.pagedIn = true
        this.note(`joined. working theory: ${this.theory}`)
        this.queueSpeak(this.opening)
        return
      }
      if (event.type === "incident.tick") {
        if (!this.pagedIn) return
        this.note(`observed tick ${event.tick.id}: ${event.tick.summary}`)
        this.queueSpeak(this.react(event.tick))
        return
      }
      if (event.type === "incident.ended") {
        if (!this.pagedIn) return
        this.note("incident ended")
      }
    })
  }

  detach(): void {
    this.unsub?.()
    this.unsub = null
    this.bus = null
  }

  getMemory(): readonly string[] {
    return this.memory
  }

  isDead(): boolean {
    return this.dead
  }

  getKillReason(): string | null {
    return this.killReason
  }

  pageIn(reason: string, tick?: IncidentTick): void {
    if (this.dead) return
    if (this.startedAt === 0) this.startedAt = this.clock.now()
    this.pagedIn = true
    this.note(`paged in: ${reason}`)
    if (tick) {
      this.note(`observed tick ${tick.id}: ${tick.summary}`)
      this.queueSpeak(`${this.opening} ${this.react(tick)}`)
      return
    }
    this.queueSpeak(this.opening)
  }

  kill(reason: string, tickId: string): void {
    if (this.dead) return
    this.dead = true
    this.killReason = reason
    this.speakGen += 1
    this.note(`KILLED: ${reason}`)
    this.bus?.publish({
      type: "agent.killed",
      at_ms: this.nowIncidentMs(),
      specialist: this.id,
      reason,
      tick_id: tickId,
    })
  }

  private note(note: string): void {
    this.memory.push(note)
    this.bus?.publish({
      type: "agent.note",
      at_ms: this.nowIncidentMs(),
      specialist: this.id,
      note,
    })
  }

  private queueSpeak(text: string): void {
    if (this.dead) return
    this.speaking = this.speaking.then(() => this.speak(text))
  }

  private async speak(text: string): Promise<void> {
    const gen = this.speakGen
    const words = text.trim().split(/\s+/).filter(Boolean)
    for (const word of words) {
      if (this.dead || gen !== this.speakGen) return
      this.bus?.publish({
        type: "agent.token",
        at_ms: this.nowIncidentMs(),
        specialist: this.id,
        text: `${word} `,
      })
      await this.clock.sleep(this.tokenGapMs)
    }
  }

  private nowIncidentMs(): number {
    if (this.startedAt === 0) return 0
    return this.clock.now() - this.startedAt
  }
}