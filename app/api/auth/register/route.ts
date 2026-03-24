import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fullName, email, password } = parsed.data;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: { email: ["Email is already registered"] } },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // isActive defaults to false — Admin must activate before user can log in
    await db.insert(users).values({
      fullName,
      email,
      passwordHash,
      role: "sales_agent",
      isActive: false,
    });

    return NextResponse.json(
      { message: "Account created. Please wait for an Admin to activate your account before logging in." },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json(
      { error: { _form: ["Something went wrong. Please try again."] } },
      { status: 500 }
    );
  }
}
