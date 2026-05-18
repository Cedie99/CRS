"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, XCircle, Clock, FileCheck2, Send,
  Building2, User, Tag, ExternalLink, MessageSquare, RefreshCw, MapPin, Loader2, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CusDocSection } from "@/components/cus-doc-section";
import { toast } from "@/lib/toast";
import { SCORING_DOC_SLOTS, type FileEntry } from "@/lib/doc-types";

// ---- Types ----------------------------------------------------------------

interface CusEvent {
  id: string;
  action: string;
  note: string | null;
  createdAt: string;
  actorName: string;
}

interface CusDetail {
  id: string;
  cisId: string;
  status: string;
  note: string | null;
  financeCreditTerms: string | null;
  financeCreditLimit: string | null;
  newTradeName: string | null;
  newCorporateName: string | null;
  newContactPerson: string | null;
  newContactNumber: string | null;
  newTelephoneNumber: string | null;
  newEmailAddress: string | null;
  newWebsite: string | null;
  newNumberOfEmployees: string | null;
  newCustomerType: string | null;
  newBusinessType: string | null;
  newDateOfBusinessReg: string | null;
  newTinNumber: string | null;
  newBusinessAddress: string | null;
  newCityMunicipality: string | null;
  newLandmarks: string | null;
  newDeliveryAddress: string | null;
  newDeliveryLandmarks: string | null;
  newDeliveryMobile: string | null;
  newDeliveryTelephone: string | null;
  newLineOfBusiness: string | null;
  newLineOfBusinessOther: string | null;
  newBusinessActivity: string | null;
  newBusinessActivityOther: string | null;
  newSalesChannel: string | null;
  newPaymentTerms: string | null;
  newOwners: unknown;
  newOfficers: unknown;
  newBusinessLife: string | null;
  newHowLongAtAddress: string | null;
  newNumberOfBranches: string | null;
  newGovCertifications: string | null;
  newTradeReferences: unknown;
  newBankReferences: unknown;
  newAchievements: string | null;
  newOtherMerits: string | null;
  newAdditionalNotes: string | null;
  // Snapshot of CIS values before the CUS was approved
  beforeSnapshot: Record<string, string | null> | null;
  // docs (jsonb arrays)
  [key: string]: unknown;
  cis: {
    id: string;
    tradeName: string | null;
    contactPerson: string | null;
    contactNumber: string | null;
    telephoneNumber: string | null;
    emailAddress: string | null;
    website: string | null;
    numberOfEmployees: string | null;
    customerType: string | null;
    businessAddress: string | null;
    cityMunicipality: string | null;
    landmarks: string | null;
    deliveryAddress: string | null;
    deliveryMobile: string | null;
    deliveryTelephone: string | null;
    businessType: string | null;
    agentCode: string | null;
    financeCreditTerms: string | null;
    financeCreditLimit: string | null;
    [key: string]: unknown;
  };
  events: CusEvent[];
}

// ---- Helpers ---------------------------------------------------------------

const DOC_KEYS = [...SCORING_DOC_SLOTS.map((s) => s.key), "docOther"] as const;

const ACTION_LABELS: Record<string, string> = {
  submitted: "Submitted for review",
  approved: "Approved",
  denied: "Denied",
};

const STEPS = [
  { key: "draft", label: "Draft", Icon: FileCheck2 },
  { key: "submitted", label: "Submitted", Icon: Send },
  { key: "review", label: "Under Review", Icon: Clock },
  { key: "approved", label: "Approved", Icon: CheckCircle2 },
];

function stepIndex(status: string) {
  if (status === "draft") return 0;
  if (status === "submitted") return 1;
  if (status === "pending_finance_review" || status === "pending_legal_review") return 2;
  if (status === "approved") return 3;
  return -1;
}

// ---- Main component -------------------------------------------------------

