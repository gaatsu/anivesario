import { test } from "node:test"
import assert from "node:assert/strict"
import { TEMAS } from "./themes.ts"
import {
  hashNome,
  corDoPostit,
  corDoTextoPostit,
  matizDoPostit,
  inclinacaoDoPostit,
  formatoDoPostit,
  fonteDoPostit,
  larguraDoPostit,
  ESTILOS,
  resolverEstilo,
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

test("formato, fonte e largura são determinísticos e válidos", () => {
  for (const n of NOMES) {
    assert.equal(formatoDoPostit(n), formatoDoPostit(n))
    assert.ok(["fita", "percevejo"].includes(formatoDoPostit(n)))

    assert.equal(fonteDoPostit(n), fonteDoPostit(n))
    assert.ok(["caveat", "kalam"].includes(fonteDoPostit(n)))

    assert.equal(larguraDoPostit(n), larguraDoPostit(n))
    assert.ok([176, 200, 224].includes(larguraDoPostit(n)))
  }
})

test("formato e fonte não andam colados", () => {
  // Se ambos lessem o mesmo bit do hash, toda fita viria com a mesma fonte e
  // as quatro combinações virariam duas. Este teste é a razão de `fatia`
  // existir — sem ela, ele falha.
  const combinacoes = new Set(
    Array.from({ length: 400 }, (_, i) => `${formatoDoPostit("n" + i)}/${fonteDoPostit("n" + i)}`)
  )
  assert.equal(combinacoes.size, 4, `só ${combinacoes.size} combinações: [...combinacoes]`)
})

test("o texto usa o mesmo matiz do papel, mais escuro", () => {
  for (const n of NOMES) {
    const matiz = matizDoPostit(n, TEMAS.birthday)
    assert.ok(corDoPostit(n, TEMAS.birthday).endsWith(` ${matiz})`))
    assert.equal(corDoTextoPostit(n, TEMAS.birthday), `oklch(0.32 0.06 ${matiz})`)
  }
})

test("estilo escolhido vence o sorteio pelo nome", () => {
  for (const estilo of ESTILOS) {
    const resolvido = resolverEstilo(estilo.id, "Ana")
    assert.equal(resolvido.formato, estilo.formato)
    assert.equal(resolvido.fonte, estilo.fonte)
  }
})

test("os quatro estilos cobrem as duas combinações de cada eixo", () => {
  assert.equal(ESTILOS.length, 4)
  assert.equal(new Set(ESTILOS.map((e) => e.id)).size, 4)
  assert.equal(new Set(ESTILOS.map((e) => `${e.formato}/${e.fonte}`)).size, 4)
})

test("template vazio ou desconhecido volta para o sorteio", () => {
  // Desconhecido acontece de verdade: se um id sair do registro, os recados já
  // gravados continuam apontando para ele. Cair no automático é o que impede a
  // tela de quebrar nesse dia.
  for (const n of NOMES) {
    const sorteado = { formato: formatoDoPostit(n), fonte: fonteDoPostit(n) }
    assert.deepEqual(resolverEstilo("", n), sorteado)
    assert.deepEqual(resolverEstilo("estilo_que_nao_existe", n), sorteado)
  }
})

test("nome vazio não quebra", () => {
  assert.match(corDoPostit("", TEMAS.birthday), /^oklch\(/)
  assert.match(corDoTextoPostit("", TEMAS.birthday), /^oklch\(/)
  assert.ok(Number.isFinite(inclinacaoDoPostit("")))
  assert.ok(["fita", "percevejo"].includes(formatoDoPostit("")))
  assert.ok(["caveat", "kalam"].includes(fonteDoPostit("")))
  assert.ok(larguraDoPostit("") > 0)
})
