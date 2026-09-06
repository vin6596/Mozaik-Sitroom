import type { SitroomEvent, Unsubscribe } from "./types.ts"

export type BusHandler = (event: SitroomEvent) => void | Promise<void>

export class EventBus {
  private readonly handlers = new Set<BusHandler>()

  subscribe(handler: BusHandler): Unsubscribe {
    this.handlers.add(handler)
    return () => { this.handlers.delete(handler) }
  }

  publish(event: SitroomEvent): void {
    for (const handler of [...this.handlers]) {
      try {
        const result = handler(event)
        if (result && typeof result.then === "function") {
          result.catch((err: unknown) => { console.error("[bus] subscriber rejected:", err) })
        }
      } catch (err) {
        console.error("[bus] subscriber threw:", err)
      }
    }
  }

  size(): number { return this.handlers.size }
}
