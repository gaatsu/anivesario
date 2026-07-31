"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Tema } from "@/lib/themes"
import { corDoPostit, inclinacaoDoPostit, texturaDoPostit } from "@/lib/postit-visual"
import { POSTIT_COLORS } from "@/lib/utils"

// Texturas sutis em CSS puro: sem imagem, sem requisição, e legíveis por cima.
const FUNDOS: Record<string, string> = {
  liso: "none",
  listrado: "repeating-linear-gradient(45deg, rgba(0,0,0,0.035) 0 6px, transparent 6px 12px)",
  pontilhado: "radial-gradient(rgba(0,0,0,0.05) 1.2px, transparent 1.2px)",
}

const TAMANHO_PONTILHADO = "10px 10px"

interface PostitCardProps {
  id: string
  name: string
  message: string
  /** Cor escolhida à mão no formulário. Fora da paleta = usa a cor do tema. */
  color: string
  icon?: string | null
  positionX: number
  positionY: number
  /** No link de revelação o mural é só para ver — nada de arrastar. */
  disabled?: boolean
  tema: Tema
}

export default function PostitCard({
  id,
  name,
  message,
  color,
  icon,
  positionX,
  positionY,
  disabled = false,
  tema,
}: PostitCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  })

  const IconComponent = icon
    ? ((Icons as unknown as Record<string, LucideIcon>)[icon] ?? null)
    : null

  // A cor procedural é o padrão, não uma imposição: se o visitante escolheu uma
  // cor da paleta no formulário, ela vence.
  const escolhidaAMao = POSTIT_COLORS.some((c) => c.hex === color)
  const fundo = escolhidaAMao ? color : corDoPostit(name, tema)
  const textura = texturaDoPostit(name)

  const style: React.CSSProperties = {
    position: "absolute",
    left: positionX,
    top: positionY,
    backgroundColor: fundo,
    backgroundImage: FUNDOS[textura],
    backgroundSize: textura === "pontilhado" ? TAMANHO_PONTILHADO : undefined,
    transform: CSS.Translate.toString(transform),
    // Inclinação por autor, em vez do -2° fixo que deixava todos idênticos.
    rotate: `${inclinacaoDoPostit(name)}deg`,
    zIndex: isDragging ? 50 : 1,
    touchAction: "none",
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`w-48 min-h-48 p-4 rounded-lg shadow-md select-none hover:shadow-xl transition-shadow ${
        disabled ? "" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      {IconComponent && <IconComponent className="w-6 h-6 mb-2 text-gray-700" />}
      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words mb-3">{message}</p>
      <p className="text-xs font-semibold text-gray-700 text-right">— {name}</p>
    </div>
  )
}
