export interface Balao {
  id: number
  /** Posição horizontal de partida, em % da largura da tela. */
  left: number
  cor: string
  /** Atraso até começar a subir, em segundos. */
  atraso: number
  /** Tempo de travessia, em segundos. */
  duracao: number
  /** Deslocamento lateral ao longo da subida, em px. */
  deriva: number
  escala: number
}

/**
 * Momentos da opacidade, em fração da travessia: some no começo, aparece
 * rápido, fica visível quase até o fim e desaparece antes de sair por cima.
 */
export const TEMPOS_OPACIDADE = [0, 0.12, 0.85, 1]

/**
 * Monta o `transition` de um balão.
 *
 * Existe separado do componente para poder ser testado, e o teste existe por
 * causa de um bug real: **um override por propriedade não herda o transition
 * raiz no framer-motion.** `resolveTransition` só mescla quando o objeto traz
 * `inherit: true`; sem isso, ele substitui o transition inteiro.
 *
 * O código anterior passava `opacity: { times: [...] }` e nada mais. A
 * opacidade então rodava com o padrão da biblioteca (~0,3s, sem atraso) e
 * completava o ciclo `0 → 1 → 1 → 0` enquanto o balão ainda estava abaixo da
 * borda da tela, recortado. Ele subia a viagem inteira invisível.
 *
 * Daí `duration` e `delay` aparecerem duas vezes aqui: não é repetição
 * descuidada, é a única forma de o override não perdê-los.
 */
export function transicaoDoBalao(balao: Pick<Balao, "duracao" | "atraso">) {
  const base = { duration: balao.duracao, delay: balao.atraso }

  return {
    ...base,
    // easeOut: sobem rápido e vão perdendo força, como algo que flutua. O
    // original usava linear, que lê como robótico.
    ease: "easeOut" as const,
    opacity: {
      ...base,
      times: TEMPOS_OPACIDADE,
      // Linear na opacidade: uma curva aplicada a cada trecho faria o balão
      // piscar nas junções dos keyframes.
      ease: "linear" as const,
    },
  }
}

/** Sorteia uma leva de balões. `inicio` continua a numeração entre chamadas. */
export function gerarBaloes(quantidade: number, atrasoMax: number, cores: string[], inicio: number): Balao[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    id: inicio + i,
    left: Math.random() * 90 + 5,
    cor: cores[i % cores.length],
    atraso: Math.random() * atrasoMax,
    // 5 a 9s. Antes era 7 a 12, tempo demais ao lado de um confetti de 3s: o
    // balão chegava ao topo quando já não havia mais nada acontecendo.
    duracao: 5 + Math.random() * 4,
    // Deriva lateral: sobem em arco, não em linha reta.
    deriva: (Math.random() - 0.5) * 120,
    // Tamanhos diferentes dão profundidade — os menores lêem como distantes.
    escala: 0.6 + Math.random() * 0.6,
  }))
}
