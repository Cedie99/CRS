import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type CisStatus } from "@/components/status-badge";
import { verifySeal, displayFingerprint } from "@/lib/signature-integrity";
import { AgentDocSection } from "@/components/agent-doc-section";
import {
  DOC_LABELS,
  DOC_SLOTS,
  docTypeRequiresExpiration,
  getFileExpirationStatus,
  sortFilesByUploadedAtDesc,
  type DocType,
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
} from "lucide-react";
import { PrintButton } from "@/components/print-button";
import { PdfPrintRenderer } from "@/components/pdf-print-renderer";
import { DocxRenderer } from "@/components/docx-renderer";
import { humanizeDisplayValue } from "@/lib/utils";

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
  docCertifications?: unknown;
  docGovCertifications?: unknown;
  docSirRestySigned?: unknown;
  docOther?: unknown;
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
  financeCreditLimit?: string | null;
  financeCreditTerms?: string | null;
  // Sales support
  salesSupportAccountType?: string | null;
  salesSupportPriceList1?: string | null;
  salesSupportPriceList2?: string | null;
  salesSupportSalesType?: string | null;
  salesSupportVatCode?: string | null;
  salesSupportOtherRemarks?: string | null;
}

function Field({
  label,
  value,
  icon: Icon,
  mono,
}: {
  label: string;
  value?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/60 p-3 print:rounded-none print:border-0 print:bg-white print:p-0 print:pb-2">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 print:text-zinc-500">
        {Icon && <Icon className="h-3 w-3 print:hidden" />}
        {label}
      </p>
      <p className={`mt-1 min-w-0 wrap-break-word text-sm leading-relaxed text-zinc-900 print:mt-0.5 print:text-[11px] print:leading-snug ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-zinc-300 print:text-zinc-400">—</span>}
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b border-zinc-200 pb-2.5 print:mb-3 print:border-zinc-300 print:pb-1.5">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 print:hidden">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-600 print:text-zinc-700">
        {label}
      </p>
    </div>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`scroll-mt-22 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-6 print:mb-0 print:break-inside-avoid print:rounded-none print:border-0 print:border-t print:border-zinc-300 print:bg-white print:px-0 print:pt-3 print:pb-2 print:shadow-none ${className}`}
    >
      {children}
    </section>
  );
}

function SignatureBlock({
  label,
  dataUrl,
  signedAt,
  verified,
  hasSeal,
}: {
  label: string;
  dataUrl: string;
  signedAt?: Date | null;
  verified: boolean;
  hasSeal: boolean;
}) {
  const fp = displayFingerprint(dataUrl);

  return (
    <div className="space-y-2">
      <div className="print:hidden">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
          {hasSeal && (
            verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
                <ShieldAlert className="h-3 w-3" />
                Seal mismatch
              </span>
            )
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
          {hasSeal && (
            <p className="text-[9px] text-zinc-500 mt-0.5">
              {verified ? "✓ Digitally verified" : "⚠ Seal mismatch"}
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
  } = props;

  const hasSignatures = customerSignature || approverSignature;

  const customerVerified =
    customerSignature && customerSignedAt && customerSignatureSeal
      ? verifySeal(cisId, customerSignedAt, customerSignature, customerSignatureSeal)
      : false;

  const approverVerified =
    approverSignature && approverSignedAt && approverSignatureSeal
      ? verifySeal(cisId, approverSignedAt, approverSignature, approverSignatureSeal)
      : false;

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

  const hasAgentInfo = agentAccountSpecialistFirst || agentAccountSpecialistLast || agentSalesSpecialist || agentSalesManager || agentTpcFirst || agentTpcLast;
  const hasFinanceData = financeEu || financeDl || financeDr || financePlTs || financePossiblePoints != null || financeApprovedPoints != null || financeCreditLimit || financeCreditTerms;
  const hasSalesSupportData = salesSupportAccountType || salesSupportPriceList1 || salesSupportPriceList2 || salesSupportSalesType || salesSupportVatCode || salesSupportOtherRemarks;

  const hasDelivery = !deliverySameAsOffice && (deliveryAddress || deliveryMobile || deliveryTelephone);
  const hasClassification = lineOfBusiness || businessActivity;
  const hasOwnership = ownerRows.length > 0 || officerRows.length > 0 || !!paymentTerms;
  const hasBackground = businessLife || howLongAtAddress || numberOfBranches || govCertifications
    || tradeRefRows.length > 0 || bankRefRows.length > 0 || achievements || otherMerits;

  return (
    <Card className="overflow-hidden print:border-0 print:shadow-none">

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
            <PrintButton />
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:gap-2">
            {corporateName && <div className="sm:col-span-2 lg:col-span-3"><Field label="Registered Corporate Name" value={corporateName} icon={Building2} /></div>}
            <Field label="Trade / Business Name" value={tradeName} icon={Briefcase} />
            {dateOfBusinessReg && <Field label="Date of Registration" value={dateOfBusinessReg} />}
            {numberOfEmployees && <Field label="No. of Employees" value={numberOfEmployees} icon={Users} />}
          </div>
        </SectionCard>

        {/* ── Contact Details ── */}
        <SectionCard>
          <SectionTitle icon={User} label="Contact Details" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:gap-2">
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:gap-2">
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:gap-2">
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
                    <table className="min-w-140 w-full text-sm print:min-w-0 print:text-xs">
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
                    <table className="min-w-120 w-full text-sm print:min-w-0 print:text-xs">
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
              {govCertifications && (
                <div className="mb-4">
                  <Field label="Government Certifications" value={govCertifications} />
                </div>
              )}
              {tradeRefRows.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Trade References</p>
                  <div className="overflow-x-auto rounded-lg border border-zinc-100 print:overflow-visible print:rounded-none print:border-zinc-200">
                    <table className="min-w-160 w-full text-sm print:min-w-0 print:text-xs">
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
                    <table className="min-w-140 w-full text-sm print:min-w-0 print:text-xs">
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
              <SectionTitle icon={Paperclip} label="Supporting Documents" />
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-0 overflow-hidden print:h-auto print:overflow-visible">
                {docEntries.map((entry) =>
                  sortFilesByUploadedAtDesc(entry.files).map((f) => {
                    const isImage = isImageFile(f);
                    const isPdf = isPdfFile(f);
                    const isDocx = isDocxFile(f);
                    const needsExpiration = docTypeRequiresExpiration(entry.key);
                    const expirationStatus = needsExpiration ? getFileExpirationStatus(f) : null;

                    return (
                      <div key={`${entry.key}-${f.url}`} className="print:break-before-page print:min-h-[240mm] print:py-2">
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
                          <div className="mt-2 border border-zinc-300 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={f.url}
                              alt={f.name}
                              className="max-h-205 w-full object-contain"
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
              <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap print:rounded-none print:bg-white print:px-0 print:py-2 print:text-xs print:border-l-2 print:border-zinc-300 print:pl-3">
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
                <Field label="Credit Limit" value={financeCreditLimit} />
                <Field label="Credit Terms" value={financeCreditTerms ? (FINANCE_CREDIT_TERMS_LABELS[financeCreditTerms] ?? humanizeDisplayValue(financeCreditTerms)) : null} />
                <Field label="Price List / Terms & Schedule (PL/TS)" value={financePlTs} />
              </div>
              {(financePossiblePoints != null || financeApprovedPoints != null) && (
                <div className="mt-5 grid gap-5 sm:grid-cols-3 print:gap-3">
                  <Field label="Possible Points" value={financePossiblePoints != null ? String(financePossiblePoints) : null} />
                  <Field label="Approved Points" value={financeApprovedPoints != null ? String(financeApprovedPoints) : null} />
                  <Field label="Credit Decision" value={financeApprovedPoints != null && financePossiblePoints != null ? `${financeApprovedPoints}/${financePossiblePoints}` : null} />
                </div>
              )}
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
                    verified={customerVerified}
                    hasSeal={!!customerSignatureSeal}
                  />
                )}
                {approverSignature && (
                  <SignatureBlock
                    label="Approver Signature"
                    dataUrl={approverSignature}
                    signedAt={approverSignedAt}
                    verified={approverVerified}
                    hasSeal={!!approverSignatureSeal}
                  />
                )}
              </div>
              
          </SectionCard>
        )}

        {/* ── Physical Sign-off (Sir Resty) ── */}
        <SectionCard className="print:break-inside-avoid">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 print:text-zinc-700 print:border-b print:border-zinc-300 print:pb-1.5">
              <PenLine className="h-3.5 w-3.5 print:hidden" />
              Senior Approver Physical Signature (Sir Resty)
            </p>

            {/* Screen helper */}
            <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 print:hidden">
              <p className="text-sm text-zinc-700">
                For printed copies: have Sir Resty sign in the designated signature panel.
              </p>
              <div className="mt-6 border-b-2 border-zinc-400" />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>Signature over printed name: Sir Resty</span>
                <span>Date: ____________________</span>
              </div>
            </div>

            {/* Print layout */}
            <div className="hidden print:block print:rounded-none print:border print:border-zinc-500 print:bg-white print:px-3 print:py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-700">
                Sign-off Required Before Final Approval
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-zinc-700">
                The Senior Approver must physically sign this printed CIS.
              </p>

              <div className="mt-5 min-h-[26mm] border-b-2 border-zinc-700" />

              <div className="mt-1 grid grid-cols-2 gap-3 text-[10px] text-zinc-700">
                <div>
                  <p className="font-semibold">Signature over printed name</p>
                  <p className="mt-0.5">Sir Resty</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Date signed</p>
                  <p className="mt-0.5">____________________</p>
                </div>
              </div>
            </div>
        </SectionCard>

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
          <PrintButton />
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
