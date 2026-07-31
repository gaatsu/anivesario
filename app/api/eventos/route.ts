import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"
import { db } from "@/lib/db"
import { v4 as uuid } from "uuid"
import { EVENT_LIFETIME_MS } from "@/lib/eventLifecycle"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Lazily purge this user's expired events before listing
    await db.event.deleteMany({
      where: {
        creatorId: user.id,
        createdAt: { lt: new Date(Date.now() - EVENT_LIFETIME_MS) },
      },
    })

    const events = await db.event.findMany({
      where: {
        creatorId: user.id,
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
    const user = await getCurrentUser()

    if (!user) {
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
        revealLink: uuid(),
        creatorId: user.id,
        animations: animations || [],
      },
    })

    const base = process.env.APP_URL ?? new URL(request.url).origin

    return NextResponse.json(
      {
        ...event,
        // Link de coleta: circula entre quem vai deixar recado.
        muralUrl: `${base}/eventos/${event.shareLink}/mural`,
        // Link de revelação: vai para o homenageado.
        revealUrl: `${base}/revelacao/${event.revealLink}`,
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
