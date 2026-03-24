"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { formatDistanceToNow } from "@/lib/utils";

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
}

export function UserManagementTable({
  users: initialUsers,
  managers,
  currentUserId,
}: UserManagementTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState({
    role: "",
    agentCode: "",
    agentType: "",
    managerId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function openEdit(user: UserRow) {
    setEditingUser(user);
    setForm({
      role: user.role,
      agentCode: user.agentCode ?? "",
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
        agentCode: form.agentCode || null,
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
                agentCode: form.agentCode || null,
                agentType: (form.agentType || null) as any,
                managerId: form.managerId || null,
                isActive: true,
              }
            : u
        )
      );
      toast.success("User updated.");
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
        toast.error("Failed to deactivate user.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u))
      );
      toast.success("User deactivated.");
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  const isAgentRole = (role: string) => role === "sales_agent" || role === "rsr";

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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Agent Code</th>
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
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {user.agentCode ?? "—"}
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

      {/* Edit / Activate dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser?.isActive ? "Edit User" : "Activate User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser?.isActive
                ? `Update role and settings for ${editingUser.fullName}.`
                : `Activate ${editingUser?.fullName}'s account and assign their role.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v ?? "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role…" />
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
                <div className="space-y-1.5">
                  <Label htmlFor="agentCode">Agent code</Label>
                  <Input
                    id="agentCode"
                    value={form.agentCode}
                    onChange={(e) => setForm((f) => ({ ...f, agentCode: e.target.value }))}
                    placeholder="e.g. SA-001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Agent type</Label>
                  <Select
                    value={form.agentType}
                    onValueChange={(v) => setForm((f) => ({ ...f, agentType: v ?? "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent type…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_agent">Sales Agent</SelectItem>
                      <SelectItem value="rsr">RSR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Manager</Label>
                  <Select
                    value={form.managerId}
                    onValueChange={(v) => setForm((f) => ({ ...f, managerId: v ?? "" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to manager…" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.fullName}{" "}
                          <span className="text-zinc-400">
                            ({ROLE_LABELS[m.role] ?? m.role})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} disabled={isLoading || !form.role} className="gap-2">
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
