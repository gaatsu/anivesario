import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ocultarEventoSeVencido } from "@/lib/eventLifecycle"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params

    const event = await db.event.findFirst({
      where: {
        shareLink,
        status: "ACTIVE",
        deletedAt: null,
      },
      include: {
        postits: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    if (await ocultarEventoSeVencido(event)) {
      return NextResponse.json({ message: "Event expired" }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error("Error fetching event:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
