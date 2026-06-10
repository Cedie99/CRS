/**
 * Adds agent_edit_before_snapshot to cis_submissions.
 * Run: npx tsx scripts/migrate-agent-edit-snapshot.ts
 */
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  await sql`
    ALTER TABLE cis_submissions
      ADD COLUMN IF NOT EXISTS agent_edit_before_snapshot JSONB
  `;

  console.log("Migration complete: agent_edit_before_snapshot");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
