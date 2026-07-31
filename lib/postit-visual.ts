import type { Tema } from "./themes.ts"

/**
 * Passo do ângulo áureo: separa matizes melhor que módulo puro, que agrupa e
 * colide quando há poucos itens.
 */
const PASSO_AUREO = 137.508

/**
 * Croma e luminosidade são constantes de propósito. Em OKLCH a luminosidade é
 * perceptualmente uniforme, então fixá-la garante que todo postit gerado tenha
 * o mesmo contraste real com o texto — o que HSL não daria, já que amarelo e
 * azul com o mesmo L parecem ter claridades diferentes.
 */
const LUMINOSIDADE = 0.92
const CROMA = 0.09

const TEXTURAS = ["liso", "listrado", "pontilhado"] as const
export type Textura = (typeof TEXTURAS)[number]

/** FNV-1a de 32 bits: rápido, sem dependência e estável entre execuções. */
export function hashNome(nome: string): number {
  let h = 2166136261
  for (let i = 0; i < nome.length; i++) {
    h ^= nome.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function corDoPostit(nome: string, tema: Tema): string {
  // Espalha pelo círculo completo com o ângulo áureo, depois comprime o
  // resultado para dentro da faixa do tema.
  const espalhado = (hashNome(nome) * PASSO_AUREO) % 360
  const desvio = (espalhado / 360 - 0.5) * tema.amplitudeMatiz
  const matiz = (tema.matizBase + desvio + 360) % 360
  return `oklch(${LUMINOSIDADE} ${CROMA} ${Number(matiz.toFixed(2))})`
}

export function inclinacaoDoPostit(nome: string): number {
  return Number((((hashNome(nome) % 61) - 30) / 10).toFixed(1))
}

export function texturaDoPostit(nome: string): Textura {
  return TEXTURAS[hashNome(nome) % TEXTURAS.length]
}
