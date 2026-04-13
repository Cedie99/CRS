/**
 * Demo seed — creates staff accounts and 30 CIS submissions in various statuses.
 *
 * Run:     npx tsx scripts/seed-demo.ts
 * Re-seed: npx tsx scripts/seed-demo.ts --reset
 *
 * All demo accounts use password: Demo@1234
 */
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";

process.loadEnvFile(".env.local");

const PASS = "Demo@1234";

const DEMO_EMAILS = [
  "manager1@demo.com",
  "manager2@demo.com",
  "agent1@demo.com",
  "agent2@demo.com",
  "agent3@demo.com",
  "agent4@demo.com",
  "agent5@demo.com",
  "finance@demo.com",
  "legal@demo.com",
  "approver@demo.com",
  "support@demo.com",
  "pending1@demo.com",
  "pending2@demo.com",
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAfter(base: Date, h: number): Date {
  return new Date(base.getTime() + h * 3_600_000);
}

async function main() {
  const { db } = await import("../lib/db");
  const { users, cisSubmissions, workflowEvents, notifications } = await import("../lib/db/schema");

  const reset = process.argv.includes("--reset");

  // Idempotency check
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "manager1@demo.com"))
    .limit(1);

  if (existing && !reset) {
    console.log("⚠️  Demo data already seeded.");
    console.log("   Run with --reset to wipe and re-seed.");
    process.exit(0);
  }

  if (existing && reset) {
    console.log("🗑  Wiping existing demo data...");

    const demoUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.email, DEMO_EMAILS));
    const demoUserIds = demoUsers.map((u) => u.id);

    if (demoUserIds.length > 0) {
      const demoSubs = await db
        .select({ id: cisSubmissions.id })
        .from(cisSubmissions)
        .where(inArray(cisSubmissions.agentId, demoUserIds));
      const demoSubIds = demoSubs.map((s) => s.id);

      if (demoSubIds.length > 0) {
        await db.delete(notifications).where(inArray(notifications.cisId, demoSubIds));
        await db.delete(workflowEvents).where(inArray(workflowEvents.cisId, demoSubIds));
        await db.delete(cisSubmissions).where(inArray(cisSubmissions.id, demoSubIds));
      }
      await db.delete(users).where(inArray(users.id, demoUserIds));
    }
    console.log("   Done.\n");
  }

  console.log("🌱 Seeding demo data...\n");

  const hash = await bcrypt.hash(PASS, 10);

  // ── USERS ────────────────────────────────────────────────────────────────────

  const [mgr1] = await db
    .insert(users)
    .values({ fullName: "Maria Santos", email: "manager1@demo.com", passwordHash: hash, role: "sales_manager", isActive: true, createdAt: daysAgo(90) })
    .returning({ id: users.id });

  const [mgr2] = await db
    .insert(users)
    .values({ fullName: "Roberto Cruz", email: "manager2@demo.com", passwordHash: hash, role: "rsr_manager", isActive: true, createdAt: daysAgo(88) })
    .returning({ id: users.id });

  const [ag1] = await db
    .insert(users)
    .values({ fullName: "Juan Dela Cruz", email: "agent1@demo.com", passwordHash: hash, role: "sales_agent", agentCode: "SA-001", agentType: "sales_agent", managerId: mgr1.id, isActive: true, createdAt: daysAgo(85) })
    .returning({ id: users.id });

  const [ag2] = await db
    .insert(users)
    .values({ fullName: "Ana Reyes", email: "agent2@demo.com", passwordHash: hash, role: "sales_agent", agentCode: "SA-002", agentType: "sales_agent", managerId: mgr1.id, isActive: true, createdAt: daysAgo(83) })
    .returning({ id: users.id });

  const [ag3] = await db
    .insert(users)
    .values({ fullName: "Miguel Torres", email: "agent3@demo.com", passwordHash: hash, role: "rsr", agentCode: "RSR-001", agentType: "rsr", managerId: mgr1.id, isActive: true, createdAt: daysAgo(80) })
    .returning({ id: users.id });

  const [ag4] = await db
    .insert(users)
    .values({ fullName: "Grace Flores", email: "agent4@demo.com", passwordHash: hash, role: "sales_agent", agentCode: "SA-003", agentType: "sales_agent", managerId: mgr2.id, isActive: true, createdAt: daysAgo(78) })
    .returning({ id: users.id });

  const [ag5] = await db
    .insert(users)
    .values({ fullName: "Carlo Mendoza", email: "agent5@demo.com", passwordHash: hash, role: "rsr", agentCode: "RSR-002", agentType: "rsr", managerId: mgr2.id, isActive: true, createdAt: daysAgo(75) })
    .returning({ id: users.id });

  const [fin] = await db
    .insert(users)
    .values({ fullName: "Lito Garcia", email: "finance@demo.com", passwordHash: hash, role: "finance_reviewer", isActive: true, createdAt: daysAgo(90) })
    .returning({ id: users.id });

  const [leg] = await db
    .insert(users)
    .values({ fullName: "Carla Villanueva", email: "legal@demo.com", passwordHash: hash, role: "legal_approver", isActive: true, createdAt: daysAgo(90) })
    .returning({ id: users.id });

  const [apv] = await db
    .insert(users)
    .values({ fullName: "Director Ramon Bautista", email: "approver@demo.com", passwordHash: hash, role: "senior_approver", isActive: true, createdAt: daysAgo(90) })
    .returning({ id: users.id });

  const [sup] = await db
    .insert(users)
    .values({ fullName: "Sheila Ramos", email: "support@demo.com", passwordHash: hash, role: "sales_support", isActive: true, createdAt: daysAgo(90) })
    .returning({ id: users.id });

  // Inactive accounts (pending admin activation — shows the banner on /admin)
  await db.insert(users).values([
    { fullName: "Patrick Aquino", email: "pending1@demo.com", passwordHash: hash, role: "sales_agent", isActive: false, createdAt: daysAgo(3) },
    { fullName: "Donna Castillo", email: "pending2@demo.com", passwordHash: hash, role: "sales_agent", isActive: false, createdAt: daysAgo(1) },
  ]);

  console.log("✓ 13 user accounts created");

  // ── CIS SUBMISSIONS ──────────────────────────────────────────────────────────
  //
  // 30 submissions spread across agents and statuses.
  // Each entry: [ agentId, agentCode, agentType, customerType, status, tradeName,
  //               contactPerson, city, businessType, tinNumber, daysAgo, lastActorId, lastAction ]
  //
  // lastAction/lastActorId are used to create a single workflow event
  // representing the most recent step taken (skipped for draft/submitted with no actor).

  type Sub = {
    agentId: string;
    agentCode: string;
    agentType: "sales_agent" | "rsr";
    customerType: "standard" | "fs_petroleum" | "special";
    status: "draft" | "submitted" | "pending_endorsement" | "pending_legal_review" | "pending_finance_review" | "pending_approval" | "approved" | "erp_encoded" | "denied" | "returned";
    tradeName: string;
    contactPerson: string;
    city: string;
    businessType: "corporation" | "partnership" | "sole_proprietor";
    tin: string;
    age: number; // days ago created
    lastActorId?: string;
    lastAction?: "submitted" | "endorsed" | "returned" | "forwarded_to_legal" | "forwarded_to_finance" | "forwarded_to_approver" | "approved" | "denied" | "erp_encoded";
  };

  const subs: Sub[] = [
    // ── Agent 1 (SA-001) ─────────────────────────────────────────────────────
    { agentId: ag1.id, agentCode: "SA-001", agentType: "sales_agent", customerType: "standard",    status: "pending_endorsement",   tradeName: "Dela Cruz Petroleum Corp",  contactPerson: "Pedro Dela Cruz",    city: "Quezon City",    businessType: "corporation",    tin: "123-456-789-000", age: 60, lastActorId: ag1.id,  lastAction: "submitted" },
    { agentId: ag1.id, agentCode: "SA-001", agentType: "sales_agent", customerType: "standard",    status: "pending_endorsement",   tradeName: "Reyes Fuel Station",        contactPerson: "Elena Reyes",        city: "Makati City",    businessType: "sole_proprietor",tin: "234-567-890-001", age: 55, lastActorId: ag1.id,  lastAction: "submitted" },
    { agentId: ag1.id, agentCode: "SA-001", agentType: "sales_agent", customerType: "standard",    status: "pending_finance_review",tradeName: "Santos Energy Trading",      contactPerson: "Jose Santos",        city: "Manila",         businessType: "partnership",    tin: "345-678-901-002", age: 50, lastActorId: mgr1.id, lastAction: "endorsed" },
    { agentId: ag1.id, agentCode: "SA-001", agentType: "sales_agent", customerType: "standard",    status: "pending_approval",      tradeName: "Garcia Oil Supply",          contactPerson: "Rosario Garcia",     city: "Cebu City",      businessType: "corporation",    tin: "456-789-012-003", age: 45, lastActorId: fin.id,  lastAction: "forwarded_to_approver" },
    { agentId: ag1.id, agentCode: "SA-001", agentType: "sales_agent", customerType: "standard",    status: "approved",              tradeName: "Mendoza Petroleum Services", contactPerson: "Carlos Mendoza",     city: "Davao City",     businessType: "corporation",    tin: "567-890-123-004", age: 40, lastActorId: apv.id,  lastAction: "approved" },
    { agentId: ag1.id, agentCode: "SA-001", agentType: "sales_agent", customerType: "standard",    status: "erp_encoded",           tradeName: "Lopez Fuel Distribution",    contactPerson: "Teresa Lopez",       city: "Caloocan City",  businessType: "partnership",    tin: "678-901-234-005", age: 70, lastActorId: sup.id,  lastAction: "erp_encoded" },
    { agentId: ag1.id, agentCode: "SA-001", agentType: "sales_agent", customerType: "standard",    status: "denied",                tradeName: "Torres Gasoline Station",    contactPerson: "Ramon Torres",       city: "Pasig City",     businessType: "sole_proprietor",tin: "789-012-345-006", age: 35, lastActorId: apv.id,  lastAction: "denied" },
    { agentId: ag1.id, agentCode: "SA-001", agentType: "sales_agent", customerType: "standard",    status: "draft",                 tradeName: "Flores Energy Corp",         contactPerson: "Marites Flores",     city: "Taguig City",    businessType: "corporation",    tin: "890-123-456-007", age: 5 },

    // ── Agent 2 (SA-002) ─────────────────────────────────────────────────────
    { agentId: ag2.id, agentCode: "SA-002", agentType: "sales_agent", customerType: "standard",    status: "submitted",             tradeName: "Rivera Petroleum Inc",       contactPerson: "Benjamin Rivera",    city: "Paranaque City", businessType: "corporation",    tin: "901-234-567-008", age: 30, lastActorId: ag2.id,  lastAction: "submitted" },
    { agentId: ag2.id, agentCode: "SA-002", agentType: "sales_agent", customerType: "standard",    status: "pending_endorsement",   tradeName: "Cruz Oil Depot",             contactPerson: "Lydia Cruz",         city: "Las Pinas City", businessType: "partnership",    tin: "012-345-678-009", age: 25, lastActorId: ag2.id,  lastAction: "submitted" },
    { agentId: ag2.id, agentCode: "SA-002", agentType: "sales_agent", customerType: "standard",    status: "pending_endorsement",   tradeName: "Bautista Fuel Supply",       contactPerson: "Ernesto Bautista",   city: "Quezon City",    businessType: "sole_proprietor",tin: "123-456-789-010", age: 22, lastActorId: ag2.id,  lastAction: "submitted" },
    { agentId: ag2.id, agentCode: "SA-002", agentType: "sales_agent", customerType: "fs_petroleum",status: "pending_finance_review",tradeName: "Villanueva Petroleum",       contactPerson: "Nilda Villanueva",   city: "Makati City",    businessType: "corporation",    tin: "234-567-890-011", age: 65, lastActorId: leg.id,  lastAction: "forwarded_to_finance" },
    { agentId: ag2.id, agentCode: "SA-002", agentType: "sales_agent", customerType: "standard",    status: "pending_approval",      tradeName: "Ramos Energy Services",      contactPerson: "Virgilio Ramos",     city: "Manila",         businessType: "partnership",    tin: "345-678-901-012", age: 42, lastActorId: fin.id,  lastAction: "forwarded_to_approver" },
    { agentId: ag2.id, agentCode: "SA-002", agentType: "sales_agent", customerType: "standard",    status: "erp_encoded",           tradeName: "Aquino Fuel Trading",        contactPerson: "Cristina Aquino",    city: "Cebu City",      businessType: "corporation",    tin: "456-789-012-013", age: 80, lastActorId: sup.id,  lastAction: "erp_encoded" },
    { agentId: ag2.id, agentCode: "SA-002", agentType: "sales_agent", customerType: "standard",    status: "returned",              tradeName: "Castillo Petroleum Corp",    contactPerson: "Rodrigo Castillo",   city: "Davao City",     businessType: "corporation",    tin: "567-890-123-014", age: 20, lastActorId: mgr1.id, lastAction: "returned" },

    // ── Agent 3 (RSR-001) ────────────────────────────────────────────────────
    { agentId: ag3.id, agentCode: "RSR-001", agentType: "rsr",        customerType: "standard",    status: "submitted",             tradeName: "Morales Oil Supply",         contactPerson: "Analiza Morales",    city: "Caloocan City",  businessType: "partnership",    tin: "678-901-234-015", age: 15, lastActorId: ag3.id,  lastAction: "submitted" },
    { agentId: ag3.id, agentCode: "RSR-001", agentType: "rsr",        customerType: "fs_petroleum",status: "pending_legal_review",  tradeName: "Concepcion Fuel Station",    contactPerson: "Eduardo Concepcion", city: "Pasig City",     businessType: "sole_proprietor",tin: "789-012-345-016", age: 28, lastActorId: mgr1.id, lastAction: "forwarded_to_legal" },
    { agentId: ag3.id, agentCode: "RSR-001", agentType: "rsr",        customerType: "special",     status: "pending_finance_review",tradeName: "Soriano Energy Corp",        contactPerson: "Felicitas Soriano",  city: "Taguig City",    businessType: "corporation",    tin: "890-123-456-017", age: 58, lastActorId: leg.id,  lastAction: "forwarded_to_finance" },
    { agentId: ag3.id, agentCode: "RSR-001", agentType: "rsr",        customerType: "special",     status: "approved",              tradeName: "Dizon Petroleum Inc",        contactPerson: "Arthur Dizon",       city: "Paranaque City", businessType: "corporation",    tin: "901-234-567-018", age: 75, lastActorId: apv.id,  lastAction: "approved" },
    { agentId: ag3.id, agentCode: "RSR-001", agentType: "rsr",        customerType: "fs_petroleum",status: "denied",                tradeName: "Navarro Oil Trading",        contactPerson: "Gloria Navarro",     city: "Las Pinas City", businessType: "partnership",    tin: "012-345-678-019", age: 33, lastActorId: leg.id,  lastAction: "denied" },

    // ── Agent 4 (SA-003) ─────────────────────────────────────────────────────
    { agentId: ag4.id, agentCode: "SA-003", agentType: "sales_agent", customerType: "standard",    status: "draft",                 tradeName: "Bernardo Fuel Supply",       contactPerson: "Imelda Bernardo",    city: "Quezon City",    businessType: "sole_proprietor",tin: "123-456-789-020", age: 2 },
    { agentId: ag4.id, agentCode: "SA-003", agentType: "sales_agent", customerType: "standard",    status: "submitted",             tradeName: "Salazar Petroleum",          contactPerson: "Renato Salazar",     city: "Makati City",    businessType: "partnership",    tin: "234-567-890-021", age: 10, lastActorId: ag4.id,  lastAction: "submitted" },
    { agentId: ag4.id, agentCode: "SA-003", agentType: "sales_agent", customerType: "standard",    status: "pending_endorsement",   tradeName: "Mercado Energy Corp",        contactPerson: "Florencia Mercado",  city: "Manila",         businessType: "corporation",    tin: "345-678-901-022", age: 18, lastActorId: ag4.id,  lastAction: "submitted" },
    { agentId: ag4.id, agentCode: "SA-003", agentType: "sales_agent", customerType: "standard",    status: "pending_approval",      tradeName: "Tolentino Oil Depot",        contactPerson: "Delfin Tolentino",   city: "Cebu City",      businessType: "corporation",    tin: "456-789-012-023", age: 48, lastActorId: fin.id,  lastAction: "forwarded_to_approver" },
    { agentId: ag4.id, agentCode: "SA-003", agentType: "sales_agent", customerType: "standard",    status: "erp_encoded",           tradeName: "Miranda Fuel Services",      contactPerson: "Estrella Miranda",   city: "Davao City",     businessType: "sole_proprietor",tin: "567-890-123-024", age: 85, lastActorId: sup.id,  lastAction: "erp_encoded" },

    // ── Agent 5 (RSR-002) ────────────────────────────────────────────────────
    { agentId: ag5.id, agentCode: "RSR-002", agentType: "rsr",        customerType: "standard",    status: "draft",                 tradeName: "Galang Petroleum Trading",   contactPerson: "Simeon Galang",      city: "Caloocan City",  businessType: "partnership",    tin: "678-901-234-025", age: 1 },
    { agentId: ag5.id, agentCode: "RSR-002", agentType: "rsr",        customerType: "standard",    status: "pending_endorsement",   tradeName: "Domingo Energy Inc",         contactPerson: "Corazon Domingo",    city: "Pasig City",     businessType: "corporation",    tin: "789-012-345-026", age: 12, lastActorId: ag5.id,  lastAction: "submitted" },
    { agentId: ag5.id, agentCode: "RSR-002", agentType: "rsr",        customerType: "special",     status: "pending_legal_review",  tradeName: "Chua Fuel Station",          contactPerson: "Wilson Chua",        city: "Taguig City",    businessType: "corporation",    tin: "890-123-456-027", age: 20, lastActorId: mgr2.id, lastAction: "forwarded_to_legal" },
    { agentId: ag5.id, agentCode: "RSR-002", agentType: "rsr",        customerType: "standard",    status: "pending_finance_review",tradeName: "Tan Petroleum Corp",         contactPerson: "Margaret Tan",       city: "Paranaque City", businessType: "corporation",    tin: "901-234-567-028", age: 52, lastActorId: mgr2.id, lastAction: "endorsed" },
    { agentId: ag5.id, agentCode: "RSR-002", agentType: "rsr",        customerType: "standard",    status: "approved",              tradeName: "Lim Oil Supply",             contactPerson: "Henry Lim",          city: "Las Pinas City", businessType: "partnership",    tin: "012-345-678-029", age: 62, lastActorId: apv.id,  lastAction: "approved" },
  ];

  // Insert submissions + workflow events
  let eventCount = 0;

  for (const s of subs) {
    const createdAt = daysAgo(s.age);

    const [sub] = await db
      .insert(cisSubmissions)
      .values({
        agentId: s.agentId,
        agentCode: s.agentCode,
        agentType: s.agentType,
        customerType: s.customerType,
        status: s.status,
        tradeName: s.tradeName,
        contactPerson: s.contactPerson,
        contactNumber: `09${Math.floor(100_000_000 + Math.random() * 899_999_999)}`,
        emailAddress: `${s.tradeName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.com`,
        businessAddress: `123 Main Street, ${s.city}`,
        cityMunicipality: s.city,
        businessType: s.businessType,
        tinNumber: s.tin,
        createdAt,
        updatedAt: s.lastAction ? hoursAfter(createdAt, s.age < 10 ? 2 : 6) : createdAt,
      })
      .returning({ id: cisSubmissions.id });

    // One workflow event representing the latest action taken (skipped for draft with no event)
    if (s.lastActorId && s.lastAction) {
      await db.insert(workflowEvents).values({
        cisId: sub.id,
        actorId: s.lastActorId,
        action: s.lastAction,
        createdAt: hoursAfter(createdAt, 2),
      });
      eventCount++;
    }
  }

  console.log(`✓ ${subs.length} CIS submissions created`);
  console.log(`✓ ${eventCount} workflow events created`);

  // ── SUMMARY ──────────────────────────────────────────────────────────────────

  const statusCounts = subs.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\n── Status breakdown ─────────────────────────");
  for (const [status, n] of Object.entries(statusCounts).sort()) {
    console.log(`  ${status.padEnd(28)} ${n}`);
  }

  console.log("\n── Login credentials (all roles) ────────────");
  const accounts = [
    ["Admin",            "admin@oracle.com",   "Admin@1234 (existing)"],
    ["Sales Manager",    "manager1@demo.com",  PASS],
    ["RSR Manager",      "manager2@demo.com",  PASS],
    ["Sales Agent",      "agent1@demo.com",    PASS],
    ["Sales Agent",      "agent2@demo.com",    PASS],
    ["RSR Agent",        "agent3@demo.com",    PASS],
    ["Sales Agent",      "agent4@demo.com",    PASS],
    ["RSR Agent",        "agent5@demo.com",    PASS],
    ["Finance Reviewer", "finance@demo.com",   PASS],
    ["Legal Approver",   "legal@demo.com",     PASS],
    ["Senior Approver",  "approver@demo.com",  PASS],
    ["Sales Support",    "support@demo.com",   PASS],
  ];
  for (const [role, email, pass] of accounts) {
    console.log(`  ${role.padEnd(18)} ${email.padEnd(26)} ${pass}`);
  }
  console.log("\n✅ Demo seed complete.\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
