import { NextResponse } from "next/server";

// Self-registration is disabled. Accounts are created by Admin only via /api/admin/users.
export async function POST() {
  return NextResponse.json({ error: "Self-registration is disabled." }, { status: 410 });
}
