import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { approveSchema } from "@/lib/validations/cis";
import { transitionCis } from "@/lib/workflow";

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
  // Senior approval no longer requires approver e-signature.
  await db
    .update(cisSubmissions)
    .set({
      approverSignature: null,
      approverSignedAt: null,
      approverSignatureSeal: null,
      updatedAt: signedAt,
    })
    .where(eq(cisSubmissions.id, id));

  await transitionCis({
    cisId: id,
    toStatus: "approved",
    action: "approved",
    actorId: session.user.id,
    note: parsed.data.note,
  });

  // Invalidate cache tags
  revalidateTag("agent-stats", {});
  revalidateTag("manager-stats", {});
  revalidateTag("workflow-history", {});

  return NextResponse.json({ success: true });
}
