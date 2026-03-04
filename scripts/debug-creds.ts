import * as xlsx from "xlsx"

async function debugCreds() {
    const sheetId = "1lwWszDwgtzbABIgqMrKSbwUkItr7aBiEDg0hKH7nskg"
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`

    const res = await fetch(url)
    const buffer = Buffer.from(await res.arrayBuffer())

    const workbook = xlsx.read(buffer, { type: "buffer" })
    const sheet = workbook.Sheets["Página1"]

    const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 })

    let activeUsers = 0
    let credsToGenerate = 0

    for (let i = 3; i < data.length; i++) {
        const row = data[i]
        if (!row || row.length === 0) continue

        const consultorName = row[2]?.toString().trim()
        const statusText = row[3]?.toString().trim().toLowerCase()
        const userActive = statusText === 'ativado'

        if (consultorName && userActive) {
            activeUsers++
            const gmailUser = row[10]?.toString().trim()
            const gmailPass = row[11]?.toString().trim()
            const email = row[8]?.toString().trim() || 'default@reobote.local'

            const webmailPass = row[12]?.toString().trim()
            const botPass = row[13]?.toString().trim()
            const agendorPass = row[14]?.toString().trim()
            const simPass = row[15]?.toString().trim()

            if (gmailUser) credsToGenerate++
            if (email && webmailPass) credsToGenerate++
            if (email && botPass) credsToGenerate++
            if (email && agendorPass) credsToGenerate++
            if (email && simPass) credsToGenerate++

            console.log(`[${consultorName}] GmailUser: ${gmailUser || 'null'}, WebmailPass: ${webmailPass || 'null'}`)
        }
    }
    console.log(`Total active: ${activeUsers}, Creds to Generate: ${credsToGenerate}`)
}

debugCreds().catch(console.error)
