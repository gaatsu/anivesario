import { test } from "node:test"
import assert from "node:assert/strict"
import {
  PRAZO_MURAL_MS,
  PRAZO_RESGATE_MS,
  limiteDePurga,
  limiteDeVencimento,
  muralVencido,
  prontoParaPurgar,
  validadeDasFotos,
} from "./prazos.ts"

const HORA = 60 * 60 * 1000
const DIA = 24 * HORA

test("o mural criado com antecedência sobrevive até a data do evento", () => {
  // O defeito que motivou o arquivo: o prazo contava a partir de createdAt, e o
  // mural de um aniversário marcado para dali a uma semana morria em 12h —
  // antes de qualquer um ter deixado recado.
  const festa = new Date("2026-08-20T14:00:00Z")

  const criacao = new Date("2026-08-13T09:00:00Z")
  assert.ok(!muralVencido(festa, criacao), "não pode vencer uma semana antes")

  const vespera = new Date("2026-08-19T23:00:00Z")
  assert.ok(!muralVencido(festa, vespera), "não pode vencer na véspera")

  const durante = new Date("2026-08-20T20:00:00Z")
  assert.ok(!muralVencido(festa, durante), "não pode vencer durante a festa")
})

test("vence 12h depois da hora marcada", () => {
  const festa = new Date("2026-08-20T14:00:00Z")

  const faltandoUmMinuto = new Date(festa.getTime() + PRAZO_MURAL_MS - 60_000)
  assert.ok(!muralVencido(festa, faltandoUmMinuto))

  const passandoUmMinuto = new Date(festa.getTime() + PRAZO_MURAL_MS + 60_000)
  assert.ok(muralVencido(festa, passandoUmMinuto))
})

test("o limite de vencimento serve de recorte para a consulta", () => {
  const agora = new Date("2026-08-21T06:00:00Z")
  const limite = limiteDeVencimento(agora)

  // Tudo que aconteceu antes do limite está vencido; o limite em si, não.
  assert.ok(muralVencido(new Date(limite.getTime() - 1), agora))
  assert.ok(!muralVencido(limite, agora))
})

test("esconder não é apagar: há uma semana para resgatar", () => {
  const escondidoEm = new Date("2026-08-21T02:00:00Z")

  assert.ok(!prontoParaPurgar(escondidoEm, new Date("2026-08-23T02:00:00Z")), "2 dias")
  assert.ok(!prontoParaPurgar(escondidoEm, new Date("2026-08-27T02:00:00Z")), "6 dias")
  assert.ok(
    prontoParaPurgar(escondidoEm, new Date(escondidoEm.getTime() + PRAZO_RESGATE_MS + 1000)),
    "passados os 7 dias"
  )
})

test("quem nunca foi escondido nunca é purgado", () => {
  // A purga varre por deletedAt. Um evento no ar tem deletedAt nulo e não pode
  // entrar nessa varredura de jeito nenhum.
  assert.ok(!prontoParaPurgar(null))
  assert.ok(!prontoParaPurgar(null, new Date("2099-01-01T00:00:00Z")))
})

test("o limite de purga é coerente com prontoParaPurgar", () => {
  const agora = new Date("2026-09-01T00:00:00Z")
  const limite = limiteDePurga(agora)

  assert.ok(prontoParaPurgar(new Date(limite.getTime() - 1), agora))
  assert.ok(!prontoParaPurgar(limite, agora))
})

test("a assinatura das fotos acompanha o vencimento do mural", () => {
  const festa = new Date("2026-08-20T14:00:00Z")
  assert.equal(validadeDasFotos(festa), festa.getTime() + PRAZO_MURAL_MS)

  // Precisa valer enquanto o mural está no ar, senão as imagens quebram numa
  // aba deixada aberta.
  const quaseVencendo = new Date(festa.getTime() + PRAZO_MURAL_MS - 1000)
  assert.ok(validadeDasFotos(festa) > quaseVencendo.getTime())
})

test("resgatar dura mais que ficar no ar", () => {
  // Se a janela de resgate fosse menor que a de exibição, um mural poderia ser
  // apagado de vez antes mesmo de alguém notar que sumiu.
  assert.ok(PRAZO_RESGATE_MS > PRAZO_MURAL_MS)
  assert.equal(PRAZO_MURAL_MS, 12 * HORA)
  assert.equal(PRAZO_RESGATE_MS, 7 * DIA)
})
