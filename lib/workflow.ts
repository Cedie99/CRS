import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, notifications, users } from "@/lib/db/schema";

type CisStatus = typeof cisSubmissions.$inferSelect["status"];
type WorkflowAction = typeof workflowEvents.$inferSelect["action"];

export async function transitionCis({
  cisId,
  toStatus,
  action,
  actorId,
  note,
  managerId,
}: {
  cisId: string;
  toStatus: CisStatus;
  action: WorkflowAction;
  actorId: string;
  note?: string;
  managerId?: string | null;
}) {
  await db
    .update(cisSubmissions)
    .set({ status: toStatus, updatedAt: new Date() })
    .where(eq(cisSubmissions.id, cisId));

  await db.insert(workflowEvents).values({
    cisId,
    actorId,
    action,
    note: note ?? null,
  });

  await notifyParties({ cisId, action, managerId });
}

async function notifyParties({
  cisId,
  action,
  managerId,
}: {
  cisId: string;
  action: WorkflowAction;
  managerId?: string | null;
}) {
  const [cis] = await db
    .select({ agentId: cisSubmissions.agentId, tradeName: cisSubmissions.tradeName })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, cisId))
    .limit(1);

  if (!cis) return;

  const label = cis.tradeName ?? cisId.slice(0, 8);
  const rows: (typeof notifications.$inferInsert)[] = [];

  const notifyRole = async (role: string, message: string) => {
    const recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, role as any));
    for (const r of recipients) {
      rows.push({ cisId, recipientId: r.id, message, type: "in_app" });
    }
  };

  if (action === "submitted") {
    // Notify the agent's manager specifically
    if (managerId) {
      rows.push({
        cisId,
        recipientId: managerId,
        message: `A new CIS form for "${label}" from your agent is pending your endorsement.`,
        type: "in_app",
      });
    }
  } else if (action === "forwarded_to_legal") {
    await notifyRole("legal_approver", `A new CIS for "${label}" requires legal review.`);
  } else if (action === "endorsed") {
    await notifyRole("finance_reviewer", `CIS for "${label}" has been endorsed and is ready for finance review.`);
  } else if (action === "returned") {
    rows.push({
      cisId,
      recipientId: cis.agentId,
      message: `Your CIS submission for "${label}" has been returned. Please review the note and submit a new form.`,
      type: "in_app",
    });
  } else if (action === "forwarded_to_finance") {
    await notifyRole("finance_reviewer", `CIS for "${label}" has been forwarded for finance review after legal clearance.`);
  } else if (action === "forwarded_to_approver") {
    await notifyRole("senior_approver", `CIS for "${label}" is ready for final approval.`);
  } else if (action === "approved") {
    rows.push({
      cisId,
      recipientId: cis.agentId,
      message: `Your CIS submission for "${label}" has been approved and is pending ERP encoding.`,
      type: "in_app",
    });
    await notifyRole("sales_support", `CIS for "${label}" has been approved. ERP encoding required.`);
    await notifyRole("admin", `CIS for "${label}" has been approved. ERP encoding required.`);
  } else if (action === "denied") {
    rows.push({
      cisId,
      recipientId: cis.agentId,
      message: `Your CIS submission for "${label}" has been denied. Please check the details for the reason.`,
      type: "in_app",
    });
    await notifyRole("sales_support", `CIS for "${label}" has been denied.`);
  } else if (action === "erp_encoded") {
    rows.push({
      cisId,
      recipientId: cis.agentId,
      message: `Customer "${label}" has been encoded in the ERP system. Onboarding is complete.`,
      type: "in_app",
    });
  }

  if (rows.length > 0) {
    await db.insert(notifications).values(rows);
  }
}
