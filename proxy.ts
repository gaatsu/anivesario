import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE, verifySession } from "@/lib/auth"

// O proxy roda em Node.js runtime por padrão no Next 16, então node:crypto (usado
// por verifySession) está disponível aqui.
//
// Isto é só a primeira barreira: quem passar daqui ainda é resolvido contra o
// banco por getCurrentUser(), que é onde a autorização de fato acontece.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (!token || !verifySession(token)) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
