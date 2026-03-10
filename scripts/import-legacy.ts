import "dotenv/config"
import * as xlsx from "xlsx"
import { db } from "../lib/db"
import { users, simCards, assets, allocations, credentials } from "../lib/db/schema"
import { eq, and } from "drizzle-orm"
import { deactivateAgendorUser } from "../lib/agendor"

// Helper to clean and truncate phone numbers
function cleanPhone(phone: any): string | null {
    if (!phone) return null
    let str = phone.toString().trim()
    // If it contains " e ", take the first one
    if (str.includes(" e ")) {
        str = str.split(" e ")[0].trim()
    }
    // Remove non-numeric characters for length check if needed, but here we just truncate to 20
    return str.substring(0, 20)
}

// Helper to clean IMEI/Numeric strings
function cleanString(val: any): string | null {
    if (val === undefined || val === null || val === "") return null
    return val.toString().trim()
}

async function main() {
    console.log("🚀 Iniciando Importação Robusta do Google Sheets...")

    const sheetId = "1lwWszDwgtzbABIgqMrKSbwUkItr7aBiEDg0hKH7nskg"
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`

    console.log(`📡 Baixando planilha de ${url}...`)
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
    let errors = 0

    // Mapping based on diagnostic:
    // [0]: TIPO
    // [2]: CONSULTOR
    // [3]: STATUS
    // [4]: CELULAR 1
    // [5]: CELULAR 2
    // [6]: IMEI
    // [7]: IMEI 2 REALME NOTE
    // [8]: email
    // [9]: TABLET
    // [10]: GMAIL
    // [11]: GOOGLE (Pass)
    // [12]: EMAIL (Pass)
    // [13]: BotConversa (Pass)
    // [14]: Agendor (Pass)
    // [15]: Simulador (Pass)

    for (let i = 3; i < data.length; i++) {
        const row = data[i]
        if (!row || row.length < 3) continue

        const consultorName = row[2]?.toString().trim()
        if (!consultorName) continue

        try {
            const tipo = row[0]?.toString().toLowerCase() || ''
            const statusText = row[3]?.toString().trim().toLowerCase()
            const userActive = statusText === 'ativado'

            let role = "Consultor"
            if (tipo.includes("supervisor")) role = "Supervisor"
            else if (tipo.includes("gerente")) role = "Gerente"
            else if (tipo.includes("administrativo") || tipo.includes("matriz") || consultorName.toLowerCase().includes("central")) role = "Administrativo"
            else if (tipo.includes("ti")) role = "TI"

            const email = cleanString(row[8]) || `${consultorName.replace(/\s+/g, '.').toLowerCase()}@reobote.local`

            // User Upsert
            let userResult = await db.select().from(users).where(eq(users.name, consultorName))
            let user = userResult[0]

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
                await db.update(users).set({
                    active: userActive,
                    email: email,
                    role: role,
                    updatedAt: new Date()
                }).where(eq(users.id, user.id))
            }

            // Sync Agendor Deactivation if inactive
            const rolesToDeactivate = ["Consultor", "Supervisor", "Gerente"];
            if (!userActive && email && rolesToDeactivate.includes(role)) {
                await deactivateAgendorUser(email);
            }

            // SIM CARDS
            const phone1 = cleanPhone(row[4])
            const phone2 = cleanPhone(row[5])
            let mainSimCardId = null

            const processSim = async (p: string, plan: "reobote" | "pessoal") => {
                if (!p) return null
                let simResult = await db.select().from(simCards).where(eq(simCards.phoneNumber, p))
                let sim = simResult[0]

                if (!sim) {
                    const insertedSim = await db.insert(simCards).values({
                        phoneNumber: p,
                        status: userActive ? "active" : "available",
                        planType: plan
                    }).returning()
                    sim = insertedSim[0]
                    totalSims++
                } else {
                    await db.update(simCards).set({
                        status: userActive ? "active" : "available",
                        planType: plan
                    }).where(eq(simCards.id, sim.id))
                }
                return sim.id
            }

            if (phone1) mainSimCardId = await processSim(phone1, "reobote")
            if (phone2) await processSim(phone2, "pessoal")

            // ASSETS (Smartphone & Tablet)
            const imei1 = cleanString(row[6])
            const imei2 = cleanString(row[7])
            const tabletImei = cleanString(row[9])
            let mainAssetId = null

            if (imei1 || imei2) {
                const queryImei = imei2 || imei1
                let hwResult = await db.select().from(assets).where(eq(assets.imei2, queryImei!))
                if (hwResult.length === 0 && imei1) {
                    hwResult = await db.select().from(assets).where(eq(assets.imei1, imei1))
                }
                let hw = hwResult[0]

                if (!hw) {
                    const insertedHw = await db.insert(assets).values({
                        type: "smartphone",
                        model: "Realme Note 50",
                        imei1: imei1,
                        imei2: imei2 || imei1,
                        status: userActive ? "in_use" : "available"
                    }).returning()
                    hw = insertedHw[0]
                    totalAssets++
                } else {
                    await db.update(assets).set({
                        status: userActive ? "in_use" : "available",
                        imei1: imei1 || hw.imei1,
                        imei2: imei2 || hw.imei2
                    }).where(eq(assets.id, hw.id))
                }
                mainAssetId = hw.id
            }

            if (tabletImei) {
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
                } else {
                    await db.update(assets).set({ status: userActive ? "in_use" : "available" }).where(eq(assets.id, tab.id))
                }
            }

            // ALLOCATIONS
            if (userActive && (mainSimCardId || mainAssetId)) {
                const allocResult = await db.select().from(allocations).where(and(eq(allocations.userId, user.id), eq(allocations.status, "active")))
                if (allocResult.length === 0) {
                    await db.insert(allocations).values({
                        userId: user.id,
                        assetId: mainAssetId,
                        simCardId: mainSimCardId,
                        status: "active",
                        deliveryDate: new Date().toISOString().split('T')[0]
                    })
                }
            }

            // CREDENTIALS
            const upsertCred = async (system: string, username: string | null, password?: string | null) => {
                if (!username) return;
                const cResult = await db.select().from(credentials).where(and(eq(credentials.userId, user.id), eq(credentials.system, system)))
                if (cResult.length === 0) {
                    await db.insert(credentials).values({
                        userId: user.id,
                        system,
                        username,
                        password: password || null
                    })
                    totalCreds++
                } else {
                    await db.update(credentials).set({
                        username,
                        password: password || cResult[0].password
                    }).where(eq(credentials.id, cResult[0].id))
                }
            }

            await upsertCred("Conta Google / Gmail", cleanString(row[10]), cleanString(row[11]))
            await upsertCred("Webmail Reobote", email, cleanString(row[12]))
            await upsertCred("BotConversa", email, cleanString(row[13]))
            await upsertCred("Agendor", email, cleanString(row[14]))
            await upsertCred("Simulador", email, cleanString(row[15]))

        } catch (err: any) {
            console.error(`❌ Erro na linha ${i + 1} (${consultorName}):`, err)
            errors++
        }
    }

    console.log("\n=========================================")
    console.log("🏁 IMPORTAÇÃO CONCLUÍDA!")
    console.log(`👤 Colaboradores: ${totalUsers} novos/atualizados`)
    console.log(`📱 Linhas (Chips): ${totalSims} novos/atualizados`)
    console.log(`💻 Aparelhos: ${totalAssets} novos/atualizados`)
    console.log(`🔐 Credenciais: ${totalCreds} novas/atualizadas`)
    console.log(`⚠️ Falhas: ${errors}`)
    console.log("=========================================\n")
}

main().catch(console.error)
