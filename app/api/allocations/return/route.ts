import { db } from "@/lib/db"
import { allocations, assets, simCards } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, returnDate, returnNotes, returnCondition } = body

    // Get current allocation to find asset/sim
    const allocation = await db.query.allocations.findFirst({
      where: eq(allocations.id, id),
    })

    if (!allocation) {
      return NextResponse.json({ error: "Atribuicao nao encontrada" }, { status: 404 })
    }

    // Finalize allocation
    const [updated] = await db
      .update(allocations)
      .set({
        status: "returned",
        returnDate: returnDate || new Date().toISOString().split("T")[0],
        returnNotes: returnNotes || null,
        returnCondition: returnCondition || null,
        updatedAt: new Date(),
      })
      .where(eq(allocations.id, id))
      .returning()

    // Free asset back to available
    await db
      .update(assets)
      .set({ status: "available", updatedAt: new Date() })
      .where(eq(assets.id, allocation.assetId))

    // Free sim card if any
    if (allocation.simCardId) {
      await db
        .update(simCards)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(simCards.id, allocation.simCardId))
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error returning allocation:", error)
    return NextResponse.json({ error: "Erro ao finalizar atribuicao" }, { status: 500 })
  }
}
