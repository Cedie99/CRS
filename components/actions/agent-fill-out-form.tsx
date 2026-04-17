"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { sileo as toast } from "sileo";

const CUSTOMER_TYPES = [
  { value: "dealer", label: "Dealer" },
  { value: "distributor", label: "Distributor" },
  { value: "private_label", label: "Private Label" },
  { value: "toll_blend", label: "Toll Blend" },
  { value: "end_user", label: "End-User" },
] as const;

interface AgentFillOutFormProps {
  cisId: string;
}

interface FormFields {
  customerType: string;
  agentAccountSpecialistFirst: string;
  agentAccountSpecialistLast: string;
  agentSalesSpecialist: string;
  agentSalesManager: string;
  agentTpcFirst: string;
  agentTpcLast: string;
}

interface FormErrors {
  customerType?: string;
}

export function AgentFillOutForm({ cisId }: AgentFillOutFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<FormFields>({
    customerType: "",
    agentAccountSpecialistFirst: "",
    agentAccountSpecialistLast: "",
    agentSalesSpecialist: "",
    agentSalesManager: "",
    agentTpcFirst: "",
    agentTpcLast: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function setField<K extends keyof FormFields>(key: K, value: string | null) {
    setFields((f) => ({ ...f, [key]: value ?? "" }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!fields.customerType) errs.customerType = "Customer type is required";
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
          customerType: fields.customerType,
          agentAccountSpecialistFirst: fields.agentAccountSpecialistFirst || undefined,
          agentAccountSpecialistLast: fields.agentAccountSpecialistLast || undefined,
          agentSalesSpecialist: fields.agentSalesSpecialist || undefined,
          agentSalesManager: fields.agentSalesManager || undefined,
          agentTpcFirst: fields.agentTpcFirst || undefined,
          agentTpcLast: fields.agentTpcLast || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setSubmitError(typeof json.error === "string" ? json.error : "Something went wrong.");
        return;
      }

      const isDealer = fields.customerType === "dealer";
      toast.success({
        title: "Form submitted.",
        description: isDealer
          ? "Routed to Legal Review (Maam Cha)."
          : "Routed to Finance Review (Maam Nida).",
      });
      router.refresh();
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-blue-900">
          Agent Fill-Out Required
        </CardTitle>
        <p className="text-sm text-blue-700">
          Your customer has submitted the form. Complete the details below to route it for review.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Customer Type */}
        <div className="space-y-1.5">
          <Label htmlFor="customer-type">Customer Type *</Label>
          <Select
            value={fields.customerType}
            onValueChange={(v) => setField("customerType", v)}
          >
            <SelectTrigger id="customer-type" className="bg-white">
              <SelectValue placeholder="Select customer type…" />
            </SelectTrigger>
            <SelectContent>
              {CUSTOMER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.customerType && (
            <p className="text-xs text-red-600">{errors.customerType}</p>
          )}
          {fields.customerType === "dealer" && (
            <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1.5">
              Dealer accounts are routed to Legal Review (Maam Cha).
            </p>
          )}
          {fields.customerType && fields.customerType !== "dealer" && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              This account type is routed to Finance Review (Maam Nida).
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Account Specialist */}
          <div className="space-y-1.5">
            <Label htmlFor="acc-spec-first">Account Specialist — First Name</Label>
            <Input
              id="acc-spec-first"
              className="bg-white"
              value={fields.agentAccountSpecialistFirst}
              onChange={(e) => setField("agentAccountSpecialistFirst", e.target.value)}
              placeholder="First name"
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-spec-last">Account Specialist — Last Name</Label>
            <Input
              id="acc-spec-last"
              className="bg-white"
              value={fields.agentAccountSpecialistLast}
              onChange={(e) => setField("agentAccountSpecialistLast", e.target.value)}
              placeholder="Last name"
              maxLength={255}
            />
          </div>

          {/* Sales Specialist */}
          <div className="space-y-1.5">
            <Label htmlFor="sales-specialist">Sales Specialist</Label>
            <Input
              id="sales-specialist"
              className="bg-white"
              value={fields.agentSalesSpecialist}
              onChange={(e) => setField("agentSalesSpecialist", e.target.value)}
              placeholder="Name"
              maxLength={255}
            />
          </div>

          {/* Sales Manager */}
          <div className="space-y-1.5">
            <Label htmlFor="sales-manager">Sales Manager</Label>
            <Input
              id="sales-manager"
              className="bg-white"
              value={fields.agentSalesManager}
              onChange={(e) => setField("agentSalesManager", e.target.value)}
              placeholder="Name"
              maxLength={255}
            />
          </div>

          {/* TPC */}
          <div className="space-y-1.5">
            <Label htmlFor="tpc-first">TPC — First Name</Label>
            <Input
              id="tpc-first"
              className="bg-white"
              value={fields.agentTpcFirst}
              onChange={(e) => setField("agentTpcFirst", e.target.value)}
              placeholder="First name"
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpc-last">TPC — Last Name</Label>
            <Input
              id="tpc-last"
              className="bg-white"
              value={fields.agentTpcLast}
              onChange={(e) => setField("agentTpcLast", e.target.value)}
              placeholder="Last name"
              maxLength={255}
            />
          </div>
        </div>

        {submitError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full gap-2 sm:w-auto"
        >
          <ArrowRight className="h-4 w-4" />
          {isLoading ? "Submitting…" : "Submit & Route for Review"}
        </Button>
      </CardContent>
    </Card>
  );
}
