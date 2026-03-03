import { db } from "@/lib/db"
import { users, assets, simCards, credentials } from "@/lib/db/schema"
import { ilike, or, desc, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get("q")

        if (!q || q.length < 2) {
            return NextResponse.json({ users: [], assets: [], simCards: [], credentials: [] })
        }

        const searchPattern = `%${q}%`
        // Super-forgiving phone search: match sequence of digits anywhere
        let digitsOnly = q.replace(/\D/g, "")
        if (digitsOnly.startsWith("55") && digitsOnly.length > 2) {
            digitsOnly = digitsOnly.substring(2)
        }

        let phoneSearchPattern = searchPattern;
        if (digitsOnly.length >= 2) {
            phoneSearchPattern = `%${digitsOnly.split('').join('%')}%`
        }

        const [matchedUsers, matchedAssets, matchedSimCards, matchedCredentials] = await Promise.all([
            db.select({ id: users.id, name: users.name, email: users.email })
                .from(users)
                .where(
                    ilike(
                        sql`coalesce(${users.name}, '') || ' ' || coalesce(${users.location}, '') || ' ' || coalesce(${users.email}, '') || ' ' || coalesce(${users.phone}, '') || ' ' || coalesce(${users.role}, '')`,
                        searchPattern
                    )
                )
                .limit(10),

            db.select({ id: assets.id, model: assets.model, type: assets.type, imei1: assets.imei1, imei2: assets.imei2 })
                .from(assets)
                .where(
                    ilike(
                        sql`coalesce(${assets.model}, '') || ' ' || coalesce(${assets.brand}, '') || ' ' || coalesce(${assets.imei1}, '') || ' ' || coalesce(${assets.imei2}, '') || ' ' || coalesce(${assets.patrimony}, '') || ' ' || coalesce(${assets.type}, '') || ' ' || coalesce(${assets.notes}, '')`,
                        searchPattern
                    )
                )
                .limit(10),

            db.select({ id: simCards.id, phoneNumber: simCards.phoneNumber, planType: simCards.planType })
                .from(simCards)
                .where(
                    or(
                        ilike(
                            sql`coalesce(${simCards.phoneNumber}, '') || ' ' || coalesce(${simCards.iccid}, '') || ' ' || coalesce(${simCards.planType}, '') || ' ' || coalesce(${simCards.notes}, '')`,
                            searchPattern
                        ),
                        ilike(
                            sql`coalesce(${simCards.phoneNumber}, '') || ' ' || coalesce(${simCards.iccid}, '') || ' ' || coalesce(${simCards.planType}, '') || ' ' || coalesce(${simCards.notes}, '')`,
                            phoneSearchPattern
                        )
                    )
                )
                .limit(10),

            db.select({ id: credentials.id, system: credentials.system, username: credentials.username })
                .from(credentials)
                .where(
                    ilike(
                        sql`coalesce(${credentials.system}, '') || ' ' || coalesce(${credentials.url}, '') || ' ' || coalesce(${credentials.username}, '')`,
                        searchPattern
                    )
                )
                .limit(10),
        ])

        return NextResponse.json({
            users: matchedUsers,
            assets: matchedAssets,
            simCards: matchedSimCards,
            credentials: matchedCredentials
        })
    } catch (error) {
        console.error("Search API Error:", error)
        return NextResponse.json({ error: "Erro na pesquisa" }, { status: 500 })
    }
}
