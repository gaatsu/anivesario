"use client"

import { DndContext, type DragEndEvent } from "@dnd-kit/core"
import { useEffect, useState } from "react"
import PostitCard from "./PostitCard"

interface Postit {
  id: string
  name: string
  message: string
  color: string
  icon?: string | null
  positionX: number
  positionY: number
}

interface MuralCanvasProps {
  shareLink: string
  postits: Postit[]
  onPositionsChange: (postits: Postit[]) => void
}

export default function MuralCanvas({ shareLink, postits, onPositionsChange }: MuralCanvasProps) {
  const [localPostits, setLocalPostits] = useState(postits)

  useEffect(() => {
    setLocalPostits(postits)
  }, [postits])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event
    const postitId = active.id as string

    const updated = localPostits.map((p) =>
      p.id === postitId
        ? { ...p, positionX: p.positionX + delta.x, positionY: p.positionY + delta.y }
        : p
    )
    setLocalPostits(updated)
    onPositionsChange(updated)

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
      <div className="relative w-full min-h-[600px] rounded-2xl bg-[url('/cork-texture.png')] bg-cover">
        {localPostits.map((postit) => (
          <PostitCard
            key={postit.id}
            id={postit.id}
            name={postit.name}
            message={postit.message}
            color={postit.color}
            icon={postit.icon}
            positionX={postit.positionX}
            positionY={postit.positionY}
          />
        ))}
      </div>
    </DndContext>
  )
}
