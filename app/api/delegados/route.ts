import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const delegates = await db.delegate.findMany({
      where: {
        creatorId: user.id,
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
    const user = await getCurrentUser()

    if (!user || user.role !== "MASTER_ADMIN") {
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
        creatorId: user.id,
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
        creatorId: user.id,
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
