import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function truncateDatabase() {
    console.log("Starting database truncation...");
    try {
        // We use CASCADE to handle foreign key dependencies automatically
        // RESTART IDENTITY resets the sequece (IDs back to 1)
        await db.execute(sql`
      TRUNCATE TABLE 
        users, 
        assets, 
        sim_cards, 
        credentials, 
        allocations, 
        audit_logs 
      RESTART IDENTITY CASCADE;
    `);
        console.log("✅ Database successfully truncated and ID sequences reset.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error truncating database:", error);
        process.exit(1);
    }
}

truncateDatabase();
