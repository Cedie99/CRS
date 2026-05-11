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

const CUSTOMER_TYPE_OPTIONS = [
  { value: "dealer", label: "Dealer" },
  { value: "distributor", label: "Distributor" },
  { value: "private_label", label: "Private Label" },
  { value: "toll_blend", label: "Toll Blend" },
  { value: "end_user", label: "End User" },
];

export function CusFinancePanel({
  cusId,
  initialCreditLimit,
  initialCreditTerms,
  newCustomerType: initialNewCustomerType,
  backHref,
  isLegal = false,
}: {
  cusId: string;
  initialCreditLimit: string;
  initialCreditTerms: string;
  newCustomerType?: string;
  backHref: string;
  isLegal?: boolean;
}) {
  const router = useRouter();
  const [creditLimit, setCreditLimit] = useState(initialCreditLimit);
  const [creditTerms, setCreditTerms] = useState(initialCreditTerms);
  const [newCustomerType, setNewCustomerType] = useState(initialNewCustomerType ?? "");
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
        body: JSON.stringify({
          financeCreditLimit: creditLimit,
          financeCreditTerms: creditTerms,
          newCustomerType: newCustomerType || undefined,
        }),
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
    <div>
      {/* Fields */}
      <div className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="creditLimit" className="text-xs">
            Credit Limit
          </Label>
          <Input
            id="creditLimit"
            placeholder="e.g. ₱500,000"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="creditTerms" className="text-xs">Credit Terms</Label>
          <Select value={creditTerms} onValueChange={(v) => setCreditTerms(v ?? "")}>
            <SelectTrigger id="creditTerms" className="w-full h-8 text-sm">
              <SelectValue placeholder="Select terms..." />
            </SelectTrigger>
            <SelectContent>
              {CREDIT_TERMS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {initialNewCustomerType && (
          <div className="space-y-1.5">
            <Label htmlFor="newCustomerType" className="text-xs text-zinc-600">
              Override customer type
            </Label>
            <Select value={newCustomerType} onValueChange={(v) => setNewCustomerType(v ?? "")}>
              <SelectTrigger id="newCustomerType" className="w-full h-8 text-sm">
                <SelectValue placeholder="Confirm or override..." />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Save row */}
        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-7 gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 px-2"
          >
            {saving ? <><Loader2 className="h-3 w-3 animate-spin" />Saving...</> : <><Save className="h-3 w-3" />Save draft</>}
          </Button>
        </div>
      </div>

      {/* Decision area */}
      <div className="border-t border-zinc-200">
        {!showApproveConfirm && !showDenyDialog && (
          <div className="flex gap-2 px-4 py-3">
            <Button
              onClick={() => setShowApproveConfirm(true)}
              disabled={approving || denying}
              size="sm"
              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDenyDialog(true)}
              disabled={approving || denying}
              size="sm"
              className="flex-1 gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Deny
            </Button>
          </div>
        )}

        {showApproveConfirm && (
          <div className="px-4 py-3 space-y-3 bg-green-50">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Confirm Approval</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {creditTerms
                    ? <>Grant <strong>{CREDIT_TERMS_OPTIONS.find(o => o.value === creditTerms)?.label ?? creditTerms}</strong>
                        {creditLimit ? <> · <strong>{creditLimit}</strong></> : ""}.</>
                    : "Set credit terms before approving."
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApprove} disabled={approving} size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
                {approving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Approving...</> : "Yes, Approve"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowApproveConfirm(false)} disabled={approving}>Cancel</Button>
            </div>
          </div>
        )}

        {showDenyDialog && (
          <div className="px-4 py-3 space-y-3 bg-red-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Deny this CUS?</p>
                <p className="text-xs text-red-700 mt-0.5">The agent will be notified. This cannot be undone.</p>
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
              <Button onClick={handleDeny} disabled={denying} size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
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
