import { cookies } from "next/headers"
import { SESSION_COOKIE, SESSION_TTL_MS, signSession, verifySession } from "./auth"

// `cookies()` é assíncrono no Next 16, e `set`/`delete` só funcionam em Route
// Handler ou Server Function — nunca durante o render de um Server Component.
export async function createSession(userId: string): Promise<void> {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function readSessionUserId(): Promise<string | null> {
  const jar = await cookies()
  const raw = jar.get(SESSION_COOKIE)?.value
  return raw ? verifySession(raw) : null
}
