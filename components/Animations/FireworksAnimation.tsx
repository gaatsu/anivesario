"use client"

import type { PropsAnimacao } from "./tipos"
import { useRitmo } from "./useRitmo"

export default function FireworksAnimation({ fase, cores, intensidade, disparar }: PropsAnimacao) {
  const celebrando = fase === "celebracao"

  useRitmo(() => {
    // Estouros nas laterais preservam o centro da tela, que é onde ficam os
    // recados.
    const x = Math.random() < 0.5 ? 0.1 + Math.random() * 0.2 : 0.7 + Math.random() * 0.2

    disparar({
      particleCount: Math.max(3, Math.round(60 * intensidade)),
      angle: 90,
      spread: 360,
      startVelocity: celebrando ? 35 : 18,
      decay: 0.9,
      gravity: 1.1,
      shapes: ["circle"],
      scalar: celebrando ? 1 : 0.7,
      ticks: celebrando ? 200 : 320,
      origin: { x, y: 0.2 + Math.random() * 0.3 },
      colors: cores,
    })
  }, celebrando ? 500 : 3200)

  return null
}
