import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

// GET /api/notifications — fetch notifications for the logged-in user
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: notifications.id,
      cisId: notifications.cisId,
      message: notifications.message,
      isRead: notifications.isRead,
      sentAt: notifications.sentAt,
    })
    .from(notifications)
    .where(eq(notifications.recipientId, session.user.id))
    .orderBy(desc(notifications.sentAt))
    .limit(20);

  return NextResponse.json(rows);
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.recipientId, session.user.id),
        eq(notifications.isRead, false)
      )
    );

  return NextResponse.json({ success: true });
}
