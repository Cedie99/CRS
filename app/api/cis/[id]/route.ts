import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions, users } from "@/lib/db/schema";

// GET /api/cis/[id] — full detail, role-based access
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [row] = await db
    .select({
      id: cisSubmissions.id,
      agentId: cisSubmissions.agentId,
      agentCode: cisSubmissions.agentCode,
      agentType: cisSubmissions.agentType,
      customerType: cisSubmissions.customerType,
      status: cisSubmissions.status,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      contactNumber: cisSubmissions.contactNumber,
      emailAddress: cisSubmissions.emailAddress,
      businessAddress: cisSubmissions.businessAddress,
      cityMunicipality: cisSubmissions.cityMunicipality,
      businessType: cisSubmissions.businessType,
      tinNumber: cisSubmissions.tinNumber,
      additionalNotes: cisSubmissions.additionalNotes,
      createdAt: cisSubmissions.createdAt,
      updatedAt: cisSubmissions.updatedAt,
      agentName: users.fullName,
      agentEmail: users.email,
    })
    .from(cisSubmissions)
    .innerJoin(users, eq(cisSubmissions.agentId, users.id))
    .where(eq(cisSubmissions.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Agents can only view their own
  const { role, id: userId } = session.user;
  if ((role === "sales_agent" || role === "rsr") && row.agentId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(row);
}
