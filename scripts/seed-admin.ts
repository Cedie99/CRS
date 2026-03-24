/**
 * Creates the first admin account (or promotes an existing user to admin).
 * Run: npx tsx scripts/seed-admin.ts
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

process.loadEnvFile(".env.local");

const ADMIN_EMAIL = "admin@oracle.com";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME = "System Admin";

async function main() {
  const { db } = await import("../lib/db");
  const { users } = await import("../lib/db/schema");

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ role: "admin", isActive: true })
      .where(eq(users.id, existing.id));
    console.log(`✓ Existing account ${ADMIN_EMAIL} promoted to admin and activated.`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await db.insert(users).values({
      fullName: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
      isActive: true,
    });
    console.log(`✓ Admin account created.`);
  }

  console.log(`\nLogin credentials:`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`\nChange the password after first login.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
