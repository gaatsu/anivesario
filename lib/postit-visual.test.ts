import { test } from "node:test"
import assert from "node:assert/strict"
import { TEMAS } from "./themes.ts"
import {
  hashNome,
  corDoPostit,
  inclinacaoDoPostit,
  texturaDoPostit,
} from "./postit-visual.ts"

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Alan", "Maria Fernanda", "José"]

test("hash é determinístico e não negativo", () => {
  for (const n of NOMES) {
    assert.equal(hashNome(n), hashNome(n))
    assert.ok(hashNome(n) >= 0)
  }
})

test("mesmo nome gera sempre a mesma cor", () => {
  assert.equal(corDoPostit("Ana", TEMAS.birthday), corDoPostit("Ana", TEMAS.birthday))
})

test("o mesmo nome muda de cor conforme o tema", () => {
  assert.notEqual(corDoPostit("Ana", TEMAS.birthday), corDoPostit("Ana", TEMAS.farewell))
})

test("a cor é oklch com luminosidade e croma fixos", () => {
  for (const n of NOMES) {
    const cor = corDoPostit(n, TEMAS.welcome)
    assert.match(cor, /^oklch\(0\.92 0\.09 \d+(\.\d+)?\)$/)
  }
})

test("o matiz fica dentro da faixa do tema", () => {
  for (const tema of Object.values(TEMAS)) {
    for (const n of NOMES) {
      const matiz = Number(corDoPostit(n, tema).match(/ (\d+(?:\.\d+)?)\)$/)![1])
      const distancia = Math.abs(((matiz - tema.matizBase + 540) % 360) - 180)
      assert.ok(
        distancia <= tema.amplitudeMatiz / 2 + 0.01,
        `${tema.id}/${n}: matiz ${matiz} fora de ${tema.matizBase}±${tema.amplitudeMatiz / 2}`
      )
    }
  }
})

test("nomes diferentes recebem cores distintas", () => {
  const cores = new Set(NOMES.map((n) => corDoPostit(n, TEMAS.birthday)))
  assert.ok(cores.size >= NOMES.length - 1, `só ${cores.size} cores para ${NOMES.length} nomes`)
})

test("inclinação é determinística e fica entre -3 e 3", () => {
  for (const n of NOMES) {
    const i = inclinacaoDoPostit(n)
    assert.equal(i, inclinacaoDoPostit(n))
    assert.ok(i >= -3 && i <= 3, `${n}: ${i}`)
  }
})

test("inclinação varia entre nomes", () => {
  assert.ok(new Set(NOMES.map(inclinacaoDoPostit)).size > 1)
})

test("textura é determinística e uma das três", () => {
  for (const n of NOMES) {
    const t = texturaDoPostit(n)
    assert.equal(t, texturaDoPostit(n))
    assert.ok(["liso", "listrado", "pontilhado"].includes(t))
  }
})

test("nome vazio não quebra", () => {
  assert.match(corDoPostit("", TEMAS.birthday), /^oklch\(/)
  assert.ok(Number.isFinite(inclinacaoDoPostit("")))
  assert.ok(["liso", "listrado", "pontilhado"].includes(texturaDoPostit("")))
})
