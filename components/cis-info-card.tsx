"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type CisStatus } from "@/components/status-badge";
import { displayFingerprint } from "@/lib/signature-integrity";
import { AgentDocSection } from "@/components/agent-doc-section";
import { PointsBreakdownPanel } from "@/components/points-breakdown-panel";
import { SignatureVerificationBadge } from "@/components/signature-verification-badge";
import {
  DOC_LABELS,
  DOC_SLOTS,
  DENIAL_REASON_CODES,
  docTypeRequiresExpiration,
  getFileExpirationStatus,
  sortFilesByUploadedAtDesc,
  type DocType,
  type DocReviewStatus,
  type DocReviewStatuses,
  type FileEntry,
} from "@/lib/doc-types";
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  Hash,
  User,
  Briefcase,
  FileText,
  PenLine,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  Link as LinkIcon,
  Users,
  BookOpen,
  Paperclip,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import { useState } from "react";
import { PrintButton } from "@/components/print-button";
import { PdfPrintRenderer } from "@/components/pdf-print-renderer";
import { DocxRenderer } from "@/components/docx-renderer";
import { PrintLayoutOptimizer } from "@/components/print-layout-optimizer";
import { humanizeDisplayValue, cn } from "@/lib/utils";

const SALES_CHANNEL_LABELS: Record<string, string> = {
  end_user: "End User",
  dealer: "Dealer",
  distributor: "Distributor",
  private_label: "Private Label",
  toll_blend: "Toll Blend",
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  standard: "End-User",
  fs_petroleum: "FS Petroleum",
  special: "Special",
  dealer: "Dealer",
  distributor: "Distributor",
  private_label: "Private Label",
  toll_blend: "Toll Blend",
  end_user: "End-User",
};

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  standard: "bg-green-50 text-green-700 border border-green-100",
  fs_petroleum: "bg-purple-50 text-purple-700 border border-purple-100",
  special: "bg-amber-50 text-amber-700 border border-amber-100",
  dealer: "bg-blue-50 text-blue-700 border border-blue-100",
  distributor: "bg-teal-50 text-teal-700 border border-teal-100",
  private_label: "bg-violet-50 text-violet-700 border border-violet-100",
  toll_blend: "bg-orange-50 text-orange-700 border border-orange-100",
  end_user: "bg-green-50 text-green-700 border border-green-100",
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  corporation: "Corporation",
  partnership: "Partnership",
  sole_proprietor: "Sole Proprietor",
  cooperative: "Cooperative",
  other: "Other",
};

const STATUS_LABELS: Partial<Record<CisStatus, string>> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_endorsement: "Pending Manager Endorsement",
  pending_legal_review: "Pending Legal Review",
  pending_finance_review: "Pending Finance Review",
  pending_approval: "Pending Approval",
  approved: "Approved",
  erp_encoded: "ERP Encoded",
  denied: "Denied",
  returned: "Returned",
};

const LINE_OF_BUSINESS_LABELS: Record<string, string> = {
  retail: "Retail",
  wholesale: "Wholesale",
  manufacturing: "Manufacturing",
  services: "Services",
  construction: "Construction",
  transport: "Transport / Logistics",
  agriculture: "Agriculture",
  other: "Other",
};

const BUSINESS_ACTIVITY_LABELS: Record<string, string> = {
  trading: "Trading",
  distribution: "Distribution",
  production: "Production",
  service_provider: "Service Provider",
  subcontractor: "Subcontractor",
  other: "Other",
};

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  cod:       "COD",
  with_terms: "With Terms",
  credit_30: "Credit – 30 days",
  credit_60: "Credit – 60 days",
  credit_90: "Credit – 90 days",
};

const FINANCE_CREDIT_TERMS_LABELS: Record<string, string> = {
  "30_days": "30 Days", "60_days": "60 Days", "90_days": "90 Days",
};

type OwnerRow = { name: string; nationality: string; percentage: string; contact: string };
type OfficerRow = { name: string; position: string; contact: string };
type TradeRefRow = { company: string; address: string; contact: string; years: string };
type BankRefRow = { bank: string; branch: string; accountType: string; accountNo: string };

function isImageFile(file: FileEntry) {
  if (file.type?.toLowerCase().startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.url);
}

function isPdfFile(file: FileEntry) {
  if (file.type?.toLowerCase() === "application/pdf") return true;
  return /\.pdf$/i.test(file.name) || /\.pdf$/i.test(file.url);
}

function isDocxFile(file: FileEntry) {
  if (file.type?.toLowerCase() === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return true;
  return /\.docx$/i.test(file.name) || /\.docx$/i.test(file.url);
}

function formatUploadedAt(value?: string) {
  if (!value) return "Uploaded date unavailable";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Uploaded date unavailable";
  return `Uploaded ${new Date(parsed).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatExpirationDate(value?: string) {
  if (!value) return "No expiration date recorded";
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return "Invalid expiration date";
  return `Expires ${new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function DocReviewBadge({ status }: { status: DocReviewStatus }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">
        <Check className="h-3 w-3" />
        Approved
      </span>
    );
  }
  if (status === "needs_review") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
        <AlertCircle className="h-3 w-3" />
        Needs Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
      <X className="h-3 w-3" />
      Rejected
    </span>
  );
}

