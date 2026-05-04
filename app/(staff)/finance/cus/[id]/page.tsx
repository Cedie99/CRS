import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions, cusEvents, cisSubmissions, users } from "@/lib/db/schema";
import { SCORING_DOC_SLOTS, type FileEntry } from "@/lib/doc-types";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  Building2,
  User,
  Tag,
  ExternalLink,
  FileText,
  MessageSquare,
  CheckCircle2,
  Send,
  XCircle,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { CusFinancePanel } from "./cus-finance-panel";

export default async function FinanceCusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role } = session.user as { id: string; role: string };
  if (role !== "finance_reviewer" && role !== "legal_approver" && role !== "admin") {
    redirect("/");
  }

  const [cus] = await db
    .select()
    .from(cusSubmissions)
    .where(eq(cusSubmissions.id, id))
    .limit(1);

  if (!cus) notFound();

  if (role === "finance_reviewer" && cus.status !== "pending_finance_review" && cus.status !== "approved" && cus.status !== "denied") notFound();
  if (role === "legal_approver" && cus.status !== "pending_legal_review" && cus.status !== "approved" && cus.status !== "denied") notFound();

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      customerType: cisSubmissions.customerType,
      status: cisSubmissions.status,
      agentCode: cisSubmissions.agentCode,
      cityMunicipality: cisSubmissions.cityMunicipality,
      businessType: cisSubmissions.businessType,
      financeCreditTerms: cisSubmissions.financeCreditTerms,
      financeCreditLimit: cisSubmissions.financeCreditLimit,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, cus.cisId))
    .limit(1);

  const events = await db
    .select({
      id: cusEvents.id,
      action: cusEvents.action,
      note: cusEvents.note,
      createdAt: cusEvents.createdAt,
      actorName: users.fullName,
    })
    .from(cusEvents)
    .innerJoin(users, eq(cusEvents.actorId, users.id))
    .where(eq(cusEvents.cusId, id))
    .orderBy(asc(cusEvents.createdAt));

  const isLegal = role === "legal_approver";
  const cisHref = isLegal ? `/legal/${cus.cisId}` : `/finance/${cus.cisId}`;

  const docSlots = [...SCORING_DOC_SLOTS, { key: "docOther", label: "Other Supporting Documents" }];
  const uploadedSlots = docSlots.filter(
    (slot) => ((cus as Record<string, unknown>)[slot.key] as FileEntry[] | null)?.length
  );
  const emptySlots = docSlots.filter(
    (slot) => !((cus as Record<string, unknown>)[slot.key] as FileEntry[] | null)?.length
  );

  const backHref = isLegal ? "/legal" : "/finance";

  const actionLabels: Record<string, string> = {
    submitted: "Submitted for review",
    approved: "Approved",
    denied: "Denied",
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Customer Updates", href: isLegal ? "/legal/cus" : "/finance/cus" },
        { label: cis?.tradeName ?? "CUS Detail" },
      ]} />
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 shrink-0 ${isLegal ? "bg-purple-50" : "bg-amber-50"}`}>
          <RefreshCw className={`h-5 w-5 ${isLegal ? "text-purple-600" : "text-amber-600"}`} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-900">
              {cis?.tradeName ?? "Customer Update Sheet"}
            </h1>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold
              ${isLegal ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
              {cus.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            Credit terms upgrade request — review and set credit evaluation below
          </p>
        </div>
      </div>

      {/* Context banner / comparison */}
      {cus.status === "approved" ? (
        <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-800">Approved — Credit Terms Comparison</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-green-200">
            <div className="px-5 py-4 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70">Before (Original CIS)</p>
              <p className="text-sm font-medium text-zinc-700">
                {cis?.financeCreditTerms
                  ? cis.financeCreditTerms.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                  : "Prepaid / COD"}
              </p>
              {cis?.financeCreditLimit && (
                <p className="text-xs text-zinc-500">Limit: {cis.financeCreditLimit}</p>
              )}
            </div>
            <div className="px-5 py-4 space-y-1 bg-green-100/40">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700/70">After (Approved CUS)</p>
              <p className="text-sm font-semibold text-green-900">
                {cus.financeCreditTerms
                  ? cus.financeCreditTerms.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                  : "—"}
              </p>
              {cus.financeCreditLimit && (
                <p className="text-xs text-green-800">Limit: {cus.financeCreditLimit}</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
          <p className="text-sm font-semibold text-zinc-800">What this request is for</p>
          <p className="mt-1 text-sm text-zinc-600">
            This customer is currently on <strong className="text-zinc-800">Prepaid / COD</strong> terms and is applying for a credit upgrade.
            Review the documents below, then fill in the credit evaluation and approve or deny.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: customer info + docs */}
        <div className="lg:col-span-3 space-y-5">
          {/* Customer info */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <Building2 className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">Customer Information</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Trade Name</p>
                  <p className="mt-0.5 font-semibold text-zinc-900">{cis?.tradeName ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Contact Person</p>
                  <p className="mt-0.5 font-medium text-zinc-800 flex items-center gap-1">
                    <User className="h-3 w-3 text-zinc-400" />
                    {cis?.contactPerson ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Customer Type</p>
                  <p className="mt-0.5 font-medium text-zinc-800 capitalize">
                    {cis?.customerType?.replace(/_/g, " ") ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Location</p>
                  <p className="mt-0.5 font-medium text-zinc-800 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-zinc-400" />
                    {cis?.cityMunicipality ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Agent Code</p>
                  <p className="mt-0.5 font-medium text-zinc-800">{cis?.agentCode ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Business Type</p>
                  <p className="mt-0.5 font-medium text-zinc-800 capitalize">
                    {cis?.businessType?.replace(/_/g, " ") ?? "—"}
                  </p>
                </div>
              </div>

              {(cis?.financeCreditTerms || cis?.financeCreditLimit) && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                    Current Terms (from original CIS)
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    {cis.financeCreditTerms && (
                      <span className="font-semibold text-zinc-800 capitalize">
                        {cis.financeCreditTerms.replace(/_/g, " ")}
                      </span>
                    )}
                    {cis.financeCreditLimit && (
                      <span className="text-zinc-600">Limit: {cis.financeCreditLimit}</span>
                    )}
                  </div>
                </div>
              )}

              {cus.note && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Agent Note</p>
                  </div>
                  <p className="text-sm text-zinc-700">{cus.note}</p>
                </div>
              )}

              <Link
                href={cisHref}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                <ExternalLink className="h-3 w-3" />
                View full original CIS
              </Link>
            </div>
          </div>

          {/* Submitted documents */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-700">Submitted Documents</h2>
              </div>
              <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-zinc-100 text-zinc-600">
                {uploadedSlots.length} / {docSlots.length} filled
              </span>
            </div>
            <div className="p-5">
              {uploadedSlots.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 py-8 text-center">
                  <FileText className="mx-auto h-7 w-7 text-zinc-300" />
                  <p className="mt-2 text-sm text-zinc-500">No documents submitted.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadedSlots.map((slot) => {
                    const files = (cus as Record<string, unknown>)[slot.key] as FileEntry[];
                    return (
                      <div key={slot.key} className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-zinc-600">{slot.label}</p>
                          <span className="text-[11px] text-zinc-400">{files.length} file{files.length !== 1 ? "s" : ""}</span>
                        </div>
                        <ul className="space-y-1.5">
                          {files.map((f) => (
                            <li key={f.url} className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              <a
                                href={f.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-zinc-700 hover:text-zinc-900 hover:underline truncate flex-1"
                              >
                                {f.name}
                              </a>
                              {f.uploadedAt && (
                                <span className="text-[11px] text-zinc-400 shrink-0">
                                  {new Date(f.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                  {emptySlots.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 list-none flex items-center gap-1 select-none">
                        <span className="group-open:hidden">▸</span>
                        <span className="hidden group-open:inline">▾</span>
                        {emptySlots.length} slot{emptySlots.length !== 1 ? "s" : ""} not submitted
                      </summary>
                      <ul className="mt-2 space-y-1 pl-3 border-l-2 border-zinc-100">
                        {emptySlots.map((slot) => (
                          <li key={slot.key} className="text-xs text-zinc-400">{slot.label}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: credit panel + activity */}
        <div className="lg:col-span-2 space-y-5">
          {cus.status === "approved" || cus.status === "denied" ? (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-zinc-700">Credit Evaluation Result</h2>
                <p className="text-xs text-zinc-500 mt-0.5">This CUS has been {cus.status}.</p>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Credit Terms Granted</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {cus.financeCreditTerms
                      ? cus.financeCreditTerms.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                      : "—"}
                  </p>
                </div>
                {cus.financeCreditLimit && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Credit Limit</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{cus.financeCreditLimit}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <CusFinancePanel
              cusId={id}
              initialCreditLimit={cus.financeCreditLimit ?? ""}
              initialCreditTerms={cus.financeCreditTerms ?? ""}
              backHref={backHref}
              isLegal={isLegal}
            />
          )}

          {events.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                <h2 className="text-sm font-semibold text-zinc-700">Activity</h2>
              </div>
              <ol className="p-4 space-y-4">
                {events.map((ev, i) => (
                  <li key={ev.id} className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0
                        ${ev.action === "approved" ? "bg-green-100"
                          : ev.action === "denied" ? "bg-red-100"
                          : "bg-zinc-100"}`}>
                        {ev.action === "approved"
                          ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                          : ev.action === "denied"
                          ? <XCircle className="h-3 w-3 text-red-600" />
                          : <Send className="h-3 w-3 text-zinc-500" />}
                      </div>
                      {i < events.length - 1 && <div className="w-px flex-1 bg-zinc-100 mt-1 min-h-[14px]" />}
                    </div>
                    <div className="pb-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800">
                        {actionLabels[ev.action] ?? ev.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-zinc-400">by {ev.actorName}</p>
                      {ev.note && (
                        <p className="mt-1 text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 rounded px-2 py-1">
                          {ev.note}
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {new Date(ev.createdAt).toLocaleString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                          hour: "numeric", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
