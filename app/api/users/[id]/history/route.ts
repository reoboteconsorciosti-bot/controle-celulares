import { db } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"
import { eq, or, and, sql, desc } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
    request: NextRequest,
    context: any
) {
    try {
        // Obter o [id] dinâmico da rota
        // As of Next.js 15, route params are accessed via a Promise.
        const { id } = await context.params
        const userId = parseInt(id)

        if (isNaN(userId)) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 })
        }

        const results = await db
            .select()
            .from(auditLogs)
            .where(
                or(
                    // Ações diretas no próprio usuário
                    and(
                        eq(auditLogs.tableName, "users"),
                        eq(auditLogs.recordId, userId)
                    ),
                    // Ações de credenciais vinculadas a este usuário
                    and(
                        eq(auditLogs.tableName, "credentials"),
                        sql`${auditLogs.newData}->>'userId' = ${userId.toString()} OR ${auditLogs.oldData}->>'userId' = ${userId.toString()}`
                    ),
                    // Ações de atribuições vinculadas a este usuário
                    and(
                        eq(auditLogs.tableName, "allocations"),
                        sql`${auditLogs.newData}->>'userId' = ${userId.toString()} OR ${auditLogs.oldData}->>'userId' = ${userId.toString()} OR ${auditLogs.newData}->>'previousUserId' = ${userId.toString()} OR ${auditLogs.oldData}->>'previousUserId' = ${userId.toString()}`
                    )
                )
            )
            .orderBy(desc(auditLogs.createdAt))
            .limit(50) // Limite razoável para o modal

        return NextResponse.json(results)
    } catch (error) {
        console.error("Error fetching user history logs:", error)
        return NextResponse.json({ error: "Erro ao buscar histórico do colaborador" }, { status: 500 })
    }
}
