import { db } from "@/lib/db"
import { simCards } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { logAction } from "@/lib/audit"

export async function GET() {
  try {
    const result = await db.query.simCards.findMany({
      with: {
        allocations: {
          with: { user: true },
          where: (allocations, { eq }) => eq(allocations.status, "active"),
          limit: 1,
        }
      },
      orderBy: (simCards, { desc }) => [desc(simCards.createdAt)],
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching sim cards:", error)
    return NextResponse.json({ error: "Erro ao buscar chips" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const [newSimCard] = await db
      .insert(simCards)
      .values({
        phoneNumber: body.phoneNumber,
        iccid: body.iccid || null,
        planType: body.planType || "reobote",
        status: body.status || "available",
        notes: body.notes || null,
      })
      .returning()

    await logAction({
      action: "INSERT",
      tableName: "sim_cards",
      recordId: newSimCard.id,
      newData: newSimCard,
    })

    return NextResponse.json(newSimCard, { status: 201 })
  } catch (error) {
    console.error("Error creating sim card:", error)
    return NextResponse.json({ error: "Erro ao criar chip" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const [updated] = await db
      .update(simCards)
      .set({
        phoneNumber: body.phoneNumber,
        iccid: body.iccid || null,
        planType: body.planType || "reobote",
        status: body.status,
        notes: body.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(simCards.id, body.id))
      .returning()

    await logAction({
      action: "UPDATE",
      tableName: "sim_cards",
      recordId: updated.id,
      newData: updated,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating sim card:", error)
    return NextResponse.json({ error: "Erro ao atualizar chip" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get("id"))

    // Busca os dados antes de deletar para a auditoria
    const simToDelete = await db.query.simCards.findFirst({
      where: eq(simCards.id, id)
    })

    await db.delete(simCards).where(eq(simCards.id, id))

    if (simToDelete) {
      await logAction({
        action: "DELETE",
        tableName: "sim_cards",
        recordId: id,
        oldData: simToDelete,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sim card:", error)
    return NextResponse.json(
      { error: "Erro ao excluir chip. Verifique se nao ha atribuicoes vinculadas." },
      { status: 500 }
    )
  }
}
