import * as xlsx from "xlsx"
import * as path from "path"

async function main() {
    const filePath = path.join(process.cwd(), "APOIO", "CELULARES E TABLETS - ADMINISTRATIVO TI E SÓCIOS.xlsx")
    console.log(`Reading file: ${filePath}`)

    const workbook = xlsx.readFile(filePath)
    const firstSheet = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheet]
    const data = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 })

    console.log(`Sheet: ${firstSheet}`)
    console.log(`Rows: ${data.length}`)

    // Show headers and a few rows
    for (let i = 0; i < Math.min(data.length, 10); i++) {
        console.log(`Row ${i}:`, data[i])
    }
}

main().catch(console.error)
