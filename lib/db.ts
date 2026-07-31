import { PrismaClient } from "../generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// A porta 5432 do Neon é inalcançável na rede corporativa (firewall bloqueia
// portas de banco), então não dá para usar o adapter `pg`. Este adapter fala com
// o Neon por WebSocket sobre 443, que passa. Na Vercel funciona igual.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
