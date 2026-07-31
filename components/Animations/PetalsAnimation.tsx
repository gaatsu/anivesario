"use client"

import type { PropsAnimacao } from "./tipos"
import { useRitmo } from "./useRitmo"

export default function PetalsAnimation({ fase, cores, intensidade, disparar }: PropsAnimacao) {
  const celebrando = fase === "celebracao"

  useRitmo(() => {
    // flat + gravidade baixa + ticks longo = queda lenta, não explosão. É isto
    // que separa as pétalas do confetti; o "papel picado" antigo não tinha nada
    // disso e por isso parecia a mesma animação.
    const lado = Math.random()
    disparar({
      particleCount: Math.max(1, Math.round(12 * intensidade)),
      angle: 270,
      spread: 120,
      startVelocity: 8,
      decay: 0.97,
      gravity: 0.35,
      drift: lado < 0.5 ? -0.6 : 0.6,
      flat: true,
      scalar: 1.2,
      ticks: 600,
      origin: { x: lado, y: -0.1 },
      colors: cores,
    })
  }, celebrando ? 300 : 1800)

  return null
}
