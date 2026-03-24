"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { cisFormSchema } from "@/lib/validations/cis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const BUSINESS_TYPES = [
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "sole_proprietor", label: "Sole Proprietor" },
  { value: "cooperative", label: "Cooperative" },
  { value: "other", label: "Other" },
];

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  fs_petroleum: "FS Petroleum",
  special: "Special",
};

type FieldErrors = Partial<Record<keyof z.infer<typeof cisFormSchema> | "_form", string>>;

interface CustomerFormProps {
  token: string;
  agentCode: string;
  customerType: string;
}

export function CustomerForm({ token, agentCode, customerType }: CustomerFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [businessType, setBusinessType] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const fd = new FormData(e.currentTarget);
    const data = {
      tradeName: fd.get("tradeName") as string,
      contactPerson: fd.get("contactPerson") as string,
      contactNumber: fd.get("contactNumber") as string,
      emailAddress: fd.get("emailAddress") as string,
      businessAddress: fd.get("businessAddress") as string,
      cityMunicipality: fd.get("cityMunicipality") as string,
      businessType,
      tinNumber: (fd.get("tinNumber") as string) || undefined,
      additionalNotes: (fd.get("additionalNotes") as string) || undefined,
    };

    const parsed = cisFormSchema.safeParse(data);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0]])));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?._form) setErrors({ _form: json.error._form[0] });
        else if (typeof json.error === "string") setErrors({ _form: json.error });
        else setErrors(Object.fromEntries(Object.entries(json.error ?? {}).map(([k, v]) => [k, (v as string[])[0]])));
        return;
      }
      router.push(`/form/${token}/submitted`);
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Information Sheet</CardTitle>
        <CardDescription>
          Please fill in your business information below. All fields marked * are required.
          <span className="mt-1 block text-xs text-zinc-400">
            Agent: <span className="font-mono">{agentCode}</span>
            {" · "}
            Type: {CUSTOMER_TYPE_LABELS[customerType] ?? customerType}
          </span>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {errors._form && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errors._form}</p>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Business Information
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tradeName">Trade / Business name *</Label>
              <Input id="tradeName" name="tradeName" placeholder="ABC Trading Co." disabled={isLoading} />
              {errors.tradeName && <p className="text-sm text-red-600">{errors.tradeName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">Contact person *</Label>
              <Input id="contactPerson" name="contactPerson" placeholder="Juan dela Cruz" disabled={isLoading} />
              {errors.contactPerson && <p className="text-sm text-red-600">{errors.contactPerson}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactNumber">Contact number *</Label>
              <Input id="contactNumber" name="contactNumber" placeholder="09XX XXX XXXX" disabled={isLoading} />
              {errors.contactNumber && <p className="text-sm text-red-600">{errors.contactNumber}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emailAddress">Email address *</Label>
              <Input id="emailAddress" name="emailAddress" type="email" placeholder="contact@business.com" disabled={isLoading} />
              {errors.emailAddress && <p className="text-sm text-red-600">{errors.emailAddress}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="businessAddress">Business address *</Label>
              <Input id="businessAddress" name="businessAddress" placeholder="123 Main St., Brgy. Example" disabled={isLoading} />
              {errors.businessAddress && <p className="text-sm text-red-600">{errors.businessAddress}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cityMunicipality">City / Municipality *</Label>
              <Input id="cityMunicipality" name="cityMunicipality" placeholder="Makati City" disabled={isLoading} />
              {errors.cityMunicipality && <p className="text-sm text-red-600">{errors.cityMunicipality}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Business type *</Label>
              <Select value={businessType} onValueChange={(v) => setBusinessType(v ?? "")} disabled={isLoading}>
                <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.businessType && <p className="text-sm text-red-600">{errors.businessType}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tinNumber">TIN number <span className="text-zinc-400">(optional)</span></Label>
              <Input id="tinNumber" name="tinNumber" placeholder="000-000-000-000" disabled={isLoading} />
            </div>
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="additionalNotes">Additional notes <span className="text-zinc-400">(optional)</span></Label>
            <Textarea id="additionalNotes" name="additionalNotes" rows={3} placeholder="Any relevant information…" disabled={isLoading} />
          </div>

          <Button type="submit" disabled={isLoading || !businessType} className="w-full">
            {isLoading ? "Submitting…" : "Submit Information"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
