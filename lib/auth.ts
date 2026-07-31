import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto"

export const SESSION_COOKIE = "anv_session"
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

const N = 16384
const R = 8
const P = 1
const KEYLEN = 64

function secret(): string {
  const s = process.env.AUTH_SECRET
  // Falhar alto: assinar sessão com segredo vazio deixaria qualquer um forjar login.
  if (!s) throw new Error("AUTH_SECRET não configurado")
  return s
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(plain, salt, KEYLEN, { N, r: R, p: P })
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$")
    if (scheme !== "scrypt") return false

    const expected = Buffer.from(hashB64, "base64")
    if (expected.length !== KEYLEN) return false

    const actual = scryptSync(plain, Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })
    return timingSafeEqual(expected, actual)
  } catch {
    // Hash malformado no banco não deve derrubar o login — só reprovar.
    return false
  }
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url")
}

export function signSession(userId: string, ttlMs: number = SESSION_TTL_MS): string {
  const payload = `${Buffer.from(userId).toString("base64url")}.${Date.now() + ttlMs}`
  return `${payload}.${sign(payload)}`
}

export function verifySession(token: string): string | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [idB64, expStr, mac] = parts

  // Assinatura antes da expiração: um token forjado não deve nem chegar a ter a
  // data lida.
  const expected = Buffer.from(sign(`${idB64}.${expStr}`))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return null

  return Buffer.from(idB64, "base64url").toString("utf8")
}
