import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'cis_submissions'
    AND column_name IN ('is_archived', 'petroleum_license_no')
  `;
  console.log(rows.map((r) => r.column_name).join(", ") || "no columns found");
  await sql.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
