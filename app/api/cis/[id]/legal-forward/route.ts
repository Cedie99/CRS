import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { financeForwardSchema } from "@/lib/validations/cis";
import { transitionCis } from "@/lib/workflow";
import type { FileEntry } from "@/lib/doc-types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "legal_approver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      status: cisSubmissions.status,
      docSirRestySigned: cisSubmissions.docSirRestySigned,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cis.status !== "pending_legal_review") {
    return NextResponse.json({ error: "CIS is not pending legal review" }, { status: 409 });
  }

  const sirRestyFiles = (cis.docSirRestySigned as FileEntry[] | null) ?? [];
  if (sirRestyFiles.length === 0) {
    return NextResponse.json(
      { error: "Please attach the approved CIS signed by Sir Resty before forwarding." },
      { status: 422 }
    );
  }

  const body = await req.json();
  const parsed = financeForwardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { note, financeCreditLimit, financeCreditTerms } = parsed.data;

  await db
    .update(cisSubmissions)
    .set({ financeCreditLimit, financeCreditTerms })
    .where(eq(cisSubmissions.id, id));

  await transitionCis({
    cisId: id,
    toStatus: "pending_approval",
    action: "forwarded_to_approver",
    actorId: session.user.id,
    note,
  });

  return NextResponse.json({ success: true });
}
