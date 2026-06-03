import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { denySchema } from "@/lib/validations/cis";
import { transitionCis } from "@/lib/workflow";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "finance_reviewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [cis] = await db
    .select({ status: cisSubmissions.status })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cis.status !== "pending_finance_review") {
    return NextResponse.json({ error: "CIS is not pending finance review" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = denySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await transitionCis({
    cisId: id,
    toStatus: "denied",
    action: "denied",
    actorId: session.user.id,
    note: parsed.data.note,
  });

  return NextResponse.json({ success: true });
}
