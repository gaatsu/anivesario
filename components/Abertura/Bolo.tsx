"use client"

import { motion, useReducedMotion } from "framer-motion"

/**
 * Borda inferior de glacê, escorrendo. Em vez de repetir a mesma gota, a
 * profundidade varia por posição: gotas idênticas leem como uma serrilha, não
 * como cobertura derretida.
 */
function bordaDeGlace(
  x0: number,
  x1: number,
  yTopo: number,
  yBase: number,
  n: number,
  semente: number
): string {
  const passo = (x1 - x0) / n
  let d = `M${x0},${yTopo} H${x1} V${yBase}`
  for (let i = n - 1; i >= 0; i--) {
    const b = x0 + (i + 1) * passo
    const a = x0 + i * passo
    const prof = 7 + ((i * 5 + semente) % 4) * 4
    d += ` C${b},${yBase + prof} ${a},${yBase + prof} ${a},${yBase}`
  }
  return `${d} Z`
}

const GLACE_BAIXO = bordaDeGlace(44, 216, 146, 164, 9, 0)
const GLACE_ALTO = bordaDeGlace(82, 178, 98, 112, 6, 2)

// Confeitos posicionados à mão sobre as duas faixas de glacê. Fixos de propósito:
// sortear a cada render faria o bolo "piscar" diferente em cada visita.
const CONFEITOS: { x: number; y: number; r: number; c: number }[] = [
  { x: 60, y: 155, r: -25, c: 0 }, { x: 82, y: 149, r: 40, c: 1 },
  { x: 104, y: 157, r: -10, c: 2 }, { x: 128, y: 150, r: 60, c: 3 },
  { x: 150, y: 158, r: -45, c: 0 }, { x: 174, y: 151, r: 20, c: 2 },
  { x: 196, y: 156, r: -60, c: 1 }, { x: 94, y: 105, r: 30, c: 3 },
  { x: 116, y: 100, r: -35, c: 0 }, { x: 140, y: 106, r: 15, c: 1 },
  { x: 162, y: 101, r: -50, c: 2 },
]

const SPONGE = "#e3bd90"
const SPONGE_ESCURO = "#cfa675"
const CREME = "#fff8ee"
const CREME_SOMBRA = "#f0e2cf"

// Sobem no lugar, então a origem precisa ser o próprio bounding box do elemento
// — sem transformBox o SVG escalaria a partir do canto do viewBox.
const NO_LUGAR = { transformBox: "fill-box", transformOrigin: "center" } as const

const surgir = {
  oculto: { opacity: 0, y: 22, scale: 0.92 },
  visivel: { opacity: 1, y: 0, scale: 1 },
}

interface Props {
  /** Cor sólida do tema, usada nas fitas do bolo. */
  acento: string
  /** Paleta do tema, usada nos confeitos. */
  cores: string[]
  className?: string
}

