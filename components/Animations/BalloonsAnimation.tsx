"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import type { PropsAnimacao } from "./tipos"

interface Balao {
  id: number
  left: number
  cor: string
  atraso: number
  duracao: number
  deriva: number
  escala: number
}

export default function BalloonsAnimation({ fase, cores, intensidade }: PropsAnimacao) {
  const reduzir = useReducedMotion()
  const [baloes, setBaloes] = useState<Balao[]>([])
  const celebrando = fase === "celebracao"

  useEffect(() => {
    if (reduzir) return

    const quantidade = Math.max(1, Math.round(14 * intensidade))

    const gerar = () =>
      setBaloes(
        Array.from({ length: quantidade }, (_, i) => ({
          id: Date.now() + i,
          left: Math.random() * 90 + 5,
          cor: cores[i % cores.length],
          atraso: Math.random() * (celebrando ? 1.2 : 3),
          duracao: 7 + Math.random() * 5,
          // Deriva lateral: sobem em arco, não em linha reta como antes.
          deriva: (Math.random() - 0.5) * 120,
          // Tamanhos diferentes dão profundidade — os menores lêem como distantes.
          escala: 0.6 + Math.random() * 0.6,
        }))
      )

    gerar()
    const id = setInterval(gerar, celebrando ? 4000 : 9000)
    return () => clearInterval(id)
  }, [celebrando, cores, intensidade, reduzir])

  if (reduzir) return null

  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      {baloes.map((b) => (
        <motion.div
          key={b.id}
          className="absolute"
          style={{ left: `${b.left}%`, bottom: -120, scale: b.escala }}
          initial={{ y: 0, x: 0, opacity: 0 }}
          animate={{ y: "-125vh", x: b.deriva, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: b.duracao,
            delay: b.atraso,
            // easeOut: sobem rápido e vão perdendo força, como algo que flutua.
            // O original usava linear, que lê como robótico.
            ease: "easeOut",
            opacity: { times: [0, 0.12, 0.85, 1] },
          }}
        >
          <svg width="50" height="70" viewBox="0 0 50 70">
            <ellipse cx="25" cy="25" rx="22" ry="25" fill={b.cor} />
            <path d="M25 50 L20 60 L30 60 Z" fill={b.cor} />
            <line x1="25" y1="60" x2="25" y2="70" stroke="#999" strokeWidth="1" />
          </svg>
        </motion.div>
      ))}
    </div>
  )
}
