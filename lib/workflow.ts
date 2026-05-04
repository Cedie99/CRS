import { eq, sql } from "drizzle-orm";
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

const WORKFLOW_ACTION_FALLBACK: Partial<Record<WorkflowAction, WorkflowAction>> = {
  // Older DB enum does not include this value yet.
  // Persist as "submitted" so transition can continue on legacy schemas.
  agent_submitted: "submitted",
};

async function resolvePersistedWorkflowAction(tx: Tx, action: WorkflowAction): Promise<WorkflowAction> {
  const rows = await tx.execute<{ enumlabel: string }>(sql`
    select e.enumlabel
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'workflow_action'
  `);

  const values = new Set(
    (Array.isArray(rows)
      ? rows
      : (rows as { rows?: Array<{ enumlabel: string }> }).rows ?? []
    ).map((r) => r.enumlabel)
  );

  if (values.has(action)) return action;
  const fallback = WORKFLOW_ACTION_FALLBACK[action];
  if (fallback && values.has(fallback)) return fallback;
  return action;
}

export async function transitionCis({
  cisId,
  toStatus,
  action,
  actorId,
  note,
  managerId,
  isDealer,
}: {
  cisId: string;
  toStatus: CisStatus;
  action: WorkflowAction;
  actorId: string;
  note?: string;
  managerId?: string | null;
  isDealer?: boolean;
}) {
  const emailJobs = await db.transaction(async (tx) => {
    const persistedAction = await resolvePersistedWorkflowAction(tx, action);

    await tx
      .update(cisSubmissions)
      .set({ status: toStatus, updatedAt: new Date() })
      .where(eq(cisSubmissions.id, cisId));

    await tx.insert(workflowEvents).values({
      cisId,
      actorId,
      action: persistedAction,
      note: note ?? null,
    });

    return notifyParties({ cisId, action, managerId, isDealer, actorId, tx });
  });

  await sendWorkflowEmails(emailJobs);
}

