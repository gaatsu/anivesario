"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

const BALLOON_COLORS = ["#f472b6", "#a78bfa", "#60a5fa", "#fbbf24", "#34d399", "#fb923c"]

interface Balloon {
  id: number
  left: number
  color: string
  delay: number
  duration: number
}

export default function BalloonsAnimation() {
  const [balloons, setBalloons] = useState<Balloon[]>([])

  useEffect(() => {
    const newBalloons = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 90 + 5,
      color: BALLOON_COLORS[i % BALLOON_COLORS.length],
      delay: Math.random() * 2,
      duration: 6 + Math.random() * 4,
    }))
    setBalloons(newBalloons)

    const timeout = setTimeout(() => setBalloons([]), 12000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {balloons.map((balloon) => (
        <motion.div
          key={balloon.id}
          className="absolute"
          style={{ left: `${balloon.left}%`, bottom: -100 }}
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: "-120vh", opacity: [1, 1, 0] }}
          transition={{
            duration: balloon.duration,
            delay: balloon.delay,
            ease: "linear",
          }}
        >
          <svg width="50" height="70" viewBox="0 0 50 70">
            <ellipse cx="25" cy="25" rx="22" ry="25" fill={balloon.color} />
            <path d="M25 50 L20 60 L30 60 Z" fill={balloon.color} />
            <line x1="25" y1="60" x2="25" y2="70" stroke="#999" strokeWidth="1" />
          </svg>
        </motion.div>
      ))}
    </div>
  )
}
