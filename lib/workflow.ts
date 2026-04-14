import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cisSubmissions, workflowEvents, notifications, users } from "@/lib/db/schema";
import {
  sendWorkflowEmails,
  buildEmailHtml,
  type WorkflowEmailJob,
  type EmailContentOpts,
} from "@/lib/email";

type CisStatus = typeof cisSubmissions.$inferSelect["status"];
type WorkflowAction = typeof workflowEvents.$inferSelect["action"];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
  const emailJobs = await db.transaction(async (tx) => {
    await tx
      .update(cisSubmissions)
      .set({ status: toStatus, updatedAt: new Date() })
      .where(eq(cisSubmissions.id, cisId));

    await tx.insert(workflowEvents).values({
      cisId,
      actorId,
      action,
      note: note ?? null,
    });

    return notifyParties({ cisId, action, managerId, tx });
  });

  await sendWorkflowEmails(emailJobs);
}

async function notifyParties({
  cisId,
  action,
  managerId,
  tx,
}: {
  cisId: string;
  action: WorkflowAction;
  managerId?: string | null;
  tx: Tx;
}) {
  const [cis] = await tx
    .select({
      agentId: cisSubmissions.agentId,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      emailAddress: cisSubmissions.emailAddress,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, cisId))
    .limit(1);

  if (!cis) return [];

  const label = cis.tradeName ?? cisId.slice(0, 8);
  const rows: (typeof notifications.$inferInsert)[] = [];
  const emailJobs: WorkflowEmailJob[] = [];
  const appUrl =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  const [agent] = await tx
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, cis.agentId))
    .limit(1);

  // Push an in-app + HTML email notification to a single user
  function addNotification(
    recipientId: string,
    inAppMessage: string,
    email: string | null | undefined,
    emailSubject: string,
    opts: Omit<EmailContentOpts, "cisId">,
  ) {
    rows.push({ cisId, recipientId, message: inAppMessage, type: "in_app" });
    if (email) {
      const text = [
        `Hello ${opts.name},`,
        "",
        opts.body,
        `CIS ID: ${cisId}`,
        opts.reviewUrl ? `${opts.ctaLabel ?? "View"}: ${opts.reviewUrl}` : "",
        "",
        "This is an automated notification from the Oracle Petroleum CRS.",
      ]
        .filter(Boolean)
        .join("\n");

      emailJobs.push({
        to: email,
        subject: emailSubject,
        text,
        html: buildEmailHtml({ ...opts, cisId }),
      });
    }
  }

  // Push in-app + HTML email notifications to all users with a given role
  async function notifyRole(
    role: string,
    inAppMessage: string,
    emailSubject: string,
    dashPath: string,
    optsFn: (name: string, reviewUrl: string | null) => Omit<EmailContentOpts, "cisId" | "name" | "reviewUrl">,
  ) {
    const recipients = await tx
      .select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.role, role as any));

    for (const r of recipients) {
      const reviewUrl = appUrl ? `${appUrl}/${dashPath}/${cisId}` : null;
      addNotification(r.id, inAppMessage, r.email, emailSubject, {
        name: r.fullName,
        reviewUrl,
        ...optsFn(r.fullName, reviewUrl),
      });
    }
  }

  if (action === "submitted") {
    // Notify the agent's manager
    if (managerId) {
      const [manager] = await tx
        .select({ id: users.id, email: users.email, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, managerId))
        .limit(1);

      const reviewUrl = appUrl ? `${appUrl}/manager/${cisId}` : null;
      addNotification(
        manager?.id ?? managerId,
        `A new CIS form for "${label}" from your agent is pending your endorsement.`,
        manager?.email,
        `[CRS] New CIS pending endorsement: ${label}`,
        {
          name: manager?.fullName ?? "there",
          title: "New CIS Pending Endorsement",
          body: `A customer form for <strong>${label}</strong> has been submitted by your agent and is now awaiting your endorsement.`,
          reviewUrl,
          ctaLabel: "Review & Endorse",
          accentColor: "#0f2340",
        },
      );
    }

    // Notify the customer — confirmation of their submission
    if (cis.emailAddress) {
      const customerName = cis.contactPerson ?? "Valued Customer";
      emailJobs.push({
        to: cis.emailAddress,
        subject: `[CRS] Your CIS form has been received: ${label}`,
        text: [
          `Hello ${customerName},`,
          "",
          `Thank you for completing your Customer Information Sheet for ${label}.`,
          "Your application has been received and is currently under review by our team.",
          "We will notify you of any updates as your application progresses.",
          "",
          "This is an automated notification from the Oracle Petroleum CRS.",
        ].join("\n"),
        html: buildEmailHtml({
          name: customerName,
          title: "Form Received – Under Review",
          body: `Thank you for completing your Customer Information Sheet for <strong>${label}</strong>. Your application has been received and is currently under review by our team. We will keep you informed as your application progresses.`,
          cisId,
          accentColor: "#1a6e3c",
        }),
      });
    }

    // Notify the agent their customer completed the form
    if (agent) {
      const viewUrl = appUrl ? `${appUrl}/agent/${cisId}` : null;
      addNotification(
        agent.id,
        `Your customer has completed the CIS form for "${label}". It is now pending endorsement.`,
        agent.email,
        `[CRS] Customer completed CIS form: ${label}`,
        {
          name: agent.fullName,
          title: "Customer Form Completed",
          body: `Your customer has completed and signed the CIS form for <strong>${label}</strong>. The form is now pending manager endorsement.`,
          reviewUrl: viewUrl,
          ctaLabel: "View Form",
          accentColor: "#1a6e3c",
        },
      );
    }
  } else if (action === "forwarded_to_legal") {
    await notifyRole(
      "legal_approver",
      `A new CIS for "${label}" requires legal review.`,
      `[CRS] CIS pending legal review: ${label}`,
      "legal",
      (_name, _url) => ({
        title: "CIS Pending Legal Review",
        body: `A CIS form for <strong>${label}</strong> has been forwarded for your legal review.`,
        ctaLabel: "Review Now",
        accentColor: "#0f2340",
      }),
    );
  } else if (action === "endorsed") {
    await notifyRole(
      "finance_reviewer",
      `CIS for "${label}" has been endorsed and is ready for finance review.`,
      `[CRS] CIS endorsed – pending finance review: ${label}`,
      "finance",
      (_name, _url) => ({
        title: "CIS Ready for Finance Review",
        body: `A CIS form for <strong>${label}</strong> has been endorsed by the manager and is now pending finance review.`,
        ctaLabel: "Review Now",
        accentColor: "#0f2340",
      }),
    );
  } else if (action === "returned") {
    if (agent) {
      const viewUrl = appUrl ? `${appUrl}/agent/${cisId}` : null;
      addNotification(
        agent.id,
        `Your CIS submission for "${label}" has been returned. Please review the note and submit a new form.`,
        agent.email,
        `[CRS] CIS returned: ${label}`,
        {
          name: agent.fullName,
          title: "CIS Returned",
          body: `Your CIS submission for <strong>${label}</strong> has been returned. Please review the manager's note and submit a new form.`,
          reviewUrl: viewUrl,
          ctaLabel: "View Form",
          accentColor: "#c17a00",
        },
      );
    }
  } else if (action === "forwarded_to_finance") {
    await notifyRole(
      "finance_reviewer",
      `CIS for "${label}" has been forwarded for finance review after legal clearance.`,
      `[CRS] CIS forwarded to finance (post-legal): ${label}`,
      "finance",
      (_name, _url) => ({
        title: "CIS Forwarded to Finance",
        body: `A CIS form for <strong>${label}</strong> has cleared legal review and is now pending finance review.`,
        ctaLabel: "Review Now",
        accentColor: "#0f2340",
      }),
    );
  } else if (action === "forwarded_to_approver") {
    await notifyRole(
      "senior_approver",
      `CIS for "${label}" is ready for final approval.`,
      `[CRS] CIS pending final approval: ${label}`,
      "approver",
      (_name, _url) => ({
        title: "CIS Pending Final Approval",
        body: `A CIS form for <strong>${label}</strong> is ready for your final approval.`,
        ctaLabel: "Review & Approve",
        accentColor: "#0f2340",
      }),
    );
  } else if (action === "approved") {
    if (agent) {
      const viewUrl = appUrl ? `${appUrl}/agent/${cisId}` : null;
      addNotification(
        agent.id,
        `Your CIS submission for "${label}" has been approved and is pending ERP encoding.`,
        agent.email,
        `[CRS] CIS approved: ${label}`,
        {
          name: agent.fullName,
          title: "CIS Approved",
          body: `Great news! Your CIS submission for <strong>${label}</strong> has been approved and is now pending ERP encoding.`,
          reviewUrl: viewUrl,
          ctaLabel: "View Form",
          accentColor: "#1a6e3c",
        },
      );
    }
    await notifyRole(
      "sales_support",
      `CIS for "${label}" has been approved. ERP encoding required.`,
      `[CRS] CIS approved – ERP encoding required: ${label}`,
      "support",
      (_name, _url) => ({
        title: "CIS Approved – ERP Encoding Required",
        body: `CIS for <strong>${label}</strong> has been approved. Please proceed with ERP encoding.`,
        ctaLabel: "View Form",
        accentColor: "#1a6e3c",
      }),
    );
    await notifyRole(
      "admin",
      `CIS for "${label}" has been approved. ERP encoding required.`,
      `[CRS] CIS approved – ERP encoding required: ${label}`,
      "admin",
      (_name, _url) => ({
        title: "CIS Approved – ERP Encoding Required",
        body: `CIS for <strong>${label}</strong> has been approved. Please proceed with ERP encoding.`,
        ctaLabel: "View Form",
        accentColor: "#1a6e3c",
      }),
    );
  } else if (action === "denied") {
    if (agent) {
      const viewUrl = appUrl ? `${appUrl}/agent/${cisId}` : null;
      addNotification(
        agent.id,
        `Your CIS submission for "${label}" has been denied. Please check the details for the reason.`,
        agent.email,
        `[CRS] CIS denied: ${label}`,
        {
          name: agent.fullName,
          title: "CIS Denied",
          body: `Your CIS submission for <strong>${label}</strong> has been denied. Please check the form details for the reason.`,
          reviewUrl: viewUrl,
          ctaLabel: "View Form",
          accentColor: "#8b2020",
        },
      );
    }
    await notifyRole(
      "sales_support",
      `CIS for "${label}" has been denied.`,
      `[CRS] CIS denied: ${label}`,
      "support",
      (_name, _url) => ({
        title: "CIS Denied",
        body: `CIS for <strong>${label}</strong> has been denied.`,
        ctaLabel: "View Form",
        accentColor: "#8b2020",
      }),
    );
  } else if (action === "erp_encoded") {
    if (agent) {
      const viewUrl = appUrl ? `${appUrl}/agent/${cisId}` : null;
      addNotification(
        agent.id,
        `Customer "${label}" has been encoded in the ERP system. Onboarding is complete.`,
        agent.email,
        `[CRS] Customer onboarded – ERP encoded: ${label}`,
        {
          name: agent.fullName,
          title: "Customer Onboarding Complete",
          body: `Customer <strong>${label}</strong> has been successfully encoded in the ERP system. Onboarding is complete.`,
          reviewUrl: viewUrl,
          ctaLabel: "View Form",
          accentColor: "#1a6e3c",
        },
      );
    }
  }

  if (rows.length > 0) {
    await tx.insert(notifications).values(rows);
  }

  return emailJobs;
}
