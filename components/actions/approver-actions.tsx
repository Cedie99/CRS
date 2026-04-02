"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SignaturePad, SignaturePadRef } from "@/components/signature-pad";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ApproverActionsProps {
  cisId: string;
}

export function ApproverActions({ cisId }: ApproverActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"approve" | "deny" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const signatureRef = useRef<SignaturePadRef>(null);
  const [signatureEmpty, setSignatureEmpty] = useState(true);

  function openDialog(a: "approve" | "deny") {
    setAction(a);
    setNote("");
    setError("");
    setSignatureEmpty(true);
    setOpen(true);
  }

  function closeDialog() {
    if (isLoading) return;
    signatureRef.current?.clear();
    setOpen(false);
  }

  async function handleSubmit() {
    if (!action) return;
    setError("");

    if (action === "deny" && note.trim().length < 10) {
      setError("Please provide a denial reason of at least 10 characters.");
      return;
    }

    if (action === "approve" && signatureRef.current?.isEmpty()) {
      setError("Your signature is required to approve.");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = action === "approve" ? "approve" : "deny";
      const body: Record<string, unknown> = { note: note.trim() || undefined };
      if (action === "approve") {
        body.approverSignature = signatureRef.current!.toDataURL();
      }

      const res = await fetch(`/api/cis/${cisId}/${endpoint}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setOpen(false);
      toast.success(action === "approve" ? "Customer approved." : "Submission denied.");
      router.push("/approver");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="print:hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Final Decision
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-zinc-500">
          This is the final step before the customer is onboarded. Review carefully before deciding.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => openDialog("approve")} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={() => openDialog("deny")}
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <XCircle className="h-4 w-4" />
            Deny
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent showCloseButton={!isLoading}>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Submission" : "Deny Submission"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-zinc-600">
            {action === "approve"
              ? "You are approving this customer. The Sales Support team will then enter them into the system. You may add an optional note."
              : "You are denying this submission. Please explain why it cannot be approved."}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="dialog-note">
              {action === "approve" ? "Note (optional)" : "Denial reason *"}
            </Label>
            <Textarea
              id="dialog-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "approve" ? "Approval remarks…" : "Reason for denial…"
              }
              disabled={isLoading}
            />
          </div>

          {action === "approve" && (
            <div className="space-y-2">
              <Label>Your Signature *</Label>
              <p className="text-xs text-zinc-500">
                Sign to formally authorize this customer onboarding.
              </p>
              <SignaturePad
                ref={signatureRef}
                onChange={(isEmpty) => setSignatureEmpty(isEmpty)}
                disabled={isLoading}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || (action === "approve" && signatureEmpty)}
              variant={action === "deny" ? "destructive" : "default"}
            >
              {isLoading
                ? "Submitting…"
                : action === "approve"
                ? "Yes, Approve"
                : "Yes, Deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
