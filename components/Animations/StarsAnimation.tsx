"use client"

import type { PropsAnimacao } from "./tipos"
import { useRitmo } from "./useRitmo"

const DOURADOS = ["#FFD700", "#FFA500", "#FFDF6B", "#F5C518"]

export default function StarsAnimation({ fase, cores, intensidade, disparar }: PropsAnimacao) {
  const celebrando = fase === "celebracao"

  useRitmo(() => {
    for (const [escala, velocidade] of [[1.2, 28], [0.7, 18]] as const) {
      disparar({
        particleCount: Math.max(1, Math.round(14 * intensidade)),
        angle: 90,
        spread: 360,
        startVelocity: celebrando ? velocidade : velocidade / 2,
        decay: 0.94,
        gravity: 0.4,
        shapes: ["star"],
        scalar: escala,
        ticks: celebrando ? 260 : 500,
        // Posição aleatória a cada disparo: o brilho aparece em pontos
        // diferentes da tela em vez de piscar sempre no mesmo lugar.
        origin: { x: Math.random(), y: Math.random() * 0.6 },
        colors: [...DOURADOS, ...cores],
      })
    }
  }, celebrando ? 400 : 2800)

  return null
}
