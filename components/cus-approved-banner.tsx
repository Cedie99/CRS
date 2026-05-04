import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cusSubmissions } from "@/lib/db/schema";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

function humanizeTerms(val: string | null | undefined) {
  if (!val) return null;
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Server component — renders a before/after comparison banner if this CIS
 * has at least one approved CUS. Shows nothing if none found.
 */
export async function CusApprovedBanner({
  cisId,
  originalCreditTerms,
  originalCreditLimit,
  hrefPrefix,
}: {
  cisId: string;
  originalCreditTerms?: string | null;
  originalCreditLimit?: string | null;
  /** Role-based path prefix: "agent" | "finance" | "legal" | "manager" | "approver" | "admin" */
  hrefPrefix: string;
}) {
  const rows = await db
    .select({
      id: cusSubmissions.id,
      status: cusSubmissions.status,
      financeCreditTerms: cusSubmissions.financeCreditTerms,
      financeCreditLimit: cusSubmissions.financeCreditLimit,
      updatedAt: cusSubmissions.updatedAt,
    })
    .from(cusSubmissions)
    .where(eq(cusSubmissions.cisId, cisId))
    .catch(() => [] as never[]);

  const approvedList = rows
    .filter((r) => r.status === "approved")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (approvedList.length === 0) return null;

  const latest = approvedList[0];

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-green-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm font-semibold text-green-800">
            Credit Terms Updated via CUS
          </p>
        </div>
        <Link
          href={`/${hrefPrefix}/cus/${latest.id}`}
          className="text-xs font-medium text-green-700 hover:text-green-900 underline underline-offset-2 shrink-0"
        >
          View CUS
        </Link>
      </div>
      <div className="grid grid-cols-2 divide-x divide-green-200">
        <div className="px-5 py-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70">
            Before (Original CIS)
          </p>
          <p className="text-sm font-medium text-zinc-700">
            {humanizeTerms(originalCreditTerms) ?? "Prepaid / COD"}
          </p>
          {originalCreditLimit && (
            <p className="text-xs text-zinc-500">Limit: {originalCreditLimit}</p>
          )}
        </div>
        <div className="px-5 py-4 space-y-1 bg-green-100/40">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70">
            After (Approved CUS)
          </p>
          <p className="text-sm font-semibold text-green-900">
            {humanizeTerms(latest.financeCreditTerms) ?? "—"}
          </p>
          {latest.financeCreditLimit && (
            <p className="text-xs text-green-800">Limit: {latest.financeCreditLimit}</p>
          )}
        </div>
      </div>
      {approvedList.length > 1 && (
        <div className="flex items-center gap-1.5 border-t border-green-200 px-5 py-2.5">
          <ArrowRight className="h-3 w-3 text-green-600 shrink-0" />
          <p className="text-xs text-green-700">
            {approvedList.length} total approved credit updates for this customer.
          </p>
        </div>
      )}
    </div>
  );
}
