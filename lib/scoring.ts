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
  docCompanyWebsite: unknown;
  docIsoCertification: unknown;   // 5pts
  docHalalCertificate: unknown;   // 1pt
  docCertifications: unknown;     // other certs — no points
  docGovCertifications: unknown;  // no points
  docOther: unknown;              // misc — no points
  // Tiered inputs — pass null/undefined to score as 0
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
 *   0 – 5,000,000          → 0pt
 *   5,000,001 (exact)      → 1pt
 *   Above 5M – 10M         → 2pts
 *   10M – 50M              → 3pts
 *   Above 50M – 100M       → 4pts
 *   100M and above         → 5pts
 */
export function scoreSalesAmount(amount: number | null | undefined): number {
  if (!amount || amount <= 0) return 0;
  if (amount <= 5_000_000) return 0;
  if (amount <= 5_000_001) return 1;
  if (amount <= 10_000_000) return 2;
  if (amount <= 50_000_000) return 3;
  if (amount <= 100_000_000) return 4;
  return 5;
}

/**
 * Net income tiers (max 5pts)
 *   250,000 and below            → 0pt
 *   250,001 – 1,000,000          → 1pt
 *   1,000,001 – 5,000,000        → 2pts
 *   5,000,001 – 15,000,000       → 3pts
 *   15,000,001 – 30,000,000      → 4pts
 *   30,000,001 and above         → 5pts
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
 *   5 digits and below (≤ 99,999)        → 0pt
 *   Low 6 digits  (100,000 – 399,999)    → 1pt
 *   Mid 6 digits  (400,000 – 699,999)    → 2pts
 *   High 6 digits (700,000 – 999,999)    → 3pts
 *   7 digits      (1,000,000 – 9,999,999)→ 4pts
 *   8 digits and above (≥ 10,000,000)    → 5pts
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
 *   0 – 1 yr      → 0pt
 *   2 – 5 yrs     → 1pt
 *   6 – 10 yrs    → 2pts
 *   11 – 20 yrs   → 3pts
 *   21 – 30 yrs   → 4pts
 *   30+ yrs       → 5pts
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
 * Fixed document points (max 31pts from docs):
 *   Mayor / Barangay Permit              2
 *   SEC / DTI Registration               2
 *   BIR Certificate of Registration      2
 *   Owner's Valid ID                     1
 *   Location Map                         1
 *   Audited FS / Annual ITR              2
 *   Proof of Billing Address             1
 *   Lease Contract                       1
 *   Proof of Ownership                   4
 *   Photo of Plant / Office / Store      1
 *   Reference Supplier Invoice           2
 *   Screenshot of Company Website        2
 *   Screenshot of Social Media Account   2
 *   ISO Certification                    5
 *   Halal Certificate                    1
 *                                       ──
 *                                       31
 *
 * Tiered scoring (max 20pts):
 *   Sales amount          0 – 5
 *   Net income            0 – 5
 *   Bank balance          0 – 5
 *   Business life (yrs)   0 – 5
 *
 * Total max: 51pts
 */
export function computePossiblePoints(cis: CisForScoring): number {
  let pts = 0;

  // ── Fixed document points ──
  if (hasEntries(cis.docMayorsPermit))        pts += 2;
  if (hasEntries(cis.docSecDti))              pts += 2;
  if (hasEntries(cis.docBirCertificate))      pts += 2;
  if (hasEntries(cis.docValidId))             pts += 1;
  if (hasEntries(cis.docLocationMap))         pts += 1;
  if (hasEntries(cis.docFinancialStatement))  pts += 2;
  if (hasEntries(cis.docProofOfBilling))      pts += 1;
  if (hasEntries(cis.docLeaseContract))       pts += 1;
  if (hasEntries(cis.docProofOfOwnership))    pts += 4;
  if (hasEntries(cis.docStorePhoto))          pts += 1;
  if (hasEntries(cis.docSupplierInvoice))     pts += 2;
  if (hasEntries(cis.docSocialMedia))         pts += 2;
  if (hasEntries(cis.docCompanyWebsite))      pts += 2;
  // Certifications — scored separately
  if (hasEntries(cis.docIsoCertification))    pts += 5;
  if (hasEntries(cis.docHalalCertificate))    pts += 1;

  // ── Tiered scoring ──
  pts += scoreSalesAmount(cis.annualSalesAmount);
  pts += scoreNetIncome(cis.netIncomeAmount);
  pts += scoreBankBalance(cis.bankBalanceAmount);
  pts += scoreBusinessLife(cis.businessLifeYears);

  return pts;
}
