import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type CisStatus } from "@/components/status-badge";
import { verifySeal, displayFingerprint } from "@/lib/signature-integrity";
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
  Landmark,
  Paperclip,
} from "lucide-react";
import { PrintButton } from "@/components/print-button";

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  fs_petroleum: "FS Petroleum",
  special: "Special",
};

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  standard: "bg-zinc-100 text-zinc-600",
  fs_petroleum: "bg-purple-50 text-purple-700 border border-purple-100",
  special: "bg-amber-50 text-amber-700 border border-amber-100",
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

const DOC_LABELS: Record<string, string> = {
  docValidId: "Valid Government ID",
  docMayorsPermit: "Mayor or Barangay Permit",
  docSecDti: "SEC / DTI Registration",
  docBirCertificate: "BIR Certificate",
  docLocationMap: "Location Map",
  docFinancialStatement: "Financial Statement / ITR",
  docBankStatement: "3-Month Bank Statement / Bank Authorization Letter",
  docProofOfBilling: "Proof of Billing",
  docLeaseContract: "Lease Contract",
  docProofOfOwnership: "Proof of Ownership",
  docStorePhoto: "Photo of Plant / Office / Store with Signage",
  docSupplierInvoice: "Supplier Invoice",
  docSocialMedia: "Social Media",
  docCertifications: "Certifications (ISO / Halal Certificate)",
  docGovCertifications: "Government and Other Certifications",
  docOther: "Other Documents",
};

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  cod:       "COD (Cash on Delivery)",
  credit_30: "Credit – 30 days",
  credit_60: "Credit – 60 days",
  credit_90: "Credit – 90 days",
};

type FileEntry = { name: string; url: string; size: number; type: string };
type OwnerRow = { name: string; nationality: string; percentage: string; contact: string };
type OfficerRow = { name: string; position: string; contact: string };
type TradeRefRow = { company: string; address: string; contact: string; years: string };
type BankRefRow = { bank: string; branch: string; accountType: string; accountNo: string };

