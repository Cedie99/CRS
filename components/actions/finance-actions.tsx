"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionNoteTemplates } from "@/components/decision-note-templates";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowRight, XCircle } from "lucide-react";
import { sileo as toast } from "sileo";
import {
  FINANCE_EU_OPTIONS,
  FINANCE_DR_OPTIONS,
  FINANCE_CREDIT_TERMS_OPTIONS,
} from "@/lib/validations/cis";
import { computePossiblePoints, type CisForScoring } from "@/lib/scoring";

interface FinanceActionsProps {
  cisId: string;
  cis: CisForScoring;
}

interface EvalFields {
  financeEu: string;
  financeDl: string;
  financeDr: string;
  financePlTs: string;
  financeApprovedPoints: string;
  financeCreditTerms: string;
}

interface EvalErrors {
  financeEu?: string;
  financeDl?: string;
  financeDr?: string;
  financePlTs?: string;
  financeApprovedPoints?: string;
  financeCreditTerms?: string;
}

export function FinanceActions({ cisId, cis }: FinanceActionsProps) {
  const router = useRouter();

  const possiblePoints = computePossiblePoints(cis);

  const scoreColor =
    possiblePoints >= 80
      ? { card: "border-green-200 bg-green-50", number: "text-green-700", label: "text-green-600", badge: "bg-green-100 text-green-700" }
      : possiblePoints >= 50
      ? { card: "border-amber-200 bg-amber-50", number: "text-amber-700", label: "text-amber-600", badge: "bg-amber-100 text-amber-700" }
      : { card: "border-red-200 bg-red-50",     number: "text-red-700",   label: "text-red-600",   badge: "bg-red-100 text-red-700" };

  const scoreLabel =
    possiblePoints >= 80 ? "High" : possiblePoints >= 50 ? "Moderate" : "Low";

  const [fields, setFields] = useState<EvalFields>({
    financeEu: "",
    financeDl: "",
    financeDr: "",
    financePlTs: "",
    financeApprovedPoints: "",
    financeCreditTerms: "",
  });
  const [evalErrors, setEvalErrors] = useState<EvalErrors>({});

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"forward" | "deny" | null>(null);
  const [note, setNote] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function setField<K extends keyof EvalFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setEvalErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validateEvalFields(): boolean {
    const errors: EvalErrors = {};
    if (!fields.financeEu) errors.financeEu = "End User classification is required";
    if (!fields.financeDl.trim()) errors.financeDl = "Delivery Limit is required";
    if (!fields.financeDr) errors.financeDr = "Delivery Receipt terms are required";
    if (!fields.financePlTs.trim()) errors.financePlTs = "Price List / Terms & Schedule is required";

    const approved = Number(fields.financeApprovedPoints);
    if (
      fields.financeApprovedPoints === "" ||
      isNaN(approved) ||
      !Number.isInteger(approved) ||
      approved < 0
    ) {
      errors.financeApprovedPoints = "Approved Points must be a whole number (0 or more)";
    }
    if (!fields.financeCreditTerms) errors.financeCreditTerms = "Credit Terms selection is required";

    setEvalErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function openDialog(a: "forward" | "deny") {
    if (a === "forward" && !validateEvalFields()) return;
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

    if (action === "deny" && note.trim().length < 10) {
      setDialogError("Please provide a denial reason of at least 10 characters.");
      return;
    }

    setIsLoading(true);
    try {
      if (action === "forward") {
        const body = {
          note: note.trim() || undefined,
          financeEu: fields.financeEu,
          financeDl: fields.financeDl,
          financeDr: fields.financeDr,
          financePlTs: fields.financePlTs,
          financeApprovedPoints: Number(fields.financeApprovedPoints),
          financeCreditTerms: fields.financeCreditTerms,
        };
        const res = await fetch(`/api/cis/${cisId}/finance-forward`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) {
          setDialogError(
            typeof json.error === "string" ? json.error : "Something went wrong."
          );
          return;
        }
      } else {
        const res = await fetch(`/api/cis/${cisId}/finance-deny`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: note.trim() }),
        });
        const json = await res.json();
        if (!res.ok) {
          setDialogError(
            typeof json.error === "string" ? json.error : "Something went wrong."
          );
          return;
        }
      }

      setOpen(false);
      toast.success({
        title: action === "forward" ? "Forwarded to Senior Approver." : "Submission denied.",
        description:
          action === "forward"
            ? "Final approver has been notified to review this account."
            : "The submission has been closed as denied.",
      });
      router.push("/finance");
      router.refresh();
    } catch {
      setDialogError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* ── Evaluation Form ── */}
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Finance Credit Evaluation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Possible Points — auto-computed, read-only */}
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${scoreColor.card}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Possible Points
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${scoreColor.badge}`}>
                  {scoreLabel}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-zinc-500">
                Auto-calculated from form completeness and uploaded documents
              </p>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${scoreColor.number}`}>
              {possiblePoints}
              <span className="ml-1 text-sm font-normal text-zinc-400">/ 112</span>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* EU */}
            <div className="space-y-1.5">
              <Label htmlFor="finance-eu">End User (EU) *</Label>
              <Select
                value={fields.financeEu}
                onValueChange={(v) => setField("financeEu", v ?? "")}
              >
                <SelectTrigger id="finance-eu" className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {FINANCE_EU_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {evalErrors.financeEu && (
                <p className="text-xs text-red-600">{evalErrors.financeEu}</p>
              )}
            </div>

            {/* DL */}
            <div className="space-y-1.5">
              <Label htmlFor="finance-dl">Delivery Limit (DL) *</Label>
              <Input
                id="finance-dl"
                value={fields.financeDl}
                onChange={(e) => setField("financeDl", e.target.value)}
                placeholder="e.g. 5,000 liters"
              />
              {evalErrors.financeDl && (
                <p className="text-xs text-red-600">{evalErrors.financeDl}</p>
              )}
            </div>

            {/* DR */}
            <div className="space-y-1.5">
              <Label htmlFor="finance-dr">Delivery Receipt (DR) *</Label>
              <Select
                value={fields.financeDr}
                onValueChange={(v) => setField("financeDr", v ?? "")}
              >
                <SelectTrigger id="finance-dr" className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {FINANCE_DR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {evalErrors.financeDr && (
                <p className="text-xs text-red-600">{evalErrors.financeDr}</p>
              )}
            </div>

            {/* PL/TS */}
            <div className="space-y-1.5">
              <Label htmlFor="finance-plts">Price List / Terms &amp; Schedule (PL/TS) *</Label>
              <Input
                id="finance-plts"
                value={fields.financePlTs}
                onChange={(e) => setField("financePlTs", e.target.value)}
                placeholder="e.g. Standard PL v2"
              />
              {evalErrors.financePlTs && (
                <p className="text-xs text-red-600">{evalErrors.financePlTs}</p>
              )}
            </div>

            {/* Approved Points */}
            <div className="space-y-1.5">
              <Label htmlFor="finance-approved">Approved Points *</Label>
              <Input
                id="finance-approved"
                type="number"
                min={0}
                value={fields.financeApprovedPoints}
                onChange={(e) => setField("financeApprovedPoints", e.target.value)}
                placeholder={`0–${possiblePoints}`}
              />
              {evalErrors.financeApprovedPoints && (
                <p className="text-xs text-red-600">{evalErrors.financeApprovedPoints}</p>
              )}
            </div>

            {/* Credit Terms */}
            <div className="space-y-1.5">
              <Label htmlFor="finance-credit-terms">Credit Terms *</Label>
              <Select
                value={fields.financeCreditTerms}
                onValueChange={(v) => setField("financeCreditTerms", v ?? "")}
              >
                <SelectTrigger id="finance-credit-terms" className="w-full">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {FINANCE_CREDIT_TERMS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {evalErrors.financeCreditTerms && (
                <p className="text-xs text-red-600">{evalErrors.financeCreditTerms}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:gap-3">
            <Button onClick={() => openDialog("forward")} className="w-full gap-2 sm:w-auto">
              <ArrowRight className="h-4 w-4" />
              Forward to Approver
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
      </Card>

      {/* ── Confirmation Dialog ── */}
      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent showCloseButton={!isLoading}>
          <DialogHeader>
            <DialogTitle>
              {action === "forward" ? "Forward to Senior Approver" : "Deny Submission"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-zinc-600">
            {action === "forward"
              ? "You are forwarding this submission to the Senior Approver for final decision. You may add an optional note."
              : "You are denying this submission. Please explain why it cannot be approved."}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="dialog-note">
              {action === "forward" ? "Note (optional)" : "Denial reason *"}
            </Label>
            {action === "forward" ? (
              <DecisionNoteTemplates type="finance_forward_note" onSelect={setNote} disabled={isLoading} />
            ) : (
              <DecisionNoteTemplates type="finance_deny_reason" onSelect={setNote} disabled={isLoading} />
            )}
            <Textarea
              id="dialog-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "forward" ? "Finance review notes…" : "Reason for denial…"
              }
              disabled={isLoading}
            />
            {dialogError && <p className="text-sm text-red-600">{dialogError}</p>}
          </div>

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
                : action === "forward"
                ? "Yes, Forward"
                : "Yes, Deny"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
