"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { Tema } from "@/lib/themes"
import {
  corDaFita,
  corDoPercevejo,
  corDoPostit,
  corDoTextoPostit,
  inclinacaoDoPostit,
  resolverEstilo,
  larguraDoPostit,
} from "@/lib/postit-visual"
import { POSTIT_COLORS } from "@/lib/utils"

/**
 * Canto inferior direito cortado, em vez de borda arredondada. É o recorte dos
 * templates e a razão de o papel parecer papel: cantos redondos leem como
 * cartão de UI, o corte em diagonal lê como folha destacada.
 */
const RECORTE = "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)"

/** Luz batendo de cima à esquerda, some no meio da folha. */
const BRILHO = "linear-gradient(135deg, rgba(255,255,255,0.35), rgba(0,0,0,0.02) 40%)"

const SOMBRA = "3px 6px 14px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.4) inset"

// Caveat é uma cursiva ligada, com altura-x baixa; Kalam é mais próxima de letra
// de forma. Nos mesmos pixels a Caveat parece bem menor, daí os tamanhos
// diferentes — é o mesmo ajuste que os templates fazem.
const FONTES: Record<string, { familia: string; corpo: string; assinatura: string }> = {
  caveat: { familia: "var(--font-caveat), cursive", corpo: "1.45rem", assinatura: "1.15rem" },
  kalam: { familia: "var(--font-kalam), cursive", corpo: "1.02rem", assinatura: "0.9rem" },
}

interface PostitCardProps {
  id: string
  name: string
  message: string
  /** Cor escolhida à mão no formulário. Fora da paleta = usa a cor do tema. */
  color: string
  icon?: string | null
  /** Estilo escolhido no formulário. Vazio = sorteado pelo nome. */
  template?: string
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
  template = "",
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

  // Fita, percevejo e tinta seguem o matiz do papel — mas só quando o papel é
  // procedural. Um amarelo escolhido à mão com percevejo rosa ficaria estranho,
  // então nesse caso tudo vira neutro.
  const corTexto = escolhidaAMao ? "#3b3129" : corDoTextoPostit(name, tema)
  const corFita = escolhidaAMao ? "rgba(255,255,255,0.75)" : corDaFita(name, tema)
  const corPercevejo = escolhidaAMao ? "#8a7361" : corDoPercevejo(name, tema)

  const estilo = resolverEstilo(template, name)
  const formato = estilo.formato
  const fonte = FONTES[estilo.fonte]

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        left: positionX,
        top: positionY,
        width: larguraDoPostit(name),
        transform: CSS.Translate.toString(transform),
        // Inclinação por autor, em vez do -2° fixo que deixava todos idênticos.
        rotate: `${inclinacaoDoPostit(name)}deg`,
        zIndex: isDragging ? 50 : 1,
        touchAction: "none",
      }}
      {...listeners}
      {...attributes}
      className={`select-none ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
    >
      {/* Fita e percevejo ficam neste nível, fora do papel: o recorte do papel
          usa clip-path, que cortaria qualquer coisa saindo pela borda de cima. */}
      {formato === "fita" ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -14,
            left: "50%",
            transform: "translateX(-50%) rotate(-3deg)",
            width: 70,
            height: 26,
            background: corFita,
            opacity: 0.65,
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            zIndex: 2,
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: corPercevejo,
            boxShadow: "0 2px 4px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.5)",
            zIndex: 2,
          }}
        />
      )}

      <div
        style={{
          background: fundo,
          backgroundImage: BRILHO,
          boxShadow: SOMBRA,
          clipPath: RECORTE,
          color: corTexto,
          fontFamily: fonte.familia,
        }}
        className="flex min-h-44 flex-col justify-between px-6 py-5 transition-shadow"
      >
        <div>
          {IconComponent && (
            <IconComponent className="mb-2 h-5 w-5" style={{ color: corTexto, opacity: 0.7 }} />
          )}
          <p
            style={{ fontSize: fonte.corpo, lineHeight: 1.28 }}
            className="break-words whitespace-pre-wrap"
          >
            {message}
          </p>
        </div>

        <p
          style={{ fontSize: fonte.assinatura, opacity: 0.75 }}
          className="mt-3 self-end break-words"
        >
          — {name}
        </p>
      </div>
    </div>
  )
}
