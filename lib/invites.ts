import { randomBytes } from "node:crypto"

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Token de convite de delegado.
 *
 * randomBytes, e não cuid(): este token é a única barreira entre um estranho e
 * uma conta de admin, então precisa ser criptograficamente imprevisível. cuid
 * embute timestamp e contador, o que o torna parcialmente adivinhável.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url")
}
