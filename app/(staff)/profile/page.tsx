import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileClient } from "./profile-client";

export const metadata = { title: "Profile — CRS" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      agentCode: users.agentCode,
      avatarUrl: users.avatarUrl,
      managerId: users.managerId,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/login");

  let managerName: string | null = null;
  if (user.managerId) {
    const [manager] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, user.managerId))
      .limit(1);
    managerName = manager?.fullName ?? null;
  }

  return <ProfileClient user={{ ...user, managerName }} />;
}
