import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { auditLogs } from "@/lib/db/schema"
import { desc } from "drizzle-orm"

export async function GET() {
    try {
        const results = await db
            .select()
            .from(auditLogs)
            .orderBy(desc(auditLogs.createdAt))
            .limit(100)

        return NextResponse.json(results)
    } catch (error) {
        console.error("Error fetching audit logs:", error)
        return NextResponse.json({ error: "Erro ao buscar logs de auditoria" }, { status: 500 })
    }
}
