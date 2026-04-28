export type CisForScoring = {
  // Document uploads (each is an array of FileEntry)
  docMayorsPermit: unknown;
  docSecDti: unknown;
  docBirCertificate: unknown;
  docValidId: unknown;
  docLocationMap: unknown;
  docFinancialStatement: unknown;
  docBankStatement: unknown;
  docProofOfBilling: unknown;
  docLeaseContract: unknown;
  docProofOfOwnership: unknown;
  docStorePhoto: unknown;
  docSupplierInvoice: unknown;
  docSocialMedia: unknown;
  docCertifications: unknown;  // ISO (5pts) or Halal (1pt) — scored as present=2pts until cert type is tracked
  docGovCertifications: unknown;
  docOther: unknown;
  // Tiered inputs — not yet collected in DB, pass null/undefined to score as 0
  annualSalesAmount?: number | null;
  netIncomeAmount?: number | null;
  bankBalanceAmount?: number | null;
  businessLifeYears?: number | null;
};

function hasEntries(field: unknown): boolean {
  return Array.isArray(field) && field.length > 0;
}

// ── Tiered scoring functions ──────────────────────────────────────────────────

/**
 * Sales amount tiers (max 5pts)
 * Note: business spec has overlapping labels for the 1pt tier — treated as 5M001–10M=2pts,
 * 1pt bracket reserved for future clarification.
 */
export function scoreSalesAmount(amount: number | null | undefined): number {
  if (!amount || amount <= 0) return 0;
  if (amount <= 5_000_000) return 0;
  if (amount <= 10_000_000) return 2;
  if (amount <= 50_000_000) return 3;
  if (amount <= 100_000_000) return 4;
  return 5;
}

/**
 * Net income tiers (max 5pts)
 */
export function scoreNetIncome(amount: number | null | undefined): number {
  if (!amount || amount <= 0) return 0;
  if (amount <= 250_000) return 0;
  if (amount <= 1_000_000) return 1;
  if (amount <= 5_000_000) return 2;
  if (amount <= 15_000_000) return 3;
  if (amount <= 30_000_000) return 4;
  return 5;
}

/**
 * Bank statement / bank authorization average balance tiers (max 5pts)
 * Digit-based: ≤5 digits=0, low 6 digits (100k–399k)=1, mid 6 (400k–699k)=2,
 * high 6 (700k–999k)=3, 7 digits (1M–9.9M)=4, ≥8 digits (10M+)=5
 */
export function scoreBankBalance(amount: number | null | undefined): number {
  if (!amount || amount <= 0) return 0;
  if (amount <= 99_999) return 0;
  if (amount <= 399_999) return 1;
  if (amount <= 699_999) return 2;
  if (amount <= 999_999) return 3;
  if (amount <= 9_999_999) return 4;
  return 5;
}

/**
 * Business life / years in operation tiers (max 5pts)
 */
export function scoreBusinessLife(years: number | null | undefined): number {
  if (!years || years <= 0) return 0;
  if (years <= 1) return 0;
  if (years <= 5) return 1;
  if (years <= 10) return 2;
  if (years <= 20) return 3;
  if (years <= 30) return 4;
  return 5;
}

// ── Main scoring function ─────────────────────────────────────────────────────

/**
 * Computes CRS Possible Points from a CIS submission.
 *
 * Fixed document points (max 29pts from docs):
 *   Mayor / Barangay Permit            2
 *   SEC / DTI Registration             2
 *   BIR Certificate of Registration    2
 *   Owner's Valid ID                   1
 *   Location Map                       1
 *   Audited FS / Annual ITR            2
 *   3-month Bank Statement             (tiered — see below)
 *   Proof of Billing Address           1
 *   Lease Contract                     1
 *   Proof of Ownership                 4
 *   Photo of Plant / Office / Store    1
 *   Reference Supplier Invoice         2
 *   Screenshot of Social Media         2
 *   Website Screenshot (docOther)      2 (placeholder — no dedicated upload slot)
 *   Certifications (ISO=5, Halal=1)    2 (conservative until cert type is tracked)
 *
 * Tiered scoring (max 20pts — requires annualSalesAmount, netIncomeAmount,
 *   bankBalanceAmount, businessLifeYears columns; score 0 until collected):
 *   Sales amount                       0–5
 *   Net income                         0–5
 *   Bank balance                       0–5
 *   Business life (years)              0–5
 */
export function computePossiblePoints(cis: CisForScoring): number {
  let pts = 0;

  // ── Fixed document points ──
  if (hasEntries(cis.docMayorsPermit))       pts += 2;
  if (hasEntries(cis.docSecDti))             pts += 2;
  if (hasEntries(cis.docBirCertificate))     pts += 2;
  if (hasEntries(cis.docValidId))            pts += 1;
  if (hasEntries(cis.docLocationMap))        pts += 1;
  if (hasEntries(cis.docFinancialStatement)) pts += 2;
  if (hasEntries(cis.docProofOfBilling))     pts += 1;
  if (hasEntries(cis.docLeaseContract))      pts += 1;
  if (hasEntries(cis.docProofOfOwnership))   pts += 4;
  if (hasEntries(cis.docStorePhoto))         pts += 1;
  if (hasEntries(cis.docSupplierInvoice))    pts += 2;
  if (hasEntries(cis.docSocialMedia))        pts += 2;
  // Website screenshot has no dedicated slot yet — scored from docOther presence
  if (hasEntries(cis.docOther))              pts += 2;
  // Certifications: ISO=5pts, Halal=1pt — scored as 2pts until cert type is tracked per upload
  if (hasEntries(cis.docCertifications) || hasEntries(cis.docGovCertifications)) pts += 2;

  // ── Tiered scoring (0 until new DB columns are added) ──
  pts += scoreSalesAmount(cis.annualSalesAmount);
  pts += scoreNetIncome(cis.netIncomeAmount);
  pts += scoreBankBalance(cis.bankBalanceAmount);
  pts += scoreBusinessLife(cis.businessLifeYears);

  return pts;
}
