import { db } from "@/lib/db"
import { users, allocations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { logAction } from "@/lib/audit"
import { deactivateAgendorUser } from "@/lib/agendor"

export async function GET() {
  try {
    const result = await db.query.users.findMany({
      with: {
        allocations: {
          with: {
            asset: true,
            simCard: true,
            previousUser: true,
          },
          orderBy: (allocations, { desc }) => [desc(allocations.createdAt)],
        },
        credentials: true,
        supervisor: true,
      },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Erro ao buscar colaboradores" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = body.email?.trim().toLowerCase()

    // Validação de unicidade por e-mail (se fornecido)
    if (email) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email)
      })
      if (existing) {
        return NextResponse.json({ error: "Este e-mail já está sendo usado por outro consultor." }, { status: 400 })
      }
    }

    const [newUser] = await db
      .insert(users)
      .values({
        name: body.name,
        location: body.location || null,
        email: email || null,
        phone: body.phone || null,
        role: body.role || "Consultor",
        supervisorId: body.supervisorId || null,
        active: body.active ?? true,
      })
      .returning()

    await logAction({
      action: "INSERT",
      tableName: "users",
      recordId: newUser.id,
      newData: newUser,
    })

    // Auto-create credentials if provided
    try {
      const agendorUsername = email ? email.split('@')[0] : (body.agendorUser ? body.agendorUser.trim() : null);
      if (agendorUsername) {
        await db.insert(require("@/lib/db/schema").credentials).values({
          userId: newUser.id,
          system: "Agendor",
          username: agendorUsername,
        })
      }
      if (body.gmailUser) {
        await db.insert(require("@/lib/db/schema").credentials).values({
          userId: newUser.id,
          system: "Gmail",
          username: body.gmailUser.trim(),
        })
      }
    } catch (credError) {
      console.error("Error auto-creating credentials:", credError)
      // Non-blocking error, user is still created.
    }

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Erro ao criar colaborador" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get("id")) || body.id
    const email = body.email?.trim().toLowerCase()

    if (!id) {
      return NextResponse.json({ error: "ID do consultor não fornecido" }, { status: 400 })
    }

    // Se estiver mudando o e-mail, verifica se já existe em OUTRA conta
    if (email) {
      const existing = await db.query.users.findFirst({
        where: (users, { and, eq, ne }) => and(eq(users.email, email), ne(users.id, id))
      })
      if (existing) {
        return NextResponse.json({ error: "Este e-mail já está sendo usado por outro consultor." }, { status: 400 })
      }
    }

    const [updated] = await db
      .update(users)
      .set({
        name: body.name,
        location: body.location || null,
        email: email || null,
        phone: body.phone || null,
        role: body.role || "Consultor",
        supervisorId: body.supervisorId || null,
        active: body.active,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: "Consultor não encontrado" }, { status: 404 })
    }

    // Efeito Cascata: Se este usuário for desativado, remove ele como supervisor dos seus subordinados e desativa no Agendor.
    if (body.active === false) {
      if (updated.role !== "Consultor") {
        await db.update(users).set({ supervisorId: null }).where(eq(users.supervisorId, id))
      }

      // Sincroniza desativação no Agendor (Usuário da Equipe)
      const rolesToDeactivate = ["Consultor", "Supervisor", "Gerente"];
      if (updated.email && rolesToDeactivate.includes(updated.role)) {
        await deactivateAgendorUser(updated.email);
      }
    }

    await logAction({
      action: "UPDATE",
      tableName: "users",
      recordId: updated.id,
      newData: updated,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Erro ao atualizar colaborador" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get("id"))

    // Busca os dados antes de deletar para a auditoria
    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, id)
    })

    await db.delete(users).where(eq(users.id, id))

    if (userToDelete) {
      await logAction({
        action: "DELETE",
        tableName: "users",
        recordId: id,
        oldData: userToDelete,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Não é possível excluir este colaborador pois ele possui histórico de equipamentos/chips vinculados. Considere inativá-lo em vez de excluí-lo." },
      { status: 400 }
    )
  }
}
