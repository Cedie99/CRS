"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sileo as toast } from "sileo";

const CREDIT_TERMS_OPTIONS = [
  { value: "prepaid_cod", label: "Prepaid / COD" },
  { value: "30_days", label: "30 Days" },
  { value: "60_days", label: "60 Days" },
];

export function CusFinancePanel({
  cusId,
  initialCreditLimit,
  initialCreditTerms,
  backHref,
  isLegal = false,
}: {
  cusId: string;
  initialCreditLimit: string;
  initialCreditTerms: string;
  backHref: string;
  isLegal?: boolean;
}) {
  const router = useRouter();
  const [creditLimit, setCreditLimit] = useState(initialCreditLimit);
  const [creditTerms, setCreditTerms] = useState(initialCreditTerms);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [denying, setDenying] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [denyNote, setDenyNote] = useState("");

  const accentClass = isLegal
    ? "border-purple-200 bg-purple-50 text-purple-800"
    : "border-amber-200 bg-amber-50 text-amber-800";

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cus/${cusId}/finance-save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financeCreditLimit: creditLimit, financeCreditTerms: creditTerms }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      toast.success({ title: "Draft saved.", description: "Credit evaluation data has been saved." });
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
        body: JSON.stringify({}),
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
      toast.success({ title: "CUS Denied.", description: "The agent has been notified." });
      router.push(backHref);
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to deny." });
      setDenying(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Credit evaluation form */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className={`border-b px-5 py-3 ${accentClass} border-opacity-50`}>
          <h2 className="text-sm font-semibold">Credit Evaluation</h2>
          <p className="text-xs mt-0.5 opacity-80">Set the credit terms to grant upon approval.</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="creditLimit">
              Credit Limit <span className="text-zinc-400 font-normal text-xs">(e.g. ₱500,000)</span>
            </Label>
            <Input
              id="creditLimit"
              placeholder="₱0.00"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="creditTerms">Credit Terms</Label>
            <Select value={creditTerms} onValueChange={(v) => setCreditTerms(v ?? "")}>
              <SelectTrigger id="creditTerms" className="w-full">
                <SelectValue placeholder="Select payment terms..." />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_TERMS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-1.5"
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4" />Save Draft</>
            )}
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-700">Decision</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Approve or deny this credit upgrade request.</p>
        </div>
        <div className="p-5 space-y-3">
          {!showApproveConfirm && !showDenyDialog && (
            <div className="space-y-2">
              <Button
                onClick={() => setShowApproveConfirm(true)}
                disabled={approving || denying}
                className="w-full gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve CUS
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDenyDialog(true)}
                disabled={approving || denying}
                className="w-full gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Deny CUS
              </Button>
            </div>
          )}

          {showApproveConfirm && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Confirm Approval</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {creditTerms
                      ? <>This will grant <strong>{CREDIT_TERMS_OPTIONS.find(o => o.value === creditTerms)?.label ?? creditTerms}</strong> credit terms
                        {creditLimit ? <> with a limit of <strong>{creditLimit}</strong></> : ""}.</>
                      : "Make sure you've set the credit limit and terms before approving."
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                >
                  {approving ? <><Loader2 className="h-4 w-4 animate-spin" />Approving...</> : "Yes, Approve"}
                </Button>
                <Button variant="outline" onClick={() => setShowApproveConfirm(false)} disabled={approving} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {showDenyDialog && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Deny this CUS?</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    The agent will be notified. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="denyNote" className="text-red-700 text-xs">
                  Reason for denial <span className="font-normal">(optional but recommended)</span>
                </Label>
                <Textarea
                  id="denyNote"
                  placeholder="e.g. Insufficient financial documents, unable to verify business income..."
                  value={denyNote}
                  onChange={(e) => setDenyNote(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleDeny}
                  disabled={denying}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5"
                >
                  {denying ? <><Loader2 className="h-4 w-4 animate-spin" />Denying...</> : "Confirm Deny"}
                </Button>
                <Button variant="outline" onClick={() => setShowDenyDialog(false)} disabled={denying} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
