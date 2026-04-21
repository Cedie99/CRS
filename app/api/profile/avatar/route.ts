import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [existingUser] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or GIF images are allowed" },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 2MB" }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const pathname = `avatars/${session.user.id}/avatar.${ext}`;
  const { url: avatarUrl } = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
  });

  if (existingUser?.avatarUrl && existingUser.avatarUrl !== avatarUrl) {
    try {
      await del(existingUser.avatarUrl);
    } catch {
      // Older avatar might already be removed; keep profile update successful.
    }
  }

  await db
    .update(users)
    .set({ avatarUrl })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ avatarUrl });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find current avatar
  const [user] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (user?.avatarUrl) {
    try {
      await del(user.avatarUrl);
    } catch {
      // Blob might already be gone — ignore
    }
  }

  await db
    .update(users)
    .set({ avatarUrl: null })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
