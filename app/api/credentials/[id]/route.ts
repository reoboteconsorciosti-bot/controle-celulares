import { db } from "@/lib/db"
import { credentials } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params


        const id = Number(idParam)
        if (isNaN(id)) {
            return NextResponse.json({ error: "ID invalido" }, { status: 400 })
        }

        const result = await db.query.credentials.findFirst({
            where: eq(credentials.id, id),
        })

        if (!result) {
            return NextResponse.json({ error: "Credencial nao encontrada" }, { status: 404 })
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error("Error fetching individual credential:", error)
        return NextResponse.json({ error: "Erro ao buscar credencial" }, { status: 500 })
    }
}
