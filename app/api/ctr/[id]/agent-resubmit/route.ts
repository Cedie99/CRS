import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, ctrEvents, cisSubmissions, users, notifications } from "@/lib/db/schema";
import type { FileEntry } from "@/lib/doc-types";

const CTR_DOC_KEYS = [
  "docValidId", "docMayorsPermit", "docSecDti", "docBirCertificate",
  "docLocationMap", "docFinancialStatement", "docBankStatement",
  "docProofOfBilling", "docLeaseContract", "docProofOfOwnership",
  "docStorePhoto", "docSupplierInvoice", "docSocialMedia", "docCompanyWebsite",
  "docIsoCertification", "docHalalCertificate", "docOther",
] as const;

// PATCH /api/ctr/[id]/agent-resubmit — agent resubmits after uploading required docs
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "sales_agent" && role !== "rsr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [ctr] = await db
    .select({
      id: ctrSubmissions.id,
      agentId: ctrSubmissions.agentId,
      status: ctrSubmissions.status,
      cisId: ctrSubmissions.cisId,
      targetCustomerType: ctrSubmissions.targetCustomerType,
      requiredDocSlots: ctrSubmissions.requiredDocSlots,
      docValidId: ctrSubmissions.docValidId,
      docMayorsPermit: ctrSubmissions.docMayorsPermit,
      docSecDti: ctrSubmissions.docSecDti,
      docBirCertificate: ctrSubmissions.docBirCertificate,
      docLocationMap: ctrSubmissions.docLocationMap,
      docFinancialStatement: ctrSubmissions.docFinancialStatement,
      docBankStatement: ctrSubmissions.docBankStatement,
      docProofOfBilling: ctrSubmissions.docProofOfBilling,
      docLeaseContract: ctrSubmissions.docLeaseContract,
      docProofOfOwnership: ctrSubmissions.docProofOfOwnership,
      docStorePhoto: ctrSubmissions.docStorePhoto,
      docSupplierInvoice: ctrSubmissions.docSupplierInvoice,
      docSocialMedia: ctrSubmissions.docSocialMedia,
      docCompanyWebsite: ctrSubmissions.docCompanyWebsite,
      docIsoCertification: ctrSubmissions.docIsoCertification,
      docHalalCertificate: ctrSubmissions.docHalalCertificate,
      docOther: ctrSubmissions.docOther,
    })
    .from(ctrSubmissions)
    .where(eq(ctrSubmissions.id, id))
    .limit(1);

  if (!ctr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ctr.agentId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ctr.status !== "pending_documents") {
    return NextResponse.json({ error: "CTR is not pending document upload" }, { status: 409 });
  }

  // Validate at least one required slot has been uploaded
  const requiredSlots = (ctr.requiredDocSlots as string[] | null) ?? [];
  const hasAtLeastOne = requiredSlots.some((slot) => {
    const key = slot as keyof typeof ctr;
    const files = (ctr[key] as FileEntry[] | null) ?? [];
    return files.length > 0;
  });

  if (!hasAtLeastOne && requiredSlots.length > 0) {
    return NextResponse.json(
      { error: "At least one required document must be uploaded before resubmitting" },
      { status: 409 }
    );
  }

  const nextStatus =
    ctr.targetCustomerType === "dealer" ? "pending_legal_review" : "pending_finance_review";
  const reviewerRole =
    nextStatus === "pending_legal_review" ? "legal_approver" : "finance_reviewer";

  await db
    .update(ctrSubmissions)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(ctrSubmissions.id, id));

  await db.insert(ctrEvents).values({
    ctrId: id,
    actorId: userId,
    action: "resubmitted",
  });

  const [cis] = await db
    .select({ tradeName: cisSubmissions.tradeName })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, ctr.cisId))
    .limit(1);

  const tradeName = cis?.tradeName ?? "a customer";

  const reviewers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, reviewerRole as typeof users.role._.data));

  if (reviewers.length > 0) {
    await db.insert(notifications).values(
      reviewers.map((reviewer) => ({
        cisId: ctr.cisId,
        ctrId: id,
        recipientId: reviewer.id,
        type: "in_app" as const,
        message: `Documents uploaded for CTR on ${tradeName} — ready for review`,
        status: "pending" as const,
      }))
    );
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
