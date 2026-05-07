import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { transitionCis } from "@/lib/workflow";

const agentSubmitSchema = z.object({
  agentAccountSpecialistFirst: z.string().min(1, "Account Specialist first name is required").max(255),
  agentAccountSpecialistLast: z.string().min(1, "Account Specialist last name is required").max(255),
  agentSalesSpecialist: z.string().min(1, "Sales Specialist is required").max(255),
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
      customerType: cisSubmissions.customerType,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cis.agentId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!cis.customerType) {
    return NextResponse.json({ error: "Customer type not set on this submission" }, { status: 422 });
  }
  if (cis.status !== "submitted") {
    return NextResponse.json({ error: "CIS is not pending agent fill-out" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = agentSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const {
    agentAccountSpecialistFirst, agentAccountSpecialistLast,
    agentSalesSpecialist, agentTpcFirst, agentTpcLast,
    docAgentOtherRequirements,
  } = parsed.data;

  const customerType = cis.customerType;

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
  // Use the admin-assigned manager instead of a user-provided value.
  const [agent] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  let managerName: string | null = null;
  if (agent?.managerId) {
    const [manager] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, agent.managerId))
      .limit(1);
    managerName = manager?.fullName ?? null;
  }

  if (existingColumns.has("agent_sales_manager")) {
    updatePayload.agentSalesManager = managerName;
  }
  if (existingColumns.has("agent_tpc_first")) {
    updatePayload.agentTpcFirst = agentTpcFirst || null;
  }
  if (existingColumns.has("agent_tpc_last")) {
    updatePayload.agentTpcLast = agentTpcLast || null;
  }
  if (existingColumns.has("doc_agent_other_requirements") && docAgentOtherRequirements !== undefined) {
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
