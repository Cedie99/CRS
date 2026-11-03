import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cisSubmissions } from "@/lib/db/schema";

// POST /api/admin/cis/[id]/backup — record that a backup of this CIS was downloaded
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const lastBackupAt = new Date();
  const [row] = await db
    .update(cisSubmissions)
    .set({ lastBackupAt, lastBackupBy: session.user.id })
    .where(and(eq(cisSubmissions.id, id), eq(cisSubmissions.status, "erp_encoded")))
    .returning({ id: cisSubmissions.id });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ lastBackupAt: lastBackupAt.toISOString(), lastBackupByName: session.user.name ?? null });
}
