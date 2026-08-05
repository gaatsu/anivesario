/**
 * Onde cada recado é colado no mural livre.
 *
 * Substitui o sorteio `Math.random() * 600` por `300` que existia antes: um
 * recado tem entre 176 e 224px de largura, então numa faixa de 600px cabem
 * menos de três sem colisão. Do quarto em diante eles empilhavam uns sobre os
 * outros e o mural virava uma pilha ilegível — que no celular ninguém via,
 * porque lá a coluna esconde o problema.
 */

/**
 * Célula = maior recado + respiro + a amplitude do desvio nos dois sentidos.
 *
 * A folga precisa ser maior que o desvio: com célula de 250 e desvio de ±13,
 * dois vizinhos podiam se aproximar 26px e encostar. É a conta que o teste de
 * sobreposição cobra.
 */
export const DESVIO_MAXIMO = 10
/** Maior largura de recado, de larguraDoPostit em lib/postit-visual. */
export const LARGURA_RECADO = 224
/** Altura típica: min-h-44 mais o padding vertical. */
export const ALTURA_RECADO = 216

export const LARGURA_CELULA = LARGURA_RECADO + 20 + DESVIO_MAXIMO * 2
export const ALTURA_CELULA = ALTURA_RECADO + 20 + DESVIO_MAXIMO * 2

/** Largura de mural assumida quando não há uma medida real (ex.: no servidor). */
export const LARGURA_PADRAO = 1100

/**
 * Deslocamento pseudoaleatório porém estável, derivado do índice.
 *
 * Uma grade exata lê como planilha, não como mural. Este empurrãozinho, somado
 * à inclinação que cada recado já tem, devolve o ar de coisa colada à mão — e
 * por ser derivado do índice, reorganizar duas vezes dá o mesmo resultado, em
 * vez de mexer tudo de lugar a cada clique.
 */
function desvio(indice: number, eixo: number): number {
  const n = Math.sin(indice * 12.9898 + eixo * 78.233) * 43758.5453
  return (n - Math.floor(n) - 0.5) * 2 * DESVIO_MAXIMO
}

export function colunasQueCabem(larguraMural: number): number {
  return Math.max(1, Math.floor(larguraMural / LARGURA_CELULA))
}

export function posicaoNaGrade(
  indice: number,
  larguraMural: number = LARGURA_PADRAO
): { x: number; y: number } {
  const colunas = colunasQueCabem(larguraMural)
  const coluna = indice % colunas
  const linha = Math.floor(indice / colunas)

  // Centraliza o bloco de colunas na largura disponível, senão a grade fica
  // encostada à esquerda com uma faixa vazia à direita.
  const sobra = Math.max(0, larguraMural - colunas * LARGURA_CELULA)

  // Piso em zero: quando a sobra é menor que o desvio, a primeira coluna
  // recebia coordenada negativa e o recado nascia meio fora do mural.
  return {
    x: Math.max(0, Math.round(sobra / 2 + coluna * LARGURA_CELULA + desvio(indice, 0))),
    y: Math.max(0, Math.round(20 + linha * ALTURA_CELULA + desvio(indice, 1))),
  }
}

export interface Ponto {
  x: number
  y: number
}

/**
 * Perímetro de um recado, para efeito de colisão.
 *
 * Todo recado é tratado pelo tamanho do maior (224x216), mesmo quando o dele é
 * menor: errar para o lado do espaço sobrando só afasta dois recados um pouco
 * demais, enquanto errar para o outro lado é exatamente o defeito que se quer
 * eliminar. Como as duas caixas têm o mesmo tamanho, sobrepor-se é só uma
 * questão de distância entre os cantos.
 */
export function seSobrepoe(a: Ponto, b: Ponto): boolean {
  return Math.abs(a.x - b.x) < LARGURA_RECADO && Math.abs(a.y - b.y) < ALTURA_RECADO
}

/**
 * Primeira vaga da grade que não encosta em nenhum recado já colado.
 *
 * Contar quantos recados existem e pedir a vaga daquele índice não serve: quem
 * apaga o próprio recado abre um buraco no meio, a contagem cai, e o recado
 * seguinte nasce exatamente sobre um que já estava lá. Só olhar as posições de
 * verdade resolve — e de quebra desvia dos recados arrastados à mão e dos
 * murais antigos, cujas posições não seguem grade nenhuma.
 */
export function vagaLivre(ocupadas: Ponto[], larguraMural: number = LARGURA_PADRAO): Ponto {
  // Uma caixa qualquer cobre no máximo 4 células da grade, então em
  // 4 * ocupadas + 1 vagas há certamente uma livre. O limite é só cinto de
  // segurança contra laço infinito; na prática a saída vem nas primeiras.
  const limite = ocupadas.length * 4 + 1

  for (let i = 0; i < limite; i++) {
    const vaga = posicaoNaGrade(i, larguraMural)
    if (!ocupadas.some((o) => seSobrepoe(vaga, o))) return vaga
  }

  // Inalcançável pela conta acima, mas se chegar aqui é melhor uma linha nova
  // embaixo de tudo do que um recado empilhado.
  const fundo = Math.max(0, ...ocupadas.map((o) => o.y))
  return { x: posicaoNaGrade(0, larguraMural).x, y: fundo + ALTURA_CELULA }
}

/**
 * Afasta só quem está sobreposto, preservando o resto do arranjo.
 *
 * Para o mural somente-leitura, onde ninguém tem como arrastar nem clicar em
 * "arrumar": o homenageado não pode ser o único a ver uma pilha. Quem já está
 * em lugar limpo não sai do lugar — arrumar tudo apagaria a disposição que
 * alguém montou à mão.
 */
export function semSobreposicao<T extends { positionX: number; positionY: number }>(
  itens: T[],
  larguraMural: number = LARGURA_PADRAO
): T[] {
  const aceitos: Ponto[] = []

  return itens.map((item) => {
    const atual = { x: item.positionX, y: item.positionY }

    if (!aceitos.some((o) => seSobrepoe(atual, o))) {
      aceitos.push(atual)
      return item
    }

    const vaga = vagaLivre(aceitos, larguraMural)
    aceitos.push(vaga)
    return { ...item, positionX: vaga.x, positionY: vaga.y }
  })
}

/** Recalcula a posição de todos, na ordem recebida. */
export function organizarEmGrade<T extends { id: string }>(
  itens: T[],
  larguraMural: number = LARGURA_PADRAO
): { id: string; positionX: number; positionY: number }[] {
  return itens.map((item, i) => {
    const { x, y } = posicaoNaGrade(i, larguraMural)
    return { id: item.id, positionX: x, positionY: y }
  })
}

/**
 * Altura necessária para o mural não cortar ninguém.
 *
 * Medida pela posição real do recado mais baixo, e não pela quantidade dividida
 * em linhas: o servidor coloca na grade de 1100px sem saber a largura da tela,
 * quem arrasta põe onde quiser, e murais antigos não seguem grade alguma. A
 * conta por linhas só acerta quando ninguém saiu do lugar previsto.
 */
export function alturaNecessaria(itens: { positionY: number }[]): number {
  const fundo = itens.reduce((maior, item) => Math.max(maior, item.positionY), 0)
  return Math.max(600, fundo + ALTURA_RECADO + 40)
}
