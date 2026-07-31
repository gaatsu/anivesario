import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import { createSession } from "@/lib/session"

// Inexistente, expirado, já aceito e revogado devolvem a mesma coisa: distinguir
// os casos confirmaria quais tokens existem para quem estiver testando links.
const INVALIDO = { message: "Convite inválido ou expirado" }

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { name, email, password } = await request.json().catch(() => ({}))

    if (
      typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.includes("@") ||
      typeof password !== "string" || password.length < 8
    ) {
      return NextResponse.json(
        { message: "Preencha nome, email e senha (mínimo 8 caracteres)" },
        { status: 400 }
      )
    }

    const invite = await db.delegate.findUnique({ where: { token } })

    if (!invite || invite.status !== "PENDING" || invite.expiresAt < new Date()) {
      return NextResponse.json(INVALIDO, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (await db.user.findUnique({ where: { email: normalizedEmail } })) {
      // O token não é consumido: o convite segue válido para outro email.
      return NextResponse.json({ message: "Este email já tem conta" }, { status: 400 })
    }

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        role: "ADMIN",
      },
    })

    await db.delegate.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", delegateId: user.id },
    })

    await createSession(user.id)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error("Error redeeming invite:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
