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

/** Altura necessária para o mural não cortar a última linha. */
export function alturaDaGrade(quantidade: number, larguraMural: number = LARGURA_PADRAO): number {
  const linhas = Math.ceil(quantidade / colunasQueCabem(larguraMural))
  return Math.max(600, 40 + linhas * ALTURA_CELULA)
}
