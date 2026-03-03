import { db } from "./db"
import { auditLogs, NewAuditLog } from "./db/schema"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export async function logAction({
    action,
    tableName,
    recordId,
    oldData,
    newData,
}: {
    action: "INSERT" | "UPDATE" | "DELETE"
    tableName: string
    recordId: number
    oldData?: any
    newData?: any
}) {
    try {
        const session = await getServerSession(authOptions) as any

        // Prioridade 1: Colaborador vinculado ao Google (nome da base interna)
        // Prioridade 2: Nome do Google autenticado (sem vínculo interno)
        // Prioridade 3: E-mail da sessão credentials (admin)
        // Prioridade 4: "Sistema" (sem sessão ativa)
        const userId =
            session?.colaboradorName
            || session?.googleName
            || session?.user?.email
            || session?.googleEmail
            || "Sistema"

        const auditLog: NewAuditLog = {
            action,
            tableName,
            recordId,
            oldData,
            newData,
            userId,
        }

        await db.insert(auditLogs).values(auditLog)
    } catch (error) {
        console.error("[Audit Log Error]: Failed to create audit log", error)
        // Não jogamos o erro para cima para não travar a aplicação
    }
}
