import { db } from "./db"
import { apagarFotos } from "./fotos"
import { limiteDePurga, limiteDeVencimento, muralVencido } from "./prazos"

export { PRAZO_MURAL_MS, validadeDasFotos } from "./prazos"

/**
 * Esconde o mural se ele já passou do prazo.
 *
 * Preenche `deletedAt` em vez de apagar. Todas as consultas públicas já filtram
 * por `deletedAt: null`, então o efeito visível é o mesmo — o mural sai do ar na
 * hora —, mas os recados e as fotos continuam lá por uma semana.
 *
 * Antes isto chamava `db.event.delete` direto, e como `Postit` tem
 * `onDelete: Cascade` o primeiro visitante a abrir um link vencido apagava, sem
 * querer e sem volta, todos os recados que o time tinha escrito.
 *
 * Devolve true quando o evento deve ser tratado como inexistente.
 */
export async function ocultarEventoSeVencido(event: {
  id: string
  eventDate: Date
  deletedAt: Date | null
}): Promise<boolean> {
  if (event.deletedAt) return true
  if (!muralVencido(event.eventDate)) return false

  await db.event.update({
    where: { id: event.id },
    data: { deletedAt: new Date() },
  })
  return true
}

/**
 * Passa a vassoura: esconde o que venceu e apaga o que já esperou demais.
 *
 * Usada pelo cron e pela listagem do dashboard. As fotos só são apagadas na
 * segunda fase — apagar os binários junto com o `deletedAt` deixaria um evento
 * resgatável sem nenhuma das imagens, o que não é resgate nenhum.
 */
export async function purgarEventosExpirados(
  creatorId?: string
): Promise<{ ocultados: number; apagados: number }> {
  const doCriador = creatorId ? { creatorId } : {}

  // Fase 1: venceu, sai do ar.
  const { count: ocultados } = await db.event.updateMany({
    where: {
      ...doCriador,
      deletedAt: null,
      eventDate: { lt: limiteDeVencimento() },
    },
    data: { deletedAt: new Date() },
  })

  // Fase 2: escondido há tempo bastante, some de vez.
  //
  // `findMany` antes do `deleteMany` porque `deleteMany` não devolve as linhas
  // apagadas — e sem elas não há como saber quais blobs apagar.
  const aPurgar = await db.event.findMany({
    where: {
      ...doCriador,
      deletedAt: { not: null, lt: limiteDePurga() },
    },
    select: { id: true, photos: true },
  })

  if (aPurgar.length === 0) return { ocultados, apagados: 0 }

  type Purgavel = { id: string; photos: string[] }
  await db.event.deleteMany({
    where: { id: { in: aPurgar.map((e: Purgavel) => e.id) } },
  })
  await apagarFotos(aPurgar.flatMap((e: Purgavel) => e.photos))

  return { ocultados, apagados: aPurgar.length }
}
