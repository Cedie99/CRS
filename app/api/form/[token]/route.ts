import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
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
  const parsed = getCisFormSchema().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Valid ID is required when payment terms is credit
  const paymentTerms = parsed.data.paymentTerms ?? "";
  if (
    ["credit_30", "credit_60", "credit_90"].includes(paymentTerms) &&
    (!body.docValidId || (Array.isArray(body.docValidId) && body.docValidId.length === 0))
  ) {
    return NextResponse.json(
      { error: { docValidId: ["Valid ID is required for credit terms."] } },
      { status: 400 }
    );
  }

  // Default blank TIN to "0000000"
  const tinNumber = parsed.data.tinNumber?.trim() || "0000000";

  const signedAt = new Date();
  const seal = computeSeal(cis.id, signedAt, parsed.data.customerSignature);
  const fp = sha256Fingerprint(parsed.data.customerSignature);

  try {
    // Save form data and mark as submitted
    await db
      .update(cisSubmissions)
      .set({
        ...parsed.data,
        tinNumber,
        status: "submitted",
        customerSignedAt: signedAt,
        customerSignatureSeal: seal,
        updatedAt: signedAt,
      })
      .where(eq(cisSubmissions.id, cis.id));

    await transitionCis({
      cisId: cis.id,
      toStatus: "submitted",
      action: "submitted",
      actorId: cis.agentId,
      note: `sha256:${fp}`,
    });
  } catch (err) {
    console.error("[form/submit] DB error:", err);
    return NextResponse.json(
      { error: "Failed to save your submission. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