function DocReviewActions({
  docType,
  currentStatus,
  onReview,
}: {
  docType: DocType;
  currentStatus?: DocReviewStatus;
  onReview: (docType: DocType, status: DocReviewStatus, reason?: string | null) => Promise<void>;
}) {
  const [isPending, setIsPending] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DocReviewStatus | null>(null);
  const [reason, setReason] = useState<string>("");
  const [showReasonFor, setShowReasonFor] = useState<"needs_review" | "rejected" | null>(null);
  const actionLabel = currentStatus ? "Update decision" : "Set decision";

  async function handleAction(status: DocReviewStatus) {
    if (status === "rejected" || status === "needs_review") {
      setShowReasonFor(status);
      setPendingStatus(status);
      return;
    }
    await submit(status, null);
  }

  async function submit(status: DocReviewStatus, r: string | null) {
    setIsPending(true);
    try {
      await onReview(docType, status, r || null);
      setShowReasonFor(null);
      setReason("");
      setPendingStatus(null);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="mt-2 print:hidden">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {actionLabel}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending || currentStatus === "approved"}
          onClick={() => handleAction("approved")}
          className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
        >
          <Check className="h-3 w-3" />
          Mark Approved
        </button>
        <button
          type="button"
          disabled={isPending || currentStatus === "needs_review"}
          onClick={() => handleAction("needs_review")}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          <AlertCircle className="h-3 w-3" />
          Request Update
        </button>
        <button
          type="button"
          disabled={isPending || currentStatus === "rejected"}
          onClick={() => handleAction("rejected")}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          <X className="h-3 w-3" />
          Reject Document
        </button>
      </div>
      {showReasonFor && (
        <div className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2">
          <label className="text-[11px] font-semibold text-zinc-500">
            Reason (optional)
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-w-40 rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-700"
              disabled={isPending}
            >
              <option value="">Select a reason</option>
              {DENIAL_REASON_CODES.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          <button
            type="button"
            disabled={isPending}
            onClick={() => submit(pendingStatus!, reason || null)}
            className="rounded-md bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Save Decision
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => { setShowReasonFor(null); setReason(""); setPendingStatus(null); }}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancel
          </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpirationStatusBadge({ status }: { status: "valid" | "expired" | "unknown" }) {
  if (status === "expired") {
    return (
      <span className="inline-flex items-center rounded-md border border-red-300 bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-800 print:border-red-500 print:bg-white print:text-red-700">
        Expired - Reupload Required
      </span>
    );
  }

  if (status === "valid") {
    return (
      <span className="inline-flex items-center rounded-md border border-green-300 bg-green-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-green-700 print:border-green-500 print:bg-white print:text-green-700">
        Valid
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 print:border-amber-500 print:bg-white print:text-amber-700">
      Unknown
    </span>
  );
}

interface CisInfoCardProps {
  cisId: string;
  // Basic
  tradeName: string | null;
  contactPerson: string | null;
  contactNumber: string | null;
  emailAddress: string | null;
  businessAddress: string | null;
  cityMunicipality: string | null;
  businessType: string | null;
  tinNumber: string | null;
  additionalNotes: string | null;
  customerType?: string | null;
  salesChannel?: string | null;
  agentCode: string;
  agentType: string | null;
  status: CisStatus;
  createdAt: Date;
  updatedAt: Date;
  // Extended basic
  corporateName?: string | null;
  dateOfBusinessReg?: string | null;
  numberOfEmployees?: string | null;
  website?: string | null;
  telephoneNumber?: string | null;
  landmarks?: string | null;
  // Delivery
  deliverySameAsOffice?: boolean | null;
  deliveryAddress?: string | null;
  deliveryLandmarks?: string | null;
  deliveryMobile?: string | null;
  deliveryTelephone?: string | null;
  // Classification
  lineOfBusiness?: string | null;
  lineOfBusinessOther?: string | null;
  businessActivity?: string | null;
  businessActivityOther?: string | null;
  // Ownership
  owners?: unknown;
  officers?: unknown;
  paymentTerms?: string | null;
  // Background
  businessLife?: string | null;
  howLongAtAddress?: string | null;
  numberOfBranches?: string | null;
  govCertifications?: string | null;
  tradeReferences?: unknown;
  bankReferences?: unknown;
  achievements?: string | null;
  otherMerits?: string | null;
  // Documents
  docValidId?: unknown;
  docMayorsPermit?: unknown;
  docSecDti?: unknown;
  docBirCertificate?: unknown;
  docLocationMap?: unknown;
  docFinancialStatement?: unknown;
  docBankStatement?: unknown;
  docProofOfBilling?: unknown;
  docProofOfOwnership?: unknown;
  docLeaseContract?: unknown;
  docStorePhoto?: unknown;
  docSupplierInvoice?: unknown;
  docSocialMedia?: unknown;
  docCompanyWebsite?: unknown;
  docIsoCertification?: unknown;
  docHalalCertificate?: unknown;
  docCertifications?: unknown;
  docGovCertifications?: unknown;
  docSirRestySigned?: unknown;
  docOther?: unknown;
  docAgentOtherRequirements?: unknown;
  docSalesSupportOther?: unknown;
  // Signatures
  customerSignature?: string | null;
  customerSignedAt?: Date | null;
  customerSignatureSeal?: string | null;
  approverSignature?: string | null;
  approverSignedAt?: Date | null;
  approverSignatureSeal?: string | null;
  // FS petroleum / special account
  petroleumLicenseNo?: string | null;
  depotStationType?: string | null;
  tankCapacity?: string | null;
  doeAccreditationNo?: string | null;
  specialAccountType?: string | null;
  specialAccountRemarks?: string | null;
  printEnabled?: boolean;
  hidePrintButton?: boolean;
  agentUpload?: {
    cisId: string;
  };
  // Agent fill-out
  agentAccountSpecialistFirst?: string | null;
  agentAccountSpecialistLast?: string | null;
  agentSalesSpecialist?: string | null;
  agentSalesManager?: string | null;
  agentTpcFirst?: string | null;
  agentTpcLast?: string | null;
  // Finance credit evaluation
  financeEu?: string | null;
  financeDl?: string | null;
  financeDr?: string | null;
  financePlTs?: string | null;
  financePossiblePoints?: number | null;
  financeApprovedPoints?: number | null;
  // Direct metric points set by Finance (each 0–5)
  metricPoints?: { annualSales?: number | null; netIncome?: number | null; bankBalance?: number | null; businessLife?: number | null } | null;
  financeCreditLimit?: string | null;
  financeCreditTerms?: string | null;
  // Sales support
  salesSupportAccountType?: string | null;
  salesSupportPriceList1?: string | null;
  salesSupportPriceList2?: string | null;
  salesSupportSalesType?: string | null;
  salesSupportVatCode?: string | null;
  salesSupportOtherRemarks?: string | null;
  // Document review
  docReviewStatuses?: DocReviewStatuses;
  onDocReview?: (docType: DocType, status: DocReviewStatus, reason?: string | null) => Promise<void>;
  /** Called when Finance saves metric points inline from the doc review panel */
  onMetricSave?: (metricPoints: Record<string, number>) => Promise<void>;
  /** Hide the PointsBreakdownPanel from the main form (it will still be shown in print mode) */
  hidePointsPanel?: boolean;
  /** Controls how much of the scoring panel is visible. "summary" = agent view (total + terms only). "full" = finance/staff view (default). */
  pointsMode?: "full" | "summary";
}

const METRIC_TIERS: Record<string, { label: string; hint: string; tiers: { range: string; pts: number }[] }> = {
  annualSales: {
    label: "Annual Sales",
    hint: "Total annual sales revenue from financial statements or ITR",
    tiers: [
      { pts: 0, range: "5,000,000 and below" },
      { pts: 1, range: "5,000,001 – 10,000,000" },
      { pts: 2, range: "10,000,001 – 50,000,000" },
      { pts: 3, range: "50,000,001 – 100,000,000" },
      { pts: 4, range: "Above 100,000,000" },
      { pts: 5, range: "100,000,000 and above (≥100M+)" },
    ],
  },
  netIncome: {
    label: "Net Income",
    hint: "Net income after tax from financial statements or ITR",
    tiers: [
      { pts: 0, range: "250,000 and below" },
      { pts: 1, range: "250,001 – 1,000,000" },
      { pts: 2, range: "1,000,001 – 5,000,000" },
      { pts: 3, range: "5,000,001 – 15,000,000" },
      { pts: 4, range: "15,000,001 – 30,000,000" },
      { pts: 5, range: "Above 30,000,000" },
    ],
  },
  bankBalance: {
    label: "Bank Statement / Average Balance",
    hint: "Average daily balance shown in the 3-month bank statement",
    tiers: [
      { pts: 0, range: "99,999 and below (5 digits or less)" },
      { pts: 1, range: "100,000 – 399,999 (low 6 digits)" },
      { pts: 2, range: "400,000 – 699,999 (mid 6 digits)" },
      { pts: 3, range: "700,000 – 999,999 (high 6 digits)" },
      { pts: 4, range: "1,000,000 – 9,999,999 (7 digits)" },
      { pts: 5, range: "10,000,000 and above (8 digits or more)" },
    ],
  },
  businessLife: {
    label: "Years in Business",
    hint: "How long the business has been in operation",
    tiers: [
      { pts: 0, range: "1 year and below" },
      { pts: 1, range: "2 to 5 years" },
      { pts: 2, range: "6 to 10 years" },
      { pts: 3, range: "11 to 20 years" },
      { pts: 4, range: "21 to 30 years" },
      { pts: 5, range: "Above 30 years" },
    ],
  },
};

function MetricPointPicker({
  metricKeys,
  initialPoints,
  onSave,
}: {
  metricKeys: string[];
  initialPoints: Record<string, number | null | undefined>;
  onSave: (points: Record<string, number>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, number | null>>(
    Object.fromEntries(metricKeys.map((k) => [k, initialPoints[k] ?? null]))
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const payload: Record<string, number> = {};
    for (const k of metricKeys) {
      if (values[k] != null) payload[k] = values[k]!;
    }
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  }

  const hasExistingPoints = metricKeys.some((k) => initialPoints[k] != null);
  const allSelected = metricKeys.every((k) => values[k] != null);

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-violet-200 bg-white print:hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-violet-100 bg-violet-600 px-3 py-2.5">
        <svg className="h-3.5 w-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-[11px] font-bold uppercase tracking-wider text-white">Financial Scoring Points</span>
        {hasExistingPoints && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>

      {hasExistingPoints && (
        <div className="border-b border-emerald-100 bg-emerald-50 px-3 py-2">
          <p className="text-[10px] text-emerald-700">
            <span className="font-semibold">Points have been recorded.</span> To make changes, contact the system administrator.
          </p>
        </div>
      )}

      <div className="divide-y divide-zinc-100">
        {metricKeys.map((key) => {
          const meta = METRIC_TIERS[key];
          const selected = values[key];
          return (
            <div key={key} className="px-3 py-3">
              {/* Metric label + hint */}
              <div className="mb-2">
                <p className="text-[11px] font-semibold text-zinc-800">{meta.label}</p>
                <p className="text-[10px] text-zinc-400">{meta.hint}</p>
              </div>
              {/* Tier options as radio-style rows */}
              <div className="overflow-hidden rounded-md border border-zinc-200">
                {meta.tiers.map((tier, i) => {
                  const isSelected = selected === tier.pts;
                  return (
                    <button
                      key={tier.pts}
                      type="button"
                      onClick={() => !hasExistingPoints && setValues((prev) => ({ ...prev, [key]: tier.pts }))}
                      disabled={hasExistingPoints}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        i !== 0 && "border-t border-zinc-100",
                        isSelected
                          ? "bg-violet-50"
                          : "bg-white hover:bg-zinc-50",
                        hasExistingPoints && "cursor-default",
                      )}
                    >
                      {/* Radio circle */}
                      <span className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isSelected ? "border-violet-600 bg-violet-600" : "border-zinc-300 bg-white",
                      )}>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      {/* Range label */}
                      <span className={cn(
                        "flex-1 text-[11px]",
                        isSelected ? "font-semibold text-violet-800" : "text-zinc-600",
                      )}>
                        {tier.range}
                      </span>
                      {/* Points badge */}
                      <span className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                        isSelected
                          ? "bg-violet-600 text-white"
                          : "bg-zinc-100 text-zinc-500",
                      )}>
                        {tier.pts} {tier.pts === 1 ? "pt" : "pts"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      {!hasExistingPoints && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-3 py-2.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !allSelected}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-all",
              allSelected && !saving
                ? "bg-violet-600 text-white shadow-sm hover:bg-violet-700 active:scale-[0.98]"
                : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
            )}
          >
            {saving ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving Points…
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {allSelected ? "Save Scoring Points" : "Select all metrics to save"}
              </>
            )}
          </button>
          {!allSelected && (
            <p className="mt-1.5 text-center text-[10px] text-zinc-400">
              {metricKeys.filter((k) => values[k] == null).length} of {metricKeys.length} metrics not yet scored
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  icon: Icon,
  mono,
  printBlank,
}: {
  label: string;
  value?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  mono?: boolean;
  /** On print, show a blank underline instead of — when value is empty */
  printBlank?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/60 p-3 print:rounded-none print:border-0 print:border-b print:border-zinc-200 print:bg-white print:px-0 print:pt-1 print:pb-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 print:text-[13px] print:text-zinc-500">
        {Icon && <Icon className="h-3 w-3 print:hidden" />}
        {label}
      </p>
      <p className={`mt-1 min-w-0 wrap-break-word text-sm leading-relaxed text-zinc-900 print:mt-1 print:text-[20px] print:leading-[1.4] ${mono ? "font-mono" : ""}`}>
        {value
          ? value
          : printBlank
            ? (
              <>
                <span className="text-zinc-300 print:hidden">—</span>
                <span className="hidden print:inline-block print:w-full print:border-b-2 print:border-zinc-400 print:pb-2">&nbsp;</span>
              </>
            )
            : <span className="text-zinc-300 print:text-zinc-400">—</span>
        }
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  label,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-center gap-2 border-b border-zinc-200 pb-2.5 print:mb-4 print:border-zinc-300 print:pb-2 ${className}`}>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 print:hidden">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-600 print:text-[13px] print:text-zinc-700">
        {label}
      </p>
    </div>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`scroll-mt-22 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-6 print:mb-1 print:break-inside-avoid print:rounded-none print:border-0 print:border-t-2 print:border-zinc-300 print:bg-white print:px-0 print:pt-4 print:pb-3 print:shadow-none ${className}`}
    >
      {children}
    </section>
  );
}

function SignatureBlock({
  label,
  dataUrl,
  signedAt,
  hasSeal,
  cisId,
  seal,
}: {
  label: string;
  dataUrl: string;
  signedAt?: Date | null;
  hasSeal: boolean;
  cisId: string;
  seal?: string | null;
}) {
  const fp = displayFingerprint(dataUrl);

  return (
    <div className="space-y-2">
      <div className="print:hidden">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
          {hasSeal && (
            <SignatureVerificationBadge
              cisId={cisId}
              signedAt={signedAt ?? null}
              dataUrl={dataUrl}
              seal={seal ?? null}
            />
          )}
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-2 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt={label} className="h-20 w-auto max-w-full object-contain sm:h-24" />
        </div>
        <p className="mt-1 flex items-center gap-1.5 break-all font-mono text-[10px] text-zinc-400">
          <Fingerprint className="h-3 w-3 shrink-0" />
          {fp}
          <span className="text-zinc-300">···</span>
        </p>
        {signedAt && (
          <p className="text-xs text-zinc-400 mt-1">
            Signed{" "}
            {new Date(signedAt).toLocaleString("en-US", {
              month: "short", day: "numeric", year: "numeric",
              hour: "numeric", minute: "2-digit",
            })}
          </p>
        )}
      </div>

      <div className="hidden print:block">
        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
        <div className="border border-zinc-300 bg-white p-1 inline-block mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt={label} className="h-20 w-auto max-w-45 object-contain" />
        </div>
        <div className="border-t border-zinc-400 pt-1 mt-1">
          {signedAt && (
            <p className="text-[9px] text-zinc-600">
              Signed:{" "}
              {new Date(signedAt).toLocaleString("en-US", {
                month: "short", day: "numeric", year: "numeric",
                hour: "numeric", minute: "2-digit",
              })}
            </p>
          )}
          <p className="font-mono text-[8px] text-zinc-400 mt-0.5 break-all">{fp}</p>
        </div>
      </div>
    </div>
  );
}

export function CisInfoCard(props: CisInfoCardProps) {
  const {
    cisId,
    tradeName,
    contactPerson,
    contactNumber,
    emailAddress,
    businessAddress,
    cityMunicipality,
    businessType,
    tinNumber,
    additionalNotes,
    customerType,
    salesChannel,
    agentCode,
    agentType,
    status,
    createdAt,
    updatedAt,
    corporateName,
    dateOfBusinessReg,
    numberOfEmployees,
    website,
    telephoneNumber,
    landmarks,
    deliverySameAsOffice,
    deliveryAddress,
    deliveryLandmarks,
    deliveryMobile,
    deliveryTelephone,
    lineOfBusiness,
    lineOfBusinessOther,
    businessActivity,
    businessActivityOther,
    owners,
    officers,
    paymentTerms,
    businessLife,
    howLongAtAddress,
    numberOfBranches,
    govCertifications,
    tradeReferences,
    bankReferences,
    achievements,
    otherMerits,
    customerSignature,
    customerSignedAt,
    customerSignatureSeal,
    approverSignature,
    approverSignedAt,
    approverSignatureSeal,
    printEnabled = false,
    hidePrintButton = false,
    agentUpload,
    financePlTs,
    financePossiblePoints,
    financeApprovedPoints,
    financeCreditLimit,
    financeCreditTerms,
    agentAccountSpecialistFirst,
    agentAccountSpecialistLast,
    agentSalesSpecialist,
    agentSalesManager,
    agentTpcFirst,
    agentTpcLast,
    financeEu,
    financeDl,
    financeDr,
    salesSupportAccountType,
    salesSupportPriceList1,
    salesSupportPriceList2,
    salesSupportSalesType,
    salesSupportVatCode,
    salesSupportOtherRemarks,
    docReviewStatuses,
    onDocReview,
    onMetricSave,
    metricPoints,
    hidePointsPanel = false,
    pointsMode = "full",
  } = props;

  const hasSignatures = customerSignature || approverSignature;

  // Signature verification is done client-side to avoid hydration mismatch
  // (verifySeal depends on SIGNATURE_HMAC_SECRET which isn't available on client)
  const customerVerified = false; // Will be computed by client component
  const approverVerified = false; // Will be computed by client component

  const lobLabel = lineOfBusiness === "other"
    ? lineOfBusinessOther
    : (LINE_OF_BUSINESS_LABELS[lineOfBusiness ?? ""] ?? humanizeDisplayValue(lineOfBusiness));

  const activityLabel = businessActivity === "other"
    ? businessActivityOther
    : (BUSINESS_ACTIVITY_LABELS[businessActivity ?? ""] ?? humanizeDisplayValue(businessActivity));

  const ownerRows = (owners as OwnerRow[] | null) ?? [];
  const officerRows = (officers as OfficerRow[] | null) ?? [];
  const tradeRefRows = (tradeReferences as TradeRefRow[] | null) ?? [];
  const bankRefRows = (bankReferences as BankRefRow[] | null) ?? [];

  // Collect all uploaded docs
  const allDocEntries = DOC_SLOTS.map((slot) => ({
    key: slot.key,
    label: DOC_LABELS[slot.key],
    files: (props[slot.key as keyof CisInfoCardProps] as FileEntry[] | null) ?? [],
  }));
  const docEntries = allDocEntries.filter((e) => e.files.length > 0);
  const allDocsByType = Object.fromEntries(
    allDocEntries.map((entry) => [entry.key, entry.files])
  ) as Record<DocType, FileEntry[]>;

  const hasCfoSigned = (allDocsByType.docSirRestySigned ?? []).length > 0;
  const canPrint = printEnabled || status === "erp_encoded";
  const printDisabledReason = "Printing is not available for your role, it will be available once the approval process is complete";
  const showCfoSignatureBox = !hasCfoSigned && canPrint;

  const hasAgentInfo = agentAccountSpecialistFirst || agentAccountSpecialistLast || agentSalesSpecialist || agentSalesManager || agentTpcFirst || agentTpcLast;
  const hasFinanceData = financeEu || financeDl || financeDr || financePlTs || financePossiblePoints != null || financeApprovedPoints != null || financeCreditLimit || financeCreditTerms;
  const hasSalesSupportData = salesSupportAccountType || salesSupportPriceList1 || salesSupportPriceList2 || salesSupportSalesType || salesSupportVatCode || salesSupportOtherRemarks;

  const hasDelivery = !deliverySameAsOffice && (deliveryAddress || deliveryMobile || deliveryTelephone);
  const hasClassification = lineOfBusiness || businessActivity;
  const hasOwnership = ownerRows.length > 0 || officerRows.length > 0 || !!paymentTerms;
  const hasBackground = businessLife || howLongAtAddress || numberOfBranches || govCertifications
    || tradeRefRows.length > 0 || bankRefRows.length > 0 || achievements || otherMerits;

  return (
    <Card className="overflow-hidden print:border-0 print:shadow-none" data-print-root>
      <PrintLayoutOptimizer />

      {/* ── PRINT HEADER ── */}
      <div className="hidden print:block px-0 pt-0 pb-4">
        <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-3 mb-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900">
              Oracle Petroleum Corporation
            </p>
            <p className="text-[10px] text-zinc-500 tracking-widest uppercase mt-0.5">
              Toll Blend Division
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-zinc-400">Form No.</p>
            <p className="font-mono text-[10px] font-semibold text-zinc-700">{cisId}</p>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-base font-bold uppercase tracking-wide text-zinc-900">
              Customer Registration Sheet
            </p>
            <div className="flex gap-5 mt-1 text-[10px] text-zinc-600">
              <span>Status: <strong className="text-zinc-900">{STATUS_LABELS[status] ?? humanizeDisplayValue(status)}</strong></span>
              <span>Type: <strong className="text-zinc-900">{customerType ? (CUSTOMER_TYPE_LABELS[customerType] ?? humanizeDisplayValue(customerType)) : "—"}</strong></span>
              {salesChannel && <span>Channel: <strong className="text-zinc-900">{SALES_CHANNEL_LABELS[salesChannel] ?? humanizeDisplayValue(salesChannel)}</strong></span>}
              <span>Agent: <strong className="font-mono text-zinc-900">{agentCode}</strong>{agentType && <span className="ml-1 text-zinc-500">({agentType === "sales_agent" ? "Sales" : "RSR"})</span>}</span>
            </div>
          </div>
          <div className="text-right text-[9px] text-zinc-400">
            <p>Submitted: {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            <p>Updated: {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>
        <div className="border-b border-zinc-300 mt-3" />
      </div>

      {/* ── SCREEN HEADER BAND ── */}
      <div className="print:hidden border-b border-zinc-100 bg-zinc-50 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-zinc-900">
              {tradeName ?? <span className="italic text-zinc-400 font-normal">Untitled</span>}
            </h2>
            {corporateName && (
              <p className="text-sm text-zinc-500 mt-0.5">{corporateName}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span>Agent <span className="font-mono font-semibold text-zinc-700">{agentCode}</span></span>
              {agentType && (
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-600">
                  {agentType === "sales_agent" ? "Sales" : "RSR"}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-col sm:items-end">
            {!hidePrintButton && <PrintButton disabled={!canPrint} disabledReason={printDisabledReason} />}
            <StatusBadge status={status} />
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${customerType ? (CUSTOMER_TYPE_COLORS[customerType] ?? "bg-zinc-100 text-zinc-600") : "bg-zinc-100 text-zinc-400"}`}>
              <Building2 className="h-3 w-3" />
              {customerType ? (CUSTOMER_TYPE_LABELS[customerType] ?? humanizeDisplayValue(customerType)) : "Pending"}
            </span>
          </div>
        </div>
      </div>

      <CardContent className="space-y-6 p-4 sm:p-6 print:space-y-4 print:px-0 print:pt-4">

        <div className="hidden print:block print:mb-1">
          <p className="text-sm font-bold text-zinc-900">
            {tradeName ?? <span className="italic text-zinc-400">Untitled</span>}
          </p>
        </div>

        {/* ── Business Information ── */}
        <SectionCard>
          <SectionTitle icon={Briefcase} label="Business Information" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-3">
            {corporateName && <div className="sm:col-span-2 lg:col-span-3"><Field label="Registered Corporate Name" value={corporateName} icon={Building2} /></div>}
            <Field label="Trade / Business Name" value={tradeName} icon={Briefcase} />
            {dateOfBusinessReg && <Field label="Date of Registration" value={dateOfBusinessReg} />}
            {numberOfEmployees && <Field label="No. of Employees" value={numberOfEmployees} icon={Users} />}
          </div>
        </SectionCard>

        {/* ── Contact Details ── */}
        <SectionCard>
          <SectionTitle icon={User} label="Contact Details" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-3">
            <Field label="Contact Person" value={contactPerson} icon={User} />
            <Field label="Email Address" value={emailAddress} icon={Mail} />
            <Field label="Mobile Number" value={contactNumber} icon={Phone} />
            {telephoneNumber && <Field label="Telephone" value={telephoneNumber} icon={Phone} />}
            {website && <div className="sm:col-span-2 lg:col-span-1"><Field label="Website" value={website} icon={LinkIcon} /></div>}
          </div>
        </SectionCard>

        {/* ── Office Address ── */}
        <SectionCard>
          <SectionTitle icon={MapPin} label="Office Address" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Street Address" value={businessAddress} icon={MapPin} />
            </div>
            <Field label="City / Municipality" value={cityMunicipality} icon={MapPin} />
            {landmarks && <Field label="Landmarks" value={landmarks} />}
          </div>
        </SectionCard>

        {/* ── Delivery Address ── */}
        {hasDelivery && (
          <SectionCard>
              <SectionTitle icon={MapPin} label="Delivery Address" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2 print:gap-3">
                {deliveryAddress && <div className="sm:col-span-2 lg:col-span-3"><Field label="Delivery Address" value={deliveryAddress} icon={MapPin} /></div>}
                {deliveryLandmarks && <div className="sm:col-span-2 lg:col-span-3"><Field label="Delivery Landmarks" value={deliveryLandmarks} /></div>}
                {deliveryMobile && <Field label="Delivery Mobile" value={deliveryMobile} icon={Phone} />}
                {deliveryTelephone && <Field label="Delivery Telephone" value={deliveryTelephone} icon={Phone} />}
              </div>
          </SectionCard>
        )}

        {/* ── Business Classification ── */}
        {hasClassification && (
          <SectionCard>
              <SectionTitle icon={Briefcase} label="Business Classification" />
              <div className="grid gap-3 sm:grid-cols-2 print:gap-2">
                {lobLabel && <Field label="Line of Business" value={lobLabel} />}
                {activityLabel && <Field label="Business Activity" value={activityLabel} />}
                <Field label="Business Type" value={businessType ? (BUSINESS_TYPE_LABELS[businessType] ?? humanizeDisplayValue(businessType)) : null} icon={Building2} />
                <Field label="TIN Number" value={tinNumber} icon={Hash} mono />
              </div>
          </SectionCard>
        )}

        {/* If no classification section shown, still show type + TIN */}
        {!hasClassification && (
          <SectionCard>
            <div className="grid gap-3 sm:grid-cols-2 print:gap-2">
              <Field label="Business Type" value={businessType ? (BUSINESS_TYPE_LABELS[businessType] ?? humanizeDisplayValue(businessType)) : null} icon={Building2} />
              <Field label="TIN Number" value={tinNumber} icon={Hash} mono />
            </div>
          </SectionCard>
        )}

        {/* ── Ownership ── */}
        {hasOwnership && (
          <SectionCard>
              <SectionTitle icon={Users} label="Ownership & Officers" />
              {ownerRows.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Owners / Partners</p>
                  <div className="overflow-x-auto rounded-lg border border-zinc-100 print:overflow-visible print:rounded-none print:border-zinc-200">
                    <table className="min-w-140 w-full text-sm print:min-w-0 print:text-[20px]">
                      <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Name</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Nationality</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">% Ownership</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerRows.map((r, i) => (
                          <tr key={i} className="border-b border-zinc-50 last:border-0">
                            <td className="px-3 py-2 text-zinc-900">{r.name || "—"}</td>
                            <td className="px-3 py-2 text-zinc-700">{r.nationality || "—"}</td>
                            <td className="px-3 py-2 text-zinc-700">{r.percentage || "—"}</td>
                            <td className="px-3 py-2 text-zinc-700">{r.contact || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {officerRows.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Officers / Representatives</p>
                  <div className="overflow-x-auto rounded-lg border border-zinc-100 print:overflow-visible print:rounded-none print:border-zinc-200">
                    <table className="min-w-120 w-full text-sm print:min-w-0 print:text-[20px]">
                      <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Name</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Position</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {officerRows.map((r, i) => (
                          <tr key={i} className="border-b border-zinc-50 last:border-0">
                            <td className="px-3 py-2 text-zinc-900">{r.name || "—"}</td>
                            <td className="px-3 py-2 text-zinc-700">{r.position || "—"}</td>
                            <td className="px-3 py-2 text-zinc-700">{r.contact || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {paymentTerms && (
                <div className="mt-4">
                  <Field label="Payment Terms" value={PAYMENT_TERMS_LABELS[paymentTerms] ?? humanizeDisplayValue(paymentTerms)} />
                </div>
              )}
          </SectionCard>
        )}

        {/* ── Business Background ── */}
        {hasBackground && (
          <SectionCard>
              <SectionTitle icon={BookOpen} label="Business Background" />
              <div className="grid gap-5 sm:grid-cols-3 print:gap-3 mb-4">
                {businessLife && <Field label="Years in Business" value={businessLife} />}
                {howLongAtAddress && <Field label="Years at Address" value={howLongAtAddress} />}
                {numberOfBranches && <Field label="No. of Branches" value={numberOfBranches} />}
              </div>
              {onMetricSave && (
                <div className="mb-4">
                  <MetricPointPicker
                    metricKeys={["businessLife"]}
                    initialPoints={{ businessLife: metricPoints?.businessLife }}
                    onSave={onMetricSave}
                  />
                </div>
              )}
              {govCertifications && (
                <div className="mb-4">
                  <Field label="Government Certifications" value={govCertifications} />
                </div>
              )}
              {tradeRefRows.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Trade References</p>
                  <div className="overflow-x-auto rounded-lg border border-zinc-100 print:overflow-visible print:rounded-none print:border-zinc-200">
                    <table className="min-w-160 w-full text-sm print:min-w-0 print:text-[20px]">
                      <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Company</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Address</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Contact</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Years</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradeRefRows.map((r, i) => (
                          <tr key={i} className="border-b border-zinc-50 last:border-0">
                            <td className="px-3 py-2 text-zinc-900">{r.company || "—"}</td>
                            <td className="px-3 py-2 text-zinc-700">{r.address || "—"}</td>
                            <td className="px-3 py-2 text-zinc-700">{r.contact || "—"}</td>
                            <td className="px-3 py-2 text-zinc-700">{r.years || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {bankRefRows.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Bank References</p>
                  <div className="overflow-x-auto rounded-lg border border-zinc-100 print:overflow-visible print:rounded-none print:border-zinc-200">
                    <table className="min-w-140 w-full text-sm print:min-w-0 print:text-[20px]">
                      <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Bank</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Branch</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Account Type</th>
                          <th className="px-3 py-2 text-xs font-semibold text-zinc-500">Account No.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bankRefRows.map((r, i) => (
                          <tr key={i} className="border-b border-zinc-50 last:border-0">
                            <td className="px-3 py-2 text-zinc-900">{r.bank || "—"}</td>
                            <td className="px-3 py-2 text-zinc-700">{r.branch || "—"}</td>
                            <td className="px-3 py-2 text-zinc-700">{r.accountType || "—"}</td>
                            <td className="px-3 py-2 font-mono text-zinc-700">{r.accountNo || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2 print:gap-3">
                {achievements && <Field label="Awards / Achievements" value={achievements} />}
                {otherMerits && <Field label="Other Merits" value={otherMerits} />}
              </div>
          </SectionCard>
        )}

        {agentUpload && (
          <SectionCard className="print:hidden">
              <SectionTitle icon={Paperclip} label="Agent Document Upload" />
              <AgentDocSection cisId={agentUpload.cisId} initialDocs={allDocsByType} />
          </SectionCard>
        )}

        {/* ── Agent Information ── */}
        {hasAgentInfo && (
          <SectionCard>
            <SectionTitle icon={User} label="Agent Information" />
            <div className="grid gap-5 sm:grid-cols-2 print:gap-3">
              {(agentAccountSpecialistFirst || agentAccountSpecialistLast) && (
                <Field label="Account Specialist" value={[agentAccountSpecialistFirst, agentAccountSpecialistLast].filter(Boolean).join(" ")} icon={User} />
              )}
              {agentSalesSpecialist && <Field label="Sales Specialist" value={agentSalesSpecialist} icon={User} />}
              {agentSalesManager && <Field label="Sales Manager" value={agentSalesManager} icon={User} />}
              {(agentTpcFirst || agentTpcLast) && (
                <Field label="TPC" value={[agentTpcFirst, agentTpcLast].filter(Boolean).join(" ")} icon={User} />
              )}
            </div>
          </SectionCard>
        )}

        {/* ── Document Uploads ── */}
        {docEntries.length > 0 && (
          <SectionCard>
              <SectionTitle icon={Paperclip} label="Supporting Documents" className="print:hidden" />
              <div className="space-y-5 print:hidden">
                {docEntries.map((entry) => (
                  <div key={entry.label}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 print:mb-1.5">{entry.label}</p>
                    <div className="space-y-2 print:space-y-1.5">
                      {sortFilesByUploadedAtDesc(entry.files).map((f, index) => {
                        const isImage = isImageFile(f);
                        const isPdf = isPdfFile(f);
                        const isDocx = isDocxFile(f);
                        const needsExpiration = docTypeRequiresExpiration(entry.key);
                        const expirationStatus = needsExpiration ? getFileExpirationStatus(f) : null;
                        return (
                          <div
                            key={f.url}
                            className={`rounded-md border border-zinc-200 bg-zinc-50 p-3 print:border-zinc-200 print:bg-white print:p-2 ${index === 0 ? "" : "print:break-before-page print:pt-4"}`}
                          >
                            {isImage && (
                              <a href={f.url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                                <img
                                  src={f.url}
                                  alt={f.name}
                                  className="max-h-56 w-auto max-w-full rounded border border-zinc-200 object-contain print:max-h-64"
                                />
                              </a>
                            )}
                            {isPdf && (
                              <div className="mb-2">
                                <PdfPrintRenderer url={f.url} name={f.name} />
                              </div>
                            )}
                            {isDocx && (
                              <div className="mb-2">
                                <DocxRenderer url={f.url} name={f.name} />
                              </div>
                            )}
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-600 hover:underline print:text-zinc-700 print:no-underline"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                              <span className="flex-1 truncate">{f.name}</span>
                              <span className="shrink-0 text-[10px] text-zinc-400">{(f.size / 1024).toFixed(0)} KB</span>
                            </a>
                            <p className="mt-1 text-[10px] text-zinc-400">{formatUploadedAt(f.uploadedAt)}</p>
                            <p className="mt-0.5 text-[10px] text-zinc-400">{formatExpirationDate(f.expirationDate)}</p>
                            {needsExpiration && expirationStatus && (
                              <div className="mt-1">
                                <ExpirationStatusBadge status={expirationStatus} />
                              </div>
                            )}
                            {(() => {
                              const review = docReviewStatuses?.[entry.key as DocType];
                              return (
                                <>
                                  <div className="mt-2 rounded-md border border-zinc-200 bg-white px-2.5 py-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                                        Document Review
                                      </p>
                                      {review ? (
                                        <DocReviewBadge status={review.status} />
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 border border-zinc-200">
                                          Not reviewed
                                        </span>
                                      )}
                                    </div>
                                    {review?.reason && (
                                      <p className="mt-1 text-[11px] text-zinc-600">
                                        Reason: <span className="font-medium text-zinc-700">{review.reason}</span>
                                      </p>
                                    )}
                                    {onMetricSave && entry.key === "docFinancialStatement" && (
                                      <MetricPointPicker
                                        metricKeys={["annualSales", "netIncome"]}
                                        initialPoints={{
                                          annualSales: metricPoints?.annualSales,
                                          netIncome:   metricPoints?.netIncome,
                                        }}
                                        onSave={onMetricSave}
                                      />
                                    )}
                                    {onMetricSave && entry.key === "docBankStatement" && (
                                      <MetricPointPicker
                                        metricKeys={["bankBalance"]}
                                        initialPoints={{ bankBalance: metricPoints?.bankBalance }}
                                        onSave={onMetricSave}
                                      />
                                    )}
                                    {onDocReview && (
                                      <DocReviewActions
                                        docType={entry.key as DocType}
                                        currentStatus={review?.status}
                                        onReview={onDocReview}
                                      />
                                    )}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-0 overflow-hidden print:h-auto print:overflow-visible">
                {docEntries.map((entry, entryIndex) =>
                  sortFilesByUploadedAtDesc(entry.files).map((f, fileIndex) => {
                    const isImage = isImageFile(f);
                    const isPdf = isPdfFile(f);
                    const isDocx = isDocxFile(f);
                    const needsExpiration = docTypeRequiresExpiration(entry.key);
                    const expirationStatus = needsExpiration ? getFileExpirationStatus(f) : null;
                    const isFirst = entryIndex === 0 && fileIndex === 0;

                    return (
                      <div
                        key={`${entry.key}-${f.url}`}
                        className={`print:py-2 ${isFirst ? "" : "print:break-before-page"}`}
                        style={{ breakInside: "avoid-page", pageBreakInside: "avoid" }}
                        data-print-file-block
                      >
                        {isFirst && (
                          <div className="mb-2 print:break-after-avoid">
                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-700">
                              Supporting Documents
                            </p>
                          </div>
                        )}
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">{entry.label}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{f.name}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{formatUploadedAt(f.uploadedAt)}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{formatExpirationDate(f.expirationDate)}</p>
                        {needsExpiration && expirationStatus && (
                          <div className="mt-1">
                            <ExpirationStatusBadge status={expirationStatus} />
                          </div>
                        )}

                        {isImage && (
                          <div
                            className="mt-2 flex h-[160mm] items-center justify-center border border-zinc-300 p-3"
                            style={{ breakInside: "avoid-page", pageBreakInside: "avoid" }}
                            data-print-file-image-frame
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={f.url}
                              alt={f.name}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}

                        {isPdf && (
                          <PdfPrintRenderer url={f.url} name={f.name} />
                        )}
                        {isDocx && (
                          <DocxRenderer url={f.url} name={f.name} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
          </SectionCard>
        )}

        {/* ── Additional Notes ── */}
        {additionalNotes && (
          <SectionCard>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 print:text-zinc-600 print:border-b print:border-zinc-200 print:pb-1">
                <FileText className="h-3.5 w-3.5 print:hidden" />
                Additional Notes
              </p>
              <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap print:rounded-none print:bg-white print:px-0 print:py-2 print:text-[20px] print:border-l-2 print:border-zinc-300 print:pl-3">
                {additionalNotes}
              </p>
          </SectionCard>
        )}

        {/* ── Finance Evaluation ── */}
        {hasFinanceData && (
          <SectionCard>
              <SectionTitle icon={FileText} label="Finance Credit Evaluation" />
              {(financeEu || financeDl || financeDr) && (
                <div className="mb-5 grid gap-5 sm:grid-cols-3 print:gap-3">
                  {financeEu && <Field label="EU" value={financeEu} />}
                  {financeDl && <Field label="DL" value={financeDl} />}
                  {financeDr && <Field label="DR" value={financeDr} />}
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2 print:gap-3">
                <Field label="Credit Limit" value={financeCreditLimit} printBlank />
                <Field label="Credit Terms" value={financeCreditTerms ? (FINANCE_CREDIT_TERMS_LABELS[financeCreditTerms] ?? humanizeDisplayValue(financeCreditTerms)) : null} printBlank />
                <Field label="Price List / Terms & Schedule (PL/TS)" value={financePlTs} />
              </div>
              <div className={hidePointsPanel ? "hidden print:block" : ""}>
                <PointsBreakdownPanel
                  {...allDocsByType}
                  metricPoints={metricPoints}
                  financePossiblePoints={financePossiblePoints}
                  financeApprovedPoints={financeApprovedPoints}
                  docReviewStatuses={docReviewStatuses as Record<string, { status: string; reason?: string | null }> | null}
                  agentType={agentType}
                  customerType={customerType}
                  mode={pointsMode}
                />
              </div>
          </SectionCard>
        )}

        {/* ── Sales Support Evaluation ── */}
        {hasSalesSupportData && (
          <SectionCard>
            <SectionTitle icon={Users} label="Sales Support Evaluation" />
            <div className="grid gap-5 sm:grid-cols-2 print:gap-3">
              {salesSupportAccountType && <Field label="Account Type" value={salesSupportAccountType} />}
              {salesSupportPriceList1 && <Field label="Price List 1" value={salesSupportPriceList1} />}
              {salesSupportPriceList2 && <Field label="Price List 2" value={salesSupportPriceList2} />}
              {salesSupportSalesType && <Field label="Sales Type" value={salesSupportSalesType} />}
              {salesSupportVatCode && <Field label="VAT Code" value={salesSupportVatCode} />}
              {salesSupportOtherRemarks && <div className="sm:col-span-2"><Field label="Other Remarks" value={salesSupportOtherRemarks} /></div>}
            </div>
          </SectionCard>
        )}

        {/* ── Signatures ── */}
        {hasSignatures && (
          <SectionCard>
              <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 print:text-zinc-600 print:border-b print:border-zinc-200 print:pb-1 print:mb-3">
                <PenLine className="h-3.5 w-3.5 print:hidden" />
                Signatures
              </p>
              <div className="grid gap-8 sm:grid-cols-2 print:gap-6">
                {customerSignature && (
                  <SignatureBlock
                    label="Customer Signature"
                    dataUrl={customerSignature}
                    signedAt={customerSignedAt}
                    cisId={cisId}
                    seal={customerSignatureSeal}
                    hasSeal={!!customerSignatureSeal}
                  />
                )}
                {approverSignature && (
                  <SignatureBlock
                    label="Approver Signature"
                    dataUrl={approverSignature}
                    signedAt={approverSignedAt}
                    cisId={cisId}
                    seal={approverSignatureSeal}
                    hasSeal={!!approverSignatureSeal}
                  />
                )}
              </div>
              
          </SectionCard>
        )}

        {/* ── Physical Sign-off — shown only after finance review starts and before CFO doc is uploaded ── */}
        {showCfoSignatureBox && <SectionCard className="print:break-inside-avoid">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 print:text-zinc-700 print:border-b print:border-zinc-300 print:pb-1.5">
              <PenLine className="h-3.5 w-3.5 print:hidden" />
              Physical Signature
            </p>

            {/* Screen helper */}
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 print:hidden">
              <p className="text-sm text-zinc-700">
                For printed copies: have the Chief Finance Officer sign in the designated signature panel.
              </p>
              <div className="mt-12 flex items-end gap-8">
                <div className="w-48 border-b-2 border-zinc-400" />
                <div className="w-32 border-b-2 border-zinc-400" />
              </div>
              <div className="mt-1.5 flex gap-8 text-xs text-zinc-500">
                <span className="w-48">Signature over printed name — Chief Finance Officer</span>
                <span className="w-32">Date:</span>
              </div>
            </div>

            {/* Print layout */}
            <div className="hidden print:block print:rounded-none print:border print:border-zinc-500 print:bg-white print:px-3 print:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">
                Sign-off Required Before Final Approval
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-700">
                The Chief Finance Officer must physically sign this printed CIS.
              </p>

              <div className="mt-5 min-h-[26mm] flex items-end gap-8">
                <div className="w-48 border-b-2 border-zinc-700" />
                <div className="w-32 border-b-2 border-zinc-700" />
              </div>

              <div className="mt-1 flex gap-8 text-[10px] text-zinc-700">
                <div className="w-48">
                  <p className="font-semibold">Signature over printed name</p>
                  <p className="mt-0.5 italic text-zinc-500">Chief Finance Officer</p>
                </div>
                <div className="w-32">
                  <p className="font-semibold">Date signed</p>
                </div>
              </div>
            </div>
        </SectionCard>}

        {/* Screen footer */}
        <div className="print:hidden">

          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-y-2 mt-6">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-400 sm:gap-x-8">
            <span>
              Submitted{" "}
              <span className="font-medium text-zinc-600">
                {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </span>
            <span>
              Last updated{" "}
              <span className="font-medium text-zinc-600">
                {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </span>
          </div>
          {!hidePrintButton && <PrintButton disabled={!canPrint} disabledReason={printDisabledReason} />}
          </div>

        </div>

        {/* Print footer */}
        <div className="hidden print:block border-t-2 border-zinc-900 pt-3 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-[9px] uppercase tracking-widest text-zinc-400">Oracle Petroleum Corporation — Confidential</p>
            <p className="text-[9px] text-zinc-400 font-mono">{cisId}</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
