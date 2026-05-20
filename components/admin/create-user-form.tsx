"use client";

import { useState } from "react";
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
import { UserPlus, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { humanizeDisplayValue } from "@/lib/utils";

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

type Manager = { id: string; fullName: string; role: string };

interface CreateUserFormProps {
  managers: Manager[];
  availableCodes: readonly string[];
}

export function CreateUserForm({ managers, availableCodes }: CreateUserFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "",
    managerId: "",
    agentCode: "",
    isTopManager: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [codeMode, setCodeMode] = useState<"select" | "generate">("select");
  const [generatingCode, setGeneratingCode] = useState(false);

  const isAgentRole = form.role === "sales_agent" || form.role === "rsr";

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
  const isManagerRole = form.role === "sales_manager" || form.role === "rsr_manager";

  const managerOptions = managers.map((m) => ({
    id: m.id,
    label: `${m.fullName} (${ROLE_LABELS[m.role] ?? humanizeDisplayValue(m.role)})`,
  }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    if (!form.fullName.trim()) { setErrors({ fullName: "Required" }); return; }
    if (!form.email.trim()) { setErrors({ email: "Required" }); return; }
    if (!form.role) { setErrors({ role: "Required" }); return; }
    if (!form.password || form.password.length < 8) {
      setErrors({ password: "Minimum 8 characters" }); return;
    }
    if (isAgentRole && !form.agentCode) {
      setErrors({ agentCode: "Required" }); return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          agentType: isAgentRole ? form.role : null,
          managerId: form.managerId || null,
          agentCode: form.agentCode || null,
          isTopManager: form.isTopManager,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errs = typeof json.error === "object" ? json.error : { _form: json.error };
        const mapped: Record<string, string> = {};
        for (const k in errs) mapped[k] = Array.isArray(errs[k]) ? errs[k][0] : errs[k];
        setErrors(mapped);
        return;
      }

      toast.success({
        title: "Account created.",
        description: "The user will be prompted to set their own password on first login.",
      });

      setForm({ fullName: "", email: "", password: "", role: "", managerId: "", agentCode: "", isTopManager: false });
      setCodeMode("select");
      router.refresh();
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-white">
      {/* Section: Identity */}
      <div className="border-b px-6 py-5">
        <h2 className="text-sm font-semibold text-zinc-900">Account details</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Basic identity information for the new user.</p>
      </div>
      <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
        {errors._form && (
          <div className="col-span-full rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {errors._form}
          </div>
        )}

        <div className="col-span-full space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Juan dela Cruz"
            disabled={isLoading}
          />
          {errors.fullName && <p className="text-xs text-red-600">{errors.fullName}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="user@oraclept.com"
            disabled={isLoading}
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Temporary password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min. 8 characters"
            disabled={isLoading}
          />
          {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
        </div>
      </div>

      {/* Section: Role */}
      <div className="border-t border-b px-6 py-5">
        <h2 className="text-sm font-semibold text-zinc-900">Role & assignment</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Determines which dashboard and permissions this user gets.</p>
      </div>
      <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
        <div className="col-span-full space-y-1.5">
          <Label>Role</Label>
          <Select
            value={form.role}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, role: v ?? "", managerId: "", agentCode: "", isTopManager: false }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select role…" />
            </SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
        </div>

        {isManagerRole && (
          <div className="col-span-full">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 hover:bg-zinc-100 transition-colors">
              <input
                type="checkbox"
                checked={form.isTopManager}
                onChange={(e) => setForm((f) => ({ ...f, isTopManager: e.target.checked }))}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-[#2d6e1e]"
              />
              <div>
                <p className="text-sm font-medium text-zinc-900">Top-level manager</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  Can view all agents and submissions across the entire team, not just direct reports.
                </p>
              </div>
            </label>
          </div>
        )}

        {isAgentRole && (
          <>
            <div className="col-span-full space-y-1.5">
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
                availableCodes.length === 0 ? (
                  <div className="flex h-9 items-center rounded-md border border-dashed bg-zinc-50 px-3 text-sm text-zinc-400 italic">
                    No available predefined codes — use Auto-generate
                  </div>
                ) : (
                  <Select
                    value={form.agentCode}
                    onValueChange={(v) => setForm((f) => ({ ...f, agentCode: v ?? "" }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select agent code…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCodes.map((code) => (
                        <SelectItem key={code} value={code}>{code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
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
              {errors.agentCode && <p className="text-xs text-red-600">{errors.agentCode}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Assign to manager</Label>
              <Select
                value={form.managerId}
                onValueChange={(v) => setForm((f) => ({ ...f, managerId: v ?? "" }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select manager…">
                    {form.managerId
                      ? managerOptions.find((m) => m.id === form.managerId)?.label
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {managerOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t bg-zinc-50 px-6 py-4">
        <Button
          type="button"
          variant="ghost"
          disabled={isLoading}
          onClick={() => router.push("/admin/users")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !form.role} className="gap-2">
          <UserPlus className="h-4 w-4" />
          {isLoading ? "Creating account…" : "Create Account"}
        </Button>
      </div>
    </form>
  );
}
