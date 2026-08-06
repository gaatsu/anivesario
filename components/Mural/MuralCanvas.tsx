"use client"

import { DndContext, type DragEndEvent } from "@dnd-kit/core"
import { useEffect, useRef, useState } from "react"
import PostitCard from "./PostitCard"
import type { Tema } from "@/lib/themes"
import { ACIMA_DE_CELULAR, useMediaQuery } from "@/lib/useMediaQuery"
import { meusRecados } from "@/lib/meus-recados"
import { LARGURA_PADRAO, alturaNecessaria, semSobreposicao } from "@/lib/arranjo"

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
  // Vazio no servidor e no primeiro render: localStorage não existe lá, e ler
  // durante o render faria o HTML do servidor divergir do cliente.
  const [meus, setMeus] = useState<Set<string>>(() => new Set())

  // No celular os recados viram uma coluna legível e arrastar sai de cena.
  // Não é degradação: posições em pixel vindas de um mural de 600px não cabem
  // numa tela de 390, e arrastar com o dedo num canvas maior que a tela seria
  // briga com a rolagem da página.
  const muralLivre = useMediaQuery(ACIMA_DE_CELULAR)

  // Largura real do mural, e não a suposição de 1100px que o servidor usa por
  // não ter como saber o tamanho da tela. Sem medir, numa janela entre 640 e
  // 1100px a última coluna nasce fora do quadro.
  const [largura, setLargura] = useState(LARGURA_PADRAO)

  useEffect(() => {
    const alvo = container.current
    if (!alvo) return
    const observador = new ResizeObserver(([entrada]) => {
      setLargura(entrada.contentRect.width || LARGURA_PADRAO)
    })
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [])

  useEffect(() => {
    // Vale para as duas telas, e não só para a da revelação: os dois links
    // circulam entre pessoas que não montaram o mural e não têm por que
    // arrumá-lo. Ninguém vê pilha em lugar nenhum.
    //
    // É correção de tela: o banco continua guardando o que está lá. Arrastar
    // durante a visita não é desfeito — este efeito só roda quando os recados
    // chegam do servidor.
    setLocalPostits(semSobreposicao(postits, largura))
  }, [postits, largura])

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

  // O botão "Arrumar no mural" saiu daqui. Ele existia para consertar à mão o
  // que agora é consertado sozinho ao desenhar, e ficava visível no link que
  // circula no grupo — dando a qualquer visitante o poder de rearranjar o mural
  // de todo mundo, pelo mesmo motivo que o exportar PDF saiu desta página.

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div
        ref={container}
        // Altura pelo recado mais baixo: com min-h fixo de 600px, a partir do
        // decimo recado a ultima linha ficava cortada por baixo.
        style={muralLivre ? { minHeight: alturaNecessaria(localPostits) } : undefined}
        // `bg-repeat` e não `bg-cover`: a textura é um ladrilho de 192px que
        // fecha nas quatro bordas (ver scripts/gerar-cortica.mjs). Esticado
        // para cobrir um mural de 1400px, cada grânulo viraria uma mancha.
        className={`w-full rounded-2xl bg-[url('/cork-texture.png')] bg-repeat ${
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
