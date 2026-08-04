"use client"

import { DndContext, type DragEndEvent } from "@dnd-kit/core"
import { useEffect, useState } from "react"
import PostitCard from "./PostitCard"
import type { Tema } from "@/lib/themes"
import { ACIMA_DE_CELULAR, useMediaQuery } from "@/lib/useMediaQuery"

interface Postit {
  id: string
  name: string
  message: string
  color: string
  icon?: string | null
  template?: string
  positionX: number
  positionY: number
}

interface MuralCanvasProps {
  /** Obrigatório fora do modo somente-leitura: é por ele que a posição é salva. */
  shareLink?: string
  postits: Postit[]
  onPositionsChange?: (postits: Postit[]) => void
  /** Link de revelação: o homenageado vê o mural, mas não reorganiza nada. */
  readOnly?: boolean
  tema: Tema
}

export default function MuralCanvas({
  shareLink,
  postits,
  onPositionsChange,
  readOnly = false,
  tema,
}: MuralCanvasProps) {
  const [localPostits, setLocalPostits] = useState(postits)

  // No celular os recados viram uma coluna legível e arrastar sai de cena.
  // Não é degradação: posições em pixel vindas de um mural de 600px não cabem
  // numa tela de 390, e arrastar com o dedo num canvas maior que a tela seria
  // briga com a rolagem da página.
  const muralLivre = useMediaQuery(ACIMA_DE_CELULAR)

  useEffect(() => {
    setLocalPostits(postits)
  }, [postits])

  const handleDragEnd = async (event: DragEndEvent) => {
    if (readOnly || !shareLink || !muralLivre) return

    const { active, delta } = event
    const postitId = active.id as string

    const updated = localPostits.map((p) =>
      p.id === postitId
        ? { ...p, positionX: p.positionX + delta.x, positionY: p.positionY + delta.y }
        : p
    )
    setLocalPostits(updated)
    onPositionsChange?.(updated)

    const movedPostit = updated.find((p) => p.id === postitId)
    if (movedPostit) {
      try {
        await fetch(`/api/mural/${shareLink}/postits/${postitId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positionX: movedPostit.positionX,
            positionY: movedPostit.positionY,
          }),
        })
      } catch (error) {
        console.error("Error saving postit position:", error)
      }
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        className={`w-full rounded-2xl bg-[url('/cork-texture.png')] bg-cover ${
          muralLivre
            ? "relative min-h-[600px]"
            : "flex flex-col items-center gap-6 px-2 py-6"
        }`}
      >
        {localPostits.map((postit) => (
          <PostitCard
            key={postit.id}
            id={postit.id}
            name={postit.name}
            message={postit.message}
            color={postit.color}
            icon={postit.icon}
            template={postit.template}
            positionX={postit.positionX}
            positionY={postit.positionY}
            disabled={readOnly || !muralLivre}
            livre={muralLivre}
            tema={tema}
          />
        ))}
      </div>
    </DndContext>
  )
}
