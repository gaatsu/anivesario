import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/auth"
import { createSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  const { email, password } = await request.json().catch(() => ({}))

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ message: "Dados inválidos" }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  // Mesma resposta para email inexistente e senha errada: não entrega quais
  // emails têm conta.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ message: "Credenciais inválidas" }, { status: 401 })
  }

  await createSession(user.id)
  return NextResponse.json({ ok: true })
}
