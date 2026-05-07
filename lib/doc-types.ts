export const DOC_TYPES = [
  "docValidId",
  "docMayorsPermit",
  "docSecDti",
  "docBirCertificate",
  "docLocationMap",
  "docFinancialStatement",
  "docBankStatement",
  "docProofOfBilling",
  "docLeaseContract",
  "docProofOfOwnership",
  "docStorePhoto",
  "docSupplierInvoice",
  "docSocialMedia",
  "docCompanyWebsite",
  "docIsoCertification",
  "docHalalCertificate",
  "docCertifications",
  "docGovCertifications",
  "docOther",
  // Agent fill-out
  "docAgentOtherRequirements",
  // Staff fill-out
  "docSirRestySigned",
  "docSalesSupportOther",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export type FileEntry = {
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt?: string;
  expirationDate?: string;
};

export type DocExpirationStatus = "valid" | "expired" | "unknown";

export function sortFilesByUploadedAtDesc(files: FileEntry[]) {
  return [...files].sort((a, b) => {
    const aTime = a.uploadedAt ? Date.parse(a.uploadedAt) : 0;
    const bTime = b.uploadedAt ? Date.parse(b.uploadedAt) : 0;
    return bTime - aTime;
  });
}

// No documents require expiration tracking in the new workflow.
export const DOC_TYPES_REQUIRING_EXPIRATION: DocType[] = [];

export function docTypeRequiresExpiration(docType: DocType) {
  return DOC_TYPES_REQUIRING_EXPIRATION.includes(docType);
}

export function normalizeExpirationDate(raw: string) {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const asDate = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(asDate.getTime())) return null;
  return trimmed;
}

export function getFileExpirationStatus(file: FileEntry, now = new Date()) : DocExpirationStatus {
  if (!file.expirationDate) return "unknown";
  const normalized = normalizeExpirationDate(file.expirationDate);
  if (!normalized) return "unknown";

  const expiresAt = new Date(`${normalized}T23:59:59.999Z`);
  return expiresAt.getTime() < now.getTime() ? "expired" : "valid";
}

export const DOC_COLUMN_MAP: Record<DocType, DocType> = {
  docValidId: "docValidId",
  docMayorsPermit: "docMayorsPermit",
  docSecDti: "docSecDti",
  docBirCertificate: "docBirCertificate",
  docLocationMap: "docLocationMap",
  docFinancialStatement: "docFinancialStatement",
  docBankStatement: "docBankStatement",
  docProofOfBilling: "docProofOfBilling",
  docLeaseContract: "docLeaseContract",
  docProofOfOwnership: "docProofOfOwnership",
  docStorePhoto: "docStorePhoto",
  docSupplierInvoice: "docSupplierInvoice",
  docSocialMedia: "docSocialMedia",
  docCompanyWebsite: "docCompanyWebsite",
  docIsoCertification: "docIsoCertification",
  docHalalCertificate: "docHalalCertificate",
  docCertifications: "docCertifications",
  docGovCertifications: "docGovCertifications",
  docOther: "docOther",
  docAgentOtherRequirements: "docAgentOtherRequirements",
  docSirRestySigned: "docSirRestySigned",
  docSalesSupportOther: "docSalesSupportOther",
};

export const DOC_SLOTS: Array<{ key: DocType; label: string }> = [
  { key: "docValidId",            label: "Owner's Valid ID" },
  { key: "docMayorsPermit",       label: "Mayor or Barangay Permit" },
  { key: "docSecDti",             label: "SEC / DTI Registration" },
  { key: "docBirCertificate",     label: "BIR Certificate of Registration" },
  { key: "docLocationMap",        label: "Location Map" },
  { key: "docFinancialStatement", label: "Audited Financial Statements / Latest Annual ITR" },
  { key: "docBankStatement",      label: "3-Month Bank Statement / Bank Authorization Letter" },
  { key: "docProofOfBilling",     label: "Proof of Billing Address" },
  { key: "docLeaseContract",      label: "Lease Contract" },
  { key: "docProofOfOwnership",   label: "Proof of Ownership of Property (Office or Store Location)" },
  { key: "docStorePhoto",         label: "Photo of Plant / Office / Store with Signage" },
  { key: "docSupplierInvoice",    label: "Reference Supplier Invoice" },
  { key: "docSocialMedia",        label: "Screenshot of Social Media Account" },
  { key: "docCompanyWebsite",     label: "Screenshot of Company Website" },
  { key: "docIsoCertification",   label: "ISO Certification" },
  { key: "docHalalCertificate",   label: "Halal Certificate" },
  { key: "docCertifications",     label: "Other Certifications" },
  { key: "docGovCertifications",  label: "Government and Other Certifications" },
  { key: "docOther",              label: "Other Supporting Documents" },
  { key: "docAgentOtherRequirements", label: "Other Requirements (Agent)" },
  { key: "docSirRestySigned",     label: "CIS Signed by Chief Finance Officer" },
  { key: "docSalesSupportOther",  label: "Other Documents for New Pricelist" },
];

export const DOC_LABELS: Record<DocType, string> = Object.fromEntries(
  DOC_SLOTS.map((slot) => [slot.key, slot.label])
) as Record<DocType, string>;

/**
 * The upload slots shown to customers and agents.
 * Matches the CRS Pointing System document list exactly.
 * Staff-only and non-scoring misc slots are excluded.
 */
export const SCORING_DOC_KEYS: DocType[] = [
  "docMayorsPermit",
  "docSecDti",
  "docBirCertificate",
  "docValidId",
  "docLocationMap",
  "docFinancialStatement",
  "docBankStatement",
  "docProofOfBilling",
  "docLeaseContract",
  "docProofOfOwnership",
  "docStorePhoto",
  "docSupplierInvoice",
  "docSocialMedia",
  "docCompanyWebsite",
  "docIsoCertification",
  "docHalalCertificate",
];

export const SCORING_DOC_SLOTS = DOC_SLOTS.filter((s) =>
  (SCORING_DOC_KEYS as string[]).includes(s.key)
);

export type DocReviewStatus = "approved" | "needs_review" | "rejected";
export type DocReviewStatuses = Partial<Record<DocType, { status: DocReviewStatus; reason?: string | null; rejectedAt?: string | null }>>;

export const DENIAL_REASON_CODES = [
  "Poor photo quality",
  "Mismatched owner on documents",
  "Insufficient funds on bank statement",
  "Expired document",
  "Incomplete document",
  "Document not readable",
  "Wrong document submitted",
] as const;
