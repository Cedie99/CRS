import { NextResponse } from "next/server";
import { eq, desc, or, inArray, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users, workflowEvents, notifications } from "@/lib/db/schema";
import { cisFormSchema, initiateSchema } from "@/lib/validations/cis";
import { transitionCis } from "@/lib/workflow";

// Role → which statuses to show in their queue
const ROLE_STATUS_FILTER: Record<string, string[]> = {
  sales_agent: ["draft", "submitted", "pending_endorsement", "pending_legal_review", "pending_finance_review", "pending_approval", "approved", "erp_encoded", "denied", "returned"],
  rsr: ["draft", "submitted", "pending_endorsement", "pending_legal_review", "pending_finance_review", "pending_approval", "approved", "erp_encoded", "denied", "returned"],
  sales_manager: ["pending_endorsement"],
  rsr_manager: ["pending_endorsement"],
  finance_reviewer: ["pending_finance_review"],
  legal_approver: ["pending_legal_review"],
  senior_approver: ["pending_approval"],
  sales_support: ["denied"],
  admin: ["draft", "submitted", "pending_endorsement", "pending_legal_review", "pending_finance_review", "pending_approval", "approved", "erp_encoded", "denied", "returned"],
};

// GET /api/cis — list filtered by role
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  const allowedStatuses = ROLE_STATUS_FILTER[role] ?? [];

  let rows;

  if (role === "sales_agent" || role === "rsr") {
    // Agents only see their own submissions
    rows = await db
      .select({
        id: cisSubmissions.id,
        agentCode: cisSubmissions.agentCode,
        customerType: cisSubmissions.customerType,
        status: cisSubmissions.status,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        createdAt: cisSubmissions.createdAt,
        updatedAt: cisSubmissions.updatedAt,
      })
      .from(cisSubmissions)
      .where(eq(cisSubmissions.agentId, userId))
      .orderBy(desc(cisSubmissions.createdAt));
  } else if (role === "sales_manager" || role === "rsr_manager") {
    // Managers see pending_endorsement forms from their assigned agents
    const myAgents = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.managerId, userId));
    const agentIds = myAgents.map((a) => a.id);

    if (agentIds.length === 0) return NextResponse.json([]);

    rows = await db
      .select({
        id: cisSubmissions.id,
        agentCode: cisSubmissions.agentCode,
        customerType: cisSubmissions.customerType,
        status: cisSubmissions.status,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        createdAt: cisSubmissions.createdAt,
        updatedAt: cisSubmissions.updatedAt,
        agentName: users.fullName,
      })
      .from(cisSubmissions)
      .innerJoin(users, eq(cisSubmissions.agentId, users.id))
      .where(
        and(
          inArray(cisSubmissions.agentId, agentIds),
          eq(cisSubmissions.status, "pending_endorsement")
        )
      )
      .orderBy(desc(cisSubmissions.createdAt));
  } else {
    // All other staff roles: filter by their allowed statuses
    rows = await db
      .select({
        id: cisSubmissions.id,
        agentCode: cisSubmissions.agentCode,
        customerType: cisSubmissions.customerType,
        status: cisSubmissions.status,
        tradeName: cisSubmissions.tradeName,
        contactPerson: cisSubmissions.contactPerson,
        createdAt: cisSubmissions.createdAt,
        updatedAt: cisSubmissions.updatedAt,
        agentName: users.fullName,
      })
      .from(cisSubmissions)
      .innerJoin(users, eq(cisSubmissions.agentId, users.id))
      .orderBy(desc(cisSubmissions.createdAt));

    rows = rows.filter((r) => allowedStatuses.includes(r.status));
  }

  return NextResponse.json(rows);
}

// POST /api/cis — agent creates a draft CIS and gets a shareable customer link
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId, agentCode, agentType } = session.user;
  if (role !== "sales_agent" && role !== "rsr") {
    return NextResponse.json({ error: "Only agents can create CIS forms" }, { status: 403 });
  }
  if (!agentCode || !agentType) {
    return NextResponse.json(
      { error: "Your account does not have an agent code assigned. Please contact Admin." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = initiateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [inserted] = await db
    .insert(cisSubmissions)
    .values({
      agentId: userId,
      agentCode,
      agentType,
      customerType: parsed.data.customerType,
      status: "draft",
    })
    .returning({ id: cisSubmissions.id, publicToken: cisSubmissions.publicToken });

  return NextResponse.json({ id: inserted.id, publicToken: inserted.publicToken }, { status: 201 });
}

async function getManagerId(agentId: string): Promise<string | null> {
  const [agent] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, agentId))
    .limit(1);
  return agent?.managerId ?? null;
}
