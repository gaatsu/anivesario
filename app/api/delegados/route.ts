import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const delegates = await db.delegate.findMany({
      where: {
        creatorId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(delegates)
  } catch (error) {
    console.error("Error fetching delegates:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "MASTER_ADMIN") {
      return NextResponse.json(
        { message: "Only master admins can add delegates" },
        { status: 403 }
      )
    }

    const { delegateEmail } = await request.json()

    if (!delegateEmail) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      )
    }

    // Check if delegate already exists
    const existing = await db.delegate.findFirst({
      where: {
        creatorId: session.user.id,
        delegateEmail,
      },
    })

    if (existing) {
      return NextResponse.json(
        { message: "Delegate already added" },
        { status: 409 }
      )
    }

    const delegate = await db.delegate.create({
      data: {
        creatorId: session.user.id,
        delegateEmail,
        status: "PENDING",
      },
    })

    // TODO: Send email invitation

    return NextResponse.json(delegate, { status: 201 })
  } catch (error) {
    console.error("Error creating delegate:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
