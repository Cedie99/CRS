import { NextResponse } from "next/server";
import { eq, and, ne, sql, count } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  users, cisSubmissions, workflowEvents, notifications,
  cusSubmissions, cusEvents, ctrSubmissions, ctrEvents,
} from "@/lib/db/schema";

const updateUserSchema = z.object({
  role: z.enum([
    "sales_agent", "rsr", "sales_manager", "rsr_manager",
    "finance_reviewer", "legal_approver", "senior_approver",
    "sales_support", "project_development_specialist", "admin",
  ]).optional(),
  agentType: z.enum(["sales_agent", "rsr"]).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  isTopManager: z.boolean().optional(),
  agentCode: z.string().nullable().optional(),
  password: z.string().min(8).optional(),
});

// PATCH /api/admin/users/[id] — activate + assign role/manager/agent code
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [existing] = await db
    .select({ id: users.id, agentCode: users.agentCode, role: users.role, agentType: users.agentType })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 12);
    updateData.mustChangePassword = true;
    delete updateData.password;
    // Bump sessionVersion to invalidate any existing sessions for this user
    updateData.sessionVersion = sql`${users.sessionVersion} + 1`;
  }

  const finalRole = parsed.data.role ?? existing.role;
  const isAgentRole = finalRole === "sales_agent" || finalRole === "rsr";

  // Validate agent code uniqueness if provided
  if (parsed.data.agentCode) {
    const code = parsed.data.agentCode;
    // Check not already assigned to a different user
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.agentCode, code), ne(users.id, id)))
      .limit(1);
    if (taken) {
      return NextResponse.json({ error: "This agent code is already assigned to another user" }, { status: 409 });
    }
    updateData.agentCode = code;
  } else if (!isAgentRole) {
    // Clear agent code if role is no longer an agent role
    updateData.agentCode = null;
  }

  // Bump sessionVersion when security-sensitive fields change (role, active state)
  if (parsed.data.role !== undefined || parsed.data.isActive !== undefined) {
    updateData.sessionVersion = sql`${users.sessionVersion} + 1`;
  }

  await db.update(users).set(updateData).where(eq(users.id, id));

  return NextResponse.json({ success: true, agentCode: (updateData.agentCode ?? existing.agentCode) ?? null });
}

// DELETE /api/admin/users/[id] — permanently delete a user
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  // Block if the user has any submissions or audit trail records that would
  // orphan meaningful data — check all three submission types and event tables.
  const [cisCount, cusCount, ctrCount, wfCount, cusEvCount, ctrEvCount] = await Promise.all([
    db.select({ total: count() }).from(cisSubmissions).where(eq(cisSubmissions.agentId, id)),
    db.select({ total: count() }).from(cusSubmissions).where(eq(cusSubmissions.agentId, id)),
    db.select({ total: count() }).from(ctrSubmissions).where(eq(ctrSubmissions.agentId, id)),
    db.select({ total: count() }).from(workflowEvents).where(eq(workflowEvents.actorId, id)),
    db.select({ total: count() }).from(cusEvents).where(eq(cusEvents.actorId, id)),
    db.select({ total: count() }).from(ctrEvents).where(eq(ctrEvents.actorId, id)),
  ]);

  const submissionTotal =
    Number(cisCount[0].total) + Number(cusCount[0].total) + Number(ctrCount[0].total);
  const eventTotal =
    Number(wfCount[0].total) + Number(cusEvCount[0].total) + Number(ctrEvCount[0].total);

  if (submissionTotal > 0) {
    return NextResponse.json(
      { error: `This user has ${submissionTotal} submission(s) on record. Deactivate them instead of deleting.` },
      { status: 409 }
    );
  }

  if (eventTotal > 0) {
    return NextResponse.json(
      { error: `This user has ${eventTotal} workflow action(s) in the audit trail. Deactivate them instead of deleting.` },
      { status: 409 }
    );
  }

  // Safe to delete — clean up dependent rows that carry no meaningful business data.
  // 1. Unassign any agents whose manager is this user.
  // 2. Delete their notifications.
  // 3. Delete the user.
  await db.update(users).set({ managerId: null }).where(eq(users.managerId, id));
  await db.delete(notifications).where(eq(notifications.recipientId, id));
  await db.delete(users).where(eq(users.id, id));

  return NextResponse.json({ success: true });
}
