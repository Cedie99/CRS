import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { DOC_TYPES, type DocType, type DocReviewStatus, type DocReviewStatuses } from "@/lib/doc-types";

const ALLOWED_ROLES = ["finance_reviewer", "legal_approver"] as const;
const ALLOWED_STATUSES = ["pending_finance_review", "pending_legal_review"] as const;
const VALID_STATUSES: DocReviewStatus[] = ["approved", "needs_review", "rejected"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(ALLOWED_ROLES as readonly string[]).includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      status: cisSubmissions.status,
      docReviewStatuses: cisSubmissions.docReviewStatuses,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(ALLOWED_STATUSES as readonly string[]).includes(cis.status)) {
    return NextResponse.json({ error: "Document review is not available at this stage" }, { status: 409 });
  }

  const body = await req.json();
  const { docType, status, reason } = body as { docType: unknown; status: unknown; reason?: unknown };

  if (!DOC_TYPES.includes(docType as DocType)) {
    return NextResponse.json({ error: "Invalid docType" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status as DocReviewStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const current = (cis.docReviewStatuses as DocReviewStatuses) ?? {};
  const existing = current[docType as DocType];
  const merged: DocReviewStatuses = {
    ...current,
    [docType as DocType]: {
      status: status as DocReviewStatus,
      reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
      // Preserve the previous rejectedAt so getFileReview can still distinguish
      // old rejected files from new replacement files after the slot is approved.
      rejectedAt: status === "rejected" ? new Date().toISOString() : (existing?.rejectedAt ?? null),
    },
  };

  await db
    .update(cisSubmissions)
    .set({ docReviewStatuses: merged })
    .where(eq(cisSubmissions.id, id));

  revalidatePath(`/finance/${id}`);
  revalidatePath(`/legal/${id}`);
  revalidatePath(`/agent/${id}`);
  revalidatePath(`/admin/${id}`);

  return NextResponse.json({ docReviewStatuses: merged });
}
