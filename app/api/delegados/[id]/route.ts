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

    const delegate = await db.delegate.findFirst({
      where: {
        id,
        creatorId: user.id,
      },
    })

    if (!delegate) {
      return NextResponse.json(
        { message: "Delegate not found" },
        { status: 404 }
      )
    }

    await db.delegate.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Delegate removed" })
  } catch (error) {
    console.error("Error deleting delegate:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
