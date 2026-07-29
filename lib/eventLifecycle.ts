import { db } from "./db"

export const EVENT_LIFETIME_MS = 12 * 60 * 60 * 1000

export function isEventExpired(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > EVENT_LIFETIME_MS
}

/**
 * Lazily deletes an event if it has passed its 12h lifetime.
 * Returns true if the event was deleted (i.e. should be treated as gone).
 */
export async function deleteEventIfExpired(event: { id: string; createdAt: Date }): Promise<boolean> {
  if (!isEventExpired(event.createdAt)) return false

  await db.event.delete({ where: { id: event.id } })
  return true
}
