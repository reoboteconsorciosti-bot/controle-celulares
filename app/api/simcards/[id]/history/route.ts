import { db } from "@/lib/db"
import { simCards, allocations } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const id = parseInt(resolvedParams.id)
        if (isNaN(id)) {
            return NextResponse.json({ error: "ID invalido" }, { status: 400 })
        }

        const simCardWithHistory = await db.query.simCards.findFirst({
            where: eq(simCards.id, id),
            with: {
                allocations: {
                    with: {
                        user: true,
                        asset: true,
                    },
                    orderBy: [desc(allocations.createdAt)]
                }
            }
        })

        if (!simCardWithHistory) {
            return NextResponse.json({ error: "Chip nao encontrado" }, { status: 404 })
        }

        return NextResponse.json(simCardWithHistory)
    } catch (error) {
        console.error("Error fetching sim card history:", error)
        return NextResponse.json({ error: "Erro ao buscar historico do chip" }, { status: 500 })
    }
}
