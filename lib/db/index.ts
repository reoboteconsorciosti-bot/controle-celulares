import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import * as schema from "./schema"

const { Pool } = pg

console.log("[v0] DATABASE_URL exists:", !!process.env.DATABASE_URL)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 10,
})

export const db = drizzle(pool, { schema })
