import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";
import { transitionCis } from "@/lib/workflow";

const salesSupportSubmitSchema = z.object({
  salesSupportNotes: z.string().max(5000).optional().or(z.literal("")),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "sales_support") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const [cis] = await db
    .select({ id: cisSubmissions.id, status: cisSubmissions.status })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!cis) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cis.status !== "approved") {
    return NextResponse.json({ error: "CIS is not approved" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = salesSupportSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await db
    .update(cisSubmissions)
    .set({
      salesSupportNotes: parsed.data.salesSupportNotes || null,
      updatedAt: new Date(),
    })
    .where(eq(cisSubmissions.id, id));

  await transitionCis({
    cisId: id,
    toStatus: "pending_erp_encoding",
    action: "sales_support_submitted",
    actorId: session.user.id,
  });

  return NextResponse.json({ success: true });
}
