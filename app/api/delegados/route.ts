import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"
import { generateInviteToken, INVITE_TTL_MS } from "@/lib/invites"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ message: "Apenas o master admin gerencia delegados" }, { status: 403 })
    }

    // O token nem é lido do banco: quem gerou o link já o recebeu na resposta do
    // POST, e reexpô-lo numa listagem daria a qualquer sessão vazada acesso aos
    // convites pendentes.
    const delegates = await db.delegate.findMany({
      where: { creatorId: user.id },
      select: {
        id: true,
        label: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        delegateUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const agora = new Date()
    return NextResponse.json(
      delegates.map((d) => ({ ...d, expired: d.status === "PENDING" && d.expiresAt < agora }))
    )
  } catch (error) {
    console.error("Error fetching delegates:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "MASTER_ADMIN") {
      return NextResponse.json({ message: "Apenas o master admin gera convites" }, { status: 403 })
    }

    const { label } = await request.json().catch(() => ({}))
    const token = generateInviteToken()

    const delegate = await db.delegate.create({
      data: {
        token,
        label: typeof label === "string" && label.trim() ? label.trim() : null,
        creatorId: user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    })

    const base = process.env.APP_URL ?? new URL(request.url).origin

    return NextResponse.json(
      {
        id: delegate.id,
        label: delegate.label,
        expiresAt: delegate.expiresAt,
        url: `${base}/auth/convite/${token}`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating delegate invite:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
