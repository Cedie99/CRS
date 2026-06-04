import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables
try { (process as any).loadEnvFile(".env.local"); } catch {}

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function runMigration() {
  try {
    const migrationSQL = readFileSync(join(process.cwd(), "drizzle", "0024_postal_code.sql"), "utf-8");
    
    console.log("Running migration 0024_postal_code.sql...");
    await sql.unsafe(migrationSQL);
    console.log("Migration completed successfully!");
    
    await sql.end();
  } catch (error) {
    console.error("Migration failed:", error);
    await sql.end();
    process.exit(1);
  }
}

runMigration();
