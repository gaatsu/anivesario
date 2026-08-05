import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ESTILOS } from "@/lib/postit-visual"
import { verificarPostit } from "@/lib/postit-token"

async function acharPostit(shareLink: string, postitId: string) {
  const event = await db.event.findFirst({
    where: { shareLink, status: "ACTIVE", deletedAt: null },
  })
  if (!event) return null

  return db.postit.findFirst({ where: { id: postitId, eventId: event.id } })
}

/**
 * Move, ou edita o conteúdo.
 *
 * A distinção é de propósito: **posição não pede token, conteúdo pede.**
 * Arrastar é arrumar o mural, coisa que qualquer um com o link pode fazer — é
 * como já funcionava. Mudar o texto ou o nome de um recado é reescrever a
 * palavra de outra pessoa, e isso só o autor pode.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string; postitId: string }> }
) {
  try {
    const { shareLink, postitId } = await params
    const postit = await acharPostit(shareLink, postitId)

    if (!postit) {
      return NextResponse.json({ message: "Postit not found" }, { status: 404 })
    }

    const body = await request.json()
    const { positionX, positionY, name, message, color, icon, template, token } = body

    const data: Record<string, unknown> = {}

    if (typeof positionX === "number") data.positionX = positionX
    if (typeof positionY === "number") data.positionY = positionY

    const mudaConteudo =
      name !== undefined ||
      message !== undefined ||
      color !== undefined ||
      icon !== undefined ||
      template !== undefined

    if (mudaConteudo) {
      if (!verificarPostit(postitId, token)) {
        return NextResponse.json(
          { message: "Só quem escreveu este recado pode editá-lo" },
          { status: 403 }
        )
      }

      if (name !== undefined) {
        const limpo = String(name).trim()
        if (!limpo) {
          return NextResponse.json({ message: "O nome não pode ficar vazio" }, { status: 400 })
        }
        data.name = limpo.slice(0, 100)
      }

      if (message !== undefined) {
        const limpo = String(message).trim()
        if (!limpo) {
          return NextResponse.json({ message: "O recado não pode ficar vazio" }, { status: 400 })
        }
        data.message = limpo.slice(0, 500)
      }

      if (color !== undefined) data.color = typeof color === "string" ? color.trim() : ""
      if (icon !== undefined) data.icon = icon || null
      if (template !== undefined) {
        data.template = ESTILOS.some((e) => e.id === template) ? template : ""
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "Nada para atualizar" }, { status: 400 })
    }

    const atualizado = await db.postit.update({ where: { id: postitId }, data })
    return NextResponse.json(atualizado)
  } catch (error) {
    console.error("Error updating postit:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

/** Excluir sempre exige o token: é destrutivo e não tem volta. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string; postitId: string }> }
) {
  try {
    const { shareLink, postitId } = await params
    const postit = await acharPostit(shareLink, postitId)

    if (!postit) {
      return NextResponse.json({ message: "Postit not found" }, { status: 404 })
    }

    // Token pelo cabeçalho, não pelo corpo: DELETE com corpo é aceito pelo
    // Next mas atravessa mal proxies e caches.
    const token = request.headers.get("x-recado-token")

    if (!verificarPostit(postitId, token)) {
      return NextResponse.json(
        { message: "Só quem escreveu este recado pode apagá-lo" },
        { status: 403 }
      )
    }

    await db.postit.delete({ where: { id: postitId } })
    return NextResponse.json({ message: "Recado apagado" })
  } catch (error) {
    console.error("Error deleting postit:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