function isImageFile(file: FileEntry) {
  if (file.type?.toLowerCase().startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.url);
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
  customerType: string;
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
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {Icon && <Icon className="h-3 w-3 print:hidden" />}
        {label}
      </p>
      <p className={`text-sm text-zinc-900 print:text-xs ${mono ? "font-mono" : ""}`}>
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
    <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 print:text-zinc-600 print:border-b print:border-zinc-200 print:pb-1">
      <Icon className="h-3.5 w-3.5 print:hidden" />
      {label}
    </p>
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
        <div className="flex items-center justify-between mb-2">
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
          <img src={dataUrl} alt={label} className="h-24 w-auto max-w-xs object-contain" />
        </div>
        <p className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 mt-1">
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
    : (LINE_OF_BUSINESS_LABELS[lineOfBusiness ?? ""] ?? lineOfBusiness);

  const activityLabel = businessActivity === "other"
    ? businessActivityOther
    : (BUSINESS_ACTIVITY_LABELS[businessActivity ?? ""] ?? businessActivity);

  const ownerRows = (owners as OwnerRow[] | null) ?? [];
  const officerRows = (officers as OfficerRow[] | null) ?? [];
  const tradeRefRows = (tradeReferences as TradeRefRow[] | null) ?? [];
  const bankRefRows = (bankReferences as BankRefRow[] | null) ?? [];

  // Collect all uploaded docs
  const docEntries: { label: string; files: FileEntry[] }[] = (
    [
      "docValidId", "docMayorsPermit", "docSecDti", "docBirCertificate",
      "docLocationMap", "docFinancialStatement", "docBankStatement",
      "docProofOfBilling", "docLeaseContract", "docProofOfOwnership",
      "docStorePhoto", "docSupplierInvoice", "docSocialMedia",
      "docCertifications", "docGovCertifications", "docOther",
    ] as const
  )
    .map((key) => ({
      label: DOC_LABELS[key],
      files: (props[key as keyof CisInfoCardProps] as FileEntry[] | null) ?? [],
    }))
    .filter((e) => e.files.length > 0);

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
              <span>Status: <strong className="text-zinc-900">{STATUS_LABELS[status] ?? status}</strong></span>
              <span>Type: <strong className="text-zinc-900">{CUSTOMER_TYPE_LABELS[customerType] ?? customerType}</strong></span>
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
          <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end">
            <PrintButton />
            <StatusBadge status={status} />
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${CUSTOMER_TYPE_COLORS[customerType] ?? "bg-zinc-100 text-zinc-600"}`}>
              <Building2 className="h-3 w-3" />
              {CUSTOMER_TYPE_LABELS[customerType] ?? customerType}
            </span>
          </div>
        </div>
      </div>

      <CardContent className="space-y-6 p-4 sm:p-6 print:px-0 print:pt-4">

        <div className="hidden print:block mb-2">
          <p className="text-sm font-bold text-zinc-900">
            {tradeName ?? <span className="italic text-zinc-400">Untitled</span>}
          </p>
        </div>

        {/* ── Business Information ── */}
        <div>
          <SectionTitle icon={Briefcase} label="Business Information" />
          <div className="grid gap-5 sm:grid-cols-2 print:gap-3">
            {corporateName && <div className="sm:col-span-2"><Field label="Registered Corporate Name" value={corporateName} icon={Building2} /></div>}
            <Field label="Trade / Business Name" value={tradeName} icon={Briefcase} />
            {dateOfBusinessReg && <Field label="Date of Registration" value={dateOfBusinessReg} />}
            {numberOfEmployees && <Field label="No. of Employees" value={numberOfEmployees} icon={Users} />}
          </div>
        </div>

        <Separator />

        {/* ── Contact Details ── */}
        <div>
          <SectionTitle icon={User} label="Contact Details" />
          <div className="grid gap-5 sm:grid-cols-2 print:gap-3">
            <Field label="Contact Person" value={contactPerson} icon={User} />
            <Field label="Email Address" value={emailAddress} icon={Mail} />
            <Field label="Mobile Number" value={contactNumber} icon={Phone} />
            {telephoneNumber && <Field label="Telephone" value={telephoneNumber} icon={Phone} />}
            {website && <Field label="Website" value={website} icon={LinkIcon} />}
          </div>
        </div>

        <Separator />

        {/* ── Office Address ── */}
        <div>
          <SectionTitle icon={MapPin} label="Office Address" />
          <div className="grid gap-5 sm:grid-cols-2 print:gap-3">
            <div className="sm:col-span-2">
              <Field label="Street Address" value={businessAddress} icon={MapPin} />
            </div>
            <Field label="City / Municipality" value={cityMunicipality} icon={MapPin} />
            {landmarks && <Field label="Landmarks" value={landmarks} />}
          </div>
        </div>

        {/* ── Delivery Address ── */}
        {hasDelivery && (
          <>
            <Separator />
            <div>
              <SectionTitle icon={MapPin} label="Delivery Address" />
              <div className="grid gap-5 sm:grid-cols-2 print:gap-3">
                {deliveryAddress && <div className="sm:col-span-2"><Field label="Delivery Address" value={deliveryAddress} icon={MapPin} /></div>}
                {deliveryLandmarks && <div className="sm:col-span-2"><Field label="Delivery Landmarks" value={deliveryLandmarks} /></div>}
                {deliveryMobile && <Field label="Delivery Mobile" value={deliveryMobile} icon={Phone} />}
                {deliveryTelephone && <Field label="Delivery Telephone" value={deliveryTelephone} icon={Phone} />}
              </div>
            </div>
          </>
        )}

        {/* ── Business Classification ── */}
        {hasClassification && (
          <>
            <Separator />
            <div>
              <SectionTitle icon={Briefcase} label="Business Classification" />
              <div className="grid gap-5 sm:grid-cols-2 print:gap-3">
                {lobLabel && <Field label="Line of Business" value={lobLabel} />}
                {activityLabel && <Field label="Business Activity" value={activityLabel} />}
                <Field label="Business Type" value={businessType ? (BUSINESS_TYPE_LABELS[businessType] ?? businessType) : null} icon={Building2} />
                <Field label="TIN Number" value={tinNumber} icon={Hash} mono />
              </div>
            </div>
          </>
        )}

        {/* If no classification section shown, still show type + TIN */}
        {!hasClassification && (
          <>
            <Separator />
            <div className="grid gap-5 sm:grid-cols-2 print:gap-3">
              <Field label="Business Type" value={businessType ? (BUSINESS_TYPE_LABELS[businessType] ?? businessType) : null} icon={Building2} />
              <Field label="TIN Number" value={tinNumber} icon={Hash} mono />
            </div>
          </>
        )}

        {/* ── Ownership ── */}
        {hasOwnership && (
          <>
            <Separator />
            <div>
              <SectionTitle icon={Users} label="Ownership & Officers" />
              {ownerRows.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Owners / Partners</p>
                  <div className="overflow-x-auto rounded-lg border border-zinc-100">
                    <table className="w-full text-sm">
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
                  <div className="overflow-x-auto rounded-lg border border-zinc-100">
                    <table className="w-full text-sm">
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
                  <Field label="Payment Terms" value={PAYMENT_TERMS_LABELS[paymentTerms] ?? paymentTerms} />
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Business Background ── */}
        {hasBackground && (
          <>
            <Separator />
            <div>
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
                  <div className="overflow-x-auto rounded-lg border border-zinc-100">
                    <table className="w-full text-sm">
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
                  <div className="overflow-x-auto rounded-lg border border-zinc-100">
                    <table className="w-full text-sm">
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
            </div>
          </>
        )}

        {/* ── Document Uploads ── */}
        {docEntries.length > 0 && (
          <>
            <Separator />
            <div>
              <SectionTitle icon={Paperclip} label="Supporting Documents" />
              <div className="space-y-3">
                {docEntries.map((entry) => (
                  <div key={entry.label}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{entry.label}</p>
                    <div className="space-y-1">
                      {entry.files.map((f) => {
                        const isImage = isImageFile(f);
                        return (
                          <div
                            key={f.url}
                            className="rounded-md border border-zinc-100 bg-zinc-50 p-2 print:border-zinc-200 print:bg-white"
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
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Additional Notes ── */}
        {additionalNotes && (
          <>
            <Separator />
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 print:text-zinc-600 print:border-b print:border-zinc-200 print:pb-1">
                <FileText className="h-3.5 w-3.5 print:hidden" />
                Additional Notes
              </p>
              <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap print:rounded-none print:bg-white print:px-0 print:py-2 print:text-xs print:border-l-2 print:border-zinc-300 print:pl-3">
                {additionalNotes}
              </p>
            </div>
          </>
        )}

        {/* ── Signatures ── */}
        {hasSignatures && (
          <>
            <Separator className="print:border-zinc-300" />
            <div>
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
            </div>
          </>
        )}

        {/* Screen footer */}
        <div className="print:hidden">
          <Separator />
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-400 sm:gap-x-8 mt-6">
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
