import { test } from "node:test"
import assert from "node:assert/strict"
import {
  ALTURA_RECADO,
  LARGURA_CELULA,
  LARGURA_RECADO,
  alturaNecessaria,
  colunasQueCabem,
  organizarEmGrade,
  posicaoNaGrade,
  seSobrepoe,
  semSobreposicao,
  semVazamento,
  vagaLivre,
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

test("a altura cobre o recado mais baixo", () => {
  // Poucos recados: o piso de 600 vence.
  assert.equal(alturaNecessaria([{ positionY: 20 }, { positionY: 200 }]), 600)

  // Um recado arrastado para baixo estica o mural, senão fica cortado pela
  // borda de baixo — que era o que acontecia com a altura calculada por
  // quantidade de linhas.
  assert.equal(alturaNecessaria([{ positionY: 2000 }]), 2000 + ALTURA_RECADO + 40)
  assert.equal(alturaNecessaria([]), 600)
})

test("sobreposição é simétrica e olha os dois eixos", () => {
  const origem = { x: 100, y: 100 }
  assert.ok(seSobrepoe(origem, { x: 110, y: 110 }))
  assert.ok(seSobrepoe({ x: 110, y: 110 }, origem))

  // Longe em um eixo só já basta para não encostar.
  assert.ok(!seSobrepoe(origem, { x: 100 + LARGURA_RECADO, y: 100 }))
  assert.ok(!seSobrepoe(origem, { x: 100, y: 100 + ALTURA_RECADO }))

  // ...mas perto nos dois é colisão, mesmo que a distância total seja grande.
  assert.ok(seSobrepoe(origem, { x: 100 + LARGURA_RECADO - 1, y: 100 + ALTURA_RECADO - 1 }))
})

test("a vaga livre desvia de quem já está colado", () => {
  const ocupadas = [posicaoNaGrade(0, 1100), posicaoNaGrade(1, 1100), posicaoNaGrade(2, 1100)]
  const vaga = vagaLivre(ocupadas, 1100)

  for (const o of ocupadas) {
    assert.ok(!seSobrepoe(vaga, o), `a vaga ${JSON.stringify(vaga)} encosta em ${JSON.stringify(o)}`)
  }
})

test("apagar um recado do meio não faz o próximo nascer em cima de outro", () => {
  // O defeito concreto: com a vaga escolhida por contagem, um mural de 5 que
  // perde o 2º volta a ter contagem 4 e o recado novo nasce sobre o 5º.
  const todas = Array.from({ length: 5 }, (_, i) => posicaoNaGrade(i, 1100))
  const restantes = todas.filter((_, i) => i !== 1)

  const vaga = vagaLivre(restantes, 1100)
  for (const o of restantes) {
    assert.ok(!seSobrepoe(vaga, o), `o recado novo caiu sobre ${JSON.stringify(o)}`)
  }
  // E aproveita justamente o buraco aberto, em vez de ir para o fim da fila.
  assert.deepEqual(vaga, todas[1])
})

test("a vaga livre também desvia de posições fora da grade", () => {
  // Murais antigos foram sorteados em 600x300 e nada ali cai numa célula.
  const bagunca = [
    { x: 13, y: 7 },
    { x: 240, y: 90 },
    { x: 455, y: 12 },
  ]
  const vaga = vagaLivre(bagunca, 1100)
  for (const o of bagunca) {
    assert.ok(!seSobrepoe(vaga, o), `a vaga encosta em ${JSON.stringify(o)}`)
  }
})

test("semSobreposicao só mexe em quem está empilhado", () => {
  const itens = [
    { id: "a", positionX: 0, positionY: 0 },
    { id: "b", positionX: 600, positionY: 0 },
    // Praticamente em cima do "a": este é o único que deve sair do lugar.
    { id: "c", positionX: 8, positionY: 6 },
  ]
  const arrumado = semSobreposicao(itens, 1100)

  assert.deepEqual(arrumado[0], itens[0])
  assert.deepEqual(arrumado[1], itens[1])
  assert.notDeepEqual(arrumado[2], itens[2])
  assert.equal(arrumado[2].id, "c")

  for (let a = 0; a < arrumado.length; a++) {
    for (let b = a + 1; b < arrumado.length; b++) {
      assert.ok(
        !seSobrepoe(
          { x: arrumado[a].positionX, y: arrumado[a].positionY },
          { x: arrumado[b].positionX, y: arrumado[b].positionY }
        ),
        `${arrumado[a].id} e ${arrumado[b].id} continuam sobrepostos`
      )
    }
  }
})

test("ninguém fica fora do quadro numa janela estreita", () => {
  // O servidor coloca na grade de 1100px porque não tem como saber a largura da
  // tela. Numa janela de 700 a última coluna nasce fora do mural — medido em
  // 411px para fora numa janela de 660, antes desta correção.
  const larguraReal = 700
  const daGradeLarga = Array.from({ length: 8 }, (_, i) => {
    const p = posicaoNaGrade(i, 1100)
    return { id: `r${i}`, positionX: p.x, positionY: p.y }
  })

  for (const arrumado of [
    semSobreposicao(daGradeLarga, larguraReal),
    semVazamento(daGradeLarga, larguraReal),
  ]) {
    for (const p of arrumado) {
      assert.ok(
        p.positionX + LARGURA_RECADO <= larguraReal,
        `${p.id} passa da borda: x=${p.positionX}`
      )
    }
  }
})

test("semVazamento não desfaz pilha, só resgata quem saiu do quadro", () => {
  // No mural de coleta a sobreposição ainda pode ser escolha de quem arrastou;
  // recado fora do quadro não é escolha de ninguém.
  const empilhados = [
    { id: "a", positionX: 10, positionY: 10 },
    { id: "b", positionX: 16, positionY: 14 },
  ]
  assert.deepEqual(semVazamento(empilhados, 1100), empilhados)

  const fugitivo = [{ id: "c", positionX: 2000, positionY: 10 }]
  assert.notDeepEqual(semVazamento(fugitivo, 1100), fugitivo)
})

test("resgatar quem saiu do quadro não cria pilha com quem ficou", () => {
  // O defeito que apareceu ao consertar o vazamento: escolhendo a vaga só com
  // os recados já visitados, o resgatado caía sobre um que ainda vinha na
  // lista. O que fica em último lugar aqui é justamente a primeira vaga da
  // grade, que é para onde o fugitivo iria.
  const primeiraVaga = posicaoNaGrade(0, 1100)
  const itens = [
    { id: "fugitivo", positionX: 5000, positionY: 0 },
    { id: "quieto", positionX: primeiraVaga.x, positionY: primeiraVaga.y },
  ]

  const arrumado = semVazamento(itens, 1100)
  assert.deepEqual(arrumado[1], itens[1], "quem estava bem não devia sair do lugar")
  assert.ok(
    !seSobrepoe(
      { x: arrumado[0].positionX, y: arrumado[0].positionY },
      { x: arrumado[1].positionX, y: arrumado[1].positionY }
    ),
    "o resgatado caiu em cima de quem ficou"
  )
})

test("um mural inteiro sorteado à moda antiga sai sem nenhuma pilha", () => {
  // Reproduz o estado real dos murais criados antes da grade: 12 recados
  // sorteados dentro de 600x300, onde cabem menos de três sem colisão.
  let semente = 42
  const aleatorio = () => {
    semente = (semente * 1103515245 + 12345) % 2147483648
    return semente / 2147483648
  }
  const itens = Array.from({ length: 12 }, (_, i) => ({
    id: `r${i}`,
    positionX: Math.round(aleatorio() * 600),
    positionY: Math.round(aleatorio() * 300),
  }))

  const arrumado = semSobreposicao(itens, 1100)
  assert.equal(arrumado.length, 12)
  assert.deepEqual(arrumado.map((p) => p.id), itens.map((p) => p.id))

  for (let a = 0; a < arrumado.length; a++) {
    for (let b = a + 1; b < arrumado.length; b++) {
      assert.ok(
        !seSobrepoe(
          { x: arrumado[a].positionX, y: arrumado[a].positionY },
          { x: arrumado[b].positionX, y: arrumado[b].positionY }
        ),
        `${arrumado[a].id} e ${arrumado[b].id} se sobrepõem`
      )
    }
  }
})
