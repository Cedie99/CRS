import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions, cusEvents, cisSubmissions, users } from "@/lib/db/schema";
import { SCORING_DOC_SLOTS, type FileEntry } from "@/lib/doc-types";
import { CusDocSection } from "@/components/cus-doc-section";
import { CusSubmitButton } from "./cus-submit-button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck2,
  Send,
  Building2,
  User,
  Tag,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  MapPin,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export default async function AgentCusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id: userId, role } = session.user as { id: string; role: string };
  if (role !== "sales_agent" && role !== "rsr") redirect("/agent");

  const [cus] = await db
    .select()
    .from(cusSubmissions)
    .where(eq(cusSubmissions.id, id))
    .limit(1);

  if (!cus || cus.agentId !== userId) notFound();

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      customerType: cisSubmissions.customerType,
      status: cisSubmissions.status,
      cityMunicipality: cisSubmissions.cityMunicipality,
      businessType: cisSubmissions.businessType,
      agentCode: cisSubmissions.agentCode,
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

  const docKeys = [...SCORING_DOC_SLOTS.map((s) => s.key), "docOther"] as const;
  const initialDocs = Object.fromEntries(
    docKeys.map((k) => [k, ((cus as Record<string, unknown>)[k] as FileEntry[] | null) ?? []])
  ) as Record<string, FileEntry[]>;
  const uploadedCount = docKeys.filter((k) => (initialDocs[k]?.length ?? 0) > 0).length;

  const isDraft = cus.status === "draft";
  const isPendingLegal = cus.status === "pending_legal_review";
  const isPendingFinance = cus.status === "pending_finance_review";
  const isUnderReview = isPendingLegal || isPendingFinance;
  const isApproved = cus.status === "approved";
  const isDenied = cus.status === "denied";

  const deniedEvent = events.findLast((e) => e.action === "denied");
  const reviewerLabel = cis?.customerType === "dealer" ? "Legal (Maam Cha)" : "Finance (Maam Nida)";

  const steps = [
    { key: "draft", label: "Draft", icon: FileCheck2 },
    { key: "submitted", label: "Submitted", icon: Send },
    { key: "review", label: "Under Review", icon: Clock },
    { key: "approved", label: "Approved", icon: CheckCircle2 },
  ];
  const stepIndex = isDraft ? 0
    : cus.status === "submitted" ? 1
    : isUnderReview ? 2
    : isApproved ? 3
    : -1;

  const actionLabels: Record<string, string> = {
    submitted: "Submitted for review",
    approved: "Approved",
    denied: "Denied",
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Customer Updates", href: "/agent/cus" },
        { label: cis?.tradeName ?? "CUS Detail" },
      ]} />
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-teal-50 p-2.5 shrink-0">
          <RefreshCw className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-900">
              {cis?.tradeName ?? "Customer Update Sheet"}
            </h1>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold
              ${isApproved ? "bg-green-50 text-green-700 border-green-200" :
                isDenied ? "bg-red-50 text-red-700 border-red-200" :
                isDraft ? "bg-zinc-100 text-zinc-600 border-zinc-200" :
                "bg-amber-50 text-amber-700 border-amber-200"}`}
            >
              {isDraft ? "Draft"
                : cus.status === "submitted" ? "Submitted"
                : isPendingFinance ? "Pending Finance Review"
                : isPendingLegal ? "Pending Legal Review"
                : isApproved ? "Approved"
                : isDenied ? "Denied"
                : cus.status}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">Credit terms upgrade request</p>
        </div>
      </div>

      {/* Progress stepper */}
      {!isDenied && (
        <div className="rounded-xl border border-zinc-200 bg-white px-8 py-5">
          <div className="flex items-start relative">
            <div className="absolute top-4 left-0 right-0 h-px bg-zinc-100 z-0 mx-10" />
            {steps.map((step, i) => {
              const isDone = isApproved;
              const isPast = i < stepIndex || (isDone && i === stepIndex);
              const isCurrent = i === stepIndex && !isDone;
              const Icon = step.icon;
              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors
                    ${isPast ? "bg-teal-500 border-teal-500"
                      : isCurrent ? "bg-white border-teal-500"
                      : "bg-white border-zinc-200"}`}
                  >
                    <Icon className={`h-3.5 w-3.5
                      ${isPast ? "text-white" : isCurrent ? "text-teal-600" : "text-zinc-300"}`}
                    />
                  </div>
                  <span className={`text-[11px] font-medium text-center leading-tight
                    ${isCurrent ? "text-zinc-800" : isPast ? "text-zinc-500" : "text-zinc-300"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status banners */}
      {isApproved && (
        <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-800">CUS Approved — Credit Terms Updated</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-green-200">
            {/* Before */}
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
            {/* After */}
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
      )}

      {isDenied && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <XCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-800">
              CUS Denied{deniedEvent?.actorName ? ` by ${deniedEvent.actorName}` : ""}
            </p>
            {deniedEvent?.note && (
              <p className="text-sm text-red-700">{deniedEvent.note}</p>
            )}
          </div>
        </div>
      )}

      {isUnderReview && (
        <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
          <Clock className="h-5 w-5 shrink-0 text-zinc-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-zinc-800">Under Review</p>
            <p className="text-sm text-zinc-600 mt-0.5">
              Being reviewed by <strong>{reviewerLabel}</strong>. No further action needed from you.
            </p>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: customer info + submit CTA */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer card */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <Building2 className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">Customer</h2>
            </div>
            <div className="p-4 space-y-3">
              <p className="font-semibold text-zinc-900">{cis?.tradeName ?? "—"}</p>
              <div className="space-y-1.5 text-sm text-zinc-600">
                {cis?.contactPerson && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    {cis.contactPerson}
                  </div>
                )}
                {cis?.cityMunicipality && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    {cis.cityMunicipality}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span className="capitalize">{cis?.customerType?.replace(/_/g, " ") ?? "—"}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Review Route</p>
                <p className="text-sm font-medium text-zinc-800">{reviewerLabel}</p>
              </div>
              <Link
                href={`/agent/${cus.cisId}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                <ExternalLink className="h-3 w-3" />
                View original CIS
              </Link>
            </div>
          </div>

          {/* Note */}
          {cus.note && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Note</p>
              </div>
              <p className="text-sm text-zinc-700">{cus.note}</p>
            </div>
          )}

          {/* Submit CTA */}
          {isDraft && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Send className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Ready to submit?</p>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Sends to <strong className="text-zinc-700">{reviewerLabel}</strong> for review. No more uploads after submitting.
                  </p>
                </div>
              </div>
              <CusSubmitButton cusId={id} />
            </div>
          )}

          {/* Activity timeline */}
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
                        <p className="mt-1 text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 rounded px-2 py-1.5">
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

        {/* Right: documents */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-700">Documents</h2>
              </div>
              <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5
                ${uploadedCount > 0 ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                {uploadedCount} / {docKeys.length} uploaded
              </span>
            </div>
            <div className="p-5">
              {isDraft && (
                <p className="mb-4 text-sm text-zinc-500">
                  Upload updated documents. Files are <strong className="text-zinc-700">append-only</strong> — they cannot be removed once uploaded.
                </p>
              )}
              <CusDocSection cusId={id} initialDocs={initialDocs} disabled={!isDraft} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
