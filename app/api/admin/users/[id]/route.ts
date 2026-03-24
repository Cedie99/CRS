import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const updateUserSchema = z.object({
  role: z.enum([
    "sales_agent", "rsr", "sales_manager", "rsr_manager",
    "finance_reviewer", "legal_approver", "senior_approver",
    "sales_support", "admin",
  ]).optional(),
  agentCode: z.string().max(50).nullable().optional(),
  agentType: z.enum(["sales_agent", "rsr"]).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
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
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await db.update(users).set(parsed.data).where(eq(users.id, id));

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users/[id] — deactivate a user
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Prevent self-deactivation
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
  }

  await db.update(users).set({ isActive: false }).where(eq(users.id, id));

  return NextResponse.json({ success: true });
}
