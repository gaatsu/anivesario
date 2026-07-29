"use client"

import { useEffect } from "react"
import confetti from "canvas-confetti"

export default function ConfettiPaperAnimation() {
  useEffect(() => {
    const duration = 4000
    const end = Date.now() + duration

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval)
        return
      }

      confetti({
        particleCount: 15,
        startVelocity: 0,
        ticks: 300,
        gravity: 0.5,
        origin: {
          x: Math.random(),
          y: -0.1,
        },
        colors: ["#f472b6", "#a78bfa", "#60a5fa", "#fbbf24", "#34d399"],
        shapes: ["square"],
        scalar: 0.8,
        drift: Math.random() - 0.5,
      })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  return null
}
