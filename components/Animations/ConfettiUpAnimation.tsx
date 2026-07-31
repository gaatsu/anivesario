"use client"

import type { PropsAnimacao } from "./tipos"
import { useRitmo } from "./useRitmo"

export default function ConfettiUpAnimation({ fase, cores, intensidade, disparar }: PropsAnimacao) {
  const celebrando = fase === "celebracao"

  useRitmo(() => {
    disparar({
      particleCount: Math.max(2, Math.round(45 * intensidade)),
      angle: 90,
      spread: celebrando ? 100 : 45,
      startVelocity: celebrando ? 60 : 30,
      decay: 0.91,
      gravity: 0.9,
      scalar: 0.9,
      ticks: celebrando ? 240 : 420,
      // Sai de baixo da borda: parece jorrar do rodapé em vez de aparecer do nada.
      origin: { x: 0.5, y: 1.05 },
      colors: cores,
    })
  }, celebrando ? 450 : 3000)

  return null
}
