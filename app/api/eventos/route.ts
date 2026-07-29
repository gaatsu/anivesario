import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { v4 as uuid } from "uuid"
import { EVENT_LIFETIME_MS } from "@/lib/eventLifecycle"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Lazily purge this user's expired events before listing
    await db.event.deleteMany({
      where: {
        creatorId: session.user.id,
        createdAt: { lt: new Date(Date.now() - EVENT_LIFETIME_MS) },
      },
    })

    const events = await db.event.findMany({
      where: {
        creatorId: session.user.id,
        deletedAt: null,
      },
      include: {
        postits: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error("Error fetching events:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { title, description, eventDate, type, animations } = await request.json()

    if (!title || !eventDate) {
      return NextResponse.json(
        { message: "Title and eventDate are required" },
        { status: 400 }
      )
    }

    const event = await db.event.create({
      data: {
        title,
        description: description || null,
        eventDate: new Date(eventDate),
        type: type || "birthday",
        shareLink: uuid(),
        creatorId: session.user.id,
        animations: animations || [],
      },
    })

    // Generate QR code URL
    const muralUrl = `${process.env.NEXTAUTH_URL}/eventos/${event.shareLink}/mural`

    return NextResponse.json(
      {
        ...event,
        muralUrl,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating event:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
