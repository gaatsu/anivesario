"use client"

import { useEffect } from "react"
import confetti from "canvas-confetti"

function launchFirework(x: number, y: number) {
  const colors = ["#f472b6", "#a78bfa", "#60a5fa", "#fbbf24", "#34d399"]
  confetti({
    particleCount: 60,
    spread: 360,
    startVelocity: 30,
    ticks: 60,
    origin: { x, y },
    colors,
    shapes: ["circle"],
    scalar: 0.9,
  })
}

export default function FireworksAnimation() {
  useEffect(() => {
    const duration = 4000
    const end = Date.now() + duration

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval)
        return
      }
      launchFirework(Math.random() * 0.8 + 0.1, Math.random() * 0.4 + 0.1)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return null
}
