import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";
import { returnSchema } from "@/lib/validations/cis";
import { transitionCis } from "@/lib/workflow";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "sales_manager" && role !== "rsr_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [cis] = await db
    .select({ status: cisSubmissions.status, agentId: cisSubmissions.agentId })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cis.status !== "pending_endorsement") {
    return NextResponse.json({ error: "CIS is not pending endorsement" }, { status: 409 });
  }

  const [agent] = await db
    .select({ managerId: users.managerId })
    .from(users)
    .where(eq(users.id, cis.agentId))
    .limit(1);

  if (!agent || agent.managerId !== userId) {
    return NextResponse.json({ error: "This submission does not belong to your agents" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = returnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await transitionCis({
    cisId: id,
    toStatus: "returned",
    action: "returned",
    actorId: userId,
    note: parsed.data.note,
  });

  return NextResponse.json({ success: true });
}
