import { db } from "../lib/db"
import { credentials, users } from "../lib/db/schema"
import { eq } from "drizzle-orm"

async function main() {
    const allUsers = await db.select().from(users)
    console.log(`Total users in DB: ${allUsers.length}`)

    const creds = await db.select().from(credentials)
    console.log(`Total creds in DB: ${creds.length}`)

    // Mostrando algumas pra inspecionar
    console.log(creds.slice(0, 5))
    process.exit(0)
}

main().catch(console.error)

// npx tsx scripts/check-creds.ts