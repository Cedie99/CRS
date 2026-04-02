import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { getCisFormSchema } from "@/lib/validations/cis";
import { transitionCis } from "@/lib/workflow";
import { computeSeal, sha256Fingerprint } from "@/lib/signature-integrity";

// GET /api/form/[token] — fetch CIS info for the customer form
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      status: cisSubmissions.status,
      customerType: cisSubmissions.customerType,
      agentCode: cisSubmissions.agentCode,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.publicToken, token))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Invalid link" }, { status: 404 });

  if (cis.status !== "draft") {
    return NextResponse.json({ error: "This form has already been submitted." }, { status: 409 });
  }

  return NextResponse.json(cis);
}

// POST /api/form/[token] — customer submits their information
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      status: cisSubmissions.status,
      customerType: cisSubmissions.customerType,
      agentId: cisSubmissions.agentId,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.publicToken, token))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (cis.status !== "draft") {
    return NextResponse.json({ error: "This form has already been submitted." }, { status: 409 });
  }

  const body = await req.json();
  const parsed = getCisFormSchema(cis.customerType).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const signedAt = new Date();
  const seal = computeSeal(cis.id, signedAt, parsed.data.customerSignature);
  const fp = sha256Fingerprint(parsed.data.customerSignature);

  // Save form data and mark as submitted
  await db
    .update(cisSubmissions)
    .set({
      ...parsed.data,
      status: "submitted",
      customerSignedAt: signedAt,
      customerSignatureSeal: seal,
      updatedAt: signedAt,
    })
    .where(eq(cisSubmissions.id, cis.id));

  // Get manager ID for notification
  const [agent] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, cis.agentId))
    .limit(1);

  await transitionCis({
    cisId: cis.id,
    toStatus: "pending_endorsement",
    action: "submitted",
    actorId: cis.agentId,
    note: `sha256:${fp}`,
    managerId: agent?.managerId ?? null,
  });

  return NextResponse.json({ success: true });
}
