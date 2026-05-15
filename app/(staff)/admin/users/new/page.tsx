import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { ShieldCheck, KeyRound, Users } from "lucide-react";
import { PREDEFINED_AGENT_CODES } from "@/lib/agent-codes";

export const metadata = { title: "Create User — CRS" };

export default async function CreateUserPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/admin");

  const [managers, assignedCodeRows] = await Promise.all([
    db
      .select({ id: users.id, fullName: users.fullName, role: users.role })
      .from(users)
      .where(and(or(eq(users.role, "sales_manager"), eq(users.role, "rsr_manager")), eq(users.isActive, true))),
    db
      .select({ agentCode: users.agentCode })
      .from(users)
      .where(isNotNull(users.agentCode)),
  ]);

  const assignedCodes = new Set(assignedCodeRows.map((r) => r.agentCode as string));
  const availableCodes = PREDEFINED_AGENT_CODES.filter((c) => !assignedCodes.has(c));

  return (
    <div className="space-y-6">
<div className="grid gap-8 lg:grid-cols-5">
      {/* Left — context panel */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 space-y-6">
          <div>
            <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Create User</h1>
            <p className="text-sm leading-relaxed text-zinc-500">
              Set up a new staff account. The user will log in with the temporary password you set and will be prompted to choose their own before accessing the system.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <KeyRound className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">Forced password change</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  The user must set a personal password on their very first login for privacy.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">Active immediately</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  Admin-created accounts are active right away — no activation step needed.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <Users className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">Agent code required</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  Agent roles must be assigned one of the official Oracle Petroleum agent codes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="lg:col-span-3 lg:pt-16">
        <CreateUserForm managers={managers} availableCodes={availableCodes} />
      </div>
    </div>
    </div>
  );
}
