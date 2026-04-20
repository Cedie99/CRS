/**
 * Seeds all sales agent and sales manager accounts.
 * Run: npx tsx scripts/seed-users.ts
 *
 * Default password for all accounts: Oracle@1234
 * All agents created with role=sales_agent, agentType=sales_agent.
 * Update agent types (rsr) and full names via /admin/users after seeding.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

process.loadEnvFile(".env.local");

const DEFAULT_PASSWORD = "Oracle@1234";

// 32 sales agent codes — names are placeholders; update in /admin/users
const AGENTS: { code: string; name: string }[] = [
  { code: "111502", name: "Agent 111502" },
  { code: "215016", name: "Agent 215016" },
  { code: "109607", name: "Agent 109607" },
  { code: "108605", name: "Agent 108605" },
  { code: "101603", name: "Agent 101603" },
  { code: "118115", name: "Agent 118115" },
  { code: "118111", name: "Agent 118111" },
  { code: "117466", name: "Agent 117466" },
  { code: "118120", name: "Agent 118120" },
  { code: "121017", name: "Agent 121017" },
  { code: "121119", name: "Agent 121119" },
  { code: "121126", name: "Agent 121126" },
  { code: "121127", name: "Agent 121127" },
  { code: "121134", name: "Agent 121134" },
  { code: "121002", name: "Agent 121002" },
  { code: "121128", name: "Agent 121128" },
  { code: "107604", name: "Agent 107604" },
  { code: "121106", name: "Agent 121106" },
  { code: "121033", name: "Agent 121033" },
  { code: "121028", name: "Agent 121028" },
  { code: "121034", name: "Agent 121034" },
  { code: "319150", name: "Agent 319150" },
  { code: "315043", name: "Agent 315043" },
  { code: "121094", name: "Agent 121094" },
  { code: "121191", name: "Agent 121191" },
  { code: "121025", name: "Agent 121025" },
  { code: "121086", name: "Agent 121086" },
  { code: "121139", name: "Agent 121139" },
  { code: "317070", name: "Agent 317070" },
  { code: "121168", name: "Agent 121168" },
  { code: "FS001",  name: "Agent FS001"  },
  { code: "SS001",  name: "Agent SS001"  },
];

// 6 sales managers
const MANAGERS: { fullName: string; email: string }[] = [
  { fullName: "Jan Kevin Siy",       email: "jankevin.siy@oracle.com" },
  { fullName: "Michael Dominic Siy", email: "michaeldominic.siy@oracle.com" },
  { fullName: "Miguel Santos",       email: "miguel.santos@oracle.com" },
  { fullName: "Eric Onnagan",        email: "eric.onnagan@oracle.com" },
  { fullName: "Louie Jay Donato",    email: "louiejay.donato@oracle.com" },
  { fullName: "Joyce Mejarito",      email: "joyce.mejarito@oracle.com" },
];

async function main() {
  const { db } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0;
  let skipped = 0;

  // --- Agents ---
  console.log("\nSeeding agents…");
  for (const agent of AGENTS) {
    const email = `${agent.code.toLowerCase()}@oracle.com`;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      console.log(`  skip  ${email} (already exists)`);
      skipped++;
      continue;
    }

    await db.insert(users).values({
      fullName: agent.name,
      email,
      passwordHash,
      role: "sales_agent",
      agentCode: agent.code,
      agentType: "sales_agent",
      isActive: true,
    });

    console.log(`  ✓     ${email}`);
    created++;
  }

  // --- Managers ---
  console.log("\nSeeding managers…");
  for (const mgr of MANAGERS) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, mgr.email))
      .limit(1);

    if (existing) {
      console.log(`  skip  ${mgr.email} (already exists)`);
      skipped++;
      continue;
    }

    await db.insert(users).values({
      fullName: mgr.fullName,
      email: mgr.email,
      passwordHash,
      role: "sales_manager",
      isActive: true,
    });

    console.log(`  ✓     ${mgr.email}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}  Skipped: ${skipped}`);
  console.log(`Default password: ${DEFAULT_PASSWORD}`);
  console.log(`Update agent names and types at /admin/users.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