async function notifyParties({
  cisId,
  action,
  managerId,
  isDealer,
  actorId,
  tx,
}: {
  cisId: string;
  action: WorkflowAction;
  managerId?: string | null;
  isDealer?: boolean;
  actorId?: string;
  tx: Tx;
}) {
  const CUSTOMER_TYPE_LABELS: Record<string, string> = {
    dealer: "Dealer",
    distributor: "Distributor",
    private_label: "Private Label",
    toll_blend: "Toll Blend",
    end_user: "End User",
  };

  const [cis] = await tx
    .select({
      agentId: cisSubmissions.agentId,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      emailAddress: cisSubmissions.emailAddress,
      customerType: cisSubmissions.customerType,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, cisId))
    .limit(1);

  if (!cis) return [];

  const label = cis.tradeName ?? cisId.slice(0, 8);
  const custType = cis.customerType ? (CUSTOMER_TYPE_LABELS[cis.customerType] ?? cis.customerType) : "Pending";
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
    // Notify the customer — confirmation of their submission
    if (cis.emailAddress) {
      const customerName = cis.contactPerson ?? "Valued Customer";
      emailJobs.push({
        to: cis.emailAddress,
        subject: `[CRS] Your CIS form has been received – ${label}`,
        text: [
          `Hello ${customerName},`,
          "",
          `Thank you for completing your Customer Information Sheet for ${label}.`,
          "Your form has been successfully received. Our assigned agent will now review and complete the remaining details on your behalf.",
          "",
          "You will receive another notification once your application moves to the next stage of the approval process.",
          "",
          `Business Name: ${label}`,
          `CIS ID: ${cisId}`,
          "",
          "If you have any questions, please contact your assigned sales agent.",
          "",
          "This is an automated notification from the Oracle Petroleum CRS.",
        ].join("\n"),
        html: buildEmailHtml({
          name: customerName,
          title: "CIS Form Received",
          body: `Thank you for completing your Customer Information Sheet. Your form has been successfully received and your assigned agent will now review and complete the remaining details on your behalf.<br><br>You will receive another notification once your application moves to the next stage of the approval process. If you have any questions, please contact your assigned sales agent.`,
          cisId,
          accentColor: "#1a6e3c",
          statusBadge: { label: "Received", color: "#16a34a" },
          details: [
            { label: "Business Name", value: label },
            { label: "Contact Person", value: cis.contactPerson ?? "—" },
          ],
        }),
      });
    }

    // Notify the agent their customer completed the form
    if (agent) {
      const viewUrl = appUrl ? `${appUrl}/agent/${cisId}` : null;
      addNotification(
        agent.id,
        `Your customer "${label}" has completed the CIS form. Please fill out the agent section.`,
        agent.email,
        `[CRS] Action required – Complete agent section: ${label}`,
        {
          name: agent.fullName,
          title: "Customer Form Completed – Your Action Needed",
          body: `Your customer has completed and signed the CIS form for <strong>${label}</strong>.<br><br>Please log in and fill out the <strong>Agent Section</strong> — including the customer type classification and account specialist details — so the form can be routed for review.`,
          reviewUrl: viewUrl,
          ctaLabel: "Fill Out Agent Section",
          accentColor: "#1a6e3c",
          details: [
            { label: "Business Name", value: label },
            { label: "Contact Person", value: cis.contactPerson ?? "—" },
          ],
        },
      );
    }
  } else if (action === "agent_submitted") {
    // Notify manager (informational only — no action required)
    if (managerId) {
      const [manager] = await tx
        .select({ id: users.id, email: users.email, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, managerId))
        .limit(1);

      const viewUrl = appUrl ? `${appUrl}/manager/${cisId}` : null;
      addNotification(
        manager?.id ?? managerId,
        `CIS form for "${label}" (${custType}) has been submitted by ${agent?.fullName ?? "an agent"} and is now in review.`,
        manager?.email,
        `[CRS] New CIS submitted by your agent – ${label}`,
        {
          name: manager?.fullName ?? "there",
          title: "New CIS Submitted by Your Agent",
          body: `A Customer Information Sheet for <strong>${label}</strong> has been submitted by <strong>${agent?.fullName ?? "your agent"}</strong> and is now in the approval pipeline.<br><br>This notification is for your awareness only — no action is required from you at this time. You can view the full form details below.`,
          reviewUrl: viewUrl,
          ctaLabel: "View Submission",
          accentColor: "#0f2340",
          statusBadge: { label: "In Review", color: "#2563eb" },
          details: [
            { label: "Business Name", value: label },
            { label: "Customer Type", value: custType },
            { label: "Contact Person", value: cis.contactPerson ?? "—" },
            { label: "Submitted By", value: agent?.fullName ?? "—" },
          ],
        },
      );
    }

    // Notify the appropriate reviewer
    if (isDealer) {
      await notifyRole(
        "legal_approver",
        `New CIS for "${label}" (Dealer) requires your legal review.`,
        `[CRS] Action required – Legal review: ${label}`,
        "legal",
        (_name, _url) => ({
          title: "New CIS Pending Your Legal Review",
          body: `A new Customer Information Sheet for <strong>${label}</strong> has been submitted and requires your legal review.<br><br>This is a <strong>Dealer</strong> account and must pass legal clearance before proceeding to finance. Please review the customer details and supporting documents, then approve or deny the submission.`,
          ctaLabel: "Review Now",
          accentColor: "#0f2340",
          statusBadge: { label: "Pending Legal Review", color: "#d97706" },
          details: [
            { label: "Business Name", value: label },
            { label: "Customer Type", value: "Dealer" },
            { label: "Contact Person", value: cis.contactPerson ?? "—" },
            { label: "Agent", value: agent?.fullName ?? "—" },
          ],
        }),
      );
    } else {
      await notifyRole(
        "finance_reviewer",
        `New CIS for "${label}" (${custType}) requires your finance review.`,
        `[CRS] Action required – Finance review: ${label}`,
        "finance",
        (_name, _url) => ({
          title: "New CIS Pending Your Finance Review",
          body: `A new Customer Information Sheet for <strong>${label}</strong> has been submitted and requires your finance review.<br><br>Please review the customer details, set the credit limit and terms, print and obtain the required signature, then approve or deny the submission.`,
          ctaLabel: "Review Now",
          accentColor: "#0f2340",
          statusBadge: { label: "Pending Finance Review", color: "#d97706" },
          details: [
            { label: "Business Name", value: label },
            { label: "Customer Type", value: custType },
            { label: "Contact Person", value: cis.contactPerson ?? "—" },
            { label: "Agent", value: agent?.fullName ?? "—" },
          ],
        }),
      );
    }
  } else if (action === "forwarded_to_legal") {
    await notifyRole(
      "legal_approver",
      `New CIS for "${label}" (${custType}) requires your legal review.`,
      `[CRS] Action required – Legal review: ${label}`,
      "legal",
      (_name, _url) => ({
        title: "CIS Forwarded for Legal Review",
        body: `A Customer Information Sheet for <strong>${label}</strong> has been forwarded and requires your legal review.<br><br>Please review the customer details and supporting documents, then approve or deny the submission.`,
        ctaLabel: "Review Now",
        accentColor: "#0f2340",
        statusBadge: { label: "Pending Legal Review", color: "#d97706" },
        details: [
          { label: "Business Name", value: label },
          { label: "Customer Type", value: custType },
          { label: "Contact Person", value: cis.contactPerson ?? "—" },
          { label: "Agent", value: agent?.fullName ?? "—" },
        ],
      }),
    );
  } else if (action === "endorsed") {
    await notifyRole(
      "finance_reviewer",
      `CIS for "${label}" (${custType}) has been endorsed and is ready for your finance review.`,
      `[CRS] Action required – Finance review: ${label}`,
      "finance",
      (_name, _url) => ({
        title: "CIS Endorsed – Ready for Finance Review",
        body: `A Customer Information Sheet for <strong>${label}</strong> has been endorsed by the manager and is now awaiting your finance review.<br><br>Please review the customer details, set the credit limit and terms, then approve or deny the submission.`,
        ctaLabel: "Review Now",
        accentColor: "#0f2340",
        statusBadge: { label: "Pending Finance Review", color: "#d97706" },
        details: [
          { label: "Business Name", value: label },
          { label: "Customer Type", value: custType },
          { label: "Contact Person", value: cis.contactPerson ?? "—" },
          { label: "Agent", value: agent?.fullName ?? "—" },
        ],
      }),
    );
  } else if (action === "returned") {
    if (agent) {
      const viewUrl = appUrl ? `${appUrl}/agent/${cisId}` : null;

      // Fetch actor's role to customize message
      let actorRole: string | null = null;
      if (actorId) {
        const [actor] = await tx
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, actorId))
          .limit(1);
        actorRole = actor?.role ?? null;
      }

      // Customize message based on who returned it
      const isFinanceOrLegal = actorRole === "finance_reviewer" || actorRole === "legal_approver";
      const reviewerType = isFinanceOrLegal
        ? (actorRole === "finance_reviewer" ? "Finance" : "Legal")
        : "Manager";

      addNotification(
        agent.id,
        `Your CIS submission for "${label}" has been returned by ${reviewerType}. Please review the note and resubmit.`,
        agent.email,
        `[CRS] Action required – CIS returned by ${reviewerType}: ${label}`,
        {
          name: agent.fullName,
          title: `CIS Returned by ${reviewerType} – Revisions Needed`,
          body: `Your CIS submission for <strong>${label}</strong> has been returned by <strong>${reviewerType}</strong> and requires your attention.<br><br>${isFinanceOrLegal ? "This is likely due to document issues or incomplete information." : ""}Please review the reviewer's note for details on what needs to be corrected, then resubmit the form once the changes have been made.`,
          reviewUrl: viewUrl,
          ctaLabel: "Review & Resubmit",
          accentColor: "#c17a00",
          statusBadge: { label: "Returned", color: "#d97706" },
          details: [
            { label: "Business Name", value: label },
            { label: "Customer Type", value: custType },
            { label: "Returned By", value: reviewerType },
          ],
        },
      );
    }
  } else if (action === "forwarded_to_finance") {
    await notifyRole(
      "finance_reviewer",
      `CIS for "${label}" (${custType}) has cleared legal review and requires your finance review.`,
      `[CRS] Action required – Finance review (post-legal): ${label}`,
      "finance",
      (_name, _url) => ({
        title: "CIS Cleared Legal – Pending Finance Review",
        body: `A Customer Information Sheet for <strong>${label}</strong> has passed legal review and is now awaiting your finance decision.<br><br>Please review the customer details, set the credit limit and terms, print and obtain the CFO signature, then approve or deny the submission.`,
        ctaLabel: "Review Now",
        accentColor: "#0f2340",
        statusBadge: { label: "Pending Finance Review", color: "#d97706" },
        details: [
          { label: "Business Name", value: label },
          { label: "Customer Type", value: custType },
          { label: "Contact Person", value: cis.contactPerson ?? "—" },
          { label: "Agent", value: agent?.fullName ?? "—" },
          { label: "Legal Status", value: "Cleared" },
        ],
      }),
    );
  } else if (action === "forwarded_to_approver") {
    await notifyRole(
      "senior_approver",
      `CIS for "${label}" (${custType}) has been reviewed by Finance and is ready for your final approval.`,
      `[CRS] Action required – Final approval: ${label}`,
      "approver",
      (_name, _url) => ({
        title: "CIS Pending Your Final Approval",
        body: `A Customer Information Sheet for <strong>${label}</strong> has been reviewed and approved by Finance and is now awaiting your final decision.<br><br>Please review the complete form — including the customer details, agent section, and finance credit evaluation — then approve or deny the submission.`,
        ctaLabel: "Review & Approve",
        accentColor: "#0f2340",
        statusBadge: { label: "Pending Final Approval", color: "#7c3aed" },
        details: [
          { label: "Business Name", value: label },
          { label: "Customer Type", value: custType },
          { label: "Contact Person", value: cis.contactPerson ?? "—" },
          { label: "Agent", value: agent?.fullName ?? "—" },
          { label: "Finance Status", value: "Approved" },
        ],
      }),
    );
  } else if (action === "sales_support_submitted") {
    await notifyRole(
      "project_development_specialist",
      `CIS for "${label}" (${custType}) is ready for ERP encoding.`,
      `[CRS] Action required – ERP encoding: ${label}`,
      "specialist",
      (_name, _url) => ({
        title: "CIS Ready for ERP Encoding",
        body: `A Customer Information Sheet for <strong>${label}</strong> has completed all approval stages and Sales Support has finished their section.<br><br>Please review the full form details and mark the customer as <strong>Encoded in ERP</strong> once complete. The agent will be notified automatically upon encoding.`,
        ctaLabel: "Encode Now",
        accentColor: "#3730a3",
        statusBadge: { label: "Pending ERP Encoding", color: "#4f46e5" },
        details: [
          { label: "Business Name", value: label },
          { label: "Customer Type", value: custType },
          { label: "Contact Person", value: cis.contactPerson ?? "—" },
          { label: "Agent", value: agent?.fullName ?? "—" },
        ],
      }),
    );
  } else if (action === "approved") {
    if (agent) {
      const viewUrl = appUrl ? `${appUrl}/agent/${cisId}` : null;
      addNotification(
        agent.id,
        `Great news! Your CIS for "${label}" (${custType}) has been approved by the Senior Approver.`,
        agent.email,
        `[CRS] CIS approved – ${label}`,
        {
          name: agent.fullName,
          title: "CIS Approved by Senior Approver",
          body: `Great news — the Customer Information Sheet for <strong>${label}</strong> has been approved by the Senior Approver.<br><br>The form will now proceed to Sales Support for final processing and ERP encoding. You will receive one more notification once the customer has been fully onboarded in the system.`,
          reviewUrl: viewUrl,
          ctaLabel: "View Submission",
          accentColor: "#1a6e3c",
          statusBadge: { label: "Approved", color: "#16a34a" },
          details: [
            { label: "Business Name", value: label },
            { label: "Customer Type", value: custType },
            { label: "Contact Person", value: cis.contactPerson ?? "—" },
          ],
        },
      );
    }
    await notifyRole(
      "sales_support",
      `CIS for "${label}" (${custType}) has been approved. Please fill out the Sales Support section.`,
      `[CRS] Action required – Sales Support fill-out: ${label}`,
      "support",
      (_name, _url) => ({
        title: "CIS Approved – Sales Support Fill-Out Needed",
        body: `A Customer Information Sheet for <strong>${label}</strong> has been approved by the Senior Approver and is now assigned to Sales Support.<br><br>Please fill out your section — including account type, price list, sales type, and VAT code — then submit to move the form to ERP encoding.`,
        ctaLabel: "Fill Out Now",
        accentColor: "#1a6e3c",
        statusBadge: { label: "Pending Sales Support", color: "#2563eb" },
        details: [
          { label: "Business Name", value: label },
          { label: "Customer Type", value: custType },
          { label: "Contact Person", value: cis.contactPerson ?? "—" },
          { label: "Agent", value: agent?.fullName ?? "—" },
        ],
      }),
    );
    await notifyRole(
      "admin",
      `CIS for "${label}" (${custType}) has been approved and is pending Sales Support fill-out.`,
      `[CRS] CIS approved – pending Sales Support: ${label}`,
      "admin",
      (_name, _url) => ({
        title: "CIS Approved – Pending Sales Support",
        body: `A Customer Information Sheet for <strong>${label}</strong> has been approved by the Senior Approver and is now pending Sales Support fill-out before ERP encoding.`,
        ctaLabel: "View Form",
        accentColor: "#1a6e3c",
        statusBadge: { label: "Approved", color: "#16a34a" },
        details: [
          { label: "Business Name", value: label },
          { label: "Customer Type", value: custType },
          { label: "Agent", value: agent?.fullName ?? "—" },
        ],
      }),
    );
  } else if (action === "denied") {
    if (agent) {
      const viewUrl = appUrl ? `${appUrl}/agent/${cisId}` : null;
      addNotification(
        agent.id,
        `Your CIS submission for "${label}" (${custType}) has been denied. Please check the denial reason.`,
        agent.email,
        `[CRS] CIS denied – ${label}`,
        {
          name: agent.fullName,
          title: "CIS Submission Denied",
          body: `Unfortunately, the Customer Information Sheet for <strong>${label}</strong> has been denied.<br><br>Please review the denial reason in the activity log. If the denial is due to missing or incomplete requirements, you may coordinate with your customer to gather the necessary documents and submit a new application.`,
          reviewUrl: viewUrl,
          ctaLabel: "View Denial Details",
          accentColor: "#8b2020",
          statusBadge: { label: "Denied", color: "#dc2626" },
          details: [
            { label: "Business Name", value: label },
            { label: "Customer Type", value: custType },
            { label: "Contact Person", value: cis.contactPerson ?? "—" },
          ],
        },
      );
    }
    await notifyRole(
      "sales_support",
      `CIS for "${label}" (${custType}) has been denied.`,
      `[CRS] CIS denied – ${label}`,
      "support",
      (_name, _url) => ({
        title: "CIS Submission Denied",
        body: `The Customer Information Sheet for <strong>${label}</strong> has been denied. No further action is required from Sales Support for this submission.`,
        ctaLabel: "View Form",
        accentColor: "#8b2020",
        statusBadge: { label: "Denied", color: "#dc2626" },
        details: [
          { label: "Business Name", value: label },
          { label: "Customer Type", value: custType },
          { label: "Agent", value: agent?.fullName ?? "—" },
        ],
      }),
    );
  } else if (action === "erp_encoded") {
    if (agent) {
      const viewUrl = appUrl ? `${appUrl}/agent/${cisId}` : null;
      addNotification(
        agent.id,
        `Customer "${label}" (${custType}) has been encoded in the ERP system. Onboarding is complete!`,
        agent.email,
        `[CRS] Onboarding complete – ${label}`,
        {
          name: agent.fullName,
          title: "Customer Onboarding Complete",
          body: `The Customer Information Sheet for <strong>${label}</strong> has been successfully encoded in the ERP system.<br><br>The entire registration process is now <strong>complete</strong>. The customer is fully onboarded and ready for transactions. No further action is required.`,
          reviewUrl: viewUrl,
          ctaLabel: "View Completed Form",
          accentColor: "#1a6e3c",
          statusBadge: { label: "ERP Encoded", color: "#16a34a" },
          details: [
            { label: "Business Name", value: label },
            { label: "Customer Type", value: custType },
            { label: "Contact Person", value: cis.contactPerson ?? "—" },
            { label: "Status", value: "Onboarding Complete" },
          ],
        },
      );
    }
  }

  if (rows.length > 0) {
    await tx.insert(notifications).values(rows);
  }

  return emailJobs;
}
