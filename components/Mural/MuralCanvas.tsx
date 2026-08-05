"use client"

import { DndContext, type DragEndEvent } from "@dnd-kit/core"
import { LayoutGrid } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import PostitCard from "./PostitCard"
import type { Tema } from "@/lib/themes"
import { ACIMA_DE_CELULAR, useMediaQuery } from "@/lib/useMediaQuery"
import { meusRecados } from "@/lib/meus-recados"
import { alturaDaGrade, organizarEmGrade } from "@/lib/arranjo"

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
  onEditar?: (postit: Postit) => void
  onExcluir?: (postit: Postit) => void
  tema: Tema
}

export default function MuralCanvas({
  shareLink,
  postits,
  onPositionsChange,
  readOnly = false,
  onEditar,
  onExcluir,
  tema,
}: MuralCanvasProps) {
  const [localPostits, setLocalPostits] = useState(postits)
  const container = useRef<HTMLDivElement>(null)
  const [reorganizando, setReorganizando] = useState(false)
  // Vazio no servidor e no primeiro render: localStorage não existe lá, e ler
  // durante o render faria o HTML do servidor divergir do cliente.
  const [meus, setMeus] = useState<Set<string>>(() => new Set())

  // No celular os recados viram uma coluna legível e arrastar sai de cena.
  // Não é degradação: posições em pixel vindas de um mural de 600px não cabem
  // numa tela de 390, e arrastar com o dedo num canvas maior que a tela seria
  // briga com a rolagem da página.
  const muralLivre = useMediaQuery(ACIMA_DE_CELULAR)

  useEffect(() => {
    setLocalPostits(postits)
  }, [postits])

  useEffect(() => {
    setMeus(meusRecados(postits.map((p) => p.id)))
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

  // Recoloca todos na grade e salva. Existe porque murais antigos foram
  // criados com posição sorteada e já estão empilhados — e porque depois de
  // muito arrasto manual é bom ter como voltar ao arrumado.
  const reorganizar = async () => {
    if (!shareLink || readOnly) return

    const largura = container.current?.clientWidth
    const arranjo = organizarEmGrade(localPostits, largura)
    const porId = new Map(arranjo.map((p) => [p.id, p]))

    setLocalPostits((atuais) =>
      atuais.map((p) => {
        const novo = porId.get(p.id)
        return novo ? { ...p, positionX: novo.positionX, positionY: novo.positionY } : p
      })
    )

    setReorganizando(true)
    try {
      // Em série, não em paralelo: são até dezenas de PATCHes e disparar todos
      // de uma vez estoura o limite de conexões do navegador.
      for (const p of arranjo) {
        await fetch(`/api/mural/${shareLink}/postits/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positionX: p.positionX, positionY: p.positionY }),
        })
      }
    } catch (error) {
      console.error("Erro ao reorganizar o mural:", error)
    } finally {
      setReorganizando(false)
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {/* Só no mural livre: na coluna do celular não há o que reorganizar. */}
      {muralLivre && !readOnly && shareLink && localPostits.length > 1 && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={reorganizar}
            disabled={reorganizando}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-apoio font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <LayoutGrid className="h-4 w-4" />
            {reorganizando ? "Arrumando..." : "Arrumar no mural"}
          </button>
        </div>
      )}
      <div
        ref={container}
        // Altura conforme a quantidade: com min-h fixo de 600px, a partir do
        // decimo recado a ultima linha da grade ficava cortada por baixo.
        style={muralLivre ? { minHeight: alturaDaGrade(localPostits.length) } : undefined}
        className={`w-full rounded-2xl bg-[url('/cork-texture.png')] bg-cover ${
          muralLivre
            ? "relative"
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
            meu={!readOnly && meus.has(postit.id)}
            onEditar={onEditar && (() => onEditar(postit))}
            onExcluir={onExcluir && (() => onExcluir(postit))}
            tema={tema}
          />
        ))}
      </div>
    </DndContext>
  )
}
