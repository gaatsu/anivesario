"use client"

import type { PropsAnimacao } from "./tipos"
import { useRitmo } from "./useRitmo"

export default function ConfettiAnimation({ fase, cores, intensidade, disparar }: PropsAnimacao) {
  const celebrando = fase === "celebracao"

  useRitmo(() => {
    const quantidade = Math.max(2, Math.round(30 * intensidade))

    // Duas escalas por rajada dão profundidade: as peças menores parecem mais
    // distantes e caem mais devagar.
    for (const escala of [1, 0.7]) {
      for (const [angulo, x] of [[60, 0], [120, 1]] as const) {
        disparar({
          particleCount: quantidade,
          angle: angulo,
          spread: celebrando ? 70 : 40,
          startVelocity: celebrando ? 55 : 25,
          decay: 0.92,
          scalar: escala,
          ticks: celebrando ? 220 : 400,
          origin: { x, y: 0.7 },
          colors: cores,
        })
      }
    }
  }, celebrando ? 350 : 2600)

  return null
}
