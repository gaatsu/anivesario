import { test } from "node:test"
import assert from "node:assert/strict"
import { paraCampoDeData, paraInstante } from "./data-evento.ts"

/**
 * Estes testes valem em qualquer fuso de propósito.
 *
 * A tentação é comparar "2026-08-21T12:00" com "2026-08-21T15:00:00.000Z" e
 * pronto — mas isso só passa em Brasília, e um teste que só passa na máquina de
 * quem escreveu não protege ninguém.
 *
 * Mais importante: ida e volta se anularem **não** era o defeito. Com o bug, o
 * navegador mandava "2026-08-21T12:00" e lia de volta "2026-08-21T12:00" — os
 * dois lados tratavam a string ingênua como local e fechava a conta. Quem
 * discordava era o servidor, em UTC, que lia aquilo como 12:00Z. O que precisa
 * ser garantido, então, é que a string enviada **não tenha como ser
 * interpretada de dois jeitos**.
 */

test("o que vai para a API é um instante absoluto, não um horário ambíguo", () => {
  const enviado = paraInstante("2026-08-21T12:00")

  // Reinterpretar o próprio valor tem de dar exatamente ele de volta. Uma
  // string ingênua falha aqui: dependeria do fuso de quem lê — que no servidor
  // da Vercel é UTC, e não o de quem marcou a data.
  assert.equal(new Date(enviado).toISOString(), enviado)
  assert.match(enviado, /Z$/)
})

test("o instante enviado corresponde à hora marcada no relógio de quem marcou", () => {
  const enviado = paraInstante("2026-08-21T12:00")
  const relido = new Date(enviado)

  assert.equal(relido.getHours(), 12)
  assert.equal(relido.getMinutes(), 0)
  assert.equal(relido.getDate(), 21)
})

test("salvar várias vezes não move a data", () => {
  // Editar relê o campo e regrava. Com o defeito, cada salvamento empurrava a
  // data 3h para trás — o horário ia derretendo a cada visita ao formulário.
  let campo = "2026-08-21T12:00"

  for (let i = 1; i <= 5; i++) {
    campo = paraCampoDeData(paraInstante(campo))
    assert.equal(campo, "2026-08-21T12:00", `andou no salvamento ${i}`)
  }
})

test("a virada do dia sobrevive à ida e volta", () => {
  // Meia-noite local cai em outro dia em UTC. Se a volta usasse getters UTC, a
  // data mudaria de dia sozinha — e um mural marcado para o dia 21 venceria
  // pelo calendário do dia 20.
  for (const campo of ["2026-08-21T00:00", "2026-08-21T23:59", "2026-12-31T22:30"]) {
    assert.equal(paraCampoDeData(paraInstante(campo)), campo)
  }
})

test("data inválida não vira lixo silencioso", () => {
  // Campo vazio continua vazio: convertê-lo faria a edição gravar uma data que
  // ninguém escolheu.
  assert.equal(paraCampoDeData(""), "")
  assert.equal(paraCampoDeData("nada disso"), "")

  // Na ida, devolver o valor original deixa a API recusar com "Data inválida",
  // que é resposta melhor do que um instante inventado.
  assert.equal(paraInstante("nada disso"), "nada disso")
})
