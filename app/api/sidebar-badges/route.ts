import { NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions, notifications } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { role, id: userId } = session.user as { role: string; id: string };
  const badges: Record<string, number> = {};

  if (role === "finance_reviewer" || role === "admin") {
    const [cusRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cusSubmissions)
      .where(eq(cusSubmissions.status, "pending_finance_review"));
    badges["/finance/cus"] = cusRow?.count ?? 0;
  }

  if (role === "legal_approver" || role === "admin") {
    const [cusRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cusSubmissions)
      .where(eq(cusSubmissions.status, "pending_legal_review"));
    badges["/legal/cus"] = cusRow?.count ?? 0;
  }

  if (role === "sales_agent" || role === "rsr") {
    // Count unread in-app CUS notifications — clears when agent opens the CUS detail page
    const [cusRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.recipientId, userId),
        eq(notifications.type, "in_app"),
        eq(notifications.isRead, false),
        isNotNull(notifications.cusId),
      ));
    badges["/agent/cus"] = cusRow?.count ?? 0;
  }

  return NextResponse.json(badges);
}
