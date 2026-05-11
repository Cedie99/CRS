import { NextResponse } from "next/server";
import { eq, desc, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, cisSubmissions } from "@/lib/db/schema";

const VALID_CUSTOMER_TYPES = [
  "dealer", "distributor", "private_label", "toll_blend", "end_user",
];

// GET /api/ctr — list CTR records filtered by role
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;

  type Row = {
    id: string;
    cisId: string;
    status: string;
    targetCustomerType: string;
    reason: string | null;
    createdAt: Date;
    updatedAt: Date;
    cis: { tradeName: string | null; customerType: string | null };
  };

  let rows: Row[];

  if (role === "sales_agent" || role === "rsr") {
    rows = await db
      .select({
        id: ctrSubmissions.id,
        cisId: ctrSubmissions.cisId,
        status: ctrSubmissions.status,
        targetCustomerType: ctrSubmissions.targetCustomerType,
        reason: ctrSubmissions.reason,
        createdAt: ctrSubmissions.createdAt,
        updatedAt: ctrSubmissions.updatedAt,
        cis: {
          tradeName: cisSubmissions.tradeName,
          customerType: cisSubmissions.customerType,
        },
      })
      .from(ctrSubmissions)
      .innerJoin(cisSubmissions, eq(ctrSubmissions.cisId, cisSubmissions.id))
      .where(eq(ctrSubmissions.agentId, userId))
      .orderBy(desc(ctrSubmissions.createdAt));
  } else if (role === "finance_reviewer") {
    rows = await db
      .select({
        id: ctrSubmissions.id,
        cisId: ctrSubmissions.cisId,
        status: ctrSubmissions.status,
        targetCustomerType: ctrSubmissions.targetCustomerType,
        reason: ctrSubmissions.reason,
        createdAt: ctrSubmissions.createdAt,
        updatedAt: ctrSubmissions.updatedAt,
        cis: {
          tradeName: cisSubmissions.tradeName,
          customerType: cisSubmissions.customerType,
        },
      })
      .from(ctrSubmissions)
      .innerJoin(cisSubmissions, eq(ctrSubmissions.cisId, cisSubmissions.id))
      .where(
        and(
          inArray(ctrSubmissions.status, ["pending_finance_review", "pending_documents"]),
          // Finance handles non-dealer targets
        )
      )
      .orderBy(desc(ctrSubmissions.createdAt))
      .then((rows) => rows.filter((r) => r.targetCustomerType !== "dealer"));
  } else if (role === "legal_approver") {
    rows = await db
      .select({
        id: ctrSubmissions.id,
        cisId: ctrSubmissions.cisId,
        status: ctrSubmissions.status,
        targetCustomerType: ctrSubmissions.targetCustomerType,
        reason: ctrSubmissions.reason,
        createdAt: ctrSubmissions.createdAt,
        updatedAt: ctrSubmissions.updatedAt,
        cis: {
          tradeName: cisSubmissions.tradeName,
          customerType: cisSubmissions.customerType,
        },
      })
      .from(ctrSubmissions)
      .innerJoin(cisSubmissions, eq(ctrSubmissions.cisId, cisSubmissions.id))
      .where(
        and(
          inArray(ctrSubmissions.status, ["pending_legal_review", "pending_documents"]),
        )
      )
      .orderBy(desc(ctrSubmissions.createdAt))
      .then((rows) => rows.filter((r) => r.targetCustomerType === "dealer"));
  } else if (role === "senior_approver") {
    rows = await db
      .select({
        id: ctrSubmissions.id,
        cisId: ctrSubmissions.cisId,
        status: ctrSubmissions.status,
        targetCustomerType: ctrSubmissions.targetCustomerType,
        reason: ctrSubmissions.reason,
        createdAt: ctrSubmissions.createdAt,
        updatedAt: ctrSubmissions.updatedAt,
        cis: {
          tradeName: cisSubmissions.tradeName,
          customerType: cisSubmissions.customerType,
        },
      })
      .from(ctrSubmissions)
      .innerJoin(cisSubmissions, eq(ctrSubmissions.cisId, cisSubmissions.id))
      .where(eq(ctrSubmissions.status, "pending_approval"))
      .orderBy(desc(ctrSubmissions.createdAt));
  } else if (role === "admin") {
    rows = await db
      .select({
        id: ctrSubmissions.id,
        cisId: ctrSubmissions.cisId,
        status: ctrSubmissions.status,
        targetCustomerType: ctrSubmissions.targetCustomerType,
        reason: ctrSubmissions.reason,
        createdAt: ctrSubmissions.createdAt,
        updatedAt: ctrSubmissions.updatedAt,
        cis: {
          tradeName: cisSubmissions.tradeName,
          customerType: cisSubmissions.customerType,
        },
      })
      .from(ctrSubmissions)
      .innerJoin(cisSubmissions, eq(ctrSubmissions.cisId, cisSubmissions.id))
      .orderBy(desc(ctrSubmissions.createdAt));
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(rows);
}

// POST /api/ctr — agent creates a new CTR
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "sales_agent" && role !== "rsr") {
    return NextResponse.json({ error: "Only agents can create CTR forms" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { cisId, targetCustomerType, reason } = body as {
    cisId?: string;
    targetCustomerType?: string;
    reason?: string;
  };

  if (!cisId || typeof cisId !== "string") {
    return NextResponse.json({ error: "cisId is required" }, { status: 400 });
  }
  if (!targetCustomerType || !VALID_CUSTOMER_TYPES.includes(targetCustomerType)) {
    return NextResponse.json({ error: "Valid targetCustomerType is required" }, { status: 400 });
  }

  // Validate the linked CIS exists, belongs to this agent, and is approved/erp_encoded
  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      agentId: cisSubmissions.agentId,
      status: cisSubmissions.status,
      customerType: cisSubmissions.customerType,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, cisId))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "CIS not found" }, { status: 404 });

  if (!["approved", "erp_encoded"].includes(cis.status)) {
    return NextResponse.json(
      { error: "CTR can only be created for an approved or ERP-encoded CIS" },
      { status: 409 }
    );
  }

  if (cis.agentId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (cis.customerType === targetCustomerType) {
    return NextResponse.json(
      { error: "Target customer type must differ from the current type" },
      { status: 409 }
    );
  }

  // Check for existing active CTR on the same CIS
  const [existing] = await db
    .select({ id: ctrSubmissions.id })
    .from(ctrSubmissions)
    .where(
      and(
        eq(ctrSubmissions.cisId, cisId),
        inArray(ctrSubmissions.status, [
          "draft", "submitted", "pending_legal_review", "pending_finance_review",
          "pending_documents", "pending_approval",
        ])
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "An active CTR already exists for this customer" },
      { status: 409 }
    );
  }

  const [inserted] = await db
    .insert(ctrSubmissions)
    .values({
      cisId,
      agentId: userId,
      status: "draft",
      targetCustomerType,
      reason: typeof reason === "string" ? reason.trim() || null : null,
    })
    .returning({ id: ctrSubmissions.id });

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
