"use client"

import { useEffect } from "react"
import confetti from "canvas-confetti"

export default function ConfettiAnimation() {
  useEffect(() => {
    const duration = 3000
    const end = Date.now() + duration

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval)
        return
      }

      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ["#f472b6", "#a78bfa", "#60a5fa", "#fbbf24"],
      })
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ["#f472b6", "#a78bfa", "#60a5fa", "#fbbf24"],
      })
    }, 150)

    return () => clearInterval(interval)
  }, [])

  return null
}
