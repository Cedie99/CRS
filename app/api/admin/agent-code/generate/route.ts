import { NextResponse } from "next/server";
import { isNotNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { PREDEFINED_AGENT_CODES } from "@/lib/agent-codes";

// GET /api/admin/agent-code/generate — return the first unused 6-digit numeric agent code
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assignedRows = await db
    .select({ agentCode: users.agentCode })
    .from(users)
    .where(isNotNull(users.agentCode));

  const used = new Set<string>([
    ...(PREDEFINED_AGENT_CODES as readonly string[]),
    ...assignedRows.map((r) => r.agentCode as string),
  ]);

  let candidate = 100000;
  while (used.has(String(candidate))) {
    candidate++;
  }

  return NextResponse.json({ code: String(candidate) });
}
