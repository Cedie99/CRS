/**
 * Deletes all data except the admin account.
 * Run with: npx tsx scripts/reset-data.ts
 */
import postgres from "postgres";

try { (process as any).loadEnvFile(".env.local"); } catch {}

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log("Resetting all data (keeping admin account)…\n");

  // Delete child tables first to respect FK constraints
  const cusEvents = await sql`DELETE FROM cus_events`;
  console.log(`✓ cus_events: ${cusEvents.count} rows deleted`);

  const cusSubmissions = await sql`DELETE FROM cus_submissions`;
  console.log(`✓ cus_submissions: ${cusSubmissions.count} rows deleted`);

  const notifications = await sql`DELETE FROM notifications`;
  console.log(`✓ notifications: ${notifications.count} rows deleted`);

  const workflowEvents = await sql`DELETE FROM workflow_events`;
  console.log(`✓ workflow_events: ${workflowEvents.count} rows deleted`);

  const cisSubmissions = await sql`DELETE FROM cis_submissions`;
  console.log(`✓ cis_submissions: ${cisSubmissions.count} rows deleted`);

  // Delete all users except the admin account
  const deletedUsers = await sql`DELETE FROM users WHERE role != 'admin'`;
  console.log(`✓ users (non-admin): ${deletedUsers.count} rows deleted`);

  // Show remaining admin accounts
  const remaining = await sql`SELECT full_name, email, role FROM users`;
  console.log(`\nRemaining accounts:`);
  for (const u of remaining) {
    console.log(`  [${u.role}] ${u.full_name} — ${u.email}`);
  }

  console.log("\nDone. System is clean.");
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
