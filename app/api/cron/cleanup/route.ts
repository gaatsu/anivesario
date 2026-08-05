import { NextRequest, NextResponse } from "next/server"
import { purgarEventosExpirados } from "@/lib/eventLifecycle"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // Passa pelo helper em vez de deleteMany direto: é aqui que os blobs das
  // fotos são apagados junto, e um deleteMany solto vazaria storage.
  //
  // São duas contagens porque são dois prazos: `ocultados` são os murais que
  // acabaram de sair do ar e ainda dá para resgatar, `apagados` os que já
  // passaram da semana de resgate e sumiram de vez.
  const { ocultados, apagados } = await purgarEventosExpirados()

  return NextResponse.json({ ocultados, apagados })
}
