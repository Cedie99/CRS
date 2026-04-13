import { desc, count, eq, and, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, cisSubmissions } from "@/lib/db/schema";
import { redirect } from "next/navigation";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { DashboardPagination, getPageNumber } from "@/components/dashboard-pagination";

export const metadata = { title: "User Management — CRS" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { page } = await searchParams;
  const pageSize = 25;
  const currentPage = getPageNumber(page);
  const offset = (currentPage - 1) * pageSize;

  const USER_COLS = {
    id: users.id,
    fullName: users.fullName,
    email: users.email,
    role: users.role,
    agentCode: users.agentCode,
    agentType: users.agentType,
    managerId: users.managerId,
    isActive: users.isActive,
    createdAt: users.createdAt,
  };

  // Managers for the dropdown — always full list, small set
  const managers = await db
    .select(USER_COLS)
    .from(users)
    .where(
      and(
        or(eq(users.role, "sales_manager"), eq(users.role, "rsr_manager")),
        eq(users.isActive, true)
      )
    );

  // Paginated users
  const [allUsers, countRow] = await Promise.all([
    db.select(USER_COLS).from(users).orderBy(desc(users.createdAt)).limit(pageSize).offset(offset),
    db.select({ total: count() }).from(users),
  ]);
  const totalUsers = Number(countRow[0]?.total ?? 0);

  // Submission counts per agent (indexed aggregate, no pagination needed)
  const countRows = await db
    .select({ agentId: cisSubmissions.agentId, total: count() })
    .from(cisSubmissions)
    .groupBy(cisSubmissions.agentId);

  const submissionCounts: Record<string, number> = {};
  for (const row of countRows) {
    submissionCounts[row.agentId] = Number(row.total);
  }

  return (
    <div className="space-y-4">
      <UserManagementTable
        users={allUsers}
        managers={managers}
        currentUserId={session.user.id}
        submissionCounts={submissionCounts}
      />
      <DashboardPagination
        basePath="/admin/users"
        currentPage={currentPage}
        totalItems={totalUsers}
        pageSize={pageSize}
      />
    </div>
  );
}
