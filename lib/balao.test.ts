import { test } from "node:test"
import assert from "node:assert/strict"
import { TEMPOS_OPACIDADE, gerarBaloes, transicaoDoBalao } from "./balao.ts"

test("todo override por propriedade repete duração e atraso", () => {
  // O teste que teria pego o bug: no framer-motion, um override por
  // propriedade NÃO herda o transition raiz — `resolveTransition` só mescla
  // quando o objeto traz `inherit: true`. Um override sem `duration` roda com
  // o padrão da biblioteca (~0,3s), e no caso da opacidade isso apagava o
  // balão antes de ele entrar na tela.
  const t = transicaoDoBalao({ duracao: 8, atraso: 1.5 })

  for (const [chave, valor] of Object.entries(t)) {
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) continue
    const override = valor as Record<string, unknown>
    assert.equal(override.duration, t.duration, `${chave} perdeu a duração`)
    assert.equal(override.delay, t.delay, `${chave} perdeu o atraso`)
  }
})

test("a opacidade cobre a travessia inteira, não os 0,3s do padrão", () => {
  const t = transicaoDoBalao({ duracao: 8, atraso: 1.5 })
  assert.equal(t.opacity.duration, 8)
  assert.equal(t.opacity.delay, 1.5)
  assert.deepEqual(t.opacity.times, TEMPOS_OPACIDADE)
})

test("os tempos de opacidade sobem de 0 a 1 sem retroceder", () => {
  assert.equal(TEMPOS_OPACIDADE[0], 0)
  assert.equal(TEMPOS_OPACIDADE.at(-1), 1)
  for (let i = 1; i < TEMPOS_OPACIDADE.length; i++) {
    assert.ok(TEMPOS_OPACIDADE[i] > TEMPOS_OPACIDADE[i - 1], `tempo ${i} não avança`)
  }
})

test("o balão fica visível na maior parte da viagem", () => {
  // Se o trecho opaco encolher demais, o balão volta a passar despercebido —
  // que é o sintoma original, só que mais sutil.
  const visivel = TEMPOS_OPACIDADE[2] - TEMPOS_OPACIDADE[1]
  assert.ok(visivel >= 0.6, `só ${Math.round(visivel * 100)}% da subida com o balão opaco`)
})

test("ids continuam de onde pararam entre levas", () => {
  // Os balões se acumulam em vez de a lista ser trocada; id repetido faria
  // duas levas colidirem na `key` do React.
  const primeira = gerarBaloes(3, 1, ["#f00"], 0)
  const segunda = gerarBaloes(3, 1, ["#f00"], 3)
  const ids = [...primeira, ...segunda].map((b) => b.id)
  assert.equal(new Set(ids).size, 6)
  assert.deepEqual(ids, [0, 1, 2, 3, 4, 5])
})

test("as cores dão a volta quando a leva é maior que a paleta", () => {
  const cores = ["#a", "#b"]
  const baloes = gerarBaloes(5, 1, cores, 0)
  assert.deepEqual(
    baloes.map((b) => b.cor),
    ["#a", "#b", "#a", "#b", "#a"]
  )
})

test("cada balão sai com valores dentro da faixa", () => {
  for (const b of gerarBaloes(200, 1.2, ["#fff"], 0)) {
    assert.ok(b.left >= 5 && b.left <= 95, `left ${b.left}`)
    assert.ok(b.atraso >= 0 && b.atraso <= 1.2, `atraso ${b.atraso}`)
    assert.ok(b.duracao >= 5 && b.duracao <= 9, `duração ${b.duracao}`)
    assert.ok(Math.abs(b.deriva) <= 60, `deriva ${b.deriva}`)
    assert.ok(b.escala >= 0.6 && b.escala <= 1.2, `escala ${b.escala}`)
  }
})
