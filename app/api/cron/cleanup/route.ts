import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { EVENT_LIFETIME_MS } from "@/lib/eventLifecycle"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const result = await db.event.deleteMany({
    where: {
      createdAt: { lt: new Date(Date.now() - EVENT_LIFETIME_MS) },
    },
  })

  return NextResponse.json({ deleted: result.count })
}
