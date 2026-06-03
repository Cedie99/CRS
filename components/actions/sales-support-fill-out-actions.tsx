"use client";



import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { DocUploadSlot } from "@/components/doc-upload-slot";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import { ArrowRight, CheckCircle2, ClipboardList, FileUp, PackagePlus } from "lucide-react";

import { toast } from "@/lib/toast";

import {

  SALES_SUPPORT_PRICE_LIST_1_OPTIONS,

  SALES_SUPPORT_PRICE_LIST_2_OPTIONS,

  SALES_SUPPORT_SALES_TYPE_OPTIONS,

  SALES_SUPPORT_VAT_CODE_OPTIONS,

} from "@/lib/validations/cis";

import type { FileEntry } from "@/lib/doc-types";



interface SalesSupportFillOutActionsProps {
  cisId: string;
  accountType?: string | null;
  initialOtherDocs?: FileEntry[];
}



interface FormFields {
  priceList1: string;
  priceList2: string;
  salesType: string;
  vatCode: string;
  otherRemarks: string;
}



interface FormErrors {
  priceList1?: string;
  priceList2?: string;
  salesType?: string;
  vatCode?: string;
}



export function SalesSupportFillOutActions({ cisId, accountType, initialOtherDocs = [] }: SalesSupportFillOutActionsProps) {

  const router = useRouter();



  const [fields, setFields] = useState<FormFields>({
    priceList1: "",
    priceList2: "",
    salesType: "",
    vatCode: "",
    otherRemarks: "",
  });

  const [otherDocs, setOtherDocs] = useState<FileEntry[]>(initialOtherDocs);

  const [errors, setErrors] = useState<FormErrors>({});

  const [isLoading, setIsLoading] = useState(false);

  const [submitError, setSubmitError] = useState("");

  const requiredFilledCount = [fields.priceList1, fields.priceList2, fields.salesType, fields.vatCode].filter(Boolean).length;
  const totalRequiredFields = 4;



  function setField<K extends keyof FormFields>(key: K, value: string | null) {

    setFields((f) => ({ ...f, [key]: value ?? "" }));

    setErrors((e) => ({ ...e, [key]: undefined }));

  }



  function validate(): boolean {

    const errs: FormErrors = {};

    if (!fields.priceList1) errs.priceList1 = "Assigned Price List 1 is required";

    if (!fields.priceList2) errs.priceList2 = "Assigned Price List 2 is required";

    if (!fields.salesType) errs.salesType = "Sales Type is required";

    if (!fields.vatCode) errs.vatCode = "VAT Code is required";

    setErrors(errs);

    return Object.keys(errs).length === 0;

  }



  async function handleSubmit() {

    if (!validate()) return;

    setSubmitError("");

    setIsLoading(true);



    try {

      const res = await fetch(`/api/cis/${cisId}/sales-support-submit`, {

        method: "PATCH",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          salesSupportPriceList1: fields.priceList1,

          salesSupportPriceList2: fields.priceList2,

          salesSupportSalesType: fields.salesType,

          salesSupportVatCode: fields.vatCode,

          salesSupportOtherRemarks: fields.otherRemarks.trim() || undefined,

        }),

      });

      const json = await res.json();

      if (!res.ok) {

        setSubmitError(typeof json.error === "string" ? json.error : "Something went wrong.");

        return;

      }

      toast.success({

        title: "Submitted to Project Development.",

        description: "The Project Development Specialist has been notified.",

      });

      router.push("/support");

      router.refresh();

    } catch {

      setSubmitError("Something went wrong. Please try again.");

    } finally {

      setIsLoading(false);

    }

  }



  return (

    <Card className="print:hidden overflow-hidden border border-emerald-200/70 bg-linear-to-b from-emerald-50/60 via-white to-white shadow-sm">

      <CardHeader className="border-b border-emerald-100/80 pb-4">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

          <div>

            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-900">

              <ClipboardList className="h-4 w-4" />

              Sales Support Information

            </CardTitle>

            <p className="mt-1 text-xs text-zinc-600">

              Complete these details before handing off to the Project Development Specialist.

            </p>

          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Required fields: {requiredFilledCount}/{totalRequiredFields}
          </span>

        </div>

      </CardHeader>

      <CardContent className="space-y-5 pt-5">



        <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">

          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Customer Setup</h3>

          <div className="space-y-1.5">
            <Label>Account Type (set by Agent)</Label>
            {accountType ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900">
                {accountType === "corporate" ? "Corporate" : "Individual"}
              </span>
            ) : (
              <p className="text-xs text-amber-600">Account type has not been provided by the agent yet.</p>
            )}
          </div>

        </section>



        <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">

          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Pricing and Tax Configuration</h3>

          <div className="grid gap-4 sm:grid-cols-2">

            <div className="space-y-1.5">

              <Label htmlFor="price-list-1">Assigned Price List 1 *</Label>

            <Select

              value={fields.priceList1}

              onValueChange={(v) => setField("priceList1", v)}

            >

              <SelectTrigger id="price-list-1" className="w-full">

                <SelectValue placeholder="Please Select" />

              </SelectTrigger>

              <SelectContent>

                {SALES_SUPPORT_PRICE_LIST_1_OPTIONS.map((opt) => (

                  <SelectItem key={opt.value} value={opt.value}>

                    {opt.label}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

            {errors.priceList1 && (

              <p className="text-xs text-red-600">{errors.priceList1}</p>

            )}

            </div>



            <div className="space-y-1.5">

              <Label htmlFor="price-list-2">Assigned Price List 2 *</Label>

            <Select

              value={fields.priceList2}

              onValueChange={(v) => setField("priceList2", v)}

            >

              <SelectTrigger id="price-list-2" className="w-full">

                <SelectValue placeholder="Please Select" />

              </SelectTrigger>

              <SelectContent>

                {SALES_SUPPORT_PRICE_LIST_2_OPTIONS.map((opt) => (

                  <SelectItem key={opt.value} value={opt.value}>

                    {opt.label}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

            {errors.priceList2 && (

              <p className="text-xs text-red-600">{errors.priceList2}</p>

            )}

            </div>



            <div className="space-y-1.5">

              <Label htmlFor="sales-type">Sales Type *</Label>

            <Select

              value={fields.salesType}

              onValueChange={(v) => setField("salesType", v)}

            >

              <SelectTrigger id="sales-type" className="w-full">

                <SelectValue placeholder="Please Select" />

              </SelectTrigger>

              <SelectContent>

                {SALES_SUPPORT_SALES_TYPE_OPTIONS.map((opt) => (

                  <SelectItem key={opt.value} value={opt.value}>

                    {opt.label}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

            {errors.salesType && (

              <p className="text-xs text-red-600">{errors.salesType}</p>

            )}

            </div>



            <div className="space-y-1.5">

              <Label htmlFor="vat-code">VAT Code (New Customer) *</Label>

            <Select

              value={fields.vatCode}

              onValueChange={(v) => setField("vatCode", v)}

            >

              <SelectTrigger id="vat-code" className="w-full">

                <SelectValue placeholder="Please Select" />

              </SelectTrigger>

              <SelectContent>

                {SALES_SUPPORT_VAT_CODE_OPTIONS.map((opt) => (

                  <SelectItem key={opt.value} value={opt.value}>

                    {opt.label}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

            {errors.vatCode && (

              <p className="text-xs text-red-600">{errors.vatCode}</p>

            )}

            </div>

          </div>

        </section>



        <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">

          <h3 className="mb-3 text-sm font-semibold text-zinc-900">Handoff Notes and Files</h3>

          <div className="space-y-1.5">

            <Label htmlFor="other-remarks">Other Remarks</Label>

            <Textarea

              id="other-remarks"

              rows={3}

              value={fields.otherRemarks}

              onChange={(e) => setField("otherRemarks", e.target.value)}

              placeholder="Add any remarks for the Project Development Specialist..."

              disabled={isLoading}

            />

          </div>



          <div className="mt-4 space-y-1.5">

            <Label className="flex items-center gap-2">

              <FileUp className="h-4 w-4 text-zinc-500" />

              Other Documents for New Pricelist

            </Label>

            <DocUploadSlot

              docType="docSalesSupportOther"

              label="Other documents for new pricelist"

              endpoint={`/api/cis/${cisId}/staff-docs`}

              files={otherDocs}

              onChange={setOtherDocs}

              disabled={isLoading}

            />

          </div>

        </section>



        {submitError && (

          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>

        )}



        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs text-zinc-500">All four required fields must be completed before submission.</p>

          <Button

            onClick={handleSubmit}

            disabled={isLoading}

            className="w-full gap-2 sm:w-auto"

          >

            <PackagePlus className="h-4 w-4" />

            {isLoading ? "Submitting..." : "Submit to Project Development"}

          </Button>

        </div>

      </CardContent>

    </Card>

  );

}

