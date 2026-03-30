import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { approveSchema } from "@/lib/validations/cis";
import { transitionCis } from "@/lib/workflow";
import { computeSeal, sha256Fingerprint } from "@/lib/signature-integrity";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "senior_approver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [cis] = await db
    .select({ status: cisSubmissions.status })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cis.status !== "pending_approval") {
    return NextResponse.json({ error: "CIS is not pending approval" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const signedAt = new Date();
  const seal = computeSeal(id, signedAt, parsed.data.approverSignature);
  const fp = sha256Fingerprint(parsed.data.approverSignature);

  // Save approver signature with integrity seal
  await db
    .update(cisSubmissions)
    .set({
      approverSignature: parsed.data.approverSignature,
      approverSignedAt: signedAt,
      approverSignatureSeal: seal,
      updatedAt: signedAt,
    })
    .where(eq(cisSubmissions.id, id));

  // Combine user note with fingerprint for the immutable audit log entry
  const noteWithFp = [parsed.data.note, `sha256:${fp}`].filter(Boolean).join("\n");

  await transitionCis({
    cisId: id,
    toStatus: "approved",
    action: "approved",
    actorId: session.user.id,
    note: noteWithFp,
  });

  return NextResponse.json({ success: true });
}
