import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";

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
    <div className="flex min-h-screen flex-col">
      <Navbar
        userName={session.user.name ?? ""}
        userRole={session.user.role}
        agentCode={session.user.agentCode}
        avatarUrl={(session.user as any).avatarUrl ?? null}
      />
      <main className="flex-1 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
