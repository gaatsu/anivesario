import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string; postitId: string }> }
) {
  try {
    const { shareLink, postitId } = await params
    const { positionX, positionY } = await request.json()

    const event = await db.event.findFirst({
      where: { shareLink, status: "ACTIVE", deletedAt: null },
    })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    const postit = await db.postit.findFirst({
      where: { id: postitId, eventId: event.id },
    })

    if (!postit) {
      return NextResponse.json({ message: "Postit not found" }, { status: 404 })
    }

    const updated = await db.postit.update({
      where: { id: postitId },
      data: {
        positionX: typeof positionX === "number" ? positionX : postit.positionX,
        positionY: typeof positionY === "number" ? positionY : postit.positionY,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating postit position:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
