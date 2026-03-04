import { NextResponse } from "next/server"
import * as xlsx from "xlsx"
import { db } from "@/lib/db"
import { users, simCards, assets, allocations, credentials } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    try {
        console.log("Iniciando Importação Inteligente do Google Sheets...")

        const sheetId = "1lwWszDwgtzbABIgqMrKSbwUkItr7aBiEDg0hKH7nskg"
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`

        console.log(`Baixando planilha de ${url}...`)
        const res = await fetch(url)
        const arrayBuffer = await res.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const workbook = xlsx.read(buffer, { type: "buffer" })
        const sheet = workbook.Sheets["Página1"]

        // Ler os dados puros
        const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 })

        let totalUsers = 0
        let totalSims = 0
        let totalAssets = 0
        let totalCreds = 0

        for (let i = 3; i < data.length; i++) {
            const row = data[i]
            if (!row || row.length === 0) continue

            const consultorName = row[2]?.toString().trim()
            const statusText = row[3]?.toString().trim().toLowerCase()

            // CHIP LIVRE:
            if (row[0] === 'CHIPS LIVRES (SEM USO)' || (row[0] && row[0].toString().startsWith('67 9') && !consultorName)) {
                let numeroLivre = (row[0] || '').toString().trim()
                if (numeroLivre.includes(" e ")) numeroLivre = numeroLivre.split(" e ")[0]
                numeroLivre = numeroLivre.substring(0, 20)
                if (numeroLivre.length > 8) {
                    const existingSims = await db.select().from(simCards).where(eq(simCards.phoneNumber, numeroLivre))
                    if (existingSims.length === 0) {
                        await db.insert(simCards).values({
                            phoneNumber: numeroLivre,
                            status: "available",
                            planType: "reobote"
                        })
                        totalSims++
                    }
                }
                continue
            }

            if (consultorName && (statusText === 'ativado' || statusText === 'inativo')) {
                const tipo = row[0]?.toString().toLowerCase() || ''
                let role = "Consultor"
                if (tipo.includes("supervisor") || tipo.includes("gerente")) role = "Supervisor"
                if (tipo.includes("administrativo") || tipo.includes("matriz") || consultorName.toLowerCase().includes("central")) role = "Outros"

                let email = row[8]?.toString().trim() || ''
                if (!email.includes('@')) {
                    email = `${consultorName.replace(/\s+/g, '.').toLowerCase()}@reobote.local`
                }

                const userActive = statusText === 'ativado'

                // User Upsert
                let userResult = await db.select().from(users).where(eq(users.name, consultorName))
                let user = userResult[0]

                // Resolve conflitos de e-mail (unique constraint do bd) p/ Inativos ou E-mails Genéricos duplicados
                let finalEmail = email
                let counter = 1
                while (true) {
                    const existingMail = await db.select().from(users).where(eq(users.email, finalEmail))
                    if (existingMail.length === 0 || (user && existingMail[0].id === user.id)) {
                        break
                    }
                    const parts = email.split('@')
                    finalEmail = `${parts[0]}-${counter}@${parts[1]}`
                    counter++
                }
                email = finalEmail

                if (!user) {
                    const inserted = await db.insert(users).values({
                        name: consultorName,
                        email: email,
                        role: role,
                        active: userActive
                    }).returning()
                    user = inserted[0]
                    totalUsers++
                } else {
                    await db.update(users).set({ active: userActive, email: email, role }).where(eq(users.id, user.id))
                }

                // CELULAR 1
                let cel1 = row[4]?.toString().trim()
                if (cel1 && cel1.includes(" e ")) cel1 = cel1.split(" e ")[0]
                cel1 = cel1?.substring(0, 20)

                let mainSimCardId = null
                if (cel1 && cel1.length > 8) {
                    let simResult = await db.select().from(simCards).where(eq(simCards.phoneNumber, cel1))
                    let sim = simResult[0]

                    if (!sim) {
                        const insertedSim = await db.insert(simCards).values({
                            phoneNumber: cel1,
                            status: userActive ? "active" : "available",
                            planType: "reobote"
                        }).returning()
                        sim = insertedSim[0]
                        totalSims++
                    } else if (userActive) {
                        await db.update(simCards).set({ status: "active" }).where(eq(simCards.id, sim.id))
                    } else {
                        await db.update(simCards).set({ status: "available" }).where(eq(simCards.id, sim.id))
                    }
                    mainSimCardId = sim.id
                }

                // CELULAR 2
                let cel2 = row[5]?.toString().trim()
                if (cel2 && cel2.includes(" e ")) cel2 = cel2.split(" e ")[0]
                cel2 = cel2?.substring(0, 20)

                if (cel2 && cel2.length > 8) {
                    let sim2Result = await db.select().from(simCards).where(eq(simCards.phoneNumber, cel2))
                    if (sim2Result.length === 0) {
                        await db.insert(simCards).values({
                            phoneNumber: cel2,
                            status: userActive ? "active" : "available",
                            planType: "private"
                        })
                        totalSims++
                    } else if (userActive) {
                        await db.update(simCards).set({ status: "active" }).where(eq(simCards.id, sim2Result[0].id))
                    } else {
                        await db.update(simCards).set({ status: "available" }).where(eq(simCards.id, sim2Result[0].id))
                    }
                }

                // SMARTPHONE
                const imei1 = row[6]?.toString().trim().substring(0, 20)
                const imei2 = row[7]?.toString().trim().substring(0, 20)
                let assetId = null

                if (imei2 || imei1) {
                    const queryImei = imei2 || imei1
                    let hwResult = await db.select().from(assets).where(eq(assets.imei2, queryImei))
                    let hw = hwResult[0]

                    if (!hw && imei1) {
                        hwResult = await db.select().from(assets).where(eq(assets.imei1, queryImei))
                        hw = hwResult[0]
                    }

                    if (!hw) {
                        const insertedHw = await db.insert(assets).values({
                            type: "smartphone",
                            model: "Realme Note 50",
                            imei1: imei1 || null,
                            imei2: queryImei,
                            status: userActive ? "in_use" : "available"
                        }).returning()
                        hw = insertedHw[0]
                        totalAssets++
                    } else if (userActive) {
                        await db.update(assets).set({ status: "in_use" }).where(eq(assets.id, hw.id))
                    } else {
                        await db.update(assets).set({ status: "available" }).where(eq(assets.id, hw.id))
                    }
                    assetId = hw.id
                }

                // TABLET
                const tabletImei = row[9]?.toString().trim().substring(0, 20)
                if (tabletImei && tabletImei.length > 5) {
                    let tabResult = await db.select().from(assets).where(eq(assets.imei1, tabletImei))
                    let tab = tabResult[0]

                    if (!tab) {
                        await db.insert(assets).values({
                            type: "tablet",
                            model: "Tablet Samsung/Multi",
                            imei1: tabletImei,
                            status: userActive ? "in_use" : "available"
                        })
                        totalAssets++
                    } else if (userActive) {
                        await db.update(assets).set({ status: "in_use" }).where(eq(assets.id, tab.id))
                    } else {
                        await db.update(assets).set({ status: "available" }).where(eq(assets.id, tab.id))
                    }
                }

                // ALOCAÇÃO
                if (userActive) {
                    if (mainSimCardId || assetId) {
                        const allocResult = await db.select().from(allocations).where(and(eq(allocations.userId, user.id), eq(allocations.status, "active")))
                        if (allocResult.length === 0) {
                            try {
                                await db.insert(allocations).values({
                                    userId: user.id,
                                    assetId: assetId,
                                    simCardId: mainSimCardId,
                                    status: "active",
                                    deliveryDate: new Date().toISOString().split('T')[0]
                                })
                            } catch (e) {
                                // Ignora duplicates raros
                            }
                        }
                    }

                    // CREDENCIAIS
                    // Limpa as credenciais existentes deste usuário para evitar fantasmas ou dados orfãos no cofre persistente
                    await db.delete(credentials).where(eq(credentials.userId, user.id))

                    const createCred = async (system: string, username: string, password?: string) => {
                        if (!username) return;
                        await db.insert(credentials).values({
                            userId: user.id,
                            system,
                            username,
                            password: password || null
                        })
                        totalCreds++
                    }

                    const gmailUser = row[10]?.toString().trim()
                    const gmailPass = row[11]?.toString().trim()
                    if (gmailUser) await createCred("Conta Google / Gmail", gmailUser, gmailPass)

                    const webmailPass = row[12]?.toString().trim()
                    if (email && webmailPass) await createCred("Webmail Reobote", email, webmailPass)

                    const botPass = row[13]?.toString().trim()
                    if (botPass && email) await createCred("BotConversa", email, botPass)

                    const agendorPass = row[14]?.toString().trim()
                    if (agendorPass && email) await createCred("Agendor", email, agendorPass)

                    const simPass = row[15]?.toString().trim()
                    if (simPass && email) await createCred("Simulador", email, simPass)
                }
            }
        }

        return NextResponse.json({
            status: "success",
            message: "Importação Inteligente Executada!",
            details: {
                users: totalUsers,
                simCards: totalSims,
                assets: totalAssets,
                credentials: totalCreds
            }
        })

    } catch (e: any) {
        console.error(e)
        return NextResponse.json({ error: "Erro na importação: " + e.message }, { status: 500 })
    }
}
