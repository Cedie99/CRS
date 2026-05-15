"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/lib/toast";

export function CtrApproverActions({ ctrId }: { ctrId: string }) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [denying, setDenying] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [denyNote, setDenyNote] = useState("");

  async function handleApprove() {
    setApproving(true);
    try {
      const res = await fetch(`/api/ctr/${ctrId}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      toast.success({ title: "CTR Approved.", description: "Customer type has been updated." });
      router.push("/approver/ctr");
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to approve." });
      setApproving(false);
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
      router.push("/approver/ctr");
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to deny." });
      setDenying(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3">
        <h2 className="text-sm font-semibold text-zinc-700">Decision</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Approve or deny this reclassification request.</p>
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
              Approve CTR
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDenyDialog(true)}
              disabled={approving || denying}
              className="w-full gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4" />
              Deny CTR
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
                  This will update the customer&apos;s type in the system. This action cannot be undone.
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
                <p className="text-sm font-semibold text-red-800">Deny this CTR?</p>
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
                placeholder="e.g. Insufficient justification for type change..."
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
  );
}
