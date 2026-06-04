import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { transitionCis } from "@/lib/workflow";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "project_development_specialist") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const customerCode = typeof body.customerCode === "string" ? body.customerCode.trim() : "";

  if (!customerCode) {
    return NextResponse.json({ error: "Customer code is required." }, { status: 400 });
  }

  const [cis] = await db
    .select({ status: cisSubmissions.status })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cis.status !== "pending_erp_encoding") {
    return NextResponse.json({ error: "CIS is not pending ERP encoding" }, { status: 409 });
  }

  await db
    .update(cisSubmissions)
    .set({ customerCode })
    .where(eq(cisSubmissions.id, id));

  await transitionCis({
    cisId: id,
    toStatus: "erp_encoded",
    action: "erp_encoded",
    actorId: session.user.id,
    note: `Customer encoded in ERP system. Customer code: ${customerCode}`,
  });

  // Invalidate cache tags
  revalidateTag("agent-stats", {});
  revalidateTag("manager-stats", {});
  revalidateTag("workflow-history", {});

  return NextResponse.json({ success: true });
}
