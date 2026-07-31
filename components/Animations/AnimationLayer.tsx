"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import confetti from "canvas-confetti"
import { resolverAnimacoes } from "@/lib/themes"
import {
  DURACAO_CELEBRACAO_MS,
  type Disparador,
  type FaseAnimacao,
  type PropsAnimacao,
} from "./tipos"
import ConfettiAnimation from "./ConfettiAnimation"
import ConfettiUpAnimation from "./ConfettiUpAnimation"
import BalloonsAnimation from "./BalloonsAnimation"
import FireworksAnimation from "./FireworksAnimation"
import PetalsAnimation from "./PetalsAnimation"
import StarsAnimation from "./StarsAnimation"

const COMPONENTES: Record<string, React.ComponentType<PropsAnimacao>> = {
  confetti: ConfettiAnimation,
  confetti_up: ConfettiUpAnimation,
  balloons: BalloonsAnimation,
  fireworks: FireworksAnimation,
  petals: PetalsAnimation,
  stars: StarsAnimation,
}

interface AnimationLayerProps {
  animations: string[]
  cores: string[]
}

export default function AnimationLayer({ animations, cores }: AnimationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanciaRef = useRef<confetti.CreateTypes | null>(null)

  const [fase, setFase] = useState<FaseAnimacao>("celebracao")
  const [visivel, setVisivel] = useState(true)

  // Começa desligado: se a preferência do sistema for reduzir movimento, nada
  // chega a rodar nem por um frame.
  const [reduzirMovimento, setReduzirMovimento] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const aplicar = () => setReduzirMovimento(mq.matches)
    aplicar()
    mq.addEventListener("change", aplicar)
    return () => mq.removeEventListener("change", aplicar)
  }, [])

  // useWorker tira a animação da thread principal. Como a fase de ambiente roda
  // indefinidamente, é o que separa a página fluida da travada ao rolar recados.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || reduzirMovimento) return

    const instancia = confetti.create(canvas, {
      resize: true,
      useWorker: true,
      disableForReducedMotion: true,
    })
    instanciaRef.current = instancia

    return () => {
      instancia.reset()
      instanciaRef.current = null
    }
  }, [reduzirMovimento])

  // Estável entre renders e sempre definida: as animações disparam sem se
  // importar se a instância já existe, e não é preciso estado para propagá-la.
  const disparar = useCallback<Disparador>((opcoes) => {
    instanciaRef.current?.(opcoes)
  }, [])

  useEffect(() => {
    if (reduzirMovimento) return
    const t = setTimeout(() => setFase("ambiente"), DURACAO_CELEBRACAO_MS)
    return () => clearTimeout(t)
  }, [reduzirMovimento])

  // Sem isto, um celular no bolso continuaria animando.
  useEffect(() => {
    const aoMudar = () => setVisivel(document.visibilityState === "visible")
    aoMudar()
    document.addEventListener("visibilitychange", aoMudar)
    return () => document.removeEventListener("visibilitychange", aoMudar)
  }, [])

  const ids = resolverAnimacoes(animations)

  if (reduzirMovimento || ids.length === 0) return null

  return (
    <>
      {/* Acima do conteúdo, não atrás. Atrás só funcionava no desktop, onde o
          card do mural é centralizado e sobra margem lateral para as partículas
          aparecerem; no celular o card ocupa a largura inteira e engolia a
          animação toda. A opacidade baixa — e mais baixa ainda no ambiente — é o
          que impede de atrapalhar a leitura. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-20 h-full w-full transition-opacity duration-1000 ${
          fase === "celebracao" ? "opacity-80" : "opacity-30"
        }`}
      />

      {visivel &&
        ids.map((id) => {
          const Componente = COMPONENTES[id]
          if (!Componente) return null
          return (
            <Componente
              key={id}
              fase={fase}
              cores={cores}
              intensidade={fase === "celebracao" ? 1 : 0.1}
              disparar={disparar}
            />
          )
        })}
    </>
  )
}
