import { db } from "@/lib/db"
import { allocations, assets, simCards } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { logAction } from "@/lib/audit"

export async function GET() {
  try {
    const result = await db.query.allocations.findMany({
      with: {
        user: true,
        asset: true,
        simCard: true,
      },
      orderBy: (allocations, { desc }) => [desc(allocations.createdAt)],
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching allocations:", error)
    return NextResponse.json({ error: "Erro ao buscar atribuicoes" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Encontra o usuário anterior que possuía este equipamento (se houver)
    let previousUserId = null;
    if (body.assetId) {
      const pastAllocation = await db.query.allocations.findFirst({
        where: (allocations, { eq, and, ne }) => and(
          eq(allocations.assetId, body.assetId),
          eq(allocations.status, "returned"),
          ne(allocations.userId, body.userId) // ignora se era da própria pessoa
        ),
        orderBy: (allocations, { desc }) => [desc(allocations.createdAt)]
      });

      if (pastAllocation) {
        previousUserId = pastAllocation.userId;
      }
    }

    // Create allocation
    const [newAllocation] = await db
      .insert(allocations)
      .values({
        userId: body.userId,
        previousUserId: previousUserId,
        assetId: body.assetId || null,
        simCardId: body.simCardId || null,
        deliveryDate: body.deliveryDate,
        returnDate: body.isLoan ? body.returnDate : null,
        isLoan: body.isLoan || false,
        accessories: body.accessories || {},
        status: "active",
        deliveryNotes: body.deliveryNotes || null,
      })
      .returning()

    // Update asset status to in_use if asset is provided
    if (body.assetId) {
      await db
        .update(assets)
        .set({ status: "in_use", updatedAt: new Date() })
        .where(eq(assets.id, body.assetId))
    }

    // If sim card selected, update its status to active
    if (body.simCardId) {
      await db
        .update(simCards)
        .set({ status: "in_use", updatedAt: new Date() })
        .where(eq(simCards.id, body.simCardId))
    }

    await logAction({
      action: "INSERT",
      tableName: "allocations",
      recordId: newAllocation.id,
      newData: newAllocation,
    })

    return NextResponse.json(newAllocation, { status: 201 })
  } catch (error) {
    console.error("Error creating allocation:", error)
    return NextResponse.json({ error: "Erro ao criar atribuicao" }, { status: 500 })
  }
}
