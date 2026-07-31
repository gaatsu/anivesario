import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deleteEventIfExpired, EVENT_LIFETIME_MS } from "@/lib/eventLifecycle"
import { assinarFotos } from "@/lib/fotos"

// Mesma leitura pública do mural, mas endereçada pelo revealLink. Fica separada
// de /api/mural para que o link do homenageado não sirva para escrever recado —
// as rotas de postit continuam só sob /api/mural/[shareLink].
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const event = await db.event.findFirst({
      where: {
        revealLink: token,
        status: "ACTIVE",
        deletedAt: null,
      },
      include: {
        postits: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    if (await deleteEventIfExpired(event)) {
      return NextResponse.json({ message: "Event expired" }, { status: 404 })
    }

    // As URLs valem até o evento expirar, e não um prazo fixo: o mural morre em
    // 12h de qualquer forma, então uma assinatura mais longa não serviria a
    // ninguém, e uma mais curta quebraria as imagens numa aba deixada aberta.
    const photos = await assinarFotos(
      event.photos,
      event.createdAt.getTime() + EVENT_LIFETIME_MS
    )

    return NextResponse.json({ ...event, photos })
  } catch (error) {
    console.error("Error fetching reveal:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
