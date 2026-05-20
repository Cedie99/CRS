"use client";

import { useEffect, useState } from "react";
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
import { UserCheck, UserX, Pencil, KeyRound, Trash2, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
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
  project_development_specialist: "Project Dev Specialist",
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
  isTopManager?: boolean;
  createdAt: Date;
};

interface UserManagementTableProps {
  users: UserRow[];
  managers: UserRow[];
  currentUserId: string;
  submissionCounts?: Record<string, number>;
  availableCodes?: readonly string[];
}

export function UserManagementTable({
  users: initialUsers,
  managers,
  currentUserId,
  submissionCounts = {},
  availableCodes = [],
}: UserManagementTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);

  // Edit / Activate dialog state
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ role: "", managerId: "", agentCode: "", isTopManager: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeMode, setCodeMode] = useState<"select" | "generate">("select");
  const [generatingCode, setGeneratingCode] = useState(false);

  // Reset password dialog state
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // Delete dialog state
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const TEMP_PASSWORD = "Opc1985!";

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  async function fetchGeneratedCode() {
    setGeneratingCode(true);
    try {
      const res = await fetch("/api/admin/agent-code/generate");
      if (res.ok) {
        const { code } = await res.json();
        setForm((f) => ({ ...f, agentCode: code }));
      }
    } finally {
      setGeneratingCode(false);
    }
  }

  async function switchCodeMode(mode: "select" | "generate") {
    setCodeMode(mode);
    setForm((f) => ({ ...f, agentCode: "" }));
    if (mode === "generate") fetchGeneratedCode();
  }

  function openEdit(user: UserRow) {
    setEditingUser(user);
    setForm({
      role: user.role,
      managerId: user.managerId ?? "",
      agentCode: user.agentCode ?? "",
      isTopManager: user.isTopManager ?? false,
    });
    setCodeMode("select");
    setError("");
  }

  async function handleSave() {
    if (!editingUser) return;
    setIsLoading(true);
    setError("");
    try {
      const isAgent = isAgentRole(form.role);
      const body: Record<string, unknown> = {
        role: form.role || undefined,
        agentType: isAgent ? (form.role as "sales_agent" | "rsr") : null,
        managerId: form.managerId || null,
        agentCode: form.agentCode || null,
        isActive: true,
        isTopManager: form.isTopManager,
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
                agentType: isAgent ? (form.role as "sales_agent" | "rsr") : null,
                managerId: form.managerId || null,
                isActive: true,
                isTopManager: form.isTopManager,
              }
            : u
        )
      );
      toast.success({ title: "User updated.", description: "Role and assignment changes were saved." });
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
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) {
        toast.error({ title: "Failed to deactivate user.", description: "Please try again or refresh the page." });
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u)));
      toast.error({ title: "User deactivated.", description: "The account can no longer sign in." });
      router.refresh();
    } catch {
      toast.error({ title: "Something went wrong.", description: "Please try again in a moment." });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(typeof json.error === "string" ? json.error : "Failed to delete user.");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      toast.success({ title: "User deleted.", description: `${deleteUser.fullName}'s account has been permanently removed.` });
      setDeleteUser(null);
      router.refresh();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  }

  function openResetPassword(user: UserRow) {
    setResetUser(user);
    setResetError("");
  }

  async function handleResetPassword() {
    if (!resetUser) return;
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: TEMP_PASSWORD }),
      });
      const json = await res.json();
      if (!res.ok) {
        setResetError(typeof json.error === "string" ? json.error : "Failed to reset password.");
        return;
      }
      toast.success({ title: "Password reset.", description: `${resetUser.fullName} will be prompted to change it on next login.` });
      setResetUser(null);
    } catch {
      setResetError("Something went wrong.");
    } finally {
      setResetLoading(false);
    }
  }

  const isAgentRole = (role: string) => role === "sales_agent" || role === "rsr";
  const isManagerRole = (role: string) => role === "sales_manager" || role === "rsr_manager";

  const managerOptions = managers.map((m) => ({
    id: m.id,
    label: `${m.fullName} (${ROLE_LABELS[m.role] ?? humanizeDisplayValue(m.role)})`,
  }));

  if (form.managerId && !managerOptions.some((m) => m.id === form.managerId)) {
    // Try to resolve the name from the full users list before falling back to the ID
    const resolvedName = users.find((u) => u.id === form.managerId)?.fullName;
    managerOptions.unshift({
      id: form.managerId,
      label: resolvedName
        ? `${resolvedName} (${ROLE_LABELS[users.find((u) => u.id === form.managerId)?.role ?? ""] ?? "Manager"})`
        : `Unknown manager (${form.managerId.slice(0, 8)}…)`,
    });
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">User Management</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Activate accounts, assign roles, agent codes, and managers.
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
                    <Badge className="shrink-0 border-0 bg-green-100 px-2.5 py-1 text-xs text-green-700 hover:bg-green-100">Active</Badge>
                  ) : (
                    <Badge className="shrink-0 border-0 bg-amber-100 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100">Pending</Badge>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-zinc-100 pt-3 text-xs">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Role</p>
                    <p className="mt-0.5 text-sm text-zinc-700">
                      {ROLE_LABELS[user.role] ?? humanizeDisplayValue(user.role)}
                      {user.isTopManager && <span className="ml-1.5 text-[10px] font-semibold uppercase text-amber-600">Top</span>}
                    </p>
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
                  {user.isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                      onClick={() => openResetPassword(user)}
                    >
                      <KeyRound className="h-3 w-3" />
                      Reset Password
                    </Button>
                  )}
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
                  {user.id !== currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 justify-center gap-1.5 rounded-lg border border-red-300 px-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => { setDeleteUser(user); setDeleteError(""); }}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
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
                    {user.isTopManager && (
                      <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                        Top
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{user.agentCode ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-sm text-zinc-600">
                    {isAgentRole(user.role) ? (submissionCounts[user.id] ?? 0) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {user.isActive ? (
                      <Badge className="border-0 bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                    ) : (
                      <Badge className="border-0 bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{formatDistanceToNow(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => openEdit(user)}>
                        <Pencil className="h-3 w-3" />
                        {user.isActive ? "Edit" : "Activate"}
                      </Button>
                      {user.isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-xs text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                          onClick={() => openResetPassword(user)}
                        >
                          <KeyRound className="h-3 w-3" />
                          Reset PW
                        </Button>
                      )}
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
                      {user.id !== currentUserId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => { setDeleteUser(user); setDeleteError(""); }}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
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
            <DialogTitle>{editingUser?.isActive ? "Edit User" : "Activate User"}</DialogTitle>
            <DialogDescription className="wrap-break-word">
              {editingUser?.isActive
                ? `Update role and settings for ${editingUser.fullName}.`
                : `Activate ${editingUser?.fullName}'s account and assign their role.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="min-w-0 space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v ?? "" }))}>
                <SelectTrigger className="box-border w-full min-w-0 max-w-full overflow-hidden [&>span]:truncate">
                  <SelectValue className="min-w-0 truncate" placeholder="Select role…">
                    {form.role ? (ROLE_LABELS[form.role] ?? humanizeDisplayValue(form.role)) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isManagerRole(form.role) && (
              <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  id="edit-top-manager"
                  checked={form.isTopManager}
                  onChange={(e) => setForm((f) => ({ ...f, isTopManager: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300 accent-[#2d6e1e]"
                />
                <div>
                  <label htmlFor="edit-top-manager" className="text-sm font-medium text-zinc-900 cursor-pointer">
                    Top-level manager
                  </label>
                  <p className="text-xs text-zinc-500">Can view all agents and submissions across the team.</p>
                </div>
              </div>
            )}

            {isAgentRole(form.role) && (
              <>
                <div className="min-w-0 space-y-1.5">
                  <Label>Agent code</Label>

                  {/* Mode toggle */}
                  <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => switchCodeMode("select")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${codeMode === "select" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      Select from list
                    </button>
                    <button
                      type="button"
                      onClick={() => switchCodeMode("generate")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${codeMode === "generate" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      Auto-generate
                    </button>
                  </div>

                  {codeMode === "select" ? (
                    <Select
                      value={form.agentCode}
                      onValueChange={(v) => setForm((f) => ({ ...f, agentCode: v ?? "" }))}
                    >
                      <SelectTrigger className="box-border w-full min-w-0 max-w-full overflow-hidden font-mono [&>span]:truncate">
                        <SelectValue placeholder="Select agent code…" />
                      </SelectTrigger>
                      <SelectContent>
                        {editingUser?.agentCode && (
                          <SelectItem value={editingUser.agentCode}>{editingUser.agentCode} (current)</SelectItem>
                        )}
                        {availableCodes
                          .filter((c) => c !== editingUser?.agentCode)
                          .map((code) => (
                            <SelectItem key={code} value={code} className="font-mono">{code}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 flex-1 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 font-mono text-sm text-zinc-700">
                        {generatingCode ? <span className="text-zinc-400">Generating…</span> : (form.agentCode || <span className="text-zinc-400">—</span>)}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 gap-1.5"
                        onClick={fetchGeneratedCode}
                        disabled={generatingCode}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${generatingCode ? "animate-spin" : ""}`} />
                        Regenerate
                      </Button>
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label>Manager</Label>
                  <Select value={form.managerId} onValueChange={(v) => setForm((f) => ({ ...f, managerId: v ?? "" }))}>
                    <SelectTrigger className="box-border w-full min-w-0 max-w-full overflow-hidden [&>span]:truncate">
                      <SelectValue className="min-w-0 truncate" placeholder="Assign to manager…">
                        {form.managerId
                          ? managerOptions.find((m) => m.id === form.managerId)?.label
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {managerOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
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
                {isLoading ? "Saving…" : editingUser?.isActive ? "Save Changes" : "Activate & Save"}
              </Button>
              <Button variant="ghost" onClick={() => setEditingUser(null)} disabled={isLoading} className="w-full sm:w-auto">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password dialog */}
      <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent className="box-border w-[calc(100vw-2.5rem)] max-w-sm overflow-x-hidden p-3.5 sm:w-full sm:max-w-md sm:p-4">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription className="wrap-break-word">
              This will reset <strong>{resetUser?.fullName}</strong>&apos;s password to the standard temporary password. They will be required to set a new password on next login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Temporary password</p>
              <p className="mt-1 font-mono text-base font-semibold text-zinc-900">{TEMP_PASSWORD}</p>
              <p className="mt-1.5 text-xs text-zinc-500">Share this with the user. They must change it immediately after logging in.</p>
            </div>

            {resetError && <p className="text-sm text-red-600">{resetError}</p>}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="w-full gap-2 sm:w-auto"
              >
                <KeyRound className="h-4 w-4" />
                {resetLoading ? "Resetting…" : "Reset to Temporary Password"}
              </Button>
              <Button variant="ghost" onClick={() => setResetUser(null)} disabled={resetLoading} className="w-full sm:w-auto">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="box-border w-[calc(100vw-2.5rem)] max-w-sm overflow-x-hidden p-3.5 sm:w-full sm:max-w-md sm:p-4">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete User</DialogTitle>
            <DialogDescription className="wrap-break-word">
              This will permanently remove <strong>{deleteUser?.fullName}</strong>'s account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">Permanent deletion</p>
              <p className="mt-0.5 text-xs">If this user has existing CIS submissions, deletion will be blocked. Use <strong>Deactivate</strong> instead to preserve their records.</p>
            </div>

            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <Button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="w-full gap-2 bg-red-600 text-white hover:bg-red-700 sm:w-auto"
              >
                <Trash2 className="h-4 w-4" />
                {deleteLoading ? "Deleting…" : "Yes, Delete Permanently"}
              </Button>
              <Button variant="ghost" onClick={() => setDeleteUser(null)} disabled={deleteLoading} className="w-full sm:w-auto">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