export default function Bolo({ acento, cores, className = "" }: Props) {
  const reduzido = useReducedMotion()
  const de = reduzido ? "visivel" : "oculto"
  const t = (delay: number, duration = 0.55) =>
    reduzido ? { duration: 0 } : { delay, duration, ease: [0.22, 1, 0.36, 1] as const }

  const cor = (i: number) => cores[i % cores.length] ?? acento

  return (
    <svg
      viewBox="0 0 260 244"
      className={className}
      role="img"
      aria-label="Bolo de aniversário com uma vela acesa"
    >
      <defs>
        <radialGradient id="halo-vela">
          <stop offset="0%" stopColor="#ffdb8a" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffdb8a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="massa" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SPONGE} />
          <stop offset="100%" stopColor={SPONGE_ESCURO} />
        </linearGradient>
      </defs>

      {/* Prato */}
      <motion.g variants={surgir} initial={de} animate="visivel" transition={t(0.1)} style={NO_LUGAR}>
        <ellipse cx="130" cy="216" rx="114" ry="13" fill="#ddd0b6" />
        <ellipse cx="130" cy="212" rx="114" ry="13" fill="#efe4cd" />
        <path d="M108,224 h44 l-6,14 h-32 Z" fill="#ddd0b6" />
        <ellipse cx="130" cy="238" rx="34" ry="6" fill="#efe4cd" />
      </motion.g>

      {/* Andar de baixo */}
      <motion.g variants={surgir} initial={de} animate="visivel" transition={t(0.3)} style={NO_LUGAR}>
        <rect x="44" y="152" width="172" height="60" rx="5" fill="url(#massa)" />
        <rect x="44" y="188" width="172" height="9" fill={acento} opacity="0.85" />
        <path d={GLACE_BAIXO} fill={CREME} />
        <path d={GLACE_BAIXO} fill={CREME_SOMBRA} opacity="0.5" transform="translate(0,3)" />
        <path d={GLACE_BAIXO} fill={CREME} />
      </motion.g>

      {/* Andar de cima */}
      <motion.g variants={surgir} initial={de} animate="visivel" transition={t(0.5)} style={NO_LUGAR}>
        <rect x="82" y="104" width="96" height="48" rx="5" fill="url(#massa)" />
        <rect x="82" y="132" width="96" height="7" fill={acento} opacity="0.85" />
        <path d={GLACE_ALTO} fill={CREME} />
      </motion.g>

      {/* Confeitos */}
      <motion.g
        initial={reduzido ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={t(1.15, 0.4)}
      >
        {CONFEITOS.map((c, i) => (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width="7"
            height="3"
            rx="1.5"
            fill={cor(c.c)}
            transform={`rotate(${c.r} ${c.x + 3.5} ${c.y + 1.5})`}
          />
        ))}
      </motion.g>

      {/* Vela: cai de cima, como no exemplo original */}
      <motion.g
        initial={reduzido ? { opacity: 1, y: 0 } : { opacity: 0, y: -70 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduzido ? { duration: 0 } : { delay: 0.85, duration: 0.6, ease: [0.34, 1.3, 0.64, 1] }}
      >
        <rect x="123" y="66" width="14" height="40" rx="4" fill="#fdfaf4" />
        {/* Listras diagonais, não horizontais: dão volume à vela cilíndrica */}
        <path d="M123,80 l14,-8 v6 l-14,8 Z" fill={acento} opacity="0.55" />
        <path d="M123,96 l14,-8 v6 l-14,8 Z" fill={acento} opacity="0.55" />
        <rect x="123" y="66" width="4" height="40" fill="#000" opacity="0.06" />
        {/* Pavio — inexistente no exemplo original, e é o que ancora a chama */}
        <path d="M130,68 v-9" stroke="#4a3a2c" strokeWidth="2.5" strokeLinecap="round" />
      </motion.g>

      {/* Chama. Três camadas defasadas em vez dos cinco círculos idênticos do
          exemplo, que ficavam empilhados na mesma posição e sumiam em scale(0)
          — lia como um blob pulsando, não como fogo. */}
      <motion.g
        initial={reduzido ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduzido ? { duration: 0 } : { delay: 1.3, duration: 0.45, ease: "backOut" }}
        style={NO_LUGAR}
      >
        <circle cx="130" cy="42" r="34" fill="url(#halo-vela)" className="halo-vela" />
        <path
          className="chama chama-externa"
          d="M130,20 C142,34 148,44 148,52 C148,62 140,70 130,70 C120,70 112,62 112,52 C112,44 118,34 130,20 Z"
          fill="#ff8a1f"
          opacity="0.45"
        />
        <path
          className="chama chama-media"
          d="M130,28 C138,39 142,46 142,52 C142,60 137,66 130,66 C123,66 118,60 118,52 C118,46 122,39 130,28 Z"
          fill="#ffd23f"
        />
        <path
          className="chama chama-nucleo"
          d="M130,44 C134,50 136,53 136,56 C136,60 133,63 130,63 C127,63 124,60 124,56 C124,53 126,50 130,44 Z"
          fill="#fff6d8"
        />
      </motion.g>
    </svg>
  )
}
