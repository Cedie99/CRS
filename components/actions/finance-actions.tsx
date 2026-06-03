"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocUploadSlot } from "@/components/doc-upload-slot";
import { DecisionNoteTemplates } from "@/components/decision-note-templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  PenLine,
  Printer,
  Save,
  ScanLine,
  XCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { numberToWords } from "@/lib/utils";
import type { FileEntry, DocReviewStatuses } from "@/lib/doc-types";

function fmtCreditLimit(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

interface FinanceActionsProps {
  cisId: string;
  initialSirRestyFiles?: FileEntry[];
  initialCreditTerms?: string;
  initialCreditLimit?: string;
  /** Override the forward endpoint. Defaults to /api/cis/{cisId}/finance-forward */
  forwardEndpoint?: string;
  /** Override the deny endpoint. Defaults to /api/cis/{cisId}/finance-deny */
  denyEndpoint?: string;
  /** Dashboard path to redirect to on success. Defaults to /finance */
  dashboardPath?: string;
  /** Whether printing is allowed. Blocked when there are unreviewed documents. */
  printEnabled?: boolean;
  /** Current document review statuses. If any doc is rejected, forward is disabled. */
  docReviewStatuses?: DocReviewStatuses;
  /**
   * When provided, overrides the internal hasRejectedDocs computation.
   * Pass `true` only when there are rejections that have NOT been resolved
   * by a new replacement file upload.
   */
  hasUnresolvedRejections?: boolean;
  /** Pass `true` when any uploaded document has not yet been reviewed. Blocks forwarding. */
  hasUnreviewedDocs?: boolean;
}

interface FieldErrors {
  sirRestyFiles?: string;
  creditTerms?: string;
  creditLimit?: string;
}

export function FinanceActions({
  cisId,
  initialSirRestyFiles = [],
  initialCreditTerms = "",
  initialCreditLimit = "",
  forwardEndpoint,
  denyEndpoint,
  dashboardPath = "/finance",
  printEnabled = true,
  docReviewStatuses = {},
  hasUnresolvedRejections,
  hasUnreviewedDocs = false,
}: FinanceActionsProps) {
  const router = useRouter();

  const [sirRestyFiles, setSirRestyFiles] =
    useState<FileEntry[]>(initialSirRestyFiles);
  const [creditTerms, setCreditTerms] = useState(initialCreditTerms);
  const [creditLimit, setCreditLimit] = useState(fmtCreditLimit(initialCreditLimit));
  const [savedCreditTerms, setSavedCreditTerms] = useState(initialCreditTerms);
  const [savedCreditLimit, setSavedCreditLimit] = useState(fmtCreditLimit(initialCreditLimit));
  const [savingCredit, setSavingCredit] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"forward" | "return" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const creditDirty = creditTerms !== savedCreditTerms || creditLimit !== savedCreditLimit;

  async function handleSaveCredit() {
    setSavingCredit(true);
    try {
      const res = await fetch(`/api/cis/${cisId}/finance-save`, {
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
      setSavedCreditTerms(creditTerms);
      setSavedCreditLimit(creditLimit);
      toast.success({ title: "Credit details saved." });
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to save." });
    } finally {
      setSavingCredit(false);
    }
  }

  const uploadComplete = sirRestyFiles.length > 0;
  const hasRejectedDocs = hasUnresolvedRejections ?? Object.values(docReviewStatuses).some((s) => s?.status === "rejected");
  const creditFilled = !!creditTerms.trim() && !!creditLimit.trim();
  const creditSaved = creditFilled && !creditDirty;
  const canForward = uploadComplete && !hasRejectedDocs && !hasUnreviewedDocs && creditSaved;
  const canReturn = hasRejectedDocs;

  function validateFields(): boolean {
    const errors: FieldErrors = {};
    if (sirRestyFiles.length === 0)
      errors.sirRestyFiles = "Please attach the approved CIS signed by CFO";
    if (!creditTerms.trim())
      errors.creditTerms = "Credit terms are required before forwarding";
    if (!creditLimit.trim())
      errors.creditLimit = "Credit limit is required before forwarding";
    if (creditFilled && creditDirty) {
      errors.creditTerms = errors.creditTerms ?? "Save credit details before forwarding";
      errors.creditLimit = errors.creditLimit ?? "Save credit details before forwarding";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function openDialog(a: "forward" | "return" | "reject") {
    if (a === "forward" && !validateFields()) return;
    setAction(a);
    setNote("");
    setDialogError("");
    setOpen(true);
  }

  function closeDialog() {
    if (isLoading) return;
    setOpen(false);
  }

  async function handleSubmit() {
    if (!action) return;
    setDialogError("");

    if ((action === "return" || action === "reject") && note.trim().length < 10) {
      setDialogError(
        "Please provide a reason of at least 10 characters.",
      );
      return;
    }

    setIsLoading(true);
    try {
      if (action === "forward") {
        const res = await fetch(
          forwardEndpoint ?? `/api/cis/${cisId}/finance-forward`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              note: note.trim() || undefined,
              financeCreditTerms: creditTerms || undefined,
              financeCreditLimit: creditLimit || undefined,
            }),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          setDialogError(
            typeof json.error === "string"
              ? json.error
              : "Something went wrong.",
          );
          return;
        }
      } else {
        let endpoint: string;
        if (action === "reject") {
          endpoint = "finance-reject";
        } else {
          endpoint = denyEndpoint ?? "finance-deny";
        }
        
        const res = await fetch(
          `/api/cis/${cisId}/${endpoint}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: note.trim() }),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          setDialogError(
            typeof json.error === "string"
              ? json.error
              : "Something went wrong.",
          );
          return;
        }
      }

      setOpen(false);
      if (action === "forward") {
        toast.success({
          title: "Forwarded to Senior Approver.",
          description: "The Senior Approver has been notified for final review.",
        });
      } else if (action === "reject") {
        toast.error({
          title: "Form rejected.",
          description: "The form has been rejected. The agent must redo the customer fillup and submission.",
        });
      } else {
        toast.error({
          title: "Returned to agent.",
          description: "The form has been returned to the agent with your denial reason.",
        });
      }
      router.push(dashboardPath);
      router.refresh();
    } catch {
      setDialogError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Card className="print:hidden overflow-hidden border border-blue-200/70 bg-linear-to-b from-blue-50/60 via-white to-white shadow-sm">
        <CardHeader className="border-b border-blue-100/80 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-blue-900">
                Finance and Legal Information
              </CardTitle>
              <p className="mt-1 text-xs text-zinc-600">
                Print the CIS form, have the CFO physically fill in the Credit Decision
                details and sign, then upload the signed copy before forwarding.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              {canForward ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className={`h-3.5 w-3.5 ${hasRejectedDocs ? "text-red-600" : "text-blue-600"}`} />
              )}
              {hasRejectedDocs ? "Rejected docs pending" : hasUnreviewedDocs ? "Documents not reviewed" : !uploadComplete ? "Upload required" : !creditFilled ? "Credit details required" : creditDirty ? "Credit details unsaved" : "Ready to forward"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <section className="rounded-xl border border-blue-200/80 bg-linear-to-br from-blue-50 via-sky-50 to-indigo-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
                  Required Physical Sign-off
                </p>
                <p className="mt-1 text-sm font-medium text-blue-900">
                  CFO fills in Credit Limit, Credit Terms, and signs the printed form
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-white/75 px-2 py-1 text-[11px] font-semibold text-blue-700">
                <AlertCircle className="h-3.5 w-3.5" />
                Mandatory
              </span>
            </div>

            <div className="mt-3 grid gap-2 grid-cols-3">
              <div className="rounded-lg border border-blue-200/70 bg-white/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                  Step 1
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <Printer className="h-4 w-4 text-blue-600" />
                  Print CIS form
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => window.print()}
                  disabled={isLoading || !printEnabled}
                >
                  Print now
                </Button>
                {!printEnabled && (
                  <p className="mt-1.5 text-[10px] leading-snug text-amber-700">
                    Review all uploaded documents before printing.
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-blue-200/70 bg-white/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                  Step 2
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <PenLine className="h-4 w-4 text-blue-600" />
                  CFO fills Credit details &amp; signs
                </p>
              </div>
              <div className="rounded-lg border border-blue-200/70 bg-white/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                  Step 3
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <ScanLine className="h-4 w-4 text-blue-600" />
                  Upload signed copy
                </p>
              </div>
            </div>

            {uploadComplete && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Signed copy uploaded ({sirRestyFiles.length})
                </span>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
            <div className="space-y-1.5">
              <Label>Attach Signed CIS (by CFO) *</Label>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <DocUploadSlot
                  docType="docSirRestySigned"
                  label="Signed CIS (by CFO)"
                  endpoint={`/api/cis/${cisId}/staff-docs`}
                  files={sirRestyFiles}
                  onChange={(files) => {
                    setSirRestyFiles(files);
                    setFieldErrors((prev) => ({
                      ...prev,
                      sirRestyFiles: undefined,
                    }));
                  }}
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.sirRestyFiles && (
                <p className="text-xs text-red-600">
                  {fieldErrors.sirRestyFiles}
                </p>
              )}
            </div>
          </section>

          {/* Credit details — shown after signed form is uploaded */}
          {uploadComplete && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Credit Evaluation</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Enter the credit details as filled in by the CFO on the signed form.</p>
                </div>
                {creditDirty && (
                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
                    Unsaved
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="creditTerms" className="text-xs font-medium text-zinc-600">
                    Credit Terms <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="creditTerms"
                    value={creditTerms}
                    onChange={(e) => { setCreditTerms(e.target.value); setFieldErrors((p) => ({ ...p, creditTerms: undefined })); }}
                    placeholder="e.g. 30 days"
                    className={`h-8 text-sm ${fieldErrors.creditTerms ? "border-red-400 focus-visible:ring-red-300" : creditDirty ? "border-amber-300 focus-visible:ring-amber-300" : ""}`}
                    disabled={isLoading || savingCredit}
                  />
                  {fieldErrors.creditTerms && (
                    <p className="text-[11px] text-red-500">{fieldErrors.creditTerms}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="creditLimit" className="text-xs font-medium text-zinc-600">
                    Credit Limit <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="creditLimit"
                    value={creditLimit}
                    onChange={(e) => { setCreditLimit(fmtCreditLimit(e.target.value)); setFieldErrors((p) => ({ ...p, creditLimit: undefined })); }}
                    placeholder="e.g. 500,000"
                    className={`h-8 text-sm ${fieldErrors.creditLimit ? "border-red-400 focus-visible:ring-red-300" : creditDirty ? "border-amber-300 focus-visible:ring-amber-300" : ""}`}
                    disabled={isLoading || savingCredit}
                  />
                  {fieldErrors.creditLimit ? (
                    <p className="text-[11px] text-red-500">{fieldErrors.creditLimit}</p>
                  ) : creditLimit ? (
                    <p className="text-[11px] text-zinc-400 italic">
                      {numberToWords(parseInt(creditLimit.replace(/[^\d]/g, ""), 10))}
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                variant={creditDirty ? "default" : "ghost"}
                size="sm"
                onClick={handleSaveCredit}
                disabled={savingCredit || isLoading || !creditDirty}
                className={`gap-1.5 text-xs ${creditDirty ? "bg-amber-500 hover:bg-amber-600 text-white" : "text-zinc-400"}`}
              >
                {savingCredit
                  ? <><Save className="h-3 w-3 animate-pulse" />Saving...</>
                  : <><Save className="h-3 w-3" />Save Credit Details</>}
              </Button>
            </section>
          )}

          <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <p className={`text-xs ${hasRejectedDocs ? "text-red-600 font-medium" : hasUnreviewedDocs ? "text-amber-700 font-medium" : "text-zinc-500"}`}>
              {hasRejectedDocs
                ? "Some documents are rejected. Return this form to the agent to upload replacements."
                : hasUnreviewedDocs
                  ? "All uploaded documents must be reviewed before forwarding. Reject any problematic documents to enable Return."
                  : "Upload the signed copy before forwarding."}
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                onClick={() => openDialog("forward")}
                className="w-full gap-2 sm:w-auto"
                disabled={isLoading || !canForward}
              >
                <ArrowRight className="h-4 w-4" />
                Forward to Sr. Approver
              </Button>
              <Button
                variant="outline"
                onClick={() => openDialog("return")}
                disabled={isLoading || !canReturn}
                title={!canReturn ? "Reject at least one document before returning the form" : undefined}
                className="w-full gap-2 border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 sm:w-auto disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Return
              </Button>
              <Button
                variant="outline"
                onClick={() => openDialog("reject")}
                disabled={isLoading}
                className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto"
              >
                <XCircle className="h-4 w-4" />
                Reject Form
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent showCloseButton={!isLoading}>
          <DialogHeader>
            <DialogTitle>
              {action === "forward"
                ? "Forward to Senior Approver"
                : action === "reject"
                ? "Reject Form"
                : "Return to Agent"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-zinc-600">
            {action === "forward"
              ? "You are forwarding this submission to the Senior Approver for final decision. You may add an optional note."
              : action === "reject"
              ? "You are rejecting this entire form. The agent must redo the customer fillup and submission. Please explain why."
              : "You are returning this submission to the agent. Please explain why it needs corrections."}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="dialog-note">
              {action === "forward" ? "Note (optional)" : "Reason *"}
            </Label>
            {action === "forward" ? (
              <DecisionNoteTemplates
                type="finance_forward_note"
                onSelect={setNote}
                disabled={isLoading}
              />
            ) : (
              <DecisionNoteTemplates
                type="finance_deny_reason"
                onSelect={setNote}
                disabled={isLoading}
              />
            )}
            <Textarea
              id="dialog-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "forward"
                  ? "Finance review notes…"
                  : action === "reject"
                  ? "Reason for rejection…"
                  : "Reason for return…"
              }
              disabled={isLoading}
            />
            {dialogError && (
              <p className="text-sm text-red-600">{dialogError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              variant={action === "return" ? "default" : action === "reject" ? "destructive" : "default"}
            >
              {isLoading
                ? "Submitting…"
                : action === "forward"
                  ? "Yes, Forward"
                  : action === "reject"
                  ? "Yes, Reject"
                  : "Yes, Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
