"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useCallback, useEffect, useState } from "react"
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

let proximoId = 0

export default function BalloonsAnimation({ fase, cores, intensidade }: PropsAnimacao) {
  const reduzir = useReducedMotion()
  const [baloes, setBaloes] = useState<Balao[]>([])
  const celebrando = fase === "celebracao"

  const gerar = useCallback(
    (quantidade: number, atrasoMax: number) => {
      // Acrescenta em vez de substituir. Substituir destruía os balões da
      // celebração quando a fase virava ambiente aos 2,5s — e como cada balão
      // leva de 7 a 12s para cruzar a tela, eles eram apagados antes de subir.
      setBaloes((atuais) => [
        ...atuais,
        ...Array.from({ length: quantidade }, (_, i) => ({
          id: proximoId++,
          left: Math.random() * 90 + 5,
          cor: cores[i % cores.length],
          atraso: Math.random() * atrasoMax,
          duracao: 7 + Math.random() * 5,
          // Deriva lateral: sobem em arco, não em linha reta.
          deriva: (Math.random() - 0.5) * 120,
          // Tamanhos diferentes dão profundidade — os menores lêem como distantes.
          escala: 0.6 + Math.random() * 0.6,
        })),
      ])
    },
    [cores]
  )

  useEffect(() => {
    if (reduzir) return

    const quantidade = Math.max(1, Math.round(14 * intensidade))
    const intervalo = celebrando ? 4000 : 9000
    const atrasoMax = celebrando ? 1.2 : 3

    // Primeira leva num requestAnimationFrame: gerar direto aqui seria setState
    // síncrono dentro do efeito, o que dispara um render em cascata logo na
    // montagem.
    const quadro = requestAnimationFrame(() => gerar(quantidade, atrasoMax))
    const id = setInterval(() => gerar(quantidade, atrasoMax), intervalo)

    return () => {
      cancelAnimationFrame(quadro)
      clearInterval(id)
    }
  }, [celebrando, gerar, intensidade, reduzir])

  if (reduzir) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none overflow-hidden z-20 transition-opacity duration-1000 ${
        celebrando ? "opacity-90" : "opacity-40"
      }`}
    >
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
          // Cada balão se remove ao terminar a viagem, em vez de a lista inteira
          // ser trocada. Sem isto a lista cresceria para sempre.
          onAnimationComplete={() =>
            setBaloes((atuais) => atuais.filter((x) => x.id !== b.id))
          }
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
