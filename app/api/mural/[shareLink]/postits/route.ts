import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deleteEventIfExpired } from "@/lib/eventLifecycle"
import { ESTILOS } from "@/lib/postit-visual"
import { assinarPostit } from "@/lib/postit-token"
import { vagaLivre } from "@/lib/arranjo"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params
    // Posição não vem do cliente: é o servidor que enxerga os outros recados e
    // pode garantir que o novo não caia sobre nenhum. Depois de colado, arrastar
    // salva pelo PATCH.
    const { name, message, color, icon, template } = await request.json()

    if (!name || !message) {
      return NextResponse.json(
        { message: "Name and message are required" },
        { status: 400 }
      )
    }

    const event = await db.event.findFirst({
      where: {
        shareLink,
        status: "ACTIVE",
        deletedAt: null,
      },
    })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    if (await deleteEventIfExpired(event)) {
      return NextResponse.json({ message: "Event expired" }, { status: 404 })
    }

    // As posições de verdade, não a contagem: quem apaga o próprio recado abre
    // um buraco no meio e derruba a contagem, e aí o recado seguinte nasceria
    // exatamente sobre um que já estava lá.
    const jaColados = await db.postit.findMany({
      where: { eventId: event.id },
      select: { positionX: true, positionY: true },
    })
    // O tipo do parâmetro é explícito porque `prisma generate` não roda nesta
    // máquina (proxy bloqueia o download), e sem o client gerado o retorno do
    // findMany chega sem tipo — o tsc local acusaria um `any` implícito.
    const vaga = vagaLivre(
      jaColados.map((p: { positionX: number; positionY: number }) => ({
        x: p.positionX,
        y: p.positionY,
      }))
    )

    const postit = await db.postit.create({
      data: {
        eventId: event.id,
        name: name.slice(0, 100),
        message: message.slice(0, 500),
        // Vazio significa "automático": o postit herda a cor do tema do evento,
        // derivada do nome de quem escreveu. Só uma cor escolhida à mão no
        // formulário chega aqui preenchida.
        color: typeof color === "string" ? color.trim() : "",
        icon: icon || null,
        // Mesma sentinela da cor: vazio = automático. Um id fora do registro é
        // descartado aqui, para o banco nunca guardar estilo que não existe.
        template: ESTILOS.some((e) => e.id === template) ? template : "",
        positionX: vaga.x,
        positionY: vaga.y,
      },
    })

    // O token vai junto na resposta e so aqui: e o unico momento em que quem
    // escreveu pode guarda-lo. Editar e excluir dependem dele depois.
    return NextResponse.json(
      { ...postit, token: assinarPostit(postit.id) },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating postit:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
