import { test } from "node:test"
import assert from "node:assert/strict"
import {
  ALTURA_CELULA,
  ALTURA_RECADO,
  LARGURA_CELULA,
  LARGURA_RECADO,
  alturaDaGrade,
  colunasQueCabem,
  organizarEmGrade,
  posicaoNaGrade,
} from "./arranjo.ts"

test("recados vizinhos não se sobrepõem", () => {
  // O defeito que motivou o arquivo: com posição aleatória num espaço de
  // 600x300, do quarto recado em diante eles empilhavam uns sobre os outros.
  //
  // Separação horizontal é comparada com a LARGURA do recado e a vertical com
  // a ALTURA — comparar as duas com a largura reprovaria um arranjo correto.
  const larguraMural = 1100
  const posicoes = Array.from({ length: 24 }, (_, i) => posicaoNaGrade(i, larguraMural))

  for (let a = 0; a < posicoes.length; a++) {
    for (let b = a + 1; b < posicoes.length; b++) {
      const dx = Math.abs(posicoes[a].x - posicoes[b].x)
      const dy = Math.abs(posicoes[a].y - posicoes[b].y)
      assert.ok(
        dx >= LARGURA_RECADO || dy >= ALTURA_RECADO,
        `${a} e ${b} se sobrepõem: dx=${dx} dy=${dy}`
      )
    }
  }
})

test("a grade é estável entre chamadas", () => {
  // Reorganizar duas vezes precisa dar o mesmo mural; um desvio aleatório de
  // verdade embaralharia tudo a cada clique.
  for (let i = 0; i < 10; i++) {
    assert.deepEqual(posicaoNaGrade(i, 1100), posicaoNaGrade(i, 1100))
  }
})

test("nada nasce com coordenada negativa", () => {
  for (const largura of [320, 700, 1100, 1600]) {
    for (let i = 0; i < 30; i++) {
      const p = posicaoNaGrade(i, largura)
      assert.ok(p.x >= 0, `largura ${largura}, índice ${i}: x=${p.x}`)
      assert.ok(p.y >= 0, `largura ${largura}, índice ${i}: y=${p.y}`)
    }
  }
})

test("um mural estreito ainda rende uma coluna", () => {
  assert.equal(colunasQueCabem(100), 1)
  assert.equal(colunasQueCabem(0), 1)
  assert.equal(colunasQueCabem(LARGURA_CELULA * 4), 4)
})

test("a grade cabe na largura do mural", () => {
  const largura = 1100
  for (let i = 0; i < 20; i++) {
    assert.ok(posicaoNaGrade(i, largura).x + LARGURA_RECADO <= largura + 10)
  }
})

test("organizar preserva os ids e a ordem", () => {
  const itens = [{ id: "a" }, { id: "b" }, { id: "c" }]
  const arranjo = organizarEmGrade(itens, 1100)
  assert.deepEqual(arranjo.map((p) => p.id), ["a", "b", "c"])
  assert.equal(arranjo.length, 3)
})

test("a altura acompanha a quantidade de linhas", () => {
  const largura = LARGURA_CELULA * 3
  assert.equal(alturaDaGrade(2, largura), 600)
  assert.ok(alturaDaGrade(30, largura) > 600)
  assert.ok(alturaDaGrade(30, largura) >= 10 * ALTURA_CELULA)
})
