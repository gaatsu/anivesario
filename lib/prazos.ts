/**
 * Quando um mural vence e quando ele pode ser apagado de vez.
 *
 * Separado de `eventLifecycle.ts` porque lá se fala com o banco, e este arquivo
 * é só data e subtração — dá para testar sem cliente do Prisma, que nem chega a
 * ser gerado nesta máquina.
 *
 * São dois prazos em sequência:
 *
 *  1. **Vencimento** — 12h depois da data do evento. O mural sai do ar, mas os
 *     dados ficam: o `deletedAt` é preenchido e todas as consultas, que já
 *     filtram por `deletedAt: null`, param de enxergá-lo.
 *  2. **Purga** — 7 dias depois de vencido. Aí sim a linha some e as fotos são
 *     apagadas do Blob.
 *
 * A conta é sobre `eventDate`, e não sobre `createdAt` como era antes. Contar
 * da criação fazia o mural de um aniversário marcado para a semana seguinte
 * morrer bem antes da data — o mural era montado com antecedência justamente
 * para dar tempo de juntar recados, e o prazo trabalhava contra isso.
 */

/** Quanto o mural continua no ar depois da hora marcada. */
export const PRAZO_MURAL_MS = 12 * 60 * 60 * 1000

/**
 * Quanto tempo os dados sobrevivem escondidos antes de sumirem de vez.
 *
 * É a margem para desfazer um engano: até aqui, um evento vencido cedo demais
 * ou apagado por acidente ainda pode voltar limpando o `deletedAt`.
 */
export const PRAZO_RESGATE_MS = 7 * 24 * 60 * 60 * 1000

/** O mural já passou da hora de sair do ar? */
export function muralVencido(eventDate: Date, agora: Date = new Date()): boolean {
  return agora.getTime() - eventDate.getTime() > PRAZO_MURAL_MS
}

/** Data do evento a partir da qual um mural ainda está no ar. */
export function limiteDeVencimento(agora: Date = new Date()): Date {
  return new Date(agora.getTime() - PRAZO_MURAL_MS)
}

/** Já escondido há tempo bastante para poder ser apagado de vez? */
export function prontoParaPurgar(deletedAt: Date | null, agora: Date = new Date()): boolean {
  if (!deletedAt) return false
  return agora.getTime() - deletedAt.getTime() > PRAZO_RESGATE_MS
}

/** Momento de exclusão a partir do qual um evento escondido ainda é resgatável. */
export function limiteDePurga(agora: Date = new Date()): Date {
  return new Date(agora.getTime() - PRAZO_RESGATE_MS)
}

/**
 * Até quando as URLs assinadas das fotos precisam valer.
 *
 * Acompanha o vencimento do mural: assinatura mais curta quebraria as imagens
 * numa aba deixada aberta, e mais longa não serviria a ninguém, porque o mural
 * já teria saído do ar.
 */
export function validadeDasFotos(eventDate: Date): number {
  return eventDate.getTime() + PRAZO_MURAL_MS
}
