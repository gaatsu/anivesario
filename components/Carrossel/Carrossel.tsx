"use client"

import { useRef, useState } from "react"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion"
import { useMovimentoReduzido } from "@/lib/movimento"
import FotoAmpliada from "./FotoAmpliada"

interface Props {
  fotos: string[]
  className?: string
}

/**
 * Leque de fotos da revelação.
 *
 * Não é um carrossel de slides: é a composição da referência
 * (`C:\anivesario\Carrossel Example`), com quatro comportamentos somados —
 * entrada escalonada a partir do centro, flutuação contínua, parallax pelo
 * mouse com profundidade por card, e inclinação 3D no hover.
 *
 * Reimplementado em framer-motion em vez do GSAP + ScrollTrigger do original:
 * o framer-motion já está instalado, e instalar pacote nesta máquina é uma
 * aposta. Como bônus, `useMovimentoReduzido` desliga tudo de uma vez, coisa que
 * a versão GSAP não fazia.
 */
export default function Carrossel({ fotos, className = "" }: Props) {
  const reduzido = useMovimentoReduzido()
  const container = useRef<HTMLDivElement>(null)
  const [ampliada, setAmpliada] = useState<number | null>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  // Mola no lugar de um requestAnimationFrame com interpolação manual (o que a
  // referência faz à mão): mesmo efeito de arrasto, sem loop nosso rodando.
  const px = useSpring(mouseX, { stiffness: 90, damping: 20, mass: 0.6 })
  const py = useSpring(mouseY, { stiffness: 90, damping: 20, mass: 0.6 })

  if (!fotos.length) return null

  const seguirMouse = (e: React.MouseEvent) => {
    // Não existe no celular — lá sobra a flutuação contínua, que é o
    // comportamento que carrega a cena de qualquer forma.
    if (reduzido || !container.current) return
    const r = container.current.getBoundingClientRect()
    mouseX.set(((e.clientX - r.left) / r.width - 0.5) * 2)
    mouseY.set(((e.clientY - r.top) / r.height - 0.5) * 2)
  }

  const soltarMouse = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div
      ref={container}
      onMouseMove={seguirMouse}
      onMouseLeave={soltarMouse}
      className={`flex justify-center items-center py-4 ${className}`}
      style={{ perspective: 900 }}
    >
      {fotos.map((url, i) => (
        <Card
          key={url}
          url={url}
          indice={i}
          total={fotos.length}
          px={px}
          py={py}
          reduzido={reduzido}
          aoAbrir={() => setAmpliada(i)}
        />
      ))}

      <FotoAmpliada
        fotos={fotos}
        aberta={ampliada}
        aoFechar={() => setAmpliada(null)}
        aoTrocar={setAmpliada}
      />
    </div>
  )
}

interface CardProps {
  url: string
  indice: number
  total: number
  px: MotionValue<number>
  py: MotionValue<number>
  reduzido: boolean
  aoAbrir: () => void
}

function Card({ url, indice, total, px, py, reduzido, aoAbrir }: CardProps) {
  // Hooks por card, e não um laço de hooks no pai: assim adicionar ou remover
  // uma foto não muda a quantidade de hooks chamada por componente.
  const desvio = indice - (total - 1) / 2
  const profundidade = 6 + (indice % 4) * 3
  const rotacao = desvio * 4.5
  // Os do meio ficam acima dos das pontas — é o que dá a leitura de leque.
  const camada = total - Math.round(Math.abs(desvio))

  const x = useTransform(px, (v) => v * profundidade)
  const y = useTransform(py, (v) => v * profundidade * 0.5)

  const [pairado, setPairado] = useState(false)

  const inclinacaoX = useMotionValue(0)
  const inclinacaoY = useMotionValue(0)
  const rx = useSpring(inclinacaoX, { stiffness: 260, damping: 22 })
  const ry = useSpring(inclinacaoY, { stiffness: 260, damping: 22 })

  const inclinar = (e: React.MouseEvent) => {
    if (reduzido) return
    const r = e.currentTarget.getBoundingClientRect()
    inclinacaoX.set(-((e.clientY - r.top) / r.height - 0.5) * 16)
    inclinacaoY.set(((e.clientX - r.left) / r.width - 0.5) * 16)
  }

  const desinclinar = () => {
    inclinacaoX.set(0)
    inclinacaoY.set(0)
  }

  return (
    <motion.div
      // Na frente de todo mundo enquanto está sob o mouse: sem isto o card
      // cresce por baixo dos vizinhos, e o zoom aparece cortado dos dois lados.
      style={{ x, y, zIndex: pairado ? total + 10 : camada }}
      className="relative -ml-[clamp(0.75rem,4vw,1.75rem)] first:ml-0"
    >
      {/* Camada 1: entrada. Separada da flutuação porque as duas animam `y` — no
          mesmo elemento, a segunda sobrescreveria a primeira. */}
      <motion.div
        initial={reduzido ? false : { opacity: 0, y: -90, scale: 0.7, rotate: rotacao + 22 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: rotacao }}
        transition={
          reduzido
            ? { duration: 0 }
            : {
                // A partir do centro: os cards do meio caem primeiro e os das
                // pontas fecham o leque.
                delay: 0.15 + Math.abs(desvio) * 0.09,
                duration: 0.9,
                ease: [0.34, 1.25, 0.64, 1],
              }
        }
      >
        {/* Camada 2: flutuação contínua + inclinação no hover. */}
        {/* Botão, e não div com onClick: abrir a foto precisa funcionar no
            teclado, e no celular — onde hover não existe — o clique é o único
            jeito de ver a imagem inteira. */}
        <motion.button
          type="button"
          onClick={aoAbrir}
          aria-label={`Ampliar a foto ${indice + 1} de ${total}`}
          onMouseMove={inclinar}
          onMouseEnter={() => setPairado(true)}
          onMouseLeave={() => {
            setPairado(false)
            desinclinar()
          }}
          style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
          animate={reduzido ? undefined : { y: [0, -(8 + (indice % 3) * 4), 0] }}
          transition={
            reduzido
              ? undefined
              : {
                  duration: 3 + (indice % 4) * 0.5,
                  delay: 1.4 + indice * 0.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
          // 1.12 mal se notava no meio da flutuação, que já move o card 8-16px.
          // 1.45 destaca de verdade qual está sob o mouse.
          whileHover={reduzido ? undefined : { scale: 1.45 }}
          whileTap={reduzido ? undefined : { scale: 0.96 }}
          className="block w-[clamp(4.5rem,17vw,8.5rem)] aspect-[2/3] cursor-zoom-in overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_10px_30px_-12px_rgb(59_49_41/0.45)] ring-1 ring-black/5"
        >
          {/* <img> e não next/image: as URLs vêm do Blob em runtime, e o
              componente do Next exigiria configurar remotePatterns para um
              domínio que muda por store. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-full w-full rounded-lg object-cover select-none"
          />
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
