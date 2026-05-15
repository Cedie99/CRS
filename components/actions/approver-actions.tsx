"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionNoteTemplates } from "@/components/decision-note-templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";

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

  function openDialog(a: "approve" | "deny") {
    setAction(a);
    setNote("");
    setError("");
    setOpen(true);
  }

  function closeDialog() {
    if (isLoading) return;
    setOpen(false);
  }

  async function handleSubmit() {
    if (!action) return;
    setError("");

    if (action === "deny" && note.trim().length < 10) {
      setError("Please provide a denial reason of at least 10 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = action === "approve" ? "approve" : "deny";
      const body: Record<string, unknown> = { note: note.trim() || undefined };

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
      if (action === "approve") {
        toast.success({
          title: "Customer approved.",
          description: "Sales Support can now onboard this customer.",
        });
      } else {
        toast.error({
          title: "Submission denied.",
          description: "The submission was closed with a denied status.",
        });
      }
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
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Button onClick={() => openDialog("approve")} className="w-full gap-2 sm:w-auto">
            <CheckCircle className="h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={() => openDialog("deny")}
            className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
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
            {action === "approve" ? (
              <DecisionNoteTemplates type="approver_approve_note" onSelect={setNote} disabled={isLoading} />
            ) : (
              <DecisionNoteTemplates type="approver_deny_reason" onSelect={setNote} disabled={isLoading} />
            )}
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
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
