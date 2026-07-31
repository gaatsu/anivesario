import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"
import { db } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const event = await db.event.findFirst({
      where: {
        id,
        creatorId: user.id,
      },
    })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    // Soft delete
    await db.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ message: "Event deleted" })
  } catch (error) {
    console.error("Error deleting event:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Correção de evento já criado. Existe porque, sem ela, um nome digitado errado
 * só se conserta apagando o evento — e os recados que os colegas já deixaram vão
 * junto. `shareLink` e `revealLink` não são editáveis: já estão circulando.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const event = await db.event.findFirst({
      where: { id, creatorId: user.id, deletedAt: null },
    })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    const body = await request.json()
    const data: Record<string, unknown> = {}

    // Só entram no update os campos realmente enviados: um PATCH com apenas
    // `title` não pode zerar a data nem as animações do evento.
    if (body.title !== undefined) {
      const title = String(body.title).trim()
      if (!title) {
        return NextResponse.json(
          { message: "O nome do homenageado não pode ficar vazio" },
          { status: 400 }
        )
      }
      data.title = title
    }

    if (body.description !== undefined) {
      data.description = String(body.description).trim() || null
    }

    if (body.eventDate !== undefined) {
      const eventDate = new Date(body.eventDate)
      if (Number.isNaN(eventDate.getTime())) {
        return NextResponse.json({ message: "Data inválida" }, { status: 400 })
      }
      data.eventDate = eventDate
    }

    if (body.type !== undefined) {
      data.type = String(body.type)
    }

    if (Array.isArray(body.animations)) {
      data.animations = body.animations.map(String)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "Nada para atualizar" }, { status: 400 })
    }

    const atualizado = await db.event.update({ where: { id }, data })

    return NextResponse.json(atualizado)
  } catch (error) {
    console.error("Error updating event:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const event = await db.event.findFirst({
      where: {
        id,
        status: "ACTIVE",
        deletedAt: null,
      },
      include: {
        postits: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error("Error fetching event:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
