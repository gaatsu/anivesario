import type confetti from "canvas-confetti"

export type FaseAnimacao = "celebracao" | "ambiente"

/**
 * Dispara partículas no canvas do AnimationLayer, não no canvas global da lib.
 *
 * Só a assinatura de chamada, de propósito: as animações apenas disparam, e
 * quem controla o ciclo de vida (criar, resetar) é o AnimationLayer. Isso deixa
 * a função estável entre renders, sem precisar de estado para propagá-la.
 */
export type Disparador = (opcoes?: confetti.Options) => void

export interface PropsAnimacao {
  fase: FaseAnimacao
  /** Paleta do tema do evento, em hex — canvas-confetti não entende oklch. */
  cores: string[]
  /** 1 na celebração, ~0.1 no ambiente. */
  intensidade: number
  disparar: Disparador
}

/** Quanto dura a celebração antes de decair para o movimento de fundo. */
export const DURACAO_CELEBRACAO_MS = 2500
