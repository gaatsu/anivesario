"use client"

import { motion, useReducedMotion } from "framer-motion"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { PropsPeca } from "./pecas"

/**
 * Peça central dos temas que ainda não têm cena própria.
 *
 * O bolo é do aniversário e só dele — mostrá-lo numa promoção ou numa
 * despedida é errado de um jeito que se nota na hora. Este medalhão é o
 * substituto honesto: monta-se sozinho a partir do que o tema já declara (cor
 * de acento, paleta e ícones), então serve os três sem fingir arte sob medida.
 */
const POSICOES_BRILHO = [
  { x: "12%", y: "18%", r: 5 },
  { x: "84%", y: "26%", r: 7 },
  { x: "22%", y: "78%", r: 6 },
  { x: "78%", y: "72%", r: 4 },
  { x: "50%", y: "6%", r: 5 },
]

export default function Medalhao({ tema, cores, className = "" }: PropsPeca) {
  const reduzido = useReducedMotion()

  const nomeIcone = tema.icones[0]
  const Icone = (Icons as unknown as Record<string, LucideIcon>)[nomeIcone] ?? Icons.Sparkles

  const t = (delay: number, duration = 0.6) =>
    reduzido ? { duration: 0 } : { delay, duration, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <div className={`relative aspect-square ${className}`}>
      {/* Halo. Mesma classe da chama da vela, então respeita
          prefers-reduced-motion pelo mesmo @media do globals.css. */}
      <div
        aria-hidden
        className="halo-vela absolute inset-0 rounded-full blur-2xl"
        style={{ background: `radial-gradient(circle, ${tema.acento}55 0%, transparent 68%)` }}
      />

      {POSICOES_BRILHO.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.r * 2,
            height: p.r * 2,
            marginLeft: -p.r,
            marginTop: -p.r,
            background: cores[i % cores.length] ?? tema.acento,
          }}
          initial={reduzido ? false : { opacity: 0, scale: 0 }}
          animate={
            reduzido
              ? { opacity: 0.8, scale: 1 }
              : { opacity: [0, 0.9, 0.45, 0.9], scale: [0, 1.15, 0.9, 1.05] }
          }
          transition={
            reduzido
              ? { duration: 0 }
              : {
                  delay: 0.9 + i * 0.12,
                  duration: 3.2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }
          }
        />
      ))}

      <motion.div
        className="absolute inset-[14%] flex items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 28%, #fffdf8 0%, ${tema.acento}22 62%, ${tema.acento}44 100%)`,
          border: `3px solid ${tema.acento}`,
          boxShadow: `0 10px 34px -12px ${tema.acento}88, inset 0 2px 0 rgba(255,255,255,0.6)`,
        }}
        initial={reduzido ? false : { opacity: 0, scale: 0.6, rotate: -12 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={
          reduzido ? { duration: 0 } : { delay: 0.3, duration: 0.75, ease: [0.34, 1.3, 0.64, 1] }
        }
      >
        <motion.div
          initial={reduzido ? false : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={t(0.75, 0.5)}
        >
          <Icone className="h-[38%] w-[38%] min-h-16 min-w-16" style={{ color: tema.acento }} />
        </motion.div>
      </motion.div>
    </div>
  )
}
