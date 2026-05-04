import { NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users, workflowEvents } from "@/lib/db/schema";
import { transitionCis } from "@/lib/workflow";

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
  if (cis.status !== "returned") {
    return NextResponse.json({ error: "CIS is not in returned status" }, { status: 409 });
  }

  // Find the last returned event to determine who returned it
  const [returnedEvent] = await db
    .select({
      actorId: workflowEvents.actorId,
    })
    .from(workflowEvents)
    .where(and(eq(workflowEvents.cisId, id), eq(workflowEvents.action, "returned")))
    .orderBy(desc(workflowEvents.createdAt))
    .limit(1);

  if (!returnedEvent) {
    return NextResponse.json({ error: "No returned event found" }, { status: 409 });
  }

  // Get the actor's role to determine where to route
  const [actor] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, returnedEvent.actorId))
    .limit(1);

  if (!actor) {
    return NextResponse.json({ error: "Actor not found" }, { status: 409 });
  }

  // Route back to the appropriate reviewer
  let toStatus: "pending_finance_review" | "pending_legal_review";
  if (actor.role === "finance_reviewer") {
    toStatus = "pending_finance_review";
  } else if (actor.role === "legal_approver") {
    toStatus = "pending_legal_review";
  } else if (actor.role === "sales_manager" || actor.role === "rsr_manager") {
    // If manager returned, route based on customer type
    const isDealer = cis.customerType === "dealer";
    toStatus = isDealer ? "pending_legal_review" : "pending_finance_review";
  } else {
    return NextResponse.json({ error: "Invalid actor role for routing" }, { status: 409 });
  }

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
  });

  return NextResponse.json({ success: true });
}
