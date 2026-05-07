"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocUploadSlot } from "@/components/doc-upload-slot";
import { ArrowRight, CheckCircle2, ClipboardList, Paperclip, UserRound } from "lucide-react";
import { sileo as toast } from "sileo";
import type { FileEntry } from "@/lib/doc-types";

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  dealer: "Dealer",
  distributor: "Distributor",
  private_label: "Private Label",
  toll_blend: "Toll Blend",
  end_user: "End-User",
};

interface AgentFillOutFormProps {
  cisId: string;
  initialCustomerType?: string;
  initialOtherRequirements?: FileEntry[];
  tradeName?: string | null;
  managerName?: string | null;
}

interface FormFields {
  agentAccountSpecialistFirst: string;
  agentAccountSpecialistLast: string;
  agentSalesSpecialist: string;
  agentTpcFirst: string;
  agentTpcLast: string;
}

interface FormErrors {
  agentAccountSpecialistFirst?: string;
  agentAccountSpecialistLast?: string;
  agentSalesSpecialist?: string;
}

export function AgentFillOutForm({ cisId, initialCustomerType = "", initialOtherRequirements = [], tradeName, managerName }: AgentFillOutFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<FormFields>({
    agentAccountSpecialistFirst: "",
    agentAccountSpecialistLast: "",
    agentSalesSpecialist: "",
    agentTpcFirst: "",
    agentTpcLast: "",
  });
  const [otherRequirements, setOtherRequirements] = useState<FileEntry[]>(initialOtherRequirements);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const requiredFilledCount = [
    fields.agentAccountSpecialistFirst.trim(),
    fields.agentAccountSpecialistLast.trim(),
    fields.agentSalesSpecialist.trim(),
  ].filter(Boolean).length;

  const isDealer = initialCustomerType === "dealer";
  const missingRequiredCount = 3 - requiredFilledCount;
  const isReadyToSubmit = missingRequiredCount === 0;
  const routeTargetLabel = isDealer ? "Legal Review (Maam Cha)" : "Finance Review (Maam Nida)";

  function setField<K extends keyof FormFields>(key: K, value: string | null) {
    setFields((f) => ({ ...f, [key]: value ?? "" }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!fields.agentAccountSpecialistFirst.trim()) errs.agentAccountSpecialistFirst = "First name is required";
    if (!fields.agentAccountSpecialistLast.trim()) errs.agentAccountSpecialistLast = "Last name is required";
    if (!fields.agentSalesSpecialist.trim()) errs.agentSalesSpecialist = "Sales Specialist is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitError("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/cis/${cisId}/agent-submit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentAccountSpecialistFirst: fields.agentAccountSpecialistFirst,
          agentAccountSpecialistLast: fields.agentAccountSpecialistLast,
          agentSalesSpecialist: fields.agentSalesSpecialist,
          agentTpcFirst: fields.agentTpcFirst || undefined,
          agentTpcLast: fields.agentTpcLast || undefined,
          docAgentOtherRequirements: otherRequirements,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setSubmitError(typeof json.error === "string" ? json.error : "Something went wrong.");
        return;
      }

      toast.success({
        title: "Form submitted.",
        description: `Routed to ${routeTargetLabel}.`,
      });
      router.refresh();
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border border-sky-200/80 bg-linear-to-b from-sky-50/70 via-white to-white shadow-sm">
      <CardHeader className="overflow-hidden rounded-t-xl border-b border-sky-100/80 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-sky-900">
              <ClipboardList className="h-4 w-4" />
              Sales Agent Information
            </CardTitle>
            <p className="mt-1 text-sm text-sky-700">
              Customer already submitted. Complete Step 1 below, then submit to route for review.
            </p>
            {tradeName?.trim() ? (
              <p className="mt-1 text-xs font-medium text-sky-700/90">
                Working on: <span className="text-sky-900">{tradeName.trim()}</span>
              </p>
            ) : null}
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-800">
            {requiredFilledCount === 3 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <UserRound className="h-3.5 w-3.5 text-sky-600" />
            )}
            Required fields: {requiredFilledCount}/3
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <section className={`relative rounded-xl border border-zinc-200 bg-white/80 p-4 sm:p-5${!isReadyToSubmit ? " agent-step-shine" : ""}`}>
          <h3 className="mb-1 text-sm font-semibold text-zinc-900">Step 1 — Assignment Details <span className="text-red-600">(Required)</span></h3>
          <p className="mb-3 text-xs text-zinc-500">These 3 fields must be completed before submit is enabled.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-spec-first">Account Specialist - First Name *</Label>
            <Input
              id="acc-spec-first"
              className="bg-white"
              value={fields.agentAccountSpecialistFirst}
              onChange={(e) => setField("agentAccountSpecialistFirst", e.target.value)}
              placeholder="First name"
              maxLength={255}
              disabled={isLoading}
              autoFocus
            />
            {errors.agentAccountSpecialistFirst && (
              <p className="text-xs text-red-600">{errors.agentAccountSpecialistFirst}</p>
            )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-spec-last">Account Specialist - Last Name *</Label>
            <Input
              id="acc-spec-last"
              className="bg-white"
              value={fields.agentAccountSpecialistLast}
              onChange={(e) => setField("agentAccountSpecialistLast", e.target.value)}
              placeholder="Last name"
              maxLength={255}
              disabled={isLoading}
            />
            {errors.agentAccountSpecialistLast && (
              <p className="text-xs text-red-600">{errors.agentAccountSpecialistLast}</p>
            )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sales-specialist">Sales Specialist *</Label>
            <Input
              id="sales-specialist"
              className="bg-white"
              value={fields.agentSalesSpecialist}
              onChange={(e) => setField("agentSalesSpecialist", e.target.value)}
              placeholder="Name"
              maxLength={255}
              disabled={isLoading}
            />
            {errors.agentSalesSpecialist && (
              <p className="text-xs text-red-600">{errors.agentSalesSpecialist}</p>
            )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Sales Manager</Label>
              <div className="flex h-9 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700">
                {managerName ?? <span className="italic text-zinc-400">No manager assigned</span>}
              </div>
            </div>
          </div>

          {initialCustomerType && (
            <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 px-3 py-2.5 text-xs text-zinc-700">
              {isDealer ? (
                <span className="font-medium text-purple-700">
                  Dealer route: this submission will be sent to Legal Review (Maam Cha).
                </span>
              ) : (
                <span className="font-medium text-amber-700">
                  Standard route ({CUSTOMER_TYPE_LABELS[initialCustomerType] ?? initialCustomerType}): this submission will be sent to Finance Review (Maam Nida).
                </span>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white/80 p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Step 2 — TPC Contact <span className="font-normal text-zinc-500">(Optional)</span></h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpc-first">TPC - First Name</Label>
            <Input
              id="tpc-first"
              className="bg-white"
              value={fields.agentTpcFirst}
              onChange={(e) => setField("agentTpcFirst", e.target.value)}
              placeholder="First name"
              maxLength={255}
              disabled={isLoading}
            />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpc-last">TPC - Last Name</Label>
            <Input
              id="tpc-last"
              className="bg-white"
              value={fields.agentTpcLast}
              onChange={(e) => setField("agentTpcLast", e.target.value)}
              placeholder="Last name"
              maxLength={255}
              disabled={isLoading}
            />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white/80 p-4 sm:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Paperclip className="h-4 w-4 text-zinc-500" />
            Step 2 — Other Requirements <span className="text-zinc-400 font-normal">(Optional)</span>
          </h3>
          <DocUploadSlot
            docType="docAgentOtherRequirements"
            label="Other Requirements"
            endpoint={`/api/cis/${cisId}/docs`}
            files={otherRequirements}
            onChange={setOtherRequirements}
            disabled={isLoading}
          />
        </section>

        {submitError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
        )}

        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            {isReadyToSubmit
              ? `Step 3 ready: submit now to route to ${routeTargetLabel}.`
              : `${missingRequiredCount} required field${missingRequiredCount === 1 ? "" : "s"} remaining in Step 1.`}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !isReadyToSubmit}
            className="w-full gap-2 sm:w-auto"
          >
            <ArrowRight className="h-4 w-4" />
            {isLoading ? "Submitting..." : isReadyToSubmit ? `Submit & Route to ${isDealer ? "Legal" : "Finance"}` : "Complete Step 1 to Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
