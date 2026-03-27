import { desc, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, cisSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { UserManagementTable } from "@/components/admin/user-management-table";

export const metadata = { title: "User Management — CRS" };

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allUsers = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      agentCode: users.agentCode,
      agentType: users.agentType,
      managerId: users.managerId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Managers for the dropdown (sales_manager, rsr_manager who are active)
  const managers = allUsers.filter(
    (u) => (u.role === "sales_manager" || u.role === "rsr_manager") && u.isActive
  );

  // Submission counts per agent
  const countRows = await db
    .select({ agentId: cisSubmissions.agentId, total: count() })
    .from(cisSubmissions)
    .groupBy(cisSubmissions.agentId);

  const submissionCounts: Record<string, number> = {};
  for (const row of countRows) {
    submissionCounts[row.agentId] = Number(row.total);
  }

  return (
    <UserManagementTable
      users={allUsers}
      managers={managers}
      currentUserId={session.user.id}
      submissionCounts={submissionCounts}
    />
  );
}
