"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Save, AlertTriangle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocUploadSlot } from "@/components/doc-upload-slot";
import { toast } from "@/lib/toast";
import type { FileEntry } from "@/lib/doc-types";

const CUSTOMER_TYPE_OPTIONS = [
  { value: "dealer", label: "Dealer" },
  { value: "distributor", label: "Distributor" },
  { value: "private_label", label: "Private Label" },
  { value: "toll_blend", label: "Toll Blend" },
  { value: "end_user", label: "End User" },
];

export function CusFinancePanel({
  cusId,
  newCustomerType: initialNewCustomerType,
  initialSirRestyFiles = [],
  initialCreditTerms = "",
  initialCreditLimit = "",
  backHref,
  isLegal = false,
}: {
  cusId: string;
  newCustomerType?: string;
  initialSirRestyFiles?: FileEntry[];
  initialCreditTerms?: string;
  initialCreditLimit?: string;
  backHref: string;
  isLegal?: boolean;
}) {
  const router = useRouter();
  const [newCustomerType, setNewCustomerType] = useState(initialNewCustomerType ?? "");
  const [sirRestyFiles, setSirRestyFiles] = useState<FileEntry[]>(initialSirRestyFiles);
  const [creditTerms, setCreditTerms] = useState(initialCreditTerms);
  const [creditLimit, setCreditLimit] = useState(initialCreditLimit);
  const [savedCreditTerms, setSavedCreditTerms] = useState(initialCreditTerms);
  const [savedCreditLimit, setSavedCreditLimit] = useState(initialCreditLimit);
  const [saving, setSaving] = useState(false);

  const creditDirty = creditTerms !== savedCreditTerms || creditLimit !== savedCreditLimit;
  const [approving, setApproving] = useState(false);
  const [denying, setDenying] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [denyNote, setDenyNote] = useState("");

  const hasSirRestyFile = sirRestyFiles.length > 0;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cus/${cusId}/finance-save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCustomerType: newCustomerType || undefined,
          financeCreditTerms: creditTerms || undefined,
          financeCreditLimit: creditLimit || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      setSavedCreditTerms(creditTerms);
      setSavedCreditLimit(creditLimit);
      toast.success({ title: "Draft saved." });
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/cus/${cusId}/finance-forward`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financeCreditTerms: creditTerms || undefined,
          financeCreditLimit: creditLimit || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      toast.success({ title: "CUS Approved.", description: "The agent has been notified." });
      router.push(backHref);
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to approve." });
      setApproving(false);
    }
  }

  async function handleDeny() {
    setDenying(true);
    try {
      const res = await fetch(`/api/cus/${cusId}/deny`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: denyNote.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      toast.error({ title: "CUS Denied.", description: "The agent has been notified." });
      router.push(backHref);
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to deny." });
      setDenying(false);
    }
  }

  return (
    <div className="flex flex-col divide-y divide-zinc-100">

      {/* ── Override customer type (only if agent requested a change) ── */}
      {initialNewCustomerType && (
        <div className="px-4 py-4 space-y-2">
          <Label htmlFor="newCustomerType" className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            Override Customer Type
          </Label>
          <Select value={newCustomerType} onValueChange={(v) => setNewCustomerType(v ?? "")}>
            <SelectTrigger id="newCustomerType" className="w-full h-8 text-sm">
              <SelectValue>
                {newCustomerType ? (CUSTOMER_TYPE_OPTIONS.find((o) => o.value === newCustomerType)?.label ?? newCustomerType) : "Confirm or override..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-7 gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 px-2"
            >
              {saving ? <><Loader2 className="h-3 w-3 animate-spin" />Saving...</> : <><Save className="h-3 w-3" />Save</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 1: Print ── */}
      <div className="px-4 py-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Step 1 — Print</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Print the CUS form for the CFO to fill in credit details and sign physically.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="w-full gap-2 text-xs font-medium"
        >
          <Printer className="h-3.5 w-3.5 text-blue-500" />
          Print CUS Form
        </Button>
      </div>

      {/* ── Step 2: Upload signed copy ── */}
      <div className="px-4 py-4 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Step 2 — Upload Signed Copy</p>
          <p className="text-xs text-zinc-500">Upload the CFO-signed form to enable approval.</p>
        </div>
        <div className="space-y-1.5">
          <p className={`text-sm font-semibold ${hasSirRestyFile ? "text-green-700" : "text-zinc-700"}`}>
            CFO-Signed Form
            {hasSirRestyFile && (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                ✓ Uploaded
              </span>
            )}
          </p>
          <DocUploadSlot
            docType="docSirRestySigned"
            label="CFO-Signed Form"
            endpoint={`/api/cus/${cusId}/staff-docs`}
            files={sirRestyFiles}
            onChange={setSirRestyFiles}
            disabled={false}
            hideLabel
          />
        </div>
        {!hasSirRestyFile && (
          <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-700">Required before approving.</p>
          </div>
        )}
      </div>

      {/* ── Step 2b: Credit evaluation (only after signed form is uploaded) ── */}
      {hasSirRestyFile && (
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Credit Evaluation</p>
            {creditDirty && (
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                Unsaved
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500">Enter the credit details as filled in by the CFO on the signed form.</p>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="creditTerms" className="text-xs font-medium text-zinc-600">Credit Terms</Label>
              <Input
                id="creditTerms"
                value={creditTerms}
                onChange={(e) => setCreditTerms(e.target.value)}
                placeholder="e.g. 30 days"
                className={`h-8 text-sm ${creditDirty ? "border-amber-300 focus-visible:ring-amber-300" : ""}`}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="creditLimit" className="text-xs font-medium text-zinc-600">Credit Limit</Label>
              <Input
                id="creditLimit"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="e.g. 500,000"
                className={`h-8 text-sm ${creditDirty ? "border-amber-300 focus-visible:ring-amber-300" : ""}`}
              />
            </div>
          </div>
          <Button
            variant={creditDirty ? "default" : "ghost"}
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className={`gap-1.5 text-xs ${creditDirty ? "bg-amber-500 hover:bg-amber-600 text-white" : "text-zinc-400 hover:text-zinc-700"}`}
          >
            {saving ? <><Loader2 className="h-3 w-3 animate-spin" />Saving...</> : <><Save className="h-3 w-3" />Save Credit Details</>}
          </Button>
        </div>
      )}

      {/* ── Step 3: Decision ── */}
      <div className="px-4 py-4">
        {!showApproveConfirm && !showDenyDialog && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Step 3 — Decision</p>
            <Button
              onClick={() => setShowApproveConfirm(true)}
              disabled={approving || denying || !hasSirRestyFile}
              size="sm"
              className="w-full gap-1.5 bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve CUS
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDenyDialog(true)}
              disabled={approving || denying}
              size="sm"
              className="w-full gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Deny
            </Button>
          </div>
        )}

        {showApproveConfirm && (
          <div className="space-y-3 rounded-lg bg-green-50 border border-green-200 px-3 py-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Confirm Approval</p>
                <p className="text-xs text-green-600 mt-0.5">This will apply all changes to the customer record.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApprove} disabled={approving} size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5">
                {approving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Approving...</> : "Yes, Approve"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowApproveConfirm(false)} disabled={approving}>Cancel</Button>
            </div>
          </div>
        )}

        {showDenyDialog && (
          <div className="space-y-3 rounded-lg bg-red-50 border border-red-200 px-3 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Deny this CUS?</p>
                <p className="text-xs text-red-500 mt-0.5">The agent will be notified. This cannot be undone.</p>
              </div>
            </div>
            <Textarea
              id="denyNote"
              placeholder="Reason for denial (optional)..."
              value={denyNote}
              onChange={(e) => setDenyNote(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleDeny} disabled={denying} size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5">
                {denying ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Denying...</> : "Confirm Deny"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowDenyDialog(false)} disabled={denying}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
