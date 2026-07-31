"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import Bolo from "./Bolo"
import type { Tema } from "@/lib/themes"

/** Tempo de tela antes do fade. O exemplo original levava ~7s só para desenhar
 *  o bolo, o que é uma eternidade para uma porta de entrada. */
const DURACAO_MS = 3000
/** Quem pediu menos movimento vê a cena parada, e por menos tempo: sem animação
 *  não há nada a esperar, mas a saudação ainda precisa ser lida. */
const DURACAO_REDUZIDA_MS = 1500

interface Props {
  tema: Tema
  /** Nome do homenageado, vindo do campo preenchido na criação do evento. */
  nome: string
  cores: string[]
  aoTerminar: () => void
}

export default function Abertura({ tema, nome, cores, aoTerminar }: Props) {
  const reduzido = useReducedMotion()
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setSaindo(true), reduzido ? DURACAO_REDUZIDA_MS : DURACAO_MS)
    return () => clearTimeout(id)
  }, [reduzido])

  const t = (delay: number) =>
    reduzido ? { duration: 0 } : { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <motion.div
      // z-50 fica acima do grão (z-40) e da camada de animação (z-20): a
      // abertura precisa cobrir o mural inteiro enquanto toca.
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6 fundo-papel"
      initial={false}
      animate={{ opacity: saindo ? 0 : 1 }}
      transition={{ duration: reduzido ? 0.25 : 0.6, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (saindo) aoTerminar()
      }}
    >
      {/* Brilho quente atrás da cena, na cor do tema. Fica sob tudo e não
          intercepta clique. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 42%, ${tema.acento}22 0%, transparent 62%)`,
        }}
      />

      <div className="relative flex flex-col items-center gap-1 text-center">
        <motion.p
          className="text-seccao font-medium tracking-wide"
          style={{ color: tema.acento }}
          initial={reduzido ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={t(0.35)}
        >
          {tema.saudacao},
        </motion.p>
        <motion.h1
          className="text-5xl md:text-6xl font-bold text-tinta"
          initial={reduzido ? false : { opacity: 0, y: 22, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={t(0.55)}
        >
          {nome}
        </motion.h1>
      </div>

      <Bolo acento={tema.acento} cores={cores} className="relative w-56 md:w-72" />

      {/* Sempre visível, mesmo tocando uma vez só: uma tela de 3s sem saída é
          uma tela travada para quem já viu ou não quer ver. */}
      <button
        type="button"
        onClick={() => setSaindo(true)}
        className="absolute bottom-8 text-apoio text-gray-500 underline underline-offset-4 hover:text-gray-800 transition"
      >
        Pular
      </button>
    </motion.div>
  )
}
