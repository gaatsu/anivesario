import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { deleteEventIfExpired } from "@/lib/eventLifecycle"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareLink: string }> }
) {
  try {
    const { shareLink } = await params
    const { name, message, color, icon, positionX, positionY } = await request.json()

    if (!name || !message) {
      return NextResponse.json(
        { message: "Name and message are required" },
        { status: 400 }
      )
    }

    const event = await db.event.findFirst({
      where: {
        shareLink,
        status: "ACTIVE",
        deletedAt: null,
      },
    })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    if (await deleteEventIfExpired(event)) {
      return NextResponse.json({ message: "Event expired" }, { status: 404 })
    }

    const postit = await db.postit.create({
      data: {
        eventId: event.id,
        name: name.slice(0, 100),
        message: message.slice(0, 500),
        color: color || "#FEF08A",
        icon: icon || null,
        positionX: positionX ?? Math.random() * 600,
        positionY: positionY ?? Math.random() * 400,
      },
    })

    return NextResponse.json(postit, { status: 201 })
  } catch (error) {
    console.error("Error creating postit:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
