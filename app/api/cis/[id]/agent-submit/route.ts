import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
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

  // Save agent fill-out fields
  await db
    .update(cisSubmissions)
    .set({
      customerType,
      agentAccountSpecialistFirst: agentAccountSpecialistFirst || null,
      agentAccountSpecialistLast: agentAccountSpecialistLast || null,
      agentSalesSpecialist: agentSalesSpecialist || null,
      agentSalesManager: agentSalesManager || null,
      agentTpcFirst: agentTpcFirst || null,
      agentTpcLast: agentTpcLast || null,
      docAgentOtherRequirements: docAgentOtherRequirements ?? null,
      updatedAt: new Date(),
    })
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
