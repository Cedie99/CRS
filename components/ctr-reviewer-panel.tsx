"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, CheckCircle2, XCircle, Save, AlertTriangle, Send,
  FileCheck, CreditCard, Gavel,
} from "lucide-react";
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
import { toast } from "@/lib/toast";
import { SCORING_DOC_SLOTS } from "@/lib/doc-types";

const CREDIT_TERMS_OPTIONS = [
  { value: "prepaid_cod", label: "Prepaid / COD" },
  { value: "30_days", label: "30 Days" },
  { value: "60_days", label: "60 Days" },
];

export function CtrReviewerPanel({
  ctrId,
  initialCreditLimit,
  initialCreditTerms,
  backHref,
  isLegal = false,
}: {
  ctrId: string;
  initialCreditLimit: string;
  initialCreditTerms: string;
  backHref: string;
  isLegal?: boolean;
}) {
  const router = useRouter();
  const [creditLimit, setCreditLimit] = useState(initialCreditLimit);
  const [creditTerms, setCreditTerms] = useState(initialCreditTerms);
  const [saving, setSaving] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [denying, setDenying] = useState(false);
  const [showForwardConfirm, setShowForwardConfirm] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [denyNote, setDenyNote] = useState("");
  const [selectedDocSlots, setSelectedDocSlots] = useState<string[]>([]);
  const [docRequestNote, setDocRequestNote] = useState("");
  const [requestingDocs, setRequestingDocs] = useState(false);

  const accentClass = isLegal
    ? "border-purple-200 bg-purple-50 text-purple-800"
    : "border-amber-200 bg-amber-50 text-amber-800";

  function toggleDocSlot(key: string) {
    setSelectedDocSlots((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/ctr/${ctrId}/finance-save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financeCreditLimit: creditLimit, financeCreditTerms: creditTerms }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      toast.success({ title: "Draft saved." });
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestDocs() {
    if (selectedDocSlots.length === 0) {
      toast.error({ title: "Select at least one document slot." });
      return;
    }
    setRequestingDocs(true);
    try {
      const res = await fetch(`/api/ctr/${ctrId}/request-documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requiredDocSlots: selectedDocSlots,
          requiredDocsNote: docRequestNote.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      toast.success({ title: "Document request sent to agent." });
      router.push(backHref);
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to request documents." });
      setRequestingDocs(false);
    }
  }

  async function handleForward() {
    setForwarding(true);
    try {
      const res = await fetch(`/api/ctr/${ctrId}/forward`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      toast.success({ title: "CTR forwarded to Senior Approver." });
      router.push(backHref);
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to forward." });
      setForwarding(false);
    }
  }

  async function handleDeny() {
    setDenying(true);
    try {
      const res = await fetch(`/api/ctr/${ctrId}/deny`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: denyNote.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      toast.error({ title: "CTR Denied.", description: "The agent has been notified." });
      router.push(backHref);
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to deny." });
      setDenying(false);
    }
  }

  const allDocSlots = [...SCORING_DOC_SLOTS, { key: "docOther", label: "Other Supporting Documents" }];

  function handleSelectAll() {
    setSelectedDocSlots(allDocSlots.map((s) => s.key));
  }
  function handleClearAll() {
    setSelectedDocSlots([]);
  }

  return (
    <div className="space-y-3">
      {/* 1. Credit Evaluation — primary task, always on top */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <div className={`border-b px-4 py-2.5 ${accentClass} border-opacity-50`}>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 opacity-70" />
            <h2 className="text-sm font-semibold">Credit Evaluation</h2>
          </div>
        </div>
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="creditLimit" className="text-[11px] font-medium text-zinc-500">
                Credit Limit
              </Label>
              <Input
                id="creditLimit"
                placeholder="₱0.00"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="font-medium h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="creditTerms" className="text-[11px] font-medium text-zinc-500">Credit Terms</Label>
              <Select value={creditTerms} onValueChange={(v) => setCreditTerms(v ?? "")}>
                <SelectTrigger id="creditTerms" className="w-full h-9 text-sm">
                  <SelectValue placeholder="Select..." />
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
          </div>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="w-full gap-1.5 border-zinc-200 hover:bg-zinc-50">
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving...</>
              : <><Save className="h-3.5 w-3.5" />Save Draft</>}
          </Button>
        </div>
      </div>

      {/* 2. Decision — approve or deny */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-700">Decision</h2>
          </div>
        </div>
        <div className="p-3 space-y-3">
          {!showForwardConfirm && !showDenyDialog && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowForwardConfirm(true)}
                disabled={forwarding || denying}
                size="sm"
                className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Forward to Approver
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDenyDialog(true)}
                disabled={forwarding || denying}
                size="sm"
                className="flex-1 gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Deny
              </Button>
            </div>
          )}

          {showForwardConfirm && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-800">
                  <span className="font-semibold">Forward to Senior Approver?</span> This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleForward}
                  disabled={forwarding}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                >
                  {forwarding ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Forwarding...</> : "Confirm"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowForwardConfirm(false)} disabled={forwarding} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {showDenyDialog && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">
                  <span className="font-semibold">Deny this CTR?</span> The agent will be notified. Cannot be undone.
                </p>
              </div>
              <Textarea
                id="denyNote"
                placeholder="Reason for denial (recommended)..."
                value={denyNote}
                onChange={(e) => setDenyNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleDeny}
                  disabled={denying}
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-1.5"
                >
                  {denying ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Denying...</> : "Confirm Deny"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDenyDialog(false)} disabled={denying} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Request Documents — optional action, at bottom */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-700">Request Documents</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedDocSlots.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-blue-600 px-1.5 text-[11px] font-bold text-white">
                {selectedDocSlots.length}
              </span>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                All
              </button>
              <span className="text-zinc-300">/</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 hover:underline"
              >
                None
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-3">
          <p className="text-[11px] text-zinc-500">
            Need more documents? Select below and the agent will be notified.
          </p>

          <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-0.5">
            {allDocSlots.map((slot) => {
              const isSelected = selectedDocSlots.includes(slot.key);
              return (
                <label
                  key={slot.key}
                  className={`group flex items-start gap-2 rounded-md border px-2.5 py-2 cursor-pointer transition-all duration-150
                    ${isSelected
                      ? "border-blue-300 bg-blue-50"
                      : "border-zinc-100 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                >
                  <div className={`flex h-4 w-4 items-center justify-center rounded border transition-colors mt-px shrink-0
                    ${isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-zinc-300 bg-white group-hover:border-zinc-400"
                    }`}>
                    {isSelected && (
                      <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDocSlot(slot.key)}
                    className="sr-only"
                  />
                  <span className={`text-[11px] leading-tight ${
                    isSelected ? "font-medium text-blue-900" : "text-zinc-600"
                  }`}>{slot.label}</span>
                </label>
              );
            })}
          </div>

          <Textarea
            id="docNote"
            placeholder="Note to agent (optional)..."
            value={docRequestNote}
            onChange={(e) => setDocRequestNote(e.target.value)}
            rows={2}
            className="text-sm resize-none"
          />

          <Button
            onClick={handleRequestDocs}
            disabled={requestingDocs || selectedDocSlots.length === 0}
            size="sm"
            className={`w-full gap-1.5 transition-all ${
              selectedDocSlots.length > 0
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                : ""
            }`}
            variant={selectedDocSlots.length > 0 ? "default" : "outline"}
          >
            {requestingDocs
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending...</>
              : <><Send className="h-3.5 w-3.5" />Send Request{selectedDocSlots.length > 0 ? ` (${selectedDocSlots.length})` : ""}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
