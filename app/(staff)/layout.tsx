import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffShell } from "@/components/staff-shell";

const STAFF_ROLES = [
  "sales_agent",
  "rsr",
  "sales_manager",
  "rsr_manager",
  "finance_reviewer",
  "legal_approver",
  "senior_approver",
  "sales_support",
  "admin",
];

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (!STAFF_ROLES.includes(session.user.role)) redirect("/login");

  return (
    <StaffShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      agentCode={session.user.agentCode}
      avatarUrl={(session.user as any).avatarUrl ?? null}
    >
      {children}
    </StaffShell>
  );
}
