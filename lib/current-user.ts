import { db } from "@/lib/db"
import { readSessionUserId } from "@/lib/session"

/**
 * Devolve o usuário da sessão atual, ou null.
 *
 * Diferente da versão anterior, não cria usuário nem promove ninguém: aquilo
 * existia só para contornar o Neon Auth criar contas por fora do nosso banco.
 * Agora contas nascem apenas pelo seed ou pelo resgate de um convite.
 */
export async function getCurrentUser() {
  const userId = await readSessionUserId()
  if (!userId) return null
  return db.user.findUnique({ where: { id: userId } })
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Não autenticado")
  return user
}
