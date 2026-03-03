import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {


        const { password } = await req.json()
        const adminPassword = process.env.ADMIN_PASSWORD || "genesis26"

        if (password === adminPassword) {
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: "Senha incorreta" }, { status: 403 })
    } catch (error) {
        console.error("Error verifying master password:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
