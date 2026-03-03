import { db } from "@/lib/db"
import { credentials } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { logAction } from "@/lib/audit"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const result = await db.query.credentials.findMany({
      with: {
        user: true,
      },
      orderBy: (credentials, { desc }) => [desc(credentials.createdAt)],
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching credentials:", error)
    return NextResponse.json({ error: "Erro ao buscar credenciais" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const [newCredential] = await db
      .insert(credentials)
      .values({
        system: body.system,
        url: body.url || null,
        username: body.username,
        password: body.password || null,
        userId: body.userId || null,
      })
      .returning()

    await logAction({
      action: "INSERT",
      tableName: "credentials",
      recordId: newCredential.id,
      newData: newCredential,
    })

    return NextResponse.json(newCredential, { status: 201 })
  } catch (error) {
    console.error("Error creating credential:", error)
    return NextResponse.json({ error: "Erro ao criar credencial" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const [updated] = await db
      .update(credentials)
      .set({
        system: body.system,
        url: body.url || null,
        username: body.username,
        password: body.password || null,
        userId: body.userId || null,
        updatedAt: new Date(),
      })
      .where(eq(credentials.id, body.id))
      .returning()

    await logAction({
      action: "UPDATE",
      tableName: "credentials",
      recordId: updated.id,
      newData: updated,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating credential:", error)
    return NextResponse.json({ error: "Erro ao atualizar credencial" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get("id"))
    await db.delete(credentials).where(eq(credentials.id, id))

    await logAction({
      action: "DELETE",
      tableName: "credentials",
      recordId: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting credential:", error)
    return NextResponse.json({ error: "Erro ao excluir credencial" }, { status: 500 })
  }
}
