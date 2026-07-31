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

    if (!user || user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ message: "Apenas o master admin revoga delegados" }, { status: 403 })
    }

    const delegate = await db.delegate.findFirst({
      where: { id, creatorId: user.id },
    })

    if (!delegate) {
      return NextResponse.json({ message: "Convite não encontrado" }, { status: 404 })
    }

    // Guarda contra o master se auto-remover e deixar o app sem administrador.
    if (delegate.delegateId === user.id) {
      return NextResponse.json(
        { message: "Você não pode revogar o próprio acesso" },
        { status: 400 }
      )
    }

    await db.delegate.update({ where: { id }, data: { status: "REVOKED" } })

    // Se o convite já tinha sido resgatado, marcar REVOKED não bastaria: a conta
    // criada continuaria logando. Remover o usuário é o que de fato tira o
    // acesso — e leva junto os eventos dele (cascade), que de todo modo expiram
    // em 12h.
    if (delegate.delegateId) {
      await db.user.delete({ where: { id: delegate.delegateId } })
    }

    return NextResponse.json({ message: "Convite revogado" })
  } catch (error) {
    console.error("Error revoking delegate:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
