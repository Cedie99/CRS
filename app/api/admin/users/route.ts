import { NextResponse } from "next/server";
import { desc, count, eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { PREDEFINED_AGENT_CODES } from "@/lib/agent-codes";

// GET /api/admin/users — list users (paginated)
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 25) || 25));
  const offset = (page - 1) * limit;

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        agentCode: users.agentCode,
        agentType: users.agentType,
        managerId: users.managerId,
        isActive: users.isActive,
        isTopManager: users.isTopManager,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(users),
  ]);

  const total = Number(countRow[0]?.total ?? 0);

  return NextResponse.json({ data: rows, total, page, limit });
}

const createUserSchema = z.object({
  fullName: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum([
    "sales_agent", "rsr", "sales_manager", "rsr_manager",
    "finance_reviewer", "legal_approver", "senior_approver",
    "sales_support", "project_development_specialist", "admin",
  ]),
  agentType: z.enum(["sales_agent", "rsr"]).nullable().optional(),
  managerId: z.string().uuid().nullable().optional(),
  isTopManager: z.boolean().optional(),
  agentCode: z.string().nullable().optional(),
});

// POST /api/admin/users — create a new user (admin only)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { fullName, email, password, role, agentType, managerId, isTopManager, agentCode } = parsed.data;

  // Check email uniqueness
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: { email: ["Email is already registered"] } }, { status: 409 });
  }

  const isAgentRole = role === "sales_agent" || role === "rsr";

  // Validate agent code for agent roles
  if (isAgentRole) {
    if (!agentCode) {
      return NextResponse.json({ error: { agentCode: ["Agent code is required for agent roles"] } }, { status: 400 });
    }
    if (!(PREDEFINED_AGENT_CODES as readonly string[]).includes(agentCode)) {
      return NextResponse.json({ error: { agentCode: ["Invalid agent code"] } }, { status: 400 });
    }
    // Check code is not already assigned
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.agentCode, agentCode)).limit(1);
    if (taken) {
      return NextResponse.json({ error: { agentCode: ["This agent code is already assigned to another user"] } }, { status: 409 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    fullName,
    email,
    passwordHash,
    role,
    agentCode: isAgentRole ? (agentCode ?? null) : null,
    agentType: (agentType ?? null) as "sales_agent" | "rsr" | null,
    managerId: managerId ?? null,
    isTopManager: isTopManager ?? false,
    isActive: true,
    mustChangePassword: true,
  });

  return NextResponse.json({ success: true, agentCode: agentCode ?? null }, { status: 201 });
}
