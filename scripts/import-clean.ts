import "dotenv/config"
import * as xlsx from "xlsx"
import * as path from "path"
import { db } from "../lib/db"
import { users, simCards, assets, allocations, credentials } from "../lib/db/schema"
import { eq, and } from "drizzle-orm"
import { deactivateAgendorUser } from "../lib/agendor"

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
    console.log("🚀 Iniciando Importação Limpa do Excel APOIO...")

    const filePath = path.join(process.cwd(), "APOIO", "VENDEDORES - CONSULTORES.xlsx")
    const workbook = xlsx.readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 })

    let totalUsers = 0
    let totalSims = 0
    let totalAssets = 0
    let totalCreds = 0
    let errors = 0

    // Mapping:
    // [0]: TIPO
    // [2]: CONSULTOR
    // [3]: STATUS
    // [4]: CELULAR 1
    // [5]: CELULAR 2 (vários ou 'e')
    // [6]: IMEI (Smartphone)
    // [7]: email (Empresa)
    // [8]: TABLET (IMEI)
    // [9]: GMAIL
    // [10]: GOOGLE (Pass)
    // [11]: EMAIL (Pass)
    // [12]: BotConversa (Pass)
    // [13]: Agendor (Pass)
    // [14]: Simulador (Pass)

    for (let i = 3; i < data.length; i++) {
        const row = data[i]
        if (!row || !row[2]) continue // Pula se não tiver nome do consultor

        const consultorName = row[2].toString().trim()

        try {
            const tipo = row[0]?.toString().toLowerCase() || ''
            const statusText = row[3]?.toString().trim().toLowerCase()
            const userActive = statusText === 'ativado'

            let role = "Consultor"
            if (tipo.includes("supervisor")) role = "Supervisor"
            else if (tipo.includes("gerente")) role = "Gerente"
            else if (tipo.includes("administrativo") || tipo.includes("matriz") || consultorName.toLowerCase().includes("central")) role = "Administrativo"
            else if (tipo.includes("ti")) role = "TI"
            else if (tipo.includes("sócio")) role = "Sócio"

            const email = cleanString(row[7]) || `${consultorName.replace(/\s+/g, '.').toLowerCase()}@reobote.local`

            // 1. User Insert
            const [user] = await db.insert(users).values({
                name: consultorName,
                email: email,
                role: role,
                active: userActive
            }).returning()
            totalUsers++

            // Sincroniza Agendor se for inativo e tiver cargo monitorado
            if (!userActive && email && ["Consultor", "Supervisor", "Gerente"].includes(role)) {
                await deactivateAgendorUser(email)
            }

            // 2. SIM Cards
            const phone1 = cleanPhone(row[4])
            const phone2 = cleanPhone(row[5])
            let mainSimCardId = null

            const processSim = async (p: string, plan: "reobote" | "pessoal") => {
                const [sim] = await db.insert(simCards).values({
                    phoneNumber: p,
                    status: userActive ? "active" : "available",
                    planType: plan
                }).returning()
                totalSims++
                return sim.id
            }

            if (phone1) mainSimCardId = await processSim(phone1, "reobote")
            if (phone2) await processSim(phone2, "pessoal")

            // 3. Assets
            const imeiHw = cleanString(row[6])
            const imeiTab = cleanString(row[8])
            let mainAssetId = null

            if (imeiHw) {
                const [hw] = await db.insert(assets).values({
                    type: "smartphone",
                    model: "Realme Note 50",
                    imei1: imeiHw,
                    status: userActive ? "in_use" : "available"
                }).returning()
                totalAssets++
                mainAssetId = hw.id
            }

            if (imeiTab) {
                await db.insert(assets).values({
                    type: "tablet",
                    model: "Tablet Samsung/Multi",
                    imei1: imeiTab,
                    status: userActive ? "in_use" : "available"
                })
                totalAssets++
            }

            // 4. Allocations
            if (userActive && (mainSimCardId || mainAssetId)) {
                await db.insert(allocations).values({
                    userId: user.id,
                    assetId: mainAssetId,
                    simCardId: mainSimCardId,
                    status: "active",
                    deliveryDate: new Date().toISOString().split('T')[0]
                })
            }

            // 5. Credentials
            const addCred = async (system: string, username: string | null, password?: string | null) => {
                if (!username) return;
                await db.insert(credentials).values({
                    userId: user.id,
                    system,
                    username,
                    password: password || null
                })
                totalCreds++
            }

            await addCred("Conta Google / Gmail", cleanString(row[9]), cleanString(row[10]))
            await addCred("Webmail Reobote", email, cleanString(row[11]))
            await addCred("BotConversa", email, cleanString(row[12]))
            await addCred("Agendor", email, cleanString(row[13]))
            await addCred("Simulador", email, cleanString(row[14]))

        } catch (err: any) {
            console.error(`❌ Erro na linha ${i + 1} (${consultorName}):`, err.message)
            errors++
        }
    }

    console.log("\n=========================================")
    console.log("🏁 IMPORTAÇÃO DE DADOS LIMPOS CONCLUÍDA!")
    console.log(`👤 Colaboradores: ${totalUsers}`)
    console.log(`📱 Linhas (Chips): ${totalSims}`)
    console.log(`💻 Aparelhos: ${totalAssets}`)
    console.log(`🔐 Credenciais: ${totalCreds}`)
    console.log(`⚠️ Erros: ${errors}`)
    console.log("=========================================\n")
}

main().catch(console.error)
