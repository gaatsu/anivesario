"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  definirMovimento,
  useMovimentoReduzido,
  usePreferenciaMovimento,
  useSistemaReduzMovimento,
} from "@/lib/movimento"
import { pecaDoTema } from "./pecas"
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
  const reduzido = useMovimentoReduzido()
  const sistemaReduz = useSistemaReduzMovimento()
  const preferencia = usePreferenciaMovimento()
  const [saindo, setSaindo] = useState(false)
  // Muda ao ligar as animações: `initial` só vale na montagem, então sem
  // remontar a cena a entrada não tocaria — a peça já estaria no estado final.
  const [ciclo, setCiclo] = useState(0)
  const Peca = pecaDoTema(tema.id)

  // O sistema pede menos movimento e ninguém escolheu nada ainda: em vez de
  // engolir a surpresa ou atropelar o ajuste do aparelho, a cena espera e
  // pergunta. Muita gente liga "reduzir animações" por bateria ou por hábito e
  // não faz ideia de que está perdendo a abertura; quem liga por enjoo tem um
  // motivo sério e continua no comando.
  const perguntando = sistemaReduz && preferencia === "auto"

  useEffect(() => {
    // Sem prazo enquanto a pergunta está na tela: sair sozinho responderia por
    // quem foi consultado.
    if (perguntando) return
    const id = setTimeout(() => setSaindo(true), reduzido ? DURACAO_REDUZIDA_MS : DURACAO_MS)
    return () => clearTimeout(id)
  }, [reduzido, perguntando, ciclo])

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

      <div key={ciclo} className="relative flex flex-col items-center gap-1 text-center">
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

      {/* O bolo é do aniversário e só dele: uma promoção abrindo com bolo é
          errado de um jeito que se nota na hora. Quem escolhe é o registro em
          pecas.ts; tema sem peça própria cai no medalhão. */}
      <Peca key={ciclo} tema={tema} cores={cores} className="relative w-52 md:w-64" />

      <div className="absolute bottom-8 flex flex-col items-center gap-3 px-6">
        {perguntando ? (
          <>
            <p className="text-apoio text-center text-gray-600 text-balance">
              Seu aparelho está com as animações reduzidas. Esta abertura tem uma
              cena animada.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  definirMovimento("completo")
                  setCiclo((c) => c + 1)
                }}
                className="rounded-full px-5 py-3 text-apoio font-semibold text-white shadow-sm transition hover:brightness-110"
                style={{ background: tema.acento }}
              >
                Ver com animação
              </button>
              <button
                type="button"
                onClick={() => definirMovimento("reduzido")}
                className="rounded-full border border-gray-300 bg-white/70 px-5 py-3 text-apoio font-medium text-gray-700 transition hover:bg-white"
              >
                Continuar sem
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Sempre visível, mesmo tocando uma vez só: uma tela de 3s sem
                saída é uma tela travada para quem já viu ou não quer ver. */}
            <button
              type="button"
              onClick={() => setSaindo(true)}
              className="text-apoio text-gray-500 underline underline-offset-4 transition hover:text-gray-800"
            >
              Pular
            </button>
            {/* Volta atrás de quem ligou as animações e se arrependeu: sem isto
                a escolha ficaria guardada sem nenhum lugar para desfazê-la. */}
            {preferencia === "completo" && (
              <button
                type="button"
                onClick={() => definirMovimento("reduzido")}
                className="text-apoio text-gray-400 underline underline-offset-4 transition hover:text-gray-700"
              >
                Reduzir animações
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
