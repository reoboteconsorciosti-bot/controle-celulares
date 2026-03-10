import "dotenv/config"
import * as xlsx from "xlsx"
import * as path from "path"
import { db } from "../lib/db"
import { users, simCards, assets, allocations, credentials } from "../lib/db/schema"
import { eq, and } from "drizzle-orm"

// Helper to clean and truncate phone numbers
function cleanPhone(phone: any): string | null {
    if (!phone) return null
    let str = phone.toString().trim()
    if (str.includes(" e ")) {
        str = str.split(" e ")[0].trim()
    }
    return str.substring(0, 20)
}

// Helper to clean strings
function cleanString(val: any): string | null {
    if (val === undefined || val === null || val === "") return null
    return val.toString().trim()
}

async function main() {
    console.log("🚀 Iniciando Importação de ADM, TI e SÓCIOS...")

    const filePath = path.join(process.cwd(), "APOIO", "CELULARES E TABLETS - ADMINISTRATIVO TI E SÓCIOS.xlsx")
    const workbook = xlsx.readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 })

    let totalUsersAdded = 0
    let totalUsersUpdated = 0
    let totalSims = 0
    let totalAssets = 0
    let totalCreds = 0
    let errors = 0

    // Mapping based on diagnostic:
    // [0]: Setor/Tipo
    // [2]: Nome
    // [3]: Status
    // [4]: Numero
    // [5]: Email Outlook
    // [6]: Gmail
    // [7]: Senha Google
    // [8]: Senha Outlook

    for (let i = 1; i < data.length; i++) { // Bypassing header Row 0
        const row = data[i]
        if (!row || !row[2]) continue

        const name = cleanString(row[2])
        if (!name || name === "Nome") continue // Avoid double headers

        try {
            const setor = row[0]?.toString().toLowerCase() || ''
            const statusText = row[3]?.toString().trim().toLowerCase()
            const userActive = statusText === 'ativado' || statusText === 'ativo'

            let role = "Administrativo"
            if (setor.includes("ti")) role = "TI"
            else if (setor.includes("sócio")) role = "Sócio"
            else if (setor.includes("supervisor")) role = "Supervisor"
            else if (setor.includes("gerente")) role = "Gerente"

            const email = cleanString(row[5]) || `${name.replace(/\s+/g, '.').toLowerCase()}@reobote.local`

            // 1. User Upsert
            let userResult = await db.select().from(users).where(eq(users.name, name))
            let user = userResult[0]

            if (!user) {
                const inserted = await db.insert(users).values({
                    name: name,
                    email: email,
                    role: role,
                    active: userActive
                }).returning()
                user = inserted[0]
                totalUsersAdded++
            } else {
                await db.update(users).set({
                    email: email,
                    role: role,
                    active: userActive,
                    updatedAt: new Date()
                }).where(eq(users.id, user.id))
                totalUsersUpdated++
            }

            // 2. SIM Cards
            const phone = cleanPhone(row[4])
            let simId = null

            if (phone) {
                let simResult = await db.select().from(simCards).where(eq(simCards.phoneNumber, phone))
                let sim = simResult[0]

                if (!sim) {
                    const insertedSim = await db.insert(simCards).values({
                        phoneNumber: phone,
                        status: userActive ? "active" : "available",
                        planType: "reobote"
                    }).returning()
                    sim = insertedSim[0]
                    totalSims++
                } else {
                    await db.update(simCards).set({
                        status: userActive ? "active" : "available"
                    }).where(eq(simCards.id, sim.id))
                }
                simId = sim.id
            }

            // 3. Allocations (Basic link if active)
            if (userActive && simId) {
                const allocResult = await db.select().from(allocations).where(and(eq(allocations.userId, user.id), eq(allocations.status, "active")))
                if (allocResult.length === 0) {
                    await db.insert(allocations).values({
                        userId: user.id,
                        simCardId: simId,
                        status: "active",
                        deliveryDate: new Date().toISOString().split('T')[0]
                    })
                }
            }

            // 4. Credentials
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

            // Gmail Credential
            await upsertCred("Conta Google / Gmail", cleanString(row[6]), cleanString(row[7]))

            // Webmail Credential
            await upsertCred("Webmail Reobote", email, cleanString(row[8]))

            // Common system placeholders if they exist in the sheet (none found in diag, but following pattern)
            const botPass = cleanString(row[13])
            if (botPass) await upsertCred("BotConversa", email, botPass)

        } catch (err: any) {
            console.error(`❌ Erro na linha ${i + 1} (${name}):`, err.message)
            errors++
        }
    }

    console.log("\n=========================================")
    console.log("🏁 IMPORTAÇÃO DE ADM/TI/SÓCIOS CONCLUÍDA!")
    console.log(`👤 Colaboradores adicionados: ${totalUsersAdded}`)
    console.log(`👤 Colaboradores atualizados: ${totalUsersUpdated}`)
    console.log(`📱 Linhas (Chips): ${totalSims} novas/atualizadas`)
    console.log(`🔐 Credenciais: ${totalCreds} novas/atualizadas`)
    console.log(`⚠️ Erros: ${errors}`)
    console.log("=========================================\n")
}

main().catch(console.error)
