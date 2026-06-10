import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users, workflowEvents } from "@/lib/db/schema";
import { transitionCis } from "@/lib/workflow";
import { DOC_TYPES, type DocReviewStatuses, type DocType, type FileEntry } from "@/lib/doc-types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "sales_agent" && role !== "rsr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const docSelect = Object.fromEntries(
    DOC_TYPES.map((key) => [key, cisSubmissions[key]])
  ) as Record<DocType, (typeof cisSubmissions)[DocType]>;

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      status: cisSubmissions.status,
      agentId: cisSubmissions.agentId,
      customerType: cisSubmissions.customerType,
      docReviewStatuses: cisSubmissions.docReviewStatuses,
      ...docSelect,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cis.agentId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (cis.status !== "returned") {
    return NextResponse.json({ error: "CIS is not in returned status" }, { status: 409 });
  }

  // Find the last returned event to determine who returned it
  const [returnedEvent] = await db
    .select({
      actorId: workflowEvents.actorId,
      createdAt: workflowEvents.createdAt,
    })
    .from(workflowEvents)
    .where(and(eq(workflowEvents.cisId, id), eq(workflowEvents.action, "returned")))
    .orderBy(desc(workflowEvents.createdAt))
    .limit(1);

  if (!returnedEvent) {
    return NextResponse.json({ error: "No returned event found" }, { status: 409 });
  }

  const statuses = (cis.docReviewStatuses as DocReviewStatuses | null) ?? {};
  const rejectedKeys = (Object.entries(statuses) as [DocType, { status: string; reason?: string | null }][])
    .filter(([, value]) => value?.status === "rejected")
    .map(([key]) => key);

  if (rejectedKeys.length > 0) {
    const cutoff = new Date(returnedEvent.createdAt).getTime();
    if (Number.isNaN(cutoff)) {
      return NextResponse.json(
        { error: "Unable to validate replacement uploads for rejected documents." },
        { status: 409 }
      );
    }

    const hasAddressedRejection = rejectedKeys.some((key) => {
      const files = ((cis as Record<string, unknown>)[key] as FileEntry[] | null | undefined) ?? [];
      
      // If the document has been deleted (no files), that counts as addressing the rejection
      if (!files || files.length === 0) return true;
      
      // Otherwise, check if there's a replacement upload after the rejection timestamp
      return files.some((file) => {
        if (!file.uploadedAt) return false;
        const uploadedAt = Date.parse(file.uploadedAt);
        return !Number.isNaN(uploadedAt) && uploadedAt > cutoff;
      });
    });

    if (!hasAddressedRejection) {
      return NextResponse.json(
        { error: "Upload a replacement file or delete the rejected documents before resubmitting." },
        { status: 409 }
      );
    }

    // Clear rejected status for documents that have been deleted or replaced
    const updatedDocReviewStatuses = { ...(cis.docReviewStatuses as DocReviewStatuses | null) ?? {} };
    rejectedKeys.forEach((key) => {
      const files = ((cis as Record<string, unknown>)[key] as FileEntry[] | null | undefined) ?? [];
      
      // If document was deleted (no files), clear its status entirely
      if (!files || files.length === 0) {
        delete updatedDocReviewStatuses[key];
      } else {
        // If document was replaced (has new files after cutoff), clear its rejected status
        const hasReplacement = files.some((file) => {
          if (!file.uploadedAt) return false;
          const uploadedAt = Date.parse(file.uploadedAt);
          return !Number.isNaN(uploadedAt) && uploadedAt > cutoff;
        });
        if (hasReplacement) {
          delete updatedDocReviewStatuses[key];
        }
      }
    });

    await db.update(cisSubmissions)
      .set({ docReviewStatuses: updatedDocReviewStatuses })
      .where(eq(cisSubmissions.id, id));
  }

  await db
    .update(cisSubmissions)
    .set({ agentEditBeforeSnapshot: null })
    .where(eq(cisSubmissions.id, id));

  // Route based on customer type — dealer goes to legal, all others to finance
  const isDealer = cis.customerType === "dealer";
  const toStatus: "pending_finance_review" | "pending_legal_review" =
    isDealer ? "pending_legal_review" : "pending_finance_review";

  // Get manager ID for informational notification
  const [agent] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  await transitionCis({
    cisId: id,
    toStatus,
    action: "agent_submitted",
    actorId: userId,
    managerId: agent?.managerId ?? null,
    isDealer: cis.customerType === "dealer",
    isResubmission: true,
  });

  // Invalidate cache tags
  revalidateTag("agent-stats", {});
  revalidateTag("manager-stats", {});
  revalidateTag("workflow-history", {});

  return NextResponse.json({ success: true });
}
