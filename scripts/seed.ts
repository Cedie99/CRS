/**
 * Seed script — inserts realistic dummy data for load testing and metrics baselining.
 *
 * Run:  npx tsx scripts/seed.ts
 * Wipe: npx tsx scripts/seed.ts --wipe
 *
 * Creates:
 *  - 2 admins, 2 finance_reviewers, 2 legal_approvers, 2 senior_approvers,
 *    2 sales_support, 2 specialists, 5 sales_managers, 30 sales_agents, 5 RSR agents
 *  - 2000 CIS submissions spread across all statuses
 *  - Full document sets, workflow events, and notifications per submission
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 3 });
const db = drizzle(client, { schema });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ---------------------------------------------------------------------------
// Data pools
// ---------------------------------------------------------------------------

const TRADE_NAMES = [
  "Apex Petroleum", "BlueStar Fuels", "CrestOil Corp", "Delta Lubricants",
  "EagleBlend Co", "FortisChemical", "GreenWave Oils", "HorizonPetro",
  "Ironclad Fuels", "JetStream Oil", "KineticBlend", "LionOil Trading",
  "MegaFuels Inc", "NovaPetro", "OmegaLube", "PrimeBlend PH",
  "QualityFuels", "RapidOil Corp", "SolarFuels Inc", "TitanBlend",
  "UnityPetro", "VanguardOils", "WaveChem Corp", "XcelFuels",
  "YieldOil Co", "ZenithPetro", "AlphaLube", "BetaFuel Systems",
  "CarbonTech PH", "DynaPetro Inc", "FusionOils", "GlobalPetro",
  "HelixFuels", "InfinityLube", "JadeOil", "KryptonBlend",
  "LuminaFuels", "MomentumOil", "NexusPetro", "OrbitBlend",
  "PinnacleFuels", "QuantumOil", "RadiantPetro", "SummitBlend",
  "TriforceOils", "UltraPetro", "VertexFuels", "WorthyOil",
  "XenonBlend", "YukonPetro",
];

const CITIES = [
  "Makati City", "Quezon City", "Pasig City", "Taguig City", "Manila",
  "Cebu City", "Davao City", "Cagayan de Oro", "Iloilo City", "Bacolod City",
  "Antipolo City", "Zamboanga City", "Valenzuela City", "Las Piñas City",
  "Parañaque City", "Mandaluyong City", "Marikina City", "Muntinlupa City",
  "San Juan City", "Caloocan City",
];

const FIRST_NAMES = [
  "Juan", "Maria", "Jose", "Ana", "Pedro", "Rosa", "Miguel", "Elena",
  "Carlos", "Luz", "Roberto", "Carmen", "Eduardo", "Gloria", "Ramon",
  "Teresita", "Antonio", "Consuelo", "Manuel", "Remedios",
];

const LAST_NAMES = [
  "Dela Cruz", "Santos", "Reyes", "Ramos", "Garcia", "Torres", "Flores",
  "Cruz", "Aquino", "Lopez", "Gonzales", "Diaz", "Bautista", "Hernandez",
  "Mendoza", "Castillo", "Villanueva", "Pascual", "Morales", "Fernandez",
];

const BANKS = ["BDO", "BPI", "Metrobank", "UnionBank", "PNB", "RCBC", "Landbank", "DBP"];
const SUPPLIERS = ["Petrotrade PH", "LubeChem Corp", "FuelSource Inc", "OilDepot PH", "ChemBlend Trading"];
const LINE_OF_BUSINESS = ["retail", "wholesale", "manufacturing", "distribution", "services"];
const BUSINESS_ACTIVITY = ["fuel_distribution", "lubricant_trading", "chemical_blending", "petroleum_retail", "industrial_supply"];
const PAYMENT_TERMS = ["cash", "30 days", "60 days", "90 days", "postdated_check"];
const SALES_CHANNELS = ["direct", "distributor", "dealer", "online", "agent"];

const CUSTOMER_TYPES: schema.NewCisSubmission["customerType"][] = [
  "dealer", "distributor", "private_label", "toll_blend", "end_user",
];

const STATUSES: schema.NewCisSubmission["status"][] = [
  "draft", "submitted", "pending_finance_review", "pending_legal_review",
  "pending_approval", "approved", "pending_erp_encoding", "erp_encoded",
  "denied", "returned",
];

const STATUS_WEIGHTS = [5, 8, 15, 8, 15, 10, 10, 15, 7, 7];

function weightedStatus(): schema.NewCisSubmission["status"] {
  const total = STATUS_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < STATUSES.length; i++) {
    r -= STATUS_WEIGHTS[i];
    if (r <= 0) return STATUSES[i];
  }
  return STATUSES[STATUSES.length - 1];
}

// Realistic Vercel Blob-style URLs with varied file types
const BLOB_BASE = "https://au3gnzwyvatzocar2.public.blob.vercel-storage.com/seed";

function fakeDoc(label: string, ext: "pdf" | "jpg" | "png" = "pdf") {
  const mimeMap = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };
  const id = randomInt(10000, 99999);
  return [{
    name: `${label}-${id}.${ext}`,
    url: `${BLOB_BASE}/${label}-${id}.${ext}`,
    size: randomInt(80000, 4000000),
    type: mimeMap[ext],
  }];
}

function maybeDoc(label: string, chance = 0.85, ext: "pdf" | "jpg" | "png" = "pdf") {
  return Math.random() < chance ? fakeDoc(label, ext) : null;
}

// Full document set for submitted+ submissions
function buildDocs(status: string) {
  const s = status as string;
  const isSubmitted = s !== "draft";
  const isAgentFilled = ["pending_finance_review", "pending_legal_review", "pending_approval",
    "approved", "pending_erp_encoding", "erp_encoded", "denied", "returned"].includes(s);
  const isReviewed = ["pending_approval", "approved", "pending_erp_encoding", "erp_encoded", "denied"].includes(s);
  const isApproved = ["approved", "pending_erp_encoding", "erp_encoded"].includes(s);
  const isErpDone = s === "erp_encoded";

  return {
    // Customer documents
    docValidId:           isSubmitted ? fakeDoc("valid-id", "jpg") : null,
    docMayorsPermit:      isSubmitted ? maybeDoc("mayors-permit") : null,
    docSecDti:            isSubmitted ? maybeDoc("sec-dti") : null,
    docBirCertificate:    isSubmitted ? maybeDoc("bir-cert") : null,
    docLocationMap:       isSubmitted ? maybeDoc("location-map", 0.7, "jpg") : null,
    docFinancialStatement:isSubmitted ? maybeDoc("financial-statement", 0.8) : null,
    docBankStatement:     isSubmitted ? maybeDoc("bank-statement", 0.8) : null,
    docProofOfBilling:    isSubmitted ? maybeDoc("proof-of-billing", 0.75, "jpg") : null,
    docLeaseContract:     isSubmitted ? maybeDoc("lease-contract", 0.6) : null,
    docProofOfOwnership:  isSubmitted ? maybeDoc("proof-of-ownership", 0.5) : null,
    docStorePhoto:        isSubmitted ? maybeDoc("store-photo", 0.9, "jpg") : null,
    docSupplierInvoice:   isSubmitted ? maybeDoc("supplier-invoice", 0.65) : null,
    docSocialMedia:       isSubmitted ? maybeDoc("social-media", 0.4, "png") : null,
    docIsoCertification:  isSubmitted ? maybeDoc("iso-cert", 0.2) : null,
    docHalalCertificate:  isSubmitted ? maybeDoc("halal-cert", 0.15) : null,
    docOther:             isSubmitted && Math.random() < 0.3 ? fakeDoc("other-doc") : null,

    // Agent-uploaded
    docAgentOtherRequirements: isAgentFilled && Math.random() < 0.4 ? fakeDoc("agent-requirements") : null,

    // Finance/legal-uploaded (CFO-signed CIS — required before forwarding)
    docSirRestySigned: isReviewed ? fakeDoc("cfo-signed-cis") : null,

    // Sales support
    docSalesSupportOther: isErpDone && Math.random() < 0.3 ? fakeDoc("sales-support-other") : null,

    // Document review statuses (set per doc when reviewed)
    docReviewStatuses: isReviewed ? {
      docValidId: pick(["approved", "approved", "approved", "rejected"]),
      docMayorsPermit: pick(["approved", "approved", "rejected"]),
      docBirCertificate: "approved",
    } : null,

    // Finance metric points
    financeMetricPoints: isApproved ? {
      annualSales: randomInt(1, 5),
      netIncome: randomInt(1, 5),
      bankBalance: randomInt(1, 5),
      businessLife: randomInt(1, 5),
    } : null,
  };
}

// ---------------------------------------------------------------------------
// Wipe
// ---------------------------------------------------------------------------

async function wipe() {
  console.log("Wiping seed data...");
  // Must delete in FK-safe order: notifications → workflow_events → cis_submissions → users
  await db.delete(schema.notifications);
  await db.delete(schema.workflowEvents);
  await db.delete(schema.cusEvents);
  await db.delete(schema.cusSubmissions);
  await db.delete(schema.ctrEvents);
  await db.delete(schema.ctrSubmissions);
  await db.delete(schema.cisSubmissions);
  await db.delete(schema.users).where(eq(schema.users.mustChangePassword, true));
  console.log("Done.");
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // -------------------------------------------------------------------------
  // 1. Staff users (all roles, multiple per role)
  // -------------------------------------------------------------------------
  console.log("Creating staff users...");

  const staffRows = [
    // Admins
    { fullName: "Admin One",    email: "seed.admin1@crs.test",  role: "admin" as const },
    { fullName: "Admin Two",    email: "seed.admin2@crs.test",  role: "admin" as const },
    // Finance reviewers
    { fullName: "Finance One",  email: "seed.finance1@crs.test", role: "finance_reviewer" as const },
    { fullName: "Finance Two",  email: "seed.finance2@crs.test", role: "finance_reviewer" as const },
    // Legal approvers
    { fullName: "Legal One",    email: "seed.legal1@crs.test",  role: "legal_approver" as const },
    { fullName: "Legal Two",    email: "seed.legal2@crs.test",  role: "legal_approver" as const },
    // Senior approvers
    { fullName: "Approver One", email: "seed.approver1@crs.test", role: "senior_approver" as const },
    { fullName: "Approver Two", email: "seed.approver2@crs.test", role: "senior_approver" as const },
    // Sales support
    { fullName: "Support One",  email: "seed.support1@crs.test", role: "sales_support" as const },
    { fullName: "Support Two",  email: "seed.support2@crs.test", role: "sales_support" as const },
    // Specialists
    { fullName: "Specialist One", email: "seed.specialist1@crs.test", role: "project_development_specialist" as const },
    { fullName: "Specialist Two", email: "seed.specialist2@crs.test", role: "project_development_specialist" as const },
  ];

  const staff = await db.insert(schema.users).values(
    staffRows.map(u => ({ ...u, passwordHash, isActive: true, mustChangePassword: true }))
  ).returning();

  const admins      = staff.filter(u => u.role === "admin");
  const finances    = staff.filter(u => u.role === "finance_reviewer");
  const legals      = staff.filter(u => u.role === "legal_approver");
  const approvers   = staff.filter(u => u.role === "senior_approver");
  const supports    = staff.filter(u => u.role === "sales_support");
  const specialists = staff.filter(u => u.role === "project_development_specialist");

  // 5 managers
  const managers = await db.insert(schema.users).values(
    Array.from({ length: 5 }, (_, i) => ({
      fullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} (Manager)`,
      email: `seed.manager${i + 1}@crs.test`,
      passwordHash,
      role: "sales_manager" as const,
      isActive: true,
      mustChangePassword: true,
      isTopManager: i === 0, // first manager is top manager
    }))
  ).returning();

  // 30 sales_agents
  const salesAgents = await db.insert(schema.users).values(
    Array.from({ length: 30 }, (_, i) => ({
      fullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      email: `seed.agent${i + 1}@crs.test`,
      passwordHash,
      role: "sales_agent" as const,
      agentCode: `AGT${String(i + 1).padStart(3, "0")}`,
      agentType: "sales_agent" as const,
      managerId: managers[i % managers.length].id,
      isActive: true,
      mustChangePassword: true,
    }))
  ).returning();

  // 5 RSR agents
  const rsrAgents = await db.insert(schema.users).values(
    Array.from({ length: 5 }, (_, i) => ({
      fullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} (RSR)`,
      email: `seed.rsr${i + 1}@crs.test`,
      passwordHash,
      role: "rsr" as const,
      agentCode: `RSR${String(i + 1).padStart(3, "0")}`,
      agentType: "rsr" as const,
      managerId: managers[i % managers.length].id,
      isActive: true,
      mustChangePassword: true,
    }))
  ).returning();

  const allAgents = [...salesAgents, ...rsrAgents];

  console.log(`Created ${staff.length} staff, ${managers.length} managers, ${salesAgents.length} sales agents, ${rsrAgents.length} RSR agents.`);

  // -------------------------------------------------------------------------
  // 2. CIS submissions — 2000 total in batches of 100
  // -------------------------------------------------------------------------
  const TOTAL = 2000;
  const BATCH = 100;
  let created = 0;

  console.log(`Creating ${TOTAL} CIS submissions...`);

  for (let batch = 0; batch < TOTAL / BATCH; batch++) {
    const rows: schema.NewCisSubmission[] = [];

    for (let i = 0; i < BATCH; i++) {
      const agent = pick(allAgents);
      const status = weightedStatus();
      const customerType = pick(CUSTOMER_TYPES);
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const tradeName = `${pick(TRADE_NAMES)} ${randomInt(1, 99)}`;
      const city = pick(CITIES);
      const daysBack = randomInt(1, 365);

      const s = status as string;
      const isAgentFilled = ["pending_finance_review", "pending_legal_review", "pending_approval",
        "approved", "pending_erp_encoding", "erp_encoded", "denied", "returned"].includes(s);
      const isPostSubmit = s !== "draft";
      const isApproved = ["approved", "pending_erp_encoding", "erp_encoded"].includes(s);
      const isErpDone = s === "erp_encoded";
      const isLegalCustomer = customerType === "dealer";

      const docs = buildDocs(s);

      rows.push({
        agentId: agent.id,
        agentCode: agent.agentCode ?? "AGT000",
        agentType: agent.agentType ?? "sales_agent",
        customerType: isPostSubmit ? customerType : null,
        status,
        isArchived: s === "denied" && Math.random() > 0.5,
        directFill: Math.random() < 0.15,

        // Customer info
        tradeName,
        corporateName: `${tradeName} ${pick(["Inc.", "Corp.", "Co.", "Trading"])}`,
        contactPerson: `${firstName} ${lastName}`,
        contactNumber: `09${randomInt(100000000, 999999999)}`,
        telephoneNumber: `02-${randomInt(10000000, 99999999)}`,
        emailAddress: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(" ", "")}${randomInt(1, 99)}@${pick(["gmail.com", "yahoo.com", "outlook.com", "company.ph"])}`,
        businessAddress: `${randomInt(1, 999)} ${pick(["Rizal Ave", "Ayala Ave", "EDSA", "Quezon Blvd", "Osmena St", "Bonifacio St"])}, ${city}`,
        cityMunicipality: city,
        businessType: pick(["corporation", "partnership", "sole_proprietor", "cooperative"]),
        tinNumber: `${randomInt(100, 999)}-${randomInt(100, 999)}-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
        website: Math.random() < 0.4 ? `https://www.${tradeName.toLowerCase().replace(/\s+/g, "")}.com.ph` : null,
        landmarks: `Near ${pick(["SM Mall", "Jollibee", "Puregold", "Mercury Drug", "7-Eleven"])} ${city}`,
        dateOfBusinessReg: `${randomInt(2000, 2020)}-${String(randomInt(1, 12)).padStart(2, "0")}-${String(randomInt(1, 28)).padStart(2, "0")}`,
        numberOfEmployees: String(randomInt(3, 500)),
        businessLife: `${randomInt(1, 25)} years`,
        howLongAtAddress: `${randomInt(1, 15)} years`,
        numberOfBranches: String(randomInt(1, 30)),
        lineOfBusiness: pick(LINE_OF_BUSINESS),
        businessActivity: pick(BUSINESS_ACTIVITY),
        paymentTerms: pick(PAYMENT_TERMS),
        salesChannel: pick(SALES_CHANNELS),
        additionalNotes: Math.random() < 0.3 ? `Account opened via referral. Priority customer.` : null,

        // Delivery
        deliverySameAsOffice: Math.random() < 0.6,
        deliveryAddress: Math.random() < 0.4 ? `${randomInt(1, 999)} Warehouse Rd, ${pick(CITIES)}` : null,
        deliveryMobile: `09${randomInt(100000000, 999999999)}`,

        // Owners & officers (1-3 entries)
        owners: Array.from({ length: randomInt(1, 3) }, () => ({
          name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          nationality: pick(["Filipino", "Filipino", "Filipino", "Chinese", "Korean"]),
          percentage: `${randomInt(10, 100)}%`,
          contact: `09${randomInt(100000000, 999999999)}`,
        })),
        officers: Array.from({ length: randomInt(1, 4) }, () => ({
          name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          position: pick(["CEO", "CFO", "COO", "President", "VP Operations", "Treasurer", "Secretary"]),
          contact: `09${randomInt(100000000, 999999999)}`,
        })),

        // Trade & bank references (1-2 entries each)
        tradeReferences: Array.from({ length: randomInt(1, 2) }, () => ({
          company: pick(SUPPLIERS),
          address: pick(CITIES),
          contact: `02-${randomInt(10000000, 99999999)}`,
          years: String(randomInt(1, 10)),
        })),
        bankReferences: Array.from({ length: randomInt(1, 2) }, () => ({
          bank: pick(BANKS),
          branch: pick(CITIES),
          accountType: pick(["Savings", "Checking", "Current"]),
          accountNo: String(randomInt(1000000000, 9999999999)),
        })),

        govCertifications: Math.random() < 0.3 ? "PhilGEPS registered, DOE accredited" : null,
        achievements: Math.random() < 0.2 ? "Best Distributor Award 2023, Top Dealer of the Year" : null,
        otherMerits: Math.random() < 0.15 ? "ISO 9001:2015 certified" : null,

        // Documents
        ...docs,

        // Agent fill-out
        agentAccountSpecialistFirst: isAgentFilled ? pick(FIRST_NAMES) : null,
        agentAccountSpecialistLast: isAgentFilled ? pick(LAST_NAMES) : null,
        agentSalesSpecialist: isAgentFilled ? `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}` : null,
        agentSalesManager: isAgentFilled ? pick(managers).fullName : null,

        // Finance evaluation
        financeEu: isApproved ? String(randomInt(500000, 20000000)) : null,
        financeDl: isApproved ? String(randomInt(100000, 10000000)) : null,
        financeDr: isApproved ? String(randomInt(100000, 10000000)) : null,
        financePlTs: isApproved ? pick(["Standard", "Premium", "Enterprise", "Basic"]) : null,
        financeCreditLimit: isApproved ? `PHP ${(randomInt(500, 10000) * 1000).toLocaleString()}` : null,
        financeCreditTerms: isApproved ? pick(["30", "60", "90", "0"]) : null,
        financePossiblePoints: isApproved ? 100 : null,
        financeApprovedPoints: isApproved ? randomInt(55, 100) : null,
        annualSalesAmount: isApproved ? String(randomInt(1000000, 100000000)) : null,
        netIncomeAmount: isApproved ? String(randomInt(100000, 20000000)) : null,
        bankBalanceAmount: isApproved ? String(randomInt(50000, 10000000)) : null,

        // Sales support
        salesSupportAccountType: isErpDone ? pick(["Regular", "Premium", "Key Account", "VIP"]) : null,
        salesSupportPriceList1: isErpDone ? `PL-${String(randomInt(1, 10)).padStart(3, "0")}` : null,
        salesSupportPriceList2: isErpDone && Math.random() < 0.5 ? `PL-${String(randomInt(11, 20)).padStart(3, "0")}` : null,
        salesSupportSalesType: isErpDone ? pick(["Wholesale", "Retail", "Consignment", "Direct"]) : null,
        salesSupportVatCode: isErpDone ? pick(["V12", "V0", "VE", "VZ"]) : null,
        salesSupportOtherRemarks: isErpDone && Math.random() < 0.4 ? "Rush encoding requested. Priority account." : null,

        // Signature
        customerSignature: isPostSubmit ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" : null,
        customerSignedAt: isPostSubmit ? daysAgo(daysBack + 1) : null,

        createdAt: daysAgo(daysBack + 2),
        updatedAt: daysAgo(daysBack),
      });
    }

    const inserted = await db.insert(schema.cisSubmissions).values(rows).returning({
      id: schema.cisSubmissions.id,
      status: schema.cisSubmissions.status,
      agentId: schema.cisSubmissions.agentId,
      customerType: schema.cisSubmissions.customerType,
    });
    created += inserted.length;

    // Workflow events + notifications
    const events: (typeof schema.workflowEvents.$inferInsert)[] = [];
    const notifs: (typeof schema.notifications.$inferInsert)[] = [];

    for (const cis of inserted) {
      const s = cis.status as string;
      const isLegal = cis.customerType === "dealer";
      const reviewer = isLegal ? pick(legals) : pick(finances);

      if (s !== "draft") {
        events.push({ cisId: cis.id, actorId: cis.agentId, action: "submitted", createdAt: daysAgo(randomInt(5, 15)) });
      }
      if (["pending_finance_review", "pending_legal_review", "pending_approval",
           "approved", "pending_erp_encoding", "erp_encoded", "denied", "returned"].includes(s)) {
        events.push({ cisId: cis.id, actorId: cis.agentId, action: "agent_submitted", createdAt: daysAgo(randomInt(3, 12)) });
        notifs.push({ cisId: cis.id, recipientId: reviewer.id, type: "in_app", message: `New CIS submission assigned for review.`, isRead: Math.random() > 0.4, status: "sent" });
      }
      if (["pending_approval", "approved", "pending_erp_encoding", "erp_encoded", "denied"].includes(s)) {
        events.push({ cisId: cis.id, actorId: reviewer.id, action: "forwarded_to_approver", createdAt: daysAgo(randomInt(2, 8)) });
        notifs.push({ cisId: cis.id, recipientId: pick(approvers).id, type: "in_app", message: "CIS submission forwarded for final approval.", isRead: Math.random() > 0.5, status: "sent" });
      }
      if (["approved", "pending_erp_encoding", "erp_encoded"].includes(s)) {
        const approver = pick(approvers);
        events.push({ cisId: cis.id, actorId: approver.id, action: "approved", createdAt: daysAgo(randomInt(1, 6)) });
        notifs.push({ cisId: cis.id, recipientId: cis.agentId, type: "in_app", message: "Your CIS submission has been approved.", isRead: Math.random() > 0.3, status: "sent" });
        notifs.push({ cisId: cis.id, recipientId: pick(supports).id, type: "in_app", message: "Approved CIS requires sales support fill-out.", isRead: Math.random() > 0.5, status: "sent" });
      }
      if (s === "denied") {
        events.push({ cisId: cis.id, actorId: pick(approvers).id, action: "denied", createdAt: daysAgo(randomInt(1, 5)) });
        notifs.push({ cisId: cis.id, recipientId: cis.agentId, type: "in_app", message: "Your CIS submission has been denied.", isRead: Math.random() > 0.4, status: "sent" });
      }
      if (s === "returned") {
        events.push({ cisId: cis.id, actorId: reviewer.id, action: "returned", createdAt: daysAgo(randomInt(1, 4)) });
        notifs.push({ cisId: cis.id, recipientId: cis.agentId, type: "in_app", message: "Your CIS submission has been returned for revision.", isRead: false, status: "sent" });
      }
      if (["pending_erp_encoding", "erp_encoded"].includes(s)) {
        events.push({ cisId: cis.id, actorId: pick(supports).id, action: "sales_support_submitted", createdAt: daysAgo(randomInt(1, 4)) });
        notifs.push({ cisId: cis.id, recipientId: pick(specialists).id, type: "in_app", message: "CIS ready for ERP encoding.", isRead: Math.random() > 0.5, status: "sent" });
      }
      if (s === "erp_encoded") {
        const spec = pick(specialists);
        events.push({ cisId: cis.id, actorId: spec.id, action: "erp_encoded", createdAt: daysAgo(randomInt(1, 2)) });
        notifs.push({ cisId: cis.id, recipientId: cis.agentId, type: "in_app", message: "Customer onboarding complete — ERP encoded.", isRead: Math.random() > 0.2, status: "sent" });
      }
    }

    if (events.length) await db.insert(schema.workflowEvents).values(events);
    if (notifs.length) await db.insert(schema.notifications).values(notifs);

    process.stdout.write(`\r  ${created}/${TOTAL} created...`);
  }

  console.log(`\nDone. ${TOTAL} CIS submissions created with full document sets.`);
  console.log("\nSeed credentials (password: Password123!):");
  console.log("  Admins:      seed.admin1@crs.test, seed.admin2@crs.test");
  console.log("  Finance:     seed.finance1@crs.test, seed.finance2@crs.test");
  console.log("  Legal:       seed.legal1@crs.test, seed.legal2@crs.test");
  console.log("  Approvers:   seed.approver1@crs.test, seed.approver2@crs.test");
  console.log("  Support:     seed.support1@crs.test, seed.support2@crs.test");
  console.log("  Specialists: seed.specialist1@crs.test, seed.specialist2@crs.test");
  console.log("  Managers:    seed.manager1@crs.test ... seed.manager5@crs.test");
  console.log("  Agents:      seed.agent1@crs.test ... seed.agent30@crs.test");
  console.log("  RSR:         seed.rsr1@crs.test ... seed.rsr5@crs.test");
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

async function main() {
  if (process.argv.includes("--wipe")) {
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
