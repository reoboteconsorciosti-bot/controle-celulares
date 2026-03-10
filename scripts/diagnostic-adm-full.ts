import * as xlsx from "xlsx"
import * as path from "path"

async function main() {
    const filePath = path.join(process.cwd(), "APOIO", "CELULARES E TABLETS - ADMINISTRATIVO TI E SÓCIOS.xlsx")
    const workbook = xlsx.readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 })

    for (let i = 0; i < Math.min(data.length, 15); i++) {
        const row = data[i]
        if (!row) continue
        console.log(`--- Row ${i} ---`)
        row.forEach((val, idx) => {
            if (val !== undefined && val !== null && val !== "") {
                console.log(`[${idx}]: ${val}`)
            }
        })
    }
}

main().catch(console.error)
