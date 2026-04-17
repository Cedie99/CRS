import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { transitionCis } from "@/lib/workflow";

const agentSubmitSchema = z.object({
  customerType: z.enum(["dealer", "distributor", "private_label", "toll_blend", "end_user"], {
    error: "Customer type is required",
  }),
  agentAccountSpecialistFirst: z.string().max(255).optional().or(z.literal("")),
  agentAccountSpecialistLast: z.string().max(255).optional().or(z.literal("")),
  agentSalesSpecialist: z.string().max(255).optional().or(z.literal("")),
  agentSalesManager: z.string().max(255).optional().or(z.literal("")),
  agentTpcFirst: z.string().max(255).optional().or(z.literal("")),
  agentTpcLast: z.string().max(255).optional().or(z.literal("")),
  docAgentOtherRequirements: z.array(z.object({
    name: z.string(),
    url: z.string(),
    size: z.number(),
    type: z.string(),
    uploadedAt: z.string().optional(),
  })).optional(),
});

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

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      status: cisSubmissions.status,
      agentId: cisSubmissions.agentId,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cis.agentId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (cis.status !== "submitted") {
    return NextResponse.json({ error: "CIS is not pending agent fill-out" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = agentSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const {
    customerType, agentAccountSpecialistFirst, agentAccountSpecialistLast,
    agentSalesSpecialist, agentSalesManager, agentTpcFirst, agentTpcLast,
    docAgentOtherRequirements,
  } = parsed.data;

  // Save agent fill-out fields using schema compatibility checks.
  // Some deployments still run older cis_submissions schemas.
  const columnRows = await db.execute<{ column_name: string }>(sql`
    select column_name
    from information_schema.columns
    where table_schema = current_schema()
      and table_name = 'cis_submissions'
      and column_name in (
        'agent_account_specialist_first',
        'agent_account_specialist_last',
        'agent_sales_specialist',
        'agent_sales_manager',
        'agent_tpc_first',
        'agent_tpc_last',
        'doc_agent_other_requirements'
      )
  `);

  const existingColumns = new Set(
    (Array.isArray(columnRows)
      ? columnRows
      : (columnRows as { rows?: Array<{ column_name: string }> }).rows ?? []
    ).map((r) => r.column_name)
  );

  const updatePayload: Record<string, unknown> = {
    customerType,
    updatedAt: new Date(),
  };

  if (existingColumns.has("agent_account_specialist_first")) {
    updatePayload.agentAccountSpecialistFirst = agentAccountSpecialistFirst || null;
  }
  if (existingColumns.has("agent_account_specialist_last")) {
    updatePayload.agentAccountSpecialistLast = agentAccountSpecialistLast || null;
  }
  if (existingColumns.has("agent_sales_specialist")) {
    updatePayload.agentSalesSpecialist = agentSalesSpecialist || null;
  }
  if (existingColumns.has("agent_sales_manager")) {
    updatePayload.agentSalesManager = agentSalesManager || null;
  }
  if (existingColumns.has("agent_tpc_first")) {
    updatePayload.agentTpcFirst = agentTpcFirst || null;
  }
  if (existingColumns.has("agent_tpc_last")) {
    updatePayload.agentTpcLast = agentTpcLast || null;
  }
  if (existingColumns.has("doc_agent_other_requirements")) {
    updatePayload.docAgentOtherRequirements = docAgentOtherRequirements ?? null;
  }

  await db
    .update(cisSubmissions)
    .set(updatePayload as never)
    .where(eq(cisSubmissions.id, id));

  // Route: dealer → legal_approver (Maam Cha), others → finance_reviewer (Maam Nida)
  const isDealer = customerType === "dealer";
  const toStatus = isDealer ? "pending_legal_review" : "pending_finance_review";

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
    isDealer,
  });

  return NextResponse.json({ success: true });
}
