import { NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({}, { status: 401 });

  const { role } = session.user as { role: string };
  const badges: Record<string, number> = {};

  if (role === "finance_reviewer" || role === "admin") {
    // Only count CUS where customer wants to update their customer type
    const [cusRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cusSubmissions)
      .where(
        and(
          eq(cusSubmissions.status, "pending_finance_review"),
          isNotNull(cusSubmissions.newCustomerType)
        )
      );
    badges["/finance/cus"] = cusRow?.count ?? 0;
  }

  if (role === "legal_approver" || role === "admin") {
    // Only count CUS where customer wants to update their customer type
    const [cusRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(cusSubmissions)
      .where(
        and(
          eq(cusSubmissions.status, "pending_legal_review"),
          isNotNull(cusSubmissions.newCustomerType)
        )
      );
    badges["/legal/cus"] = cusRow?.count ?? 0;
  }

  return NextResponse.json(badges);
}
