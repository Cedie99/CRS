import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
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
      financeCreditTerms: cisSubmissions.financeCreditTerms,
      financeCreditLimit: cisSubmissions.financeCreditLimit,
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
      { error: "Please attach the approved CIS signed by the Chief Finance Officer before forwarding." },
      { status: 422 }
    );
  }

  if (!cis.financeCreditTerms?.trim()) {
    return NextResponse.json(
      { error: "Credit terms are required before forwarding." },
      { status: 422 }
    );
  }

  if (!cis.financeCreditLimit?.trim()) {
    return NextResponse.json(
      { error: "Credit limit is required before forwarding." },
      { status: 422 }
    );
  }

  const body = await req.json();

  // Accept credit fields from request body so the reviewer doesn't need a separate save step
  if (typeof body.financeCreditTerms === "string" && body.financeCreditTerms.trim()) {
    await db.update(cisSubmissions).set({ financeCreditTerms: body.financeCreditTerms.trim() }).where(eq(cisSubmissions.id, id));
    cis.financeCreditTerms = body.financeCreditTerms.trim();
  }
  if (typeof body.financeCreditLimit === "string" && body.financeCreditLimit.trim()) {
    await db.update(cisSubmissions).set({ financeCreditLimit: body.financeCreditLimit.trim() }).where(eq(cisSubmissions.id, id));
    cis.financeCreditLimit = body.financeCreditLimit.trim();
  }

  const parsed = financeForwardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { note } = parsed.data;

  await transitionCis({
    cisId: id,
    toStatus: "pending_approval",
    action: "forwarded_to_approver",
    actorId: session.user.id,
    note,
  });

  // Invalidate cache tags
  revalidateTag("agent-stats", {});
  revalidateTag("manager-stats", {});
  revalidateTag("workflow-history", {});

  return NextResponse.json({ success: true });
}
