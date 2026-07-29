import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/neon-auth"
import { db } from "@/lib/db"

const handlers = auth.handler()

export const { GET, PUT, DELETE, PATCH } = handlers

type RouteContext = { params: Promise<{ path: string[] }> }

// Neon Auth's sign-up endpoint is otherwise open to anyone who knows the
// URL. Gate it here so only the very first admin (bootstrap) or someone
// with a pending Delegate invite can actually create an account.
export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params

  if (path.join("/") === "sign-up/email") {
    const body = await request.clone().json().catch(() => null)
    const email = typeof body?.email === "string" ? body.email : null

    const userCount = await db.user.count()
    const isBootstrap = userCount === 0

    const hasInvite = email
      ? await db.delegate.findFirst({
          where: { delegateEmail: email, status: "PENDING" },
        })
      : null

    if (!isBootstrap && !hasInvite) {
      return NextResponse.json(
        { message: "Cadastro disponível apenas por convite." },
        { status: 403 }
      )
    }
  }

  return handlers.POST(request, context)
}
