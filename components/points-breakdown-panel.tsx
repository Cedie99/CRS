"use client";

import { cn } from "@/lib/utils";

function hasEntries(field: unknown): boolean {
  return Array.isArray(field) && field.length > 0;
}

// ── Recommended terms logic ───────────────────────────────────────────────────

/**
 * RSR brackets apply to Dealer accounts.
 * Sales Agent brackets apply to End User, Distributor, Private Label, Toll Blend.
 * The pointing system ALWAYS runs — it is the bracket table selection that depends
 * on account type. If the account type falls outside the expected scope for the
 * agent type, both bracket tables are shown and Finance determines the final terms.
 */

const RSR_TIERS = [
  { min: 0,  max: 10,       terms: "Prepaid / COD", label: "0 – 10 pts"  },
  { min: 11, max: 15,       terms: "30 Days",        label: "11 – 15 pts" },
  { min: 16, max: Infinity, terms: "60 Days",         label: "16+ pts"     },
] as const;

const SALES_AGENT_TIERS = [
  { min: 0,  max: 24,       terms: "Prepaid / COD", label: "0 – 24 pts"  },
  { min: 25, max: 29,       terms: "30 Days",        label: "25 – 29 pts" },
  { min: 30, max: Infinity, terms: "60 Days",         label: "30+ pts"     },
] as const;

type Tier = { min: number; max: number; terms: string; label: string };

function matchTier(pts: number, tiers: readonly Tier[]): Tier {
  return tiers.find((t) => pts >= t.min && pts <= t.max) ?? tiers[tiers.length - 1];
}

/**
 * Returns which bracket table to use and whether it cleanly applies.
 * "cleanApply" = agent type and customer type are the expected pairing.
 * When not a clean match, show both tables and defer to Finance.
 */
function resolveTermsContext(
  agentType: string | null | undefined,
  customerType: string | null | undefined,
): {
  isRsr: boolean;
  primaryTiers: readonly Tier[];
  cleanApply: boolean;
  scopeNote: string;
} {
  const isRsr = agentType === "rsr";
  const isDealer = customerType === "dealer";
  const isNonDealer = customerType != null && !isDealer;

  if (isRsr && isDealer) {
    return {
      isRsr: true,
      primaryTiers: RSR_TIERS,
      cleanApply: true,
      scopeNote: "RSR · Dealer Account",
    };
  }

  if (!isRsr && isNonDealer) {
    return {
      isRsr: false,
      primaryTiers: SALES_AGENT_TIERS,
      cleanApply: true,
      scopeNote: "Sales Agent · Non-Dealer Account",
    };
  }

  // Mismatch or unknown — use agent type's bracket but flag for Finance
  return {
    isRsr,
    primaryTiers: isRsr ? RSR_TIERS : SALES_AGENT_TIERS,
    cleanApply: false,
    scopeNote: isRsr
      ? "RSR bracket is designed for Dealer accounts."
      : "Sales Agent bracket applies to End User, Distributor, Private Label, and Toll Blend.",
  };
}

// ── Document rows ─────────────────────────────────────────────────────────────

type DocFields = {
  docMayorsPermit?: unknown;
  docSecDti?: unknown;
  docBirCertificate?: unknown;
  docValidId?: unknown;
  docLocationMap?: unknown;
  docFinancialStatement?: unknown;
  docBankStatement?: unknown;
  docProofOfBilling?: unknown;
  docLeaseContract?: unknown;
  docProofOfOwnership?: unknown;
  docStorePhoto?: unknown;
  docSupplierInvoice?: unknown;
  docSocialMedia?: unknown;
  docCompanyWebsite?: unknown;
  docIsoCertification?: unknown;
  docHalalCertificate?: unknown;
  docCertifications?: unknown;
  docGovCertifications?: unknown;
  docOther?: unknown;
};

const DOC_ROWS: { label: string; field: keyof DocFields; pts: number }[] = [
  { label: "Mayor or Barangay Permit",                              field: "docMayorsPermit",       pts: 2 },
  { label: "SEC / DTI Registration",                               field: "docSecDti",             pts: 2 },
  { label: "BIR Certificate of Registration",                      field: "docBirCertificate",     pts: 2 },
  { label: "Owner's Valid ID",                                     field: "docValidId",            pts: 1 },
  { label: "Location Map",                                         field: "docLocationMap",        pts: 1 },
  { label: "Audited Financial Statements / Latest Annual ITR",     field: "docFinancialStatement", pts: 2 },
  { label: "Proof of Billing Address",                             field: "docProofOfBilling",     pts: 1 },
  { label: "Lease Contract",                                       field: "docLeaseContract",      pts: 1 },
  { label: "Proof of Ownership of Property (Office or Store)",     field: "docProofOfOwnership",   pts: 4 },
  { label: "Photo of Plant / Office / Store with Signage",         field: "docStorePhoto",         pts: 1 },
  { label: "Reference Supplier Invoice",                           field: "docSupplierInvoice",    pts: 2 },
  { label: "Screenshot of Social Media Account",                   field: "docSocialMedia",        pts: 2 },
  { label: "Screenshot of Company Website",                        field: "docCompanyWebsite",     pts: 2 },
  { label: "ISO Certification",                                    field: "docIsoCertification",   pts: 5 },
  { label: "Halal Certificate",                                    field: "docHalalCertificate",   pts: 1 },
];

