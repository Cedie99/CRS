"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserCheck, UserX, Pencil } from "lucide-react";
import { sileo as toast } from "sileo";
import { formatDistanceToNow, humanizeDisplayValue } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  sales_agent: "Sales Agent",
  rsr: "RSR",
  sales_manager: "Sales Manager",
  rsr_manager: "RSR Manager",
  finance_reviewer: "Finance Reviewer",
  legal_approver: "Legal Approver",
  senior_approver: "Senior Approver",
  sales_support: "Sales Support",
  admin: "Admin",
};

const ALL_ROLES = Object.entries(ROLE_LABELS);

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  agentCode: string | null;
  agentType: string | null;
  managerId: string | null;
  isActive: boolean;
  createdAt: Date;
};

interface UserManagementTableProps {
  users: UserRow[];
  managers: UserRow[];
  currentUserId: string;
  submissionCounts?: Record<string, number>;
}

export function UserManagementTable({
  users: initialUsers,
  managers,
  currentUserId,
  submissionCounts = {},
}: UserManagementTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    role: "",
    agentType: "",
    managerId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  function openEdit(user: UserRow) {
    setEditingUser(user);
    setForm({
      role: user.role,
      agentType: user.agentType ?? "",
      managerId: user.managerId ?? "",
    });
    setError("");
  }

  async function handleSave() {
    if (!editingUser) return;
    setIsLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        role: form.role || undefined,
        agentType: (form.agentType || null) as "sales_agent" | "rsr" | null,
        managerId: form.managerId || null,
        isActive: true,
      };

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Failed to update user.");
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                role: form.role || u.role,
                agentCode: json.agentCode ?? u.agentCode,
                agentType: (form.agentType || null) as any,
                managerId: form.managerId || null,
                isActive: true,
              }
            : u
        )
      );
          toast.success({
            title: "User updated.",
            description: "Role and assignment changes were saved.",
          });
      setEditingUser(null);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeactivate(userId: string) {
    if (userId === currentUserId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error({
          title: "Failed to deactivate user.",
          description: "Please try again or refresh the page.",
        });
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u))
      );
      toast.success({
        title: "User deactivated.",
        description: "The account can no longer sign in.",
      });
      router.refresh();
    } catch {
      toast.error({
        title: "Something went wrong.",
        description: "Please try again in a moment.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const isAgentRole = (role: string) => role === "sales_agent" || role === "rsr";

  const managerOptions = managers.map((m) => ({
    id: m.id,
    label: `${m.fullName} (${ROLE_LABELS[m.role] ?? humanizeDisplayValue(m.role)})`,
  }));

  if (form.managerId && !managerOptions.some((m) => m.id === form.managerId)) {
    managerOptions.unshift({
      id: form.managerId,
      label: `Assigned manager (${form.managerId.slice(0, 8)}...)`,
    });
  }

  const selectedManagerLabel =
    managerOptions.find((m) => m.id === form.managerId)?.label ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to submissions
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">User Management</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Activate new accounts, assign roles, agent codes, and managers.
        </p>
      </div>

      {/* Pending activation banner */}
      {users.some((u) => !u.isActive) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {users.filter((u) => !u.isActive).length} account(s) pending activation.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="md:hidden">
          <div className="space-y-4 p-4">
            {users.map((user) => (
              <div
                key={user.id}
                className={`rounded-xl border p-4 ${!user.isActive ? "border-amber-200 bg-amber-50/40" : "border-zinc-200 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold leading-tight text-zinc-900">{user.fullName}</p>
                    <p className="truncate text-sm text-zinc-500">{user.email}</p>
                  </div>
                  {user.isActive ? (
                    <Badge className="shrink-0 border-0 bg-green-100 px-2.5 py-1 text-xs text-green-700 hover:bg-green-100">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="shrink-0 border-0 bg-amber-100 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100">
                      Pending
                    </Badge>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 pt-3 text-xs">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Role</p>
                    <p className="mt-0.5 text-sm text-zinc-700">{ROLE_LABELS[user.role] ?? humanizeDisplayValue(user.role)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Agent Code</p>
                    <p className="mt-0.5 font-mono text-sm text-zinc-700">{user.agentCode ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Submissions</p>
                    <p className="mt-0.5 text-sm text-zinc-700">
                      {isAgentRole(user.role) ? (submissionCounts[user.id] ?? 0) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Joined</p>
                    <p className="mt-0.5 text-sm text-zinc-700">{formatDistanceToNow(user.createdAt)} ago</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 border-t border-zinc-100 pt-3 sm:grid-cols-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                    onClick={() => openEdit(user)}
                  >
                    <Pencil className="h-3 w-3" />
                    {user.isActive ? "Edit" : "Activate"}
                  </Button>
                  {user.isActive && user.id !== currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 justify-center gap-1.5 rounded-lg border border-red-200 px-3 text-sm text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDeactivate(user.id)}
                      disabled={isLoading}
                    >
                      <UserX className="h-3 w-3" />
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
        <table className="min-w-160 w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Agent Code</th>
              <th className="px-4 py-3">Submissions</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((user) => (
              <tr key={user.id} className={`hover:bg-zinc-50 ${!user.isActive ? "bg-amber-50/40" : ""}`}>
                <td className="px-4 py-3 font-medium text-zinc-900">{user.fullName}</td>
                <td className="px-4 py-3 text-zinc-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    {ROLE_LABELS[user.role] ?? humanizeDisplayValue(user.role)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {user.agentCode ?? "—"}
                </td>
                <td className="px-4 py-3 tabular-nums text-sm text-zinc-600">
                  {isAgentRole(user.role)
                    ? (submissionCounts[user.id] ?? 0)
                    : <span className="text-zinc-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  {user.isActive ? (
                    <Badge className="border-0 bg-green-100 text-green-700 hover:bg-green-100">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100">
                      Pending
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">
                  {formatDistanceToNow(user.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="h-3 w-3" />
                      {user.isActive ? "Edit" : "Activate"}
                    </Button>
                    {user.isActive && user.id !== currentUserId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDeactivate(user.id)}
                        disabled={isLoading}
                      >
                        <UserX className="h-3 w-3" />
                        Deactivate
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Edit / Activate dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="box-border w-[calc(100vw-2.5rem)] max-w-sm overflow-x-hidden p-3.5 sm:w-full sm:max-w-md sm:p-4">
          <DialogHeader>
            <DialogTitle>
              {editingUser?.isActive ? "Edit User" : "Activate User"}
            </DialogTitle>
            <DialogDescription className="wrap-break-word">
              {editingUser?.isActive
                ? `Update role and settings for ${editingUser.fullName}.`
                : `Activate ${editingUser?.fullName}'s account and assign their role.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="min-w-0 space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v ?? "" }))}
              >
                <SelectTrigger className="box-border w-full min-w-0 max-w-full overflow-hidden [&>span]:truncate">
                  <SelectValue className="min-w-0 truncate" placeholder="Select role…" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAgentRole(form.role) && (
              <>
                <div className="min-w-0 space-y-1.5">
                  <Label>Agent code</Label>
                  {editingUser?.agentCode ? (
                    <div className="flex h-9 items-center rounded-md border bg-zinc-50 px-3 font-mono text-sm text-zinc-700">
                      {editingUser.agentCode}
                    </div>
                  ) : (
                    <div className="flex h-9 items-center rounded-md border border-dashed bg-zinc-50 px-3 text-sm text-zinc-400 italic">
                      Will be auto-generated on save
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label>Agent type</Label>
                  <Select
                    value={form.agentType}
                    onValueChange={(v) => setForm((f) => ({ ...f, agentType: v ?? "" }))}
                  >
                    <SelectTrigger className="box-border w-full min-w-0 max-w-full overflow-hidden [&>span]:truncate">
                      <SelectValue className="min-w-0 truncate" placeholder="Select agent type…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_agent">Sales Agent</SelectItem>
                      <SelectItem value="rsr">RSR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label>Manager</Label>
                  <Select
                    value={form.managerId}
                    onValueChange={(v) => setForm((f) => ({ ...f, managerId: v ?? "" }))}
                  >
                    <SelectTrigger className="box-border w-full min-w-0 max-w-full overflow-hidden [&>span]:truncate">
                      <SelectValue className="min-w-0 truncate" placeholder="Assign to manager…">
                        {selectedManagerLabel}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {managerOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="truncate">{m.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Button onClick={handleSave} disabled={isLoading || !form.role} className="w-full gap-2 sm:w-auto">
                <UserCheck className="h-4 w-4" />
                {isLoading
                  ? "Saving…"
                  : editingUser?.isActive
                  ? "Save Changes"
                  : "Activate & Save"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditingUser(null)}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
