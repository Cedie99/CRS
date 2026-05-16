/**
 * Seed script — inserts realistic dummy data for load testing and metrics baselining.
 *
 * Run:  npx tsx scripts/seed.ts
 * Wipe: npx tsx scripts/seed.ts --wipe
 *
 * Creates:
 *  - 1 admin, 1 finance_reviewer, 1 legal_approver, 1 senior_approver,
 *    1 sales_support, 1 specialist, 2 sales_managers, 10 sales_agents
 *  - 500 CIS submissions spread across all statuses
 *  - Workflow events and notifications for each submission
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const TRADE_NAMES = [
  "Apex Petroleum", "BlueStar Fuels", "CrestOil Corp", "Delta Lubricants",
  "EagleBlend Co", "FortisChemical", "GreenWave Oils", "HorizonPetro",
  "Ironclad Fuels", "JetStream Oil", "KineticBlend", "LionOil Trading",
  "MegaFuels Inc", "NovaPetro", "OmegaLube", "PrimeBlend PH",
  "QualityFuels", "RapidOil Corp", "SolarFuels Inc", "TitanBlend",
  "UnityPetro", "VanguardOils", "WaveChem Corp", "XcelFuels",
  "YieldOil Co", "ZenithPetro", "AlphaLube", "BetaFuel Systems",
  "CarbonTech PH", "DynaPetro Inc",
];

const CITIES = [
  "Makati City", "Quezon City", "Pasig City", "Taguig City", "Manila",
  "Cebu City", "Davao City", "Cagayan de Oro", "Iloilo City", "Bacolod City",
];

const CUSTOMER_TYPES: schema.NewCisSubmission["customerType"][] = [
  "dealer", "distributor", "private_label", "toll_blend", "end_user",
];

const STATUSES: schema.NewCisSubmission["status"][] = [
  "draft", "submitted", "pending_finance_review", "pending_legal_review",
  "pending_approval", "approved", "pending_erp_encoding", "erp_encoded",
  "denied", "returned",
];

// Weight distribution — more active records than terminal ones
const STATUS_WEIGHTS = [5, 8, 15, 8, 15, 10, 10, 15, 7, 7]; // sums to 100

function weightedStatus(): schema.NewCisSubmission["status"] {
  const total = STATUS_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < STATUSES.length; i++) {
    r -= STATUS_WEIGHTS[i];
    if (r <= 0) return STATUSES[i];
  }
  return STATUSES[STATUSES.length - 1];
}

function fakeDoc() {
  return [{ name: "document.pdf", url: "https://example.com/doc.pdf", size: 102400, type: "application/pdf" }];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function wipe() {
  console.log("Wiping seed data...");
  // Delete in FK order
  await db.delete(schema.notifications).where(eq(schema.notifications.status, "pending"));
  await db.delete(schema.workflowEvents);
  await db.delete(schema.cisSubmissions);
  // Delete only seed users (identified by email pattern)
  await db.delete(schema.users).where(eq(schema.users.mustChangePassword, true));
  console.log("Done.");
}

async function seed() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // ---------------------------------------------------------------------------
  // 1. Staff users
  // ---------------------------------------------------------------------------
  console.log("Creating staff users...");

  const [admin] = await db.insert(schema.users).values({
    fullName: "Admin User",
    email: "seed.admin@crs.test",
    passwordHash,
    role: "admin",
    isActive: true,
    mustChangePassword: true,
  }).returning();

  const [finance] = await db.insert(schema.users).values({
    fullName: "Finance Reviewer",
    email: "seed.finance@crs.test",
    passwordHash,
    role: "finance_reviewer",
    isActive: true,
    mustChangePassword: true,
  }).returning();

  const [legal] = await db.insert(schema.users).values({
    fullName: "Legal Approver",
    email: "seed.legal@crs.test",
    passwordHash,
    role: "legal_approver",
    isActive: true,
    mustChangePassword: true,
  }).returning();

  const [approver] = await db.insert(schema.users).values({
    fullName: "Senior Approver",
    email: "seed.approver@crs.test",
    passwordHash,
    role: "senior_approver",
    isActive: true,
    mustChangePassword: true,
  }).returning();

  const [support] = await db.insert(schema.users).values({
    fullName: "Sales Support",
    email: "seed.support@crs.test",
    passwordHash,
    role: "sales_support",
    isActive: true,
    mustChangePassword: true,
  }).returning();

  const [specialist] = await db.insert(schema.users).values({
    fullName: "ERP Specialist",
    email: "seed.specialist@crs.test",
    passwordHash,
    role: "project_development_specialist",
    isActive: true,
    mustChangePassword: true,
  }).returning();

  const managers = await db.insert(schema.users).values([
    { fullName: "Manager Alpha", email: "seed.manager1@crs.test", passwordHash, role: "sales_manager", isActive: true, mustChangePassword: true },
    { fullName: "Manager Beta",  email: "seed.manager2@crs.test", passwordHash, role: "sales_manager", isActive: true, mustChangePassword: true, isTopManager: true },
  ]).returning();

  const agents = await db.insert(schema.users).values(
    Array.from({ length: 10 }, (_, i) => ({
      fullName: `Seed Agent ${i + 1}`,
      email: `seed.agent${i + 1}@crs.test`,
      passwordHash,
      role: "sales_agent" as const,
      agentCode: `AGT${String(i + 1).padStart(3, "0")}`,
      agentType: "sales_agent" as const,
      managerId: i < 5 ? managers[0].id : managers[1].id,
      isActive: true,
      mustChangePassword: true,
    }))
  ).returning();

  console.log(`Created ${agents.length} agents, ${managers.length} managers, and 6 staff users.`);

  // ---------------------------------------------------------------------------
  // 2. CIS submissions
  // ---------------------------------------------------------------------------
  console.log("Creating 500 CIS submissions...");

  const BATCH = 50;
  const TOTAL = 500;
  let created = 0;

  for (let batch = 0; batch < TOTAL / BATCH; batch++) {
    const rows: schema.NewCisSubmission[] = [];

    for (let i = 0; i < BATCH; i++) {
      const agent = pick(agents);
      const status = weightedStatus();
      const customerType = pick(CUSTOMER_TYPES);
      const tradeName = `${pick(TRADE_NAMES)} ${randomInt(1, 99)}`;
      const daysBack = randomInt(1, 180);

      const s = status as string;
      const isFinanceStatus = ["pending_finance_review", "pending_approval", "approved", "pending_erp_encoding", "erp_encoded", "denied", "returned"].includes(s);
      const isLegalStatus = s === "pending_legal_review";
      const isPostSubmit = s !== "draft";
      const isApproved = ["approved", "pending_erp_encoding", "erp_encoded"].includes(s);
      const isErpDone = s === "erp_encoded";

      rows.push({
        agentId: agent.id,
        agentCode: agent.agentCode ?? "AGT000",
        agentType: "sales_agent",
        customerType: isPostSubmit ? customerType : null,
        status,
        isArchived: status === "denied" && Math.random() > 0.5,

        // Customer fields
        tradeName,
        contactPerson: `Contact ${randomInt(1, 999)}`,
        contactNumber: `09${randomInt(100000000, 999999999)}`,
        emailAddress: `customer${randomInt(1, 9999)}@example.com`,
        businessAddress: `${randomInt(1, 999)} Business St, ${pick(CITIES)}`,
        cityMunicipality: pick(CITIES),
        businessType: pick(["corporation", "partnership", "sole_proprietor"]),
        tinNumber: `${randomInt(100, 999)}-${randomInt(100, 999)}-${randomInt(100, 999)}`,
        corporateName: `${tradeName} Inc.`,
        numberOfEmployees: String(randomInt(5, 500)),
        businessLife: `${randomInt(1, 20)} years`,
        howLongAtAddress: `${randomInt(1, 10)} years`,
        numberOfBranches: String(randomInt(1, 20)),
        paymentTerms: pick(["cash", "30 days", "60 days", "90 days"]),
        salesChannel: pick(["direct", "distributor", "dealer"]),

        owners: [{ name: `Owner ${randomInt(1, 99)}`, nationality: "Filipino", percentage: "100%", contact: "09" + randomInt(100000000, 999999999) }],
        officers: [{ name: `Officer ${randomInt(1, 99)}`, position: "CEO", contact: "09" + randomInt(100000000, 999999999) }],
        tradeReferences: [{ company: "Supplier A", address: "Manila", contact: "02-1234567", years: "3" }],
        bankReferences: [{ bank: "BDO", branch: "Makati", accountType: "Savings", accountNo: `${randomInt(1000000000, 9999999999)}` }],

        // Documents (only for submitted+)
        docValidId: isPostSubmit ? fakeDoc() : null,
        docMayorsPermit: isPostSubmit ? fakeDoc() : null,
        docBirCertificate: isPostSubmit ? fakeDoc() : null,

        // Agent fields (only for finance/legal+ statuses)
        agentAccountSpecialistFirst: isFinanceStatus || isLegalStatus ? "Juan" : null,
        agentAccountSpecialistLast: isFinanceStatus || isLegalStatus ? "Dela Cruz" : null,
        agentSalesSpecialist: isFinanceStatus || isLegalStatus ? "Maria Santos" : null,
        agentSalesManager: isFinanceStatus || isLegalStatus ? pick(managers).fullName : null,

        // Finance fields (for pending_approval+)
        financeEu: isApproved ? String(randomInt(100000, 5000000)) : null,
        financeDl: isApproved ? String(randomInt(100000, 5000000)) : null,
        financeDr: isApproved ? String(randomInt(100000, 5000000)) : null,
        financeCreditLimit: isApproved ? `PHP ${randomInt(100000, 10000000).toLocaleString()}` : null,
        financeCreditTerms: isApproved ? pick(["30", "60", "90"]) : null,
        financePossiblePoints: isApproved ? 100 : null,
        financeApprovedPoints: isApproved ? randomInt(60, 100) : null,
        docSirRestySigned: isApproved ? fakeDoc() : null,

        // Sales support (for erp_encoded)
        salesSupportAccountType: isErpDone ? "Regular" : null,
        salesSupportPriceList1: isErpDone ? "PL-001" : null,
        salesSupportSalesType: isErpDone ? "Wholesale" : null,
        salesSupportVatCode: isErpDone ? "V12" : null,

        // Signature (for submitted+)
        customerSignature: isPostSubmit ? "data:image/png;base64,iVBORw0KGgo=" : null,
        customerSignedAt: isPostSubmit ? daysAgo(daysBack + 1) : null,

        createdAt: daysAgo(daysBack + 2),
        updatedAt: daysAgo(daysBack),
      });
    }

    const inserted = await db.insert(schema.cisSubmissions).values(rows).returning({ id: schema.cisSubmissions.id, status: schema.cisSubmissions.status, agentId: schema.cisSubmissions.agentId });
    created += inserted.length;

    // Workflow events for each inserted submission
    const events: (typeof schema.workflowEvents.$inferInsert)[] = [];
    const notifs: (typeof schema.notifications.$inferInsert)[] = [];

    for (const cis of inserted) {
      const isPostSubmit = cis.status !== "draft";

      if (isPostSubmit) {
        events.push({ cisId: cis.id, actorId: cis.agentId, action: "submitted", createdAt: daysAgo(randomInt(3, 10)) });
      }
      if (["pending_finance_review", "pending_legal_review", "pending_approval", "approved", "pending_erp_encoding", "erp_encoded", "denied", "returned"].includes(cis.status)) {
        events.push({ cisId: cis.id, actorId: cis.agentId, action: "agent_submitted", createdAt: daysAgo(randomInt(2, 8)) });
      }
      if (["pending_approval", "approved", "pending_erp_encoding", "erp_encoded", "denied"].includes(cis.status)) {
        const reviewer = cis.status === "pending_legal_review" ? legal : finance;
        events.push({ cisId: cis.id, actorId: reviewer.id, action: "forwarded_to_approver", createdAt: daysAgo(randomInt(1, 5)) });
      }
      if (["approved", "pending_erp_encoding", "erp_encoded"].includes(cis.status)) {
        events.push({ cisId: cis.id, actorId: approver.id, action: "approved", createdAt: daysAgo(randomInt(1, 4)) });
        notifs.push({ cisId: cis.id, recipientId: cis.agentId, type: "in_app", message: "Your CIS submission has been approved.", isRead: Math.random() > 0.3, status: "sent" });
      }
      if (cis.status === "denied") {
        events.push({ cisId: cis.id, actorId: approver.id, action: "denied", createdAt: daysAgo(randomInt(1, 4)) });
      }
      if (cis.status === "returned") {
        events.push({ cisId: cis.id, actorId: finance.id, action: "returned", createdAt: daysAgo(randomInt(1, 3)) });
        notifs.push({ cisId: cis.id, recipientId: cis.agentId, type: "in_app", message: "Your CIS submission has been returned for revision.", isRead: false, status: "sent" });
      }
      if (["pending_erp_encoding", "erp_encoded"].includes(cis.status)) {
        events.push({ cisId: cis.id, actorId: support.id, action: "sales_support_submitted", createdAt: daysAgo(randomInt(1, 3)) });
      }
      if (cis.status === "erp_encoded") {
        events.push({ cisId: cis.id, actorId: specialist.id, action: "erp_encoded", createdAt: daysAgo(1) });
      }
    }

    if (events.length) await db.insert(schema.workflowEvents).values(events);
    if (notifs.length) await db.insert(schema.notifications).values(notifs);

    process.stdout.write(`\r  ${created}/${TOTAL} created...`);
  }

  console.log(`\nDone. ${TOTAL} CIS submissions created.`);
  console.log("\nSeed user credentials (all roles, password: Password123!):");
  console.log("  Admin:      seed.admin@crs.test");
  console.log("  Finance:    seed.finance@crs.test");
  console.log("  Legal:      seed.legal@crs.test");
  console.log("  Approver:   seed.approver@crs.test");
  console.log("  Support:    seed.support@crs.test");
  console.log("  Specialist: seed.specialist@crs.test");
  console.log("  Manager 1:  seed.manager1@crs.test");
  console.log("  Manager 2:  seed.manager2@crs.test");
  console.log("  Agents:     seed.agent1@crs.test ... seed.agent10@crs.test");
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

async function main() {
  const shouldWipe = process.argv.includes("--wipe");
  if (shouldWipe) {
    await wipe();
  } else {
    await seed();
  }
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