const MAX_DOC_POINTS    = DOC_ROWS.reduce((s, r) => s + r.pts, 0); // 31
const MAX_TIERED_POINTS = 20;
const MAX_TOTAL         = MAX_DOC_POINTS + MAX_TIERED_POINTS;      // 51

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniBar({ earned, max, color }: { earned: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min(100, (earned / max) * 100);
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-100">
      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SectionHeader({ label, badge, badgeColor }: { label: string; badge: string; badgeColor: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold tabular-nums", badgeColor)}>{badge}</span>
    </div>
  );
}

function ColHeader({ cols }: { cols: { label: string; className?: string }[] }) {
  return (
    <div className="flex border-b border-zinc-100 bg-zinc-50/60 px-3 py-1">
      {cols.map((c) => (
        <span key={c.label} className={cn("text-[10px] font-bold uppercase tracking-wider text-zinc-400", c.className)}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function SubtotalRow({ label, earned, max, barColor }: { label: string; earned: number; max: number; barColor: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-zinc-200 bg-zinc-50 px-3 py-2">
      <span className="flex-1 text-xs font-semibold text-zinc-600">{label}</span>
      <div className="flex w-32 shrink-0 items-center gap-2">
        <div className="flex-1">
          <MiniBar earned={earned} max={max} color={barColor} />
        </div>
        <span className="w-12 text-right text-xs font-bold tabular-nums text-zinc-600">
          {earned} / {max}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export type MetricPoints = {
  annualSales?: number | null;
  netIncome?: number | null;
  bankBalance?: number | null;
  businessLife?: number | null;
};

export type PointsBreakdownPanelProps = DocFields & {
  metricPoints?: MetricPoints | null;
  financePossiblePoints?: number | null;
  /** @deprecated — approved points are now auto-derived from docReviewStatuses */
  financeApprovedPoints?: number | null;
  docReviewStatuses?: Record<string, { status: string; reason?: string | null }> | null;
  agentType?: string | null;
  customerType?: string | null;
  /**
   * "full"    — finance/legal/staff: document checklist + financial metrics + summary + terms (default)
   * "summary" — agent: total score bar + recommended terms only, no per-document or per-metric breakdown
   */
  mode?: "full" | "summary";
  /** When true, always show the Approved points counter even before any reviews have been done. */
  showApprovedAlways?: boolean;
};

export function PointsBreakdownPanel({
  financePossiblePoints,
  financeApprovedPoints,
  docReviewStatuses,
  metricPoints,
  agentType,
  customerType,
  mode = "full",
  showApprovedAlways = false,
  ...docs
}: PointsBreakdownPanelProps) {
  const d = docs as DocFields;

  // ── Possible points ──────────────────────────────────────────────────────────
  let docEarned = 0;
  for (const row of DOC_ROWS) {
    if (hasEntries(d[row.field])) docEarned += row.pts;
  }

  const salesPts     = metricPoints?.annualSales  ?? 0;
  const netPts       = metricPoints?.netIncome    ?? 0;
  const bankPts      = metricPoints?.bankBalance  ?? 0;
  const bizPts       = metricPoints?.businessLife ?? 0;
  const tieredEarned = salesPts + netPts + bankPts + bizPts;

  const totalPossible = financePossiblePoints ?? (docEarned + tieredEarned);

  // ── Approved points — derived from doc review statuses ───────────────────────
  // Each doc Finance explicitly marks "approved" contributes its points.
  // Tiered financial scores always pass through (Finance can't reject a sales figure).
  // If no doc has been reviewed yet, approved points = null (pending).
  const reviews = docReviewStatuses ?? {};
  const hasAnyReview = Object.keys(reviews).length > 0;

  let approvedDocPts = 0;
  for (const row of DOC_ROWS) {
    const review = reviews[row.field];
    if (hasEntries(d[row.field]) && review?.status === "approved") {
      approvedDocPts += row.pts;
    }
  }

  // Fall back to the stored value only if no review statuses exist at all.
  // When showApprovedAlways is true (active finance/legal reviewer), always show approved pts
  // starting from 0 so it updates in real time as documents are marked approved.
  const totalApproved = hasAnyReview
    ? approvedDocPts + tieredEarned
    : showApprovedAlways
      ? approvedDocPts + tieredEarned
      : (financeApprovedPoints ?? null);

  // In summary/agent mode, hide estimated points (show 0) until finance has set
  // approved points — once approved points exist, show them to everyone.
  const ptsForTerms = mode === "summary" && totalApproved == null
    ? 0
    : (totalApproved ?? totalPossible);

  const { isRsr, primaryTiers, cleanApply, scopeNote } = resolveTermsContext(agentType, customerType);
  const activeTier = matchTier(ptsForTerms, primaryTiers);

  const possiblePct = Math.min(100, (totalPossible / MAX_TOTAL) * 100);
  const approvedPct = totalApproved != null ? Math.min(100, (totalApproved / MAX_TOTAL) * 100) : 0;

  const TIER_LABELS: Record<string, string[]> = {
    annualSales:  ["5,000,000 and below", "5,000,001 – 10,000,000", "10,000,001 – 50,000,000", "50,000,001 – 100,000,000", "Above 100,000,000", "100,000,000 and above"],
    netIncome:    ["250,000 and below", "250,001 – 1,000,000", "1,000,001 – 5,000,000", "5,000,001 – 15,000,000", "15,000,001 – 30,000,000", "Above 30,000,000"],
    bankBalance:  ["99,999 and below", "100,000 – 399,999", "400,000 – 699,999", "700,000 – 999,999", "1,000,000 – 9,999,999", "10,000,000 and above"],
    businessLife: ["1 year and below", "2 to 5 years", "6 to 10 years", "11 to 20 years", "21 to 30 years", "Above 30 years"],
  };

  const tieredRows = [
    { label: "Annual Sales",              key: "annualSales",  hint: "From financial statements / ITR", pts: salesPts },
    { label: "Net Income",                key: "netIncome",    hint: "Net income after tax", pts: netPts },
    { label: "Bank Statement / Balance",  key: "bankBalance",  hint: "Average daily balance (3-month statement)", pts: bankPts },
    { label: "Years in Business",         key: "businessLife", hint: "Years in continuous operation", pts: bizPts },
  ];

  return (
    <div className="space-y-4 text-xs print:space-y-3">

      

      {/* ── Document Checklist + Financial Metrics (full mode only) ── */}
      {mode === "full" && <>

      {/* ── Document Checklist ── */}
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-2">
          <h3 className="text-xs font-bold text-zinc-900">Document Checklist</h3>
          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            {docEarned} / {MAX_DOC_POINTS} pts
          </span>
        </div>
        
        <div className="divide-y divide-zinc-100">
          {DOC_ROWS.map((row, i) => {
            const uploaded = hasEntries(d[row.field]);
            const review = reviews[row.field];
            const reviewStatus = uploaded ? (review?.status ?? null) : null;
            return (
              <div
                key={row.field}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2",
                  i % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                  !uploaded && "opacity-40",
                )}
              >
                <div className="flex-1">
                  <p className="text-xs font-medium text-zinc-800">{row.label}</p>
                  <p className="text-[10px] text-zinc-400">+{row.pts} pts</p>
                </div>
                
                {uploaded ? (
                  reviewStatus === "approved" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Approved
                    </span>
                  ) : reviewStatus === "rejected" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Rejected
                    </span>
                  ) : reviewStatus === "needs_review" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Needs Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                      Pending
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                    Not Uploaded
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Financial Metrics ── */}
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-2">
          <h3 className="text-xs font-bold text-zinc-900">Financial Metrics</h3>
          <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
            {tieredEarned} / {MAX_TIERED_POINTS} pts
          </span>
        </div>
        
        <div className="divide-y divide-zinc-100">
          {tieredRows.map((row, i) => {
            const hasPoints = row.pts > 0;
            const tierLabel = hasPoints ? TIER_LABELS[row.key]?.[row.pts] : null;
            return (
              <div
                key={row.label}
                className={cn(
                  "flex items-center gap-3 px-3 py-2",
                  i % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                  !hasPoints && "opacity-40",
                )}
              >
                <div className="flex-1">
                  <p className="text-xs font-medium text-zinc-800">{row.label}</p>
                  <p className="text-[10px] text-zinc-400">{row.hint}</p>
                  {tierLabel && (
                    <p className="mt-0.5 text-[10px] font-medium text-violet-600 print:hidden">{tierLabel}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-zinc-700">{row.pts}</p>
                  <p className="text-[10px] text-zinc-400">/ 5 pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      </>}

      {/* ── Score Summary Card ── */}
      <div className="rounded-xl border-2 border-zinc-200 bg-linear-to-br from-zinc-50 to-white p-4 shadow-sm mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-900">Credit Score Summary</h3>
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
            Max {MAX_TOTAL} pts
          </span>
        </div>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Documents Score */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-blue-800">Documents</span>
              <span className="text-[10px] font-bold text-blue-600">{docEarned} / {MAX_DOC_POINTS}</span>
            </div>
            <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
              <div 
                className="h-full rounded-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, (docEarned / MAX_DOC_POINTS) * 100)}%` }} 
              />
            </div>
            <p className="mt-1.5 text-[9px] text-blue-600">
              {docEarned === MAX_DOC_POINTS ? "All documents uploaded" : ""}
            </p>
          </div>

          {/* Financial Score */}
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-violet-800">Financial Metrics</span>
              <span className="text-[10px] font-bold text-violet-600">{tieredEarned} / {MAX_TIERED_POINTS}</span>
            </div>
            <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-violet-200">
              <div 
                className="h-full rounded-full bg-violet-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, (tieredEarned / MAX_TIERED_POINTS) * 100)}%` }} 
              />
            </div>
            <p className="mt-1.5 text-[9px] text-violet-600">
              {tieredEarned === MAX_TIERED_POINTS ? "All metrics provided" : ""}
            </p>
          </div>
        </div>

        {/* Total Score */}
        <div className="mt-3 rounded-lg border-2 border-zinc-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-zinc-500">Possible Points</p>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums text-zinc-900">{totalPossible}</span>
                <span className="text-xs text-zinc-400">/ {MAX_TOTAL} pts</span>
              </div>
            </div>
            {totalApproved != null && (
              <div className="text-right">
                <p className="text-[10px] font-semibold text-zinc-500">Approved</p>
                <div className="mt-0.5 flex items-baseline gap-1.5 justify-end">
                  <span className="text-2xl font-black tabular-nums text-emerald-600">{totalApproved}</span>
                  <span className="text-xs text-zinc-400">/ {MAX_TOTAL} pts</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recommended Terms ── */}
      <div className="overflow-hidden rounded-xl border-2 border-zinc-200 bg-linear-to-br from-zinc-50 to-white">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-2">
          <h3 className="text-xs font-bold text-zinc-900">Applicable Credit Terms</h3>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
              isRsr ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700",
            )}>
              {isRsr ? "RSR" : "Sales Agent"}
            </span>
            {!cleanApply && (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                Finance to confirm
              </span>
            )}
          </div>
        </div>

        {!cleanApply && (
          <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-700">
            <span className="font-semibold">Note: </span>
            {scopeNote}
          </div>
        )}

        {/* Current Tier Highlight */}
        <div className={cn(
          "border-b-4 px-3 py-3",
          cleanApply ? "border-emerald-500 bg-emerald-50" : "border-amber-500 bg-amber-50",
        )}>
          <div className="flex items-center justify-between">
            <div>
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                cleanApply ? "text-emerald-600" : "text-amber-600",
              )}>
                {cleanApply ? "Applicable" : "Estimated"}
              </p>
              <p className={cn(
                "mt-0.5 text-lg font-black",
                cleanApply ? "text-emerald-800" : "text-amber-800",
              )}>
                {activeTier.terms}
              </p>
              <p className={cn("mt-0.5 text-[10px]", cleanApply ? "text-emerald-600" : "text-amber-600")}>
                Score: {ptsForTerms} pts ({activeTier.label})
              </p>
            </div>
            <div className={cn(
              "rounded-xl px-4 py-3 text-center",
              cleanApply ? "bg-emerald-100" : "bg-amber-100",
            )}>
              <p className={cn(
                "text-3xl font-black tabular-nums",
                cleanApply ? "text-emerald-700" : "text-amber-700",
              )}>
                {ptsForTerms}
              </p>
              <p className={cn("text-[10px] font-semibold", cleanApply ? "text-emerald-600" : "text-amber-600")}>points</p>
            </div>
          </div>
        </div>

        {/* All Tiers */}
        <div className="divide-y divide-zinc-100">
          {primaryTiers.map((tier, i) => {
            const isActive = ptsForTerms >= tier.min && ptsForTerms <= tier.max;
            const rangeLabel = tier.max === Infinity
              ? `${tier.min}+ pts`
              : `${tier.min} – ${tier.max} pts`;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between px-3 py-2",
                  isActive ? "bg-white font-semibold" : "bg-zinc-50/50",
                )}
              >
                <span className={cn(
                  "text-xs",
                  isActive ? "text-zinc-900" : "text-zinc-500",
                )}>
                  {rangeLabel}
                </span>
                <span className={cn(
                  "text-xs",
                  isActive ? "text-zinc-900" : "text-zinc-500",
                )}>
                  {tier.terms}
                </span>
                {isActive && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    cleanApply ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                  )}>
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50 px-3 py-2">
          <p className="text-[9px] text-zinc-500">* Final terms subject to Finance Department review</p>
        </div>
      </div>
    </div>
  );
}
