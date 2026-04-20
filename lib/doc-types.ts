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

export function hasAtLeastOneValidFile(files: FileEntry[]) {
  return files.some((file) => getFileExpirationStatus(file) === "valid");
}

export function getExpirationRequirementErrorMessage(docType: DocType) {
  if (docType === "docMayorsPermit") {
    return "A valid, non-expired business permit is required. Please upload the latest permit.";
  }
  return "A valid, non-expired document is required.";
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
  docCertifications: "docCertifications",
  docGovCertifications: "docGovCertifications",
  docOther: "docOther",
  docAgentOtherRequirements: "docAgentOtherRequirements",
  docSirRestySigned: "docSirRestySigned",
  docSalesSupportOther: "docSalesSupportOther",
};

export const DOC_SLOTS: Array<{ key: DocType; label: string }> = [
  { key: "docValidId", label: "Valid Government ID" },
  { key: "docMayorsPermit", label: "Mayor or Barangay Permit" },
  { key: "docSecDti", label: "SEC / DTI Registration Certificate" },
  { key: "docBirCertificate", label: "BIR Registration Certificate" },
  { key: "docLocationMap", label: "Location Map / Vicinity Map" },
  { key: "docFinancialStatement", label: "Financial Statement / ITR" },
  { key: "docBankStatement", label: "3-Month Bank Statement / Bank Authorization Letter" },
  { key: "docProofOfBilling", label: "Proof of Billing" },
  { key: "docLeaseContract", label: "Lease Contract / Title (if applicable)" },
  { key: "docProofOfOwnership", label: "Proof of Ownership (if applicable)" },
  { key: "docStorePhoto", label: "Photo of Plant / Office / Store with Signage" },
  { key: "docSupplierInvoice", label: "Supplier Invoice (latest)" },
  { key: "docSocialMedia", label: "Social Media / Website Screenshot" },
  { key: "docCertifications", label: "Certifications (ISO / Halal Certificate)" },
  { key: "docGovCertifications", label: "Government and Other Certifications" },
  { key: "docOther", label: "Other Supporting Documents" },
  { key: "docAgentOtherRequirements", label: "Other Requirements (Agent)" },
  { key: "docSirRestySigned", label: "Approved CIS (Signed by Sir Resty)" },
  { key: "docSalesSupportOther", label: "Other Documents for New Pricelist" },
];

export const DOC_LABELS: Record<DocType, string> = Object.fromEntries(
  DOC_SLOTS.map((slot) => [slot.key, slot.label])
) as Record<DocType, string>;
