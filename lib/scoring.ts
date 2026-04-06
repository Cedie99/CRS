export type CisForScoring = {
  // Core documents
  docFinancialStatement: unknown;
  docBankStatement: unknown;
  docSecDti: unknown;
  docBirCertificate: unknown;
  docMayorsPermit: unknown;
  docValidId: unknown;
  docProofOfBilling: unknown;
  docProofOfOwnership: unknown;
  docLocationMap: unknown;
  docStorePhoto: unknown;
  // Bonus documents
  docLeaseContract: unknown;
  docCertifications: unknown;
  docSupplierInvoice: unknown;
  docGovCertifications: unknown;
  docSocialMedia: unknown;
  docOther: unknown;
  // Form sections
  bankReferences: unknown;
  tradeReferences: unknown;
  owners: unknown;
  officers: unknown;
  tinNumber?: string | null;
  businessLife?: string | null;
};

function hasEntries(field: unknown): boolean {
  return Array.isArray(field) && field.length > 0;
}

/**
 * Auto-calculates Possible Points from CIS form completeness.
 *
 * Core (100 pts max):
 *   Documents — 70 pts
 *     Financial Statement  15
 *     Bank Statement       15
 *     SEC / DTI             8
 *     BIR Certificate       8
 *     Mayor's Permit        8
 *     Valid ID              5
 *     Proof of Billing      4
 *     Proof of Ownership    3
 *     Location Map          2
 *     Store Photo           2
 *   Form sections — 30 pts
 *     Bank References      10
 *     Trade References     10
 *     Owners / Officers     5
 *     TIN Number            3
 *     Years in Business     2
 *
 * Bonus (up to +12 pts):
 *   Lease Contract          3
 *   Certifications          3
 *   Supplier Invoice        2
 *   Gov Certifications      2
 *   Social Media            1
 *   Other                   1
 *
 * Maximum achievable: 112 pts
 */
export function computePossiblePoints(cis: CisForScoring): number {
  let pts = 0;

  // ── Core documents (70 pts) ──
  if (hasEntries(cis.docFinancialStatement)) pts += 15;
  if (hasEntries(cis.docBankStatement))      pts += 15;
  if (hasEntries(cis.docSecDti))             pts += 8;
  if (hasEntries(cis.docBirCertificate))     pts += 8;
  if (hasEntries(cis.docMayorsPermit))       pts += 8;
  if (hasEntries(cis.docValidId))            pts += 5;
  if (hasEntries(cis.docProofOfBilling))     pts += 4;
  if (hasEntries(cis.docProofOfOwnership))   pts += 3;
  if (hasEntries(cis.docLocationMap))        pts += 2;
  if (hasEntries(cis.docStorePhoto))         pts += 2;

  // ── Form completeness (30 pts) ──
  if (hasEntries(cis.bankReferences))                              pts += 10;
  if (hasEntries(cis.tradeReferences))                             pts += 10;
  if (hasEntries(cis.owners) || hasEntries(cis.officers))          pts += 5;
  if (cis.tinNumber?.trim())                                       pts += 3;
  if (cis.businessLife?.trim())                                    pts += 2;

  // ── Bonus documents (up to +12 pts) ──
  if (hasEntries(cis.docLeaseContract))     pts += 3;
  if (hasEntries(cis.docCertifications))    pts += 3;
  if (hasEntries(cis.docSupplierInvoice))   pts += 2;
  if (hasEntries(cis.docGovCertifications)) pts += 2;
  if (hasEntries(cis.docSocialMedia))       pts += 1;
  if (hasEntries(cis.docOther))             pts += 1;

  return pts;
}
