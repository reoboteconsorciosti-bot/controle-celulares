import { db } from "@/lib/db"
import { assets } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { logAction } from "@/lib/audit"

export async function GET() {
  try {
    const result = await db.query.assets.findMany({
      with: {
        allocations: {
          with: { user: true },
          where: (allocations, { eq }) => eq(allocations.status, "active"),
          limit: 1,
        }
      },
      orderBy: (assets, { desc }) => [desc(assets.createdAt)],
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching assets:", error)
    return NextResponse.json({ error: "Erro ao buscar ativos" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const [newAsset] = await db
      .insert(assets)
      .values({
        type: body.type,
        model: body.model,
        imei1: body.imei1 || null,
        imei2: body.imei2 || null,
        status: body.status || "available",
        condition: body.condition || "bom",
        isNew: body.isNew || false,
        notes: body.observations || body.notes || null,
      })
      .returning()

    await logAction({
      action: "INSERT",
      tableName: "assets",
      recordId: newAsset.id,
      newData: newAsset,
    })

    return NextResponse.json(newAsset, { status: 201 })
  } catch (error) {
    console.error("Error creating asset:", error)
    return NextResponse.json({ error: "Erro ao criar ativo" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const [updated] = await db
      .update(assets)
      .set({
        type: body.type,
        model: body.model,
        imei1: body.imei1 || null,
        imei2: body.imei2 || null,
        status: body.status,
        condition: body.condition,
        isNew: body.isNew || false,
        notes: body.observations || body.notes || null,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, body.id))
      .returning()

    await logAction({
      action: "UPDATE",
      tableName: "assets",
      recordId: updated.id,
      newData: updated,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating asset:", error)
    return NextResponse.json({ error: "Erro ao atualizar ativo" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get("id"))

    // Busca os dados antes de deletar para a auditoria
    const assetToDelete = await db.query.assets.findFirst({
      where: eq(assets.id, id)
    })

    await db.delete(assets).where(eq(assets.id, id))

    if (assetToDelete) {
      await logAction({
        action: "DELETE",
        tableName: "assets",
        recordId: id,
        oldData: assetToDelete,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting asset:", error)
    return NextResponse.json(
      { error: "Erro ao excluir ativo. Verifique se nao ha atribuicoes vinculadas." },
      { status: 500 }
    )
  }
}
