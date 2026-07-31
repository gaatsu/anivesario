"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface PostitCardProps {
  id: string
  name: string
  message: string
  color: string
  icon?: string | null
  positionX: number
  positionY: number
  /** No link de revelação o mural é só para ver — nada de arrastar. */
  disabled?: boolean
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
}: PostitCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  })

  const IconComponent = icon
    ? ((Icons as unknown as Record<string, LucideIcon>)[icon] ?? null)
    : null

  const style: React.CSSProperties = {
    position: "absolute",
    left: positionX,
    top: positionY,
    backgroundColor: color,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
    touchAction: "none",
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`w-48 min-h-48 p-4 rounded-lg shadow-md select-none hover:shadow-xl transition-shadow rotate-[-2deg] hover:rotate-0 ${
        disabled ? "" : "cursor-grab active:cursor-grabbing"
      }`}
    >
      {IconComponent && (
        <IconComponent className="w-6 h-6 mb-2 text-gray-700" />
      )}
      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words mb-3">
        {message}
      </p>
      <p className="text-xs font-semibold text-gray-600 text-right">
        — {name}
      </p>
    </div>
  )
}
