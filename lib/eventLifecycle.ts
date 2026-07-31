import { db } from "./db"
import { apagarFotos } from "./fotos"

export const EVENT_LIFETIME_MS = 12 * 60 * 60 * 1000

export function isEventExpired(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > EVENT_LIFETIME_MS
}

/**
 * Lazily deletes an event if it has passed its 12h lifetime.
 * Returns true if the event was deleted (i.e. should be treated as gone).
 *
 * `photos` é obrigatório de propósito: apagar a linha sem apagar os binários
 * vaza storage silenciosamente, e como todo evento morre em 12h isso vazaria em
 * todo evento com foto. Exigir o campo faz o compilador cobrar de quem
 * escrever a próxima chamada.
 */
export async function deleteEventIfExpired(event: {
  id: string
  createdAt: Date
  photos: string[]
}): Promise<boolean> {
  if (!isEventExpired(event.createdAt)) return false

  await db.event.delete({ where: { id: event.id } })
  await apagarFotos(event.photos)
  return true
}

/**
 * Remove em lote os eventos vencidos, junto com as fotos deles. Usado pelo cron
 * e pela listagem do dashboard. Faz um `findMany` antes do `deleteMany` porque
 * `deleteMany` não devolve as linhas apagadas — e sem elas não há como saber
 * quais blobs apagar.
 */
export async function purgarEventosExpirados(creatorId?: string): Promise<number> {
  const expirados = await db.event.findMany({
    where: {
      createdAt: { lt: new Date(Date.now() - EVENT_LIFETIME_MS) },
      ...(creatorId ? { creatorId } : {}),
    },
    select: { id: true, photos: true },
  })

  if (expirados.length === 0) return 0

  type Expirado = { id: string; photos: string[] }
  await db.event.deleteMany({
    where: { id: { in: expirados.map((e: Expirado) => e.id) } },
  })
  await apagarFotos(expirados.flatMap((e: Expirado) => e.photos))

  return expirados.length
}