export function CusDetailModal({
  cusId,
  open,
  onClose,
}: {
  cusId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<CusDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cus/${id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json() as CusDetail;
      setDetail(data);
    } catch {
      toast.error({ title: "Failed to load CUS details." });
      onClose();
    } finally {
      setLoading(false);
    }
  }, [onClose]);

  useEffect(() => {
    if (open && cusId) {
      setDetail(null);
      void fetchDetail(cusId);
    }
  }, [open, cusId, fetchDetail]);

  async function handleSubmit() {
    if (!detail) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cus/${detail.id}/submit`, { method: "PATCH" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      toast.success({ title: "Submitted for review." });
      await fetchDetail(detail.id);
      router.refresh();
    } catch (err) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to submit." });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDocsChange(key: string, files: FileEntry[]) {
    if (!detail) return;
    setDetail((prev) => prev ? { ...prev, [key]: files } : prev);
  }

  const cus = detail;
  const cis = detail?.cis ?? null;

  const isDraft = cus?.status === "draft";
  const isPendingLegal = cus?.status === "pending_legal_review";
  const isPendingFinance = cus?.status === "pending_finance_review";
  const isUnderReview = isPendingLegal || isPendingFinance;
  const isApproved = cus?.status === "approved";
  const isDenied = cus?.status === "denied";
  const currentStep = cus ? stepIndex(cus.status) : -1;
  const reviewerLabel = cis?.customerType === "dealer" ? "Legal Review" : "Finance Review";
  const deniedEvent = cus?.events.findLast((e) => e.action === "denied");

  const initialDocs = DOC_KEYS.reduce<Record<string, FileEntry[]>>((acc, k) => {
    acc[k] = (cus?.[k] as FileEntry[] | null) ?? [];
    return acc;
  }, {});

  const cisDocs = DOC_KEYS.reduce<Record<string, FileEntry[]>>((acc, k) => {
    acc[k] = (cis?.[k] as FileEntry[] | null) ?? [];
    return acc;
  }, {});

  // Comparison table rows (requested fields only — only rows with a new value)
  const compHumanize = (v: string | null | undefined) => v?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compOwners = (v: any) => Array.isArray(v) && v.length ? v.map((o: { name?: string; percentage?: string }) => [o.name, o.percentage ? `(${o.percentage}%)` : ""].filter(Boolean).join(" ")).join(", ") : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compOfficers = (v: any) => Array.isArray(v) && v.length ? v.map((o: { name?: string; position?: string }) => [o.name, o.position ? `(${o.position})` : ""].filter(Boolean).join(" ")).join(", ") : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compTradeRef = (v: any) => Array.isArray(v) && v.length ? v.map((r: { company?: string }) => r.company).filter(Boolean).join(", ") : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const compBankRef = (v: any) => Array.isArray(v) && v.length ? v.map((r: { bank?: string; branch?: string }) => [r.bank, r.branch].filter(Boolean).join(" - ")).join(", ") : null;
  type CompRow = { label: string; current: string | null; requested: string | null };
  const compRows: CompRow[] = cus ? [
    { label: "Trade Name",          current: cis?.tradeName ?? null,                                   requested: cus.newTradeName ?? null },
    { label: "Corporate Name",      current: (cis?.corporateName as string) ?? null,                   requested: cus.newCorporateName ?? null },
    { label: "Customer Type",       current: compHumanize(cis?.customerType),                          requested: compHumanize(cus.newCustomerType) },
    { label: "Business Type",       current: compHumanize(cis?.businessType as string),                requested: compHumanize(cus.newBusinessType) },
    { label: "Date of Reg.",        current: (cis?.dateOfBusinessReg as string) ?? null,               requested: cus.newDateOfBusinessReg ?? null },
    { label: "No. of Employees",    current: (cis?.numberOfEmployees as string) ?? null,               requested: cus.newNumberOfEmployees ?? null },
    { label: "TIN Number",          current: (cis?.tinNumber as string) ?? null,                       requested: cus.newTinNumber ?? null },
    { label: "Contact Person",      current: cis?.contactPerson ?? null,                               requested: cus.newContactPerson ?? null },
    { label: "Mobile",              current: cis?.contactNumber ?? null,                               requested: cus.newContactNumber ?? null },
    { label: "Telephone",           current: cis?.telephoneNumber ?? null,                             requested: cus.newTelephoneNumber ?? null },
    { label: "Email",               current: cis?.emailAddress ?? null,                                requested: cus.newEmailAddress ?? null },
    { label: "Website",             current: cis?.website ?? null,                                     requested: cus.newWebsite ?? null },
    { label: "Business Address",    current: cis?.businessAddress ?? null,                             requested: cus.newBusinessAddress ?? null },
    { label: "City/Municipality",   current: cis?.cityMunicipality ?? null,                            requested: cus.newCityMunicipality ?? null },
    { label: "Landmarks",           current: cis?.landmarks ?? null,                                   requested: cus.newLandmarks ?? null },
    { label: "Delivery Address",    current: cis?.deliveryAddress ?? null,                             requested: cus.newDeliveryAddress ?? null },
    { label: "Delivery Landmarks",  current: (cis?.deliveryLandmarks as string) ?? null,               requested: cus.newDeliveryLandmarks ?? null },
    { label: "Delivery Mobile",     current: cis?.deliveryMobile ?? null,                              requested: cus.newDeliveryMobile ?? null },
    { label: "Delivery Tel",        current: cis?.deliveryTelephone ?? null,                           requested: cus.newDeliveryTelephone ?? null },
    { label: "Line of Business",    current: compHumanize(cis?.lineOfBusiness as string),              requested: compHumanize(cus.newLineOfBusiness) },
    { label: "Business Activity",   current: compHumanize(cis?.businessActivity as string),            requested: compHumanize(cus.newBusinessActivity) },
    { label: "Sales Channel",       current: compHumanize(cis?.salesChannel as string),                requested: compHumanize(cus.newSalesChannel) },
    { label: "Payment Terms",       current: compHumanize(cis?.paymentTerms as string),                requested: compHumanize(cus.newPaymentTerms) },
    { label: "Owners",              current: compOwners(cis?.owners),                                  requested: compOwners(cus.newOwners) },
    { label: "Officers",            current: compOfficers(cis?.officers),                              requested: compOfficers(cus.newOfficers) },
    { label: "Business Life",       current: (cis?.businessLife as string) ?? null,                    requested: cus.newBusinessLife ?? null },
    { label: "How Long at Address", current: (cis?.howLongAtAddress as string) ?? null,                requested: cus.newHowLongAtAddress ?? null },
    { label: "No. of Branches",     current: (cis?.numberOfBranches as string) ?? null,                requested: cus.newNumberOfBranches ?? null },
    { label: "Gov. Certifications", current: (cis?.govCertifications as string) ?? null,               requested: cus.newGovCertifications ?? null },
    { label: "Trade References",    current: compTradeRef(cis?.tradeReferences),                       requested: compTradeRef(cus.newTradeReferences) },
    { label: "Bank References",     current: compBankRef(cis?.bankReferences),                         requested: compBankRef(cus.newBankReferences) },
    { label: "Achievements",        current: (cis?.achievements as string) ?? null,                    requested: cus.newAchievements ?? null },
    { label: "Other Merits",        current: (cis?.otherMerits as string) ?? null,                     requested: cus.newOtherMerits ?? null },
    { label: "Additional Notes",    current: (cis?.additionalNotes as string) ?? null,                 requested: cus.newAdditionalNotes ?? null },
  ].filter((r) => r.requested) : [];

  // Build before/after rows from the stored snapshot (only for approved CUS)
  type ChangeRow = { label: string; before: string | null; after: string };
  const approvedChangeRows: ChangeRow[] = [];
  if (isApproved && cus?.beforeSnapshot) {
    const snap = cus.beforeSnapshot;
    const humanize = (v: string | null | undefined) => v?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownersSummary = (v: any) => Array.isArray(v) && v.length ? v.map((o: { name?: string; percentage?: string }) => [o.name, o.percentage ? `(${o.percentage}%)` : ""].filter(Boolean).join(" ")).join(", ") : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const officersSummary = (v: any) => Array.isArray(v) && v.length ? v.map((o: { name?: string; position?: string }) => [o.name, o.position ? `(${o.position})` : ""].filter(Boolean).join(" ")).join(", ") : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tradeRefSummary = (v: any) => Array.isArray(v) && v.length ? v.map((r: { company?: string }) => r.company).filter(Boolean).join(", ") : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bankRefSummary = (v: any) => Array.isArray(v) && v.length ? v.map((r: { bank?: string; branch?: string }) => [r.bank, r.branch].filter(Boolean).join(" - ")).join(", ") : null;
    const CHANGE_FIELDS: Array<{ label: string; cisKey: string; after: string | null | undefined }> = [
      { label: "Trade Name",          cisKey: "tradeName",            after: cus.newTradeName },
      { label: "Corporate Name",      cisKey: "corporateName",        after: cus.newCorporateName },
      { label: "Customer Type",       cisKey: "customerType",         after: humanize(cus.newCustomerType) },
      { label: "Business Type",       cisKey: "businessType",         after: humanize(cus.newBusinessType) },
      { label: "Date of Reg.",        cisKey: "dateOfBusinessReg",    after: cus.newDateOfBusinessReg },
      { label: "No. of Employees",    cisKey: "numberOfEmployees",    after: cus.newNumberOfEmployees },
      { label: "TIN Number",          cisKey: "tinNumber",            after: cus.newTinNumber },
      { label: "Contact Person",      cisKey: "contactPerson",        after: cus.newContactPerson },
      { label: "Mobile",              cisKey: "contactNumber",        after: cus.newContactNumber },
      { label: "Telephone",           cisKey: "telephoneNumber",      after: cus.newTelephoneNumber },
      { label: "Email",               cisKey: "emailAddress",         after: cus.newEmailAddress },
      { label: "Website",             cisKey: "website",              after: cus.newWebsite },
      { label: "Business Address",    cisKey: "businessAddress",      after: cus.newBusinessAddress },
      { label: "City/Municipality",   cisKey: "cityMunicipality",     after: cus.newCityMunicipality },
      { label: "Landmarks",           cisKey: "landmarks",            after: cus.newLandmarks },
      { label: "Delivery Address",    cisKey: "deliveryAddress",      after: cus.newDeliveryAddress },
      { label: "Delivery Landmarks",  cisKey: "deliveryLandmarks",    after: cus.newDeliveryLandmarks },
      { label: "Delivery Mobile",     cisKey: "deliveryMobile",       after: cus.newDeliveryMobile },
      { label: "Delivery Tel",        cisKey: "deliveryTelephone",    after: cus.newDeliveryTelephone },
      { label: "Line of Business",    cisKey: "lineOfBusiness",       after: humanize(cus.newLineOfBusiness) },
      { label: "Business Activity",   cisKey: "businessActivity",     after: humanize(cus.newBusinessActivity) },
      { label: "Sales Channel",       cisKey: "salesChannel",         after: humanize(cus.newSalesChannel) },
      { label: "Payment Terms",       cisKey: "paymentTerms",         after: humanize(cus.newPaymentTerms) },
      { label: "Owners",              cisKey: "owners",               after: ownersSummary(cus.newOwners) },
      { label: "Officers",            cisKey: "officers",             after: officersSummary(cus.newOfficers) },
      { label: "Business Life",       cisKey: "businessLife",         after: cus.newBusinessLife },
      { label: "How Long at Address", cisKey: "howLongAtAddress",     after: cus.newHowLongAtAddress },
      { label: "No. of Branches",     cisKey: "numberOfBranches",     after: cus.newNumberOfBranches },
      { label: "Gov. Certifications", cisKey: "govCertifications",    after: cus.newGovCertifications },
      { label: "Trade References",    cisKey: "tradeReferences",      after: tradeRefSummary(cus.newTradeReferences) },
      { label: "Bank References",     cisKey: "bankReferences",       after: bankRefSummary(cus.newBankReferences) },
      { label: "Achievements",        cisKey: "achievements",         after: cus.newAchievements },
      { label: "Other Merits",        cisKey: "otherMerits",          after: cus.newOtherMerits },
      { label: "Additional Notes",    cisKey: "additionalNotes",      after: cus.newAdditionalNotes },
      { label: "Credit Terms",        cisKey: "financeCreditTerms",   after: humanize(cus.financeCreditTerms) },
      { label: "Credit Limit",        cisKey: "financeCreditLimit",   after: cus.financeCreditLimit },
    ];
    for (const { label, cisKey, after } of CHANGE_FIELDS) {
      if (after && cisKey in snap) {
        const before = snap[cisKey];
        approvedChangeRows.push({ label, before: before ? String(before).replace(/_/g, " ") : null, after });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-4xl w-full flex flex-col p-0 gap-0 max-h-[92vh]">

        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="rounded-lg bg-teal-50 p-2 shrink-0">
              <RefreshCw className="h-4 w-4 text-teal-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base">
                  {cis?.tradeName ?? "Customer Update Sheet"}
                </DialogTitle>
                {cus && (
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold shrink-0
                    ${isApproved ? "bg-green-50 text-green-700 border-green-200"
                      : isDenied ? "bg-red-50 text-red-700 border-red-200"
                      : isDraft ? "bg-zinc-100 text-zinc-600 border-zinc-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                    {isDraft ? "Draft"
                      : cus.status === "submitted" ? "Submitted"
                      : isPendingFinance ? "Pending Finance Review"
                      : isPendingLegal ? "Pending Legal Review"
                      : isApproved ? "Approved"
                      : isDenied ? "Denied"
                      : cus.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">Customer Update Sheet</p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto min-h-0 flex-1 px-6 py-5 space-y-5">

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          )}

          {cus && (
            <>
              {/* Stepper */}
              {!isDenied && (
                <div className="rounded-xl border border-zinc-200 bg-white px-8 py-4">
                  <div className="flex items-start relative">
                    <div className="absolute top-4 left-0 right-0 h-px bg-zinc-100 z-0 mx-10" />
                    {STEPS.map((step, i) => {
                      const isPast = i < currentStep || (isApproved && i === currentStep);
                      const isCurrent = i === currentStep && !isApproved;
                      return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5 flex-1">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors
                            ${isPast ? "bg-teal-500 border-teal-500" : isCurrent ? "bg-white border-teal-500" : "bg-white border-zinc-200"}`}>
                            <step.Icon className={`h-3.5 w-3.5 ${isPast ? "text-white" : isCurrent ? "text-teal-600" : "text-zinc-300"}`} />
                          </div>
                          <span className={`text-[11px] font-medium text-center leading-tight
                            ${isCurrent ? "text-zinc-800" : isPast ? "text-zinc-500" : "text-zinc-300"}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status banners */}
              {isApproved && (
                <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-sm font-semibold text-green-800">CUS Approved — Changes Applied to Customer Record</p>
                  </div>
                  {approvedChangeRows.length > 0 ? (
                    <div className="divide-y divide-green-100">
                      <div className="grid grid-cols-[1fr_2fr_24px_2fr]">
                        <div className="px-5 py-2 bg-green-100/50"><p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70">Field</p></div>
                        <div className="px-5 py-2 bg-green-100/50"><p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70">Before</p></div>
                        <div className="bg-green-100/50" />
                        <div className="px-5 py-2 bg-green-100"><p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70">After</p></div>
                      </div>
                      {approvedChangeRows.map((row) => (
                        <div key={row.label} className="grid grid-cols-[1fr_2fr_24px_2fr] items-start">
                          <div className="px-5 py-3"><p className="text-xs font-semibold text-zinc-500">{row.label}</p></div>
                          <div className="px-5 py-3"><p className="text-sm text-zinc-500 line-through decoration-zinc-400">{row.before ?? "—"}</p></div>
                          <div className="flex items-start justify-center pt-3.5 bg-green-50/60"><ArrowRight className="h-3.5 w-3.5 text-green-500 shrink-0" /></div>
                          <div className="px-5 py-3 bg-green-50/60"><p className="text-sm font-semibold text-green-900">{row.after}</p></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="px-5 py-4 text-sm text-zinc-600">Changes applied — no detailed snapshot available for this record.</p>
                  )}
                </div>
              )}

              {isDenied && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                  <XCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-red-800">
                      CUS Denied{deniedEvent?.actorName ? ` by ${deniedEvent.actorName}` : ""}
                    </p>
                    {deniedEvent?.note && <p className="text-sm text-red-700">{deniedEvent.note}</p>}
                  </div>
                </div>
              )}

              {isUnderReview && (
                <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
                  <Clock className="h-5 w-5 shrink-0 text-zinc-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">Under Review</p>
                    <p className="text-sm text-zinc-600 mt-0.5">
                      Being reviewed by <strong>{reviewerLabel}</strong>. No further action needed from you.
                    </p>
                  </div>
                </div>
              )}

              {/* Two-col layout */}
              <div className="grid gap-5 lg:grid-cols-5">

                {/* Left */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Customer card */}
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                      <Building2 className="h-4 w-4 text-zinc-400" />
                      <h2 className="text-sm font-semibold text-zinc-700">Customer</h2>
                    </div>

                    {/* Current CIS info */}
                    <div className="px-4 pt-4 pb-3 space-y-2">
                      <p className="text-base font-bold text-zinc-900 leading-tight">{cis?.tradeName ?? "—"}</p>
                      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 text-sm text-zinc-600">
                        {cis?.contactPerson && (
                          <>
                            <User className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{cis.contactPerson}</span>
                          </>
                        )}
                        {cis?.cityMunicipality && (
                          <>
                            <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{cis.cityMunicipality}</span>
                          </>
                        )}
                        <>
                          <Tag className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="capitalize">{cis?.customerType?.replace(/_/g, " ") ?? "—"}</span>
                        </>
                      </div>
                    </div>

                    {/* Requested Changes — comparison table */}
                    {compRows.length > 0 && (
                      <div className="mx-4 mb-3 rounded-lg border border-zinc-200 overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-[100px_1fr_1fr] border-b border-zinc-200 bg-zinc-50">
                          <div className="px-3 py-2 border-r border-zinc-200">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Field</p>
                          </div>
                          <div className="px-3 py-2 border-r border-zinc-200 flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-zinc-400 shrink-0" />
                            <p className="text-[10px] font-semibold text-zinc-500">Current</p>
                          </div>
                          <div className="px-3 py-2 flex items-center gap-1 bg-amber-50">
                            <RefreshCw className="h-3 w-3 text-amber-500 shrink-0" />
                            <p className="text-[10px] font-semibold text-amber-600">Requested</p>
                          </div>
                        </div>
                        {/* Rows */}
                        <div className="divide-y divide-zinc-100">
                          {compRows.map(({ label, current, requested: req }) => {
                            const hasChange = !!req && req !== current;
                            return (
                              <div key={label} className={`grid grid-cols-[100px_1fr_1fr] ${hasChange ? "bg-amber-50/50" : ""}`}>
                                <div className="px-3 py-2 border-r border-zinc-100 flex items-start">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 leading-snug mt-0.5">{label}</p>
                                </div>
                                <div className="px-3 py-2 border-r border-zinc-100">
                                  <p className={`text-xs break-words leading-snug ${current ? (hasChange ? "text-zinc-400" : "text-zinc-700") : "text-zinc-300 italic"}`}>
                                    {current ?? "—"}
                                  </p>
                                </div>
                                <div className="px-3 py-2">
                                  {hasChange ? (
                                    <div className="flex items-start gap-1">
                                      <ArrowRight className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                      <p className="text-xs font-semibold text-amber-900 break-words leading-snug">{req}</p>
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-zinc-300 italic">no change</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Review Route + link */}
                    <div className="border-t border-zinc-100 px-4 py-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Review Route</p>
                        <p className="text-sm font-semibold text-zinc-800 mt-0.5">{reviewerLabel}</p>
                      </div>
                      <Link
                        href={`/agent/${cus.cisId}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Original CIS
                      </Link>
                    </div>
                  </div>

                  {/* Note */}
                  {cus.note && (
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Note</p>
                      </div>
                      <p className="text-sm text-zinc-700">{cus.note}</p>
                    </div>
                  )}

                  {/* Submit CTA */}
                  {isDraft && (
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <Send className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-zinc-800">Ready to submit?</p>
                          <p className="text-sm text-zinc-500 mt-0.5">
                            Sends to <strong className="text-zinc-700">{reviewerLabel}</strong> for review.
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full"
                      >
                        {submitting
                          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                          : "Submit for Review"}
                      </Button>
                    </div>
                  )}

                  {/* Activity */}
                  {cus.events.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                      <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                        <h2 className="text-sm font-semibold text-zinc-700">Activity</h2>
                      </div>
                      <ol className="p-4 space-y-4">
                        {cus.events.map((ev, i) => (
                          <li key={ev.id} className="flex items-start gap-2.5">
                            <div className="flex flex-col items-center">
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0
                                ${ev.action === "approved" ? "bg-green-100" : ev.action === "denied" ? "bg-red-100" : "bg-zinc-100"}`}>
                                {ev.action === "approved"
                                  ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  : ev.action === "denied"
                                  ? <XCircle className="h-3 w-3 text-red-600" />
                                  : <Send className="h-3 w-3 text-zinc-500" />}
                              </div>
                              {i < cus.events.length - 1 && <div className="w-px flex-1 bg-zinc-100 mt-1 min-h-[14px]" />}
                            </div>
                            <div className="pb-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-800">
                                {ACTION_LABELS[ev.action] ?? ev.action.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-zinc-400">by {ev.actorName}</p>
                              {ev.note && (
                                <p className="mt-1 text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 rounded px-2 py-1.5">
                                  {ev.note}
                                </p>
                              )}
                              <p className="text-[11px] text-zinc-400 mt-0.5">
                                {new Date(ev.createdAt).toLocaleString("en-US", {
                                  month: "short", day: "numeric", year: "numeric",
                                  hour: "numeric", minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {/* Right: documents */}
                <div className="lg:col-span-3">
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-zinc-400" />
                        <h2 className="text-sm font-semibold text-zinc-700">Documents</h2>
                      </div>
                    </div>
                    <div className="p-4">
                      <CusDocSection
                        cusId={cus.id}
                        initialDocs={initialDocs}
                        cisDocs={cisDocs}
                        disabled={!isDraft}
                        onDocChange={handleDocsChange}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
