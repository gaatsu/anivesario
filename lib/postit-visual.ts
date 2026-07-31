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

const FORMATOS = ["fita", "percevejo"] as const
export type Formato = (typeof FORMATOS)[number]

const FONTES = ["caveat", "kalam"] as const
export type Fonte = (typeof FONTES)[number]

/** Larguras em px. Papelaria de verdade não vem toda do mesmo tamanho. */
const LARGURAS = [176, 200, 224] as const

/** FNV-1a de 32 bits: rápido, sem dependência e estável entre execuções. */
export function hashNome(nome: string): number {
  let h = 2166136261
  for (let i = 0; i < nome.length; i++) {
    h ^= nome.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Fatia diferente do mesmo hash para cada atributo.
 *
 * Sem o deslocamento, `hash % 2` para formato e `hash % 2` para fonte dariam
 * sempre o mesmo bit — e aí toda fita viria com Kalam e todo percevejo com
 * Caveat, reduzindo quatro combinações a duas. Os bits do FNV-1a são bem
 * misturados, então faixas distintas se comportam como sorteios independentes.
 */
function fatia(nome: string, deslocamento: number, modulo: number): number {
  return (hashNome(nome) >>> deslocamento) % modulo
}

/** Matiz OKLCH do postit, dentro da faixa do tema. */
export function matizDoPostit(nome: string, tema: Tema): number {
  // Espalha pelo círculo completo com o ângulo áureo, depois comprime o
  // resultado para dentro da faixa do tema.
  const espalhado = (hashNome(nome) * PASSO_AUREO) % 360
  const desvio = (espalhado / 360 - 0.5) * tema.amplitudeMatiz
  return Number((((tema.matizBase + desvio + 360) % 360)).toFixed(2))
}

export function corDoPostit(nome: string, tema: Tema): string {
  return `oklch(${LUMINOSIDADE} ${CROMA} ${matizDoPostit(nome, tema)})`
}

/**
 * Texto num tom escuro do próprio matiz do papel, em vez de cinza neutro. É o
 * que os templates fazem, e o motivo é que cinza sobre papel colorido parece
 * sujo — a mesma família de cor parece tinta.
 */
export function corDoTextoPostit(nome: string, tema: Tema): string {
  return `oklch(0.32 0.06 ${matizDoPostit(nome, tema)})`
}

/** Fita adesiva: quase branca, no matiz do papel, translúcida. */
export function corDaFita(nome: string, tema: Tema): string {
  return `oklch(0.9 0.03 ${matizDoPostit(nome, tema)} / 0.8)`
}

/** Percevejo: saturado e escuro, para ler como plástico e não como papel. */
export function corDoPercevejo(nome: string, tema: Tema): string {
  return `oklch(0.52 0.15 ${matizDoPostit(nome, tema)})`
}

export function inclinacaoDoPostit(nome: string): number {
  return Number((((hashNome(nome) % 61) - 30) / 10).toFixed(1))
}

/**
 * Estilos oferecidos no formulário.
 *
 * Os nove cards do arquivo de templates são, na verdade, **duas** combinações
 * (fita+Kalam e percevejo+Caveat) repetidas em nove tamanhos e cores. Tamanho,
 * inclinação e cor já são procedurais aqui, então o que sobra de escolha real
 * são os dois eixos abaixo — cruzados, dão quatro estilos em vez de dois.
 */
export const ESTILOS = [
  { id: "fita_kalam", label: "Fita, letra solta", formato: "fita", fonte: "kalam" },
  { id: "fita_caveat", label: "Fita, cursiva", formato: "fita", fonte: "caveat" },
  { id: "percevejo_kalam", label: "Percevejo, letra solta", formato: "percevejo", fonte: "kalam" },
  { id: "percevejo_caveat", label: "Percevejo, cursiva", formato: "percevejo", fonte: "caveat" },
] as const satisfies readonly { id: string; label: string; formato: Formato; fonte: Fonte }[]

export type EstiloId = (typeof ESTILOS)[number]["id"]

/**
 * Resolve o estilo efetivo do postit.
 *
 * `template` vazio — ou desconhecido, o que acontece quando um id sai do
 * registro mas os recados gravados continuam apontando para ele — volta para o
 * sorteio pelo nome, que é o padrão.
 */
export function resolverEstilo(
  template: string,
  nome: string
): { formato: Formato; fonte: Fonte } {
  const escolhido = ESTILOS.find((e) => e.id === template)
  if (escolhido) return { formato: escolhido.formato, fonte: escolhido.fonte }
  return { formato: formatoDoPostit(nome), fonte: fonteDoPostit(nome) }
}

export function formatoDoPostit(nome: string): Formato {
  return FORMATOS[fatia(nome, 3, FORMATOS.length)]
}

export function fonteDoPostit(nome: string): Fonte {
  return FONTES[fatia(nome, 11, FONTES.length)]
}

export function larguraDoPostit(nome: string): number {
  return LARGURAS[fatia(nome, 17, LARGURAS.length)]
}
