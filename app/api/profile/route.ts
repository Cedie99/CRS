import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { updateProfileSchema } from "@/lib/validations/profile";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { fullName, email } = parsed.data;

  // Check email uniqueness (excluding self)
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, session.user.id)))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: { email: ["Email already in use"] } },
      { status: 409 }
    );
  }

  await db
    .update(users)
    .set({ fullName, email })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ fullName, email });
}
