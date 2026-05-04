import { NextResponse } from "next/server";
import { eq, desc, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions, cisSubmissions, users } from "@/lib/db/schema";

// GET /api/cus — list CUS records filtered by role
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;

  let rows: Array<{
    id: string;
    cisId: string;
    status: string;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
    cis: { tradeName: string | null; contactPerson: string | null; customerType: string | null };
  }>;

  if (role === "sales_agent" || role === "rsr") {
    rows = await db
      .select({
        id: cusSubmissions.id,
        cisId: cusSubmissions.cisId,
        status: cusSubmissions.status,
        note: cusSubmissions.note,
        createdAt: cusSubmissions.createdAt,
        updatedAt: cusSubmissions.updatedAt,
        cis: {
          tradeName: cisSubmissions.tradeName,
          contactPerson: cisSubmissions.contactPerson,
          customerType: cisSubmissions.customerType,
        },
      })
      .from(cusSubmissions)
      .innerJoin(cisSubmissions, eq(cusSubmissions.cisId, cisSubmissions.id))
      .where(eq(cusSubmissions.agentId, userId))
      .orderBy(desc(cusSubmissions.createdAt));
  } else if (role === "finance_reviewer") {
    rows = await db
      .select({
        id: cusSubmissions.id,
        cisId: cusSubmissions.cisId,
        status: cusSubmissions.status,
        note: cusSubmissions.note,
        createdAt: cusSubmissions.createdAt,
        updatedAt: cusSubmissions.updatedAt,
        cis: {
          tradeName: cisSubmissions.tradeName,
          contactPerson: cisSubmissions.contactPerson,
          customerType: cisSubmissions.customerType,
        },
      })
      .from(cusSubmissions)
      .innerJoin(cisSubmissions, eq(cusSubmissions.cisId, cisSubmissions.id))
      .where(eq(cusSubmissions.status, "pending_finance_review"))
      .orderBy(desc(cusSubmissions.createdAt));
  } else if (role === "legal_approver") {
    rows = await db
      .select({
        id: cusSubmissions.id,
        cisId: cusSubmissions.cisId,
        status: cusSubmissions.status,
        note: cusSubmissions.note,
        createdAt: cusSubmissions.createdAt,
        updatedAt: cusSubmissions.updatedAt,
        cis: {
          tradeName: cisSubmissions.tradeName,
          contactPerson: cisSubmissions.contactPerson,
          customerType: cisSubmissions.customerType,
        },
      })
      .from(cusSubmissions)
      .innerJoin(cisSubmissions, eq(cusSubmissions.cisId, cisSubmissions.id))
      .where(eq(cusSubmissions.status, "pending_legal_review"))
      .orderBy(desc(cusSubmissions.createdAt));
  } else if (role === "admin") {
    rows = await db
      .select({
        id: cusSubmissions.id,
        cisId: cusSubmissions.cisId,
        status: cusSubmissions.status,
        note: cusSubmissions.note,
        createdAt: cusSubmissions.createdAt,
        updatedAt: cusSubmissions.updatedAt,
        cis: {
          tradeName: cisSubmissions.tradeName,
          contactPerson: cisSubmissions.contactPerson,
          customerType: cisSubmissions.customerType,
        },
      })
      .from(cusSubmissions)
      .innerJoin(cisSubmissions, eq(cusSubmissions.cisId, cisSubmissions.id))
      .orderBy(desc(cusSubmissions.createdAt));
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(rows);
}

// POST /api/cus — agent creates a new CUS linked to an approved CIS
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "sales_agent" && role !== "rsr") {
    return NextResponse.json({ error: "Only agents can create CUS forms" }, { status: 403 });
  }

  let body: { cisId?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { cisId, note } = body;
  if (!cisId || typeof cisId !== "string") {
    return NextResponse.json({ error: "cisId is required" }, { status: 400 });
  }

  // Validate the linked CIS exists, is approved, and belongs to this agent
  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      agentId: cisSubmissions.agentId,
      status: cisSubmissions.status,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, cisId))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "CIS not found" }, { status: 404 });

  if (!["approved", "erp_encoded"].includes(cis.status)) {
    return NextResponse.json(
      { error: "CUS can only be created for an approved or ERP-encoded CIS" },
      { status: 409 }
    );
  }

  if (cis.agentId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [inserted] = await db
    .insert(cusSubmissions)
    .values({
      cisId,
      agentId: userId,
      status: "draft",
      note: note ?? null,
    })
    .returning({ id: cusSubmissions.id });

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
