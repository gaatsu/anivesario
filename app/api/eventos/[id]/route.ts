import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"
import { db } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const event = await db.event.findFirst({
      where: {
        id,
        creatorId: user.id,
      },
    })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
    }

    // Soft delete
    await db.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ message: "Event deleted" })
  } catch (error) {
    console.error("Error deleting event:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const event = await db.event.findFirst({
      where: {
        id,
        status: "ACTIVE",
        deletedAt: null,
      },
      include: {
        postits: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 })
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
