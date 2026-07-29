import { auth } from "@/lib/neon-auth"
import { db } from "@/lib/db"

/**
 * Resolves the authenticated Neon Auth session and syncs it into our own
 * User table (role tracking lives here, not in Neon Auth). The first person
 * ever to sign in becomes MASTER_ADMIN; everyone else must already have an
 * ACCEPTED Delegate row for their email to be recognized as ADMIN.
 */
export async function getCurrentUser() {
  const { data: session } = await auth.getSession()
  if (!session?.user) return null

  const existing = await db.user.findUnique({ where: { id: session.user.id } })
  if (existing) {
    if (existing.email !== session.user.email || existing.name !== session.user.name) {
      return db.user.update({
        where: { id: session.user.id },
        data: { email: session.user.email, name: session.user.name },
      })
    }
    return existing
  }

  const isFirstUser = (await db.user.count()) === 0
  if (isFirstUser) {
    return db.user.create({
      data: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: "MASTER_ADMIN",
      },
    })
  }

  const invite = await db.delegate.findFirst({
    where: { delegateEmail: session.user.email, status: { in: ["PENDING", "ACCEPTED"] } },
  })
  if (!invite) return null

  const [user] = await db.$transaction([
    db.user.create({
      data: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: "ADMIN",
      },
    }),
    db.delegate.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", delegateId: session.user.id },
    }),
  ])

  return user
}
