import { NextRequest, NextResponse } from "next/server"
import { purgarEventosExpirados } from "@/lib/eventLifecycle"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // Passa pelo helper em vez de deleteMany direto: é aqui que os blobs das
  // fotos são apagados junto, e um deleteMany solto vazaria storage.
  const deleted = await purgarEventosExpirados()

  return NextResponse.json({ deleted })
}
