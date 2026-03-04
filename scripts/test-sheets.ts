import * as xlsx from "xlsx"

async function main() {
    const sheetId = "1lwWszDwgtzbABIgqMrKSbwUkItr7aBiEDg0hKH7nskg"
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`

    console.log(`Downloading ${url}...`)
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const workbook = xlsx.read(buffer, { type: "buffer" })

    workbook.SheetNames.forEach(sheetName => {
        console.log(`Sheet: ${sheetName}`)
        const sheet = workbook.Sheets[sheetName]
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 })

        console.log(`- Rows: ${data.length}`)
        if (data.length > 2) {
            console.log(`- Header Row 2:`, data[1])
            console.log(`- Header Row 3:`, data[2])
            console.log(`- Sample Row 4:`, data[3])
        }
    })
}

main().catch(console.error)
