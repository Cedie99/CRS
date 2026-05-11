import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, ctrEvents, cisSubmissions, users } from "@/lib/db/schema";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  ArrowRight, GitMerge, CheckCircle2, XCircle, Clock, FileText,
  Send, MessageSquare, Tag, ExternalLink, CalendarDays, User,
  CircleDot, Circle, AlertTriangle, ShieldCheck, Hourglass,
} from "lucide-react";
import { SCORING_DOC_SLOTS, DOC_LABELS, type FileEntry } from "@/lib/doc-types";
import { CtrAgentActions } from "./ctr-agent-actions";

export const metadata = { title: "CTR Detail — Agent — CRS" };

function humanizeType(val: string | null) {
  if (!val) return "—";
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
    submitted: "bg-blue-50 text-blue-700 border-blue-200",
    pending_legal_review: "bg-purple-50 text-purple-700 border-purple-200",
    pending_finance_review: "bg-amber-50 text-amber-700 border-amber-200",
    pending_documents: "bg-orange-50 text-orange-700 border-orange-200",
    pending_approval: "bg-sky-50 text-sky-700 border-sky-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    denied: "bg-red-50 text-red-700 border-red-200",
  };
  const cls = map[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

const ACTION_LABELS: Record<string, string> = {
  submitted: "Submitted for review",
  resubmitted: "Documents uploaded — resubmitted",
  documents_requested: "Documents requested",
  forwarded_to_approver: "Forwarded to Senior Approver",
  approved: "Approved",
  denied: "Denied",
};

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  dealer: "bg-blue-100 text-blue-800 border-blue-200",
  distributor: "bg-teal-100 text-teal-800 border-teal-200",
  private_label: "bg-violet-100 text-violet-800 border-violet-200",
  toll_blend: "bg-orange-100 text-orange-800 border-orange-200",
  end_user: "bg-green-100 text-green-800 border-green-200",
};

// Workflow steps for the stepper
const WORKFLOW_STEPS = [
  { key: "draft", label: "Draft" },
  { key: "review", label: "Under Review" },
  { key: "approval", label: "Approval" },
  { key: "result", label: "Result" },
] as const;

function getStepIndex(status: string): number {
  if (status === "draft") return 0;
  if (["submitted", "pending_legal_review", "pending_finance_review", "pending_documents"].includes(status)) return 1;
  if (status === "pending_approval") return 2;
  return 3;
}

export default async function AgentCtrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, id: userId } = session.user as { role: string; id: string };
  if (role !== "sales_agent" && role !== "rsr") redirect("/agent");

  const { id } = await params;

  const [row] = await db
    .select({
      id: ctrSubmissions.id,
      cisId: ctrSubmissions.cisId,
      agentId: ctrSubmissions.agentId,
      status: ctrSubmissions.status,
      targetCustomerType: ctrSubmissions.targetCustomerType,
      reason: ctrSubmissions.reason,
      requiredDocSlots: ctrSubmissions.requiredDocSlots,
      requiredDocsNote: ctrSubmissions.requiredDocsNote,
      financeCreditLimit: ctrSubmissions.financeCreditLimit,
      financeCreditTerms: ctrSubmissions.financeCreditTerms,
      beforeSnapshot: ctrSubmissions.beforeSnapshot,
      // docs
      docValidId: ctrSubmissions.docValidId,
      docMayorsPermit: ctrSubmissions.docMayorsPermit,
      docSecDti: ctrSubmissions.docSecDti,
      docBirCertificate: ctrSubmissions.docBirCertificate,
      docLocationMap: ctrSubmissions.docLocationMap,
      docFinancialStatement: ctrSubmissions.docFinancialStatement,
      docBankStatement: ctrSubmissions.docBankStatement,
      docProofOfBilling: ctrSubmissions.docProofOfBilling,
      docLeaseContract: ctrSubmissions.docLeaseContract,
      docProofOfOwnership: ctrSubmissions.docProofOfOwnership,
      docStorePhoto: ctrSubmissions.docStorePhoto,
      docSupplierInvoice: ctrSubmissions.docSupplierInvoice,
      docSocialMedia: ctrSubmissions.docSocialMedia,
      docCompanyWebsite: ctrSubmissions.docCompanyWebsite,
      docIsoCertification: ctrSubmissions.docIsoCertification,
      docHalalCertificate: ctrSubmissions.docHalalCertificate,
      docOther: ctrSubmissions.docOther,
      createdAt: ctrSubmissions.createdAt,
      updatedAt: ctrSubmissions.updatedAt,
      cis: {
        id: cisSubmissions.id,
        tradeName: cisSubmissions.tradeName,
        customerType: cisSubmissions.customerType,
        contactPerson: cisSubmissions.contactPerson,
        cityMunicipality: cisSubmissions.cityMunicipality,
      },
    })
    .from(ctrSubmissions)
    .innerJoin(cisSubmissions, eq(ctrSubmissions.cisId, cisSubmissions.id))
    .where(eq(ctrSubmissions.id, id))
    .limit(1);

  if (!row) notFound();
  if (row.agentId !== userId) redirect("/agent/ctr");

  const events = await db
    .select({
      id: ctrEvents.id,
      action: ctrEvents.action,
      note: ctrEvents.note,
      createdAt: ctrEvents.createdAt,
      actorName: users.fullName,
    })
    .from(ctrEvents)
    .innerJoin(users, eq(ctrEvents.actorId, users.id))
    .where(eq(ctrEvents.ctrId, id))
    .orderBy(asc(ctrEvents.createdAt));

  const status = row.status;
  const isDraft = status === "draft";
  const isPendingDocs = status === "pending_documents";
  const isUnderReview = ["pending_legal_review", "pending_finance_review"].includes(status);
  const isPendingApproval = status === "pending_approval";
  const isApproved = status === "approved";
  const isDenied = status === "denied";
  const isTerminal = isApproved || isDenied;

  const requiredSlots = (row.requiredDocSlots as string[] | null) ?? [];
  const requiredSlotsDisplay = requiredSlots.map((key) => ({
    key,
    label: DOC_LABELS[key as keyof typeof DOC_LABELS] ?? key,
    files: ((row as Record<string, unknown>)[key] as FileEntry[] | null) ?? [],
  }));

  const deniedEvent = events.findLast((e) => e.action === "denied");
  const docsRequestedEvent = events.findLast((e) => e.action === "documents_requested");

  const reviewerLabel =
    row.targetCustomerType === "dealer" ? "Legal (Maam Cha)" : "Finance (Maam Nida)";

  const currentStep = getStepIndex(status);
  const fromTypeColor = CUSTOMER_TYPE_COLORS[row.cis.customerType ?? ""] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
  const toTypeColor = CUSTOMER_TYPE_COLORS[row.targetCustomerType ?? ""] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";

  const allSlots = [...SCORING_DOC_SLOTS, { key: "docOther", label: "Other Supporting Documents" }];
  const uploadedDocs = allSlots.filter((s) => {
    const files = ((row as Record<string, unknown>)[s.key] as FileEntry[] | null) ?? [];
    return files.length > 0;
  });
  const totalFiles = uploadedDocs.reduce((acc, s) => {
    const files = ((row as Record<string, unknown>)[s.key] as FileEntry[] | null) ?? [];
    return acc + files.length;
  }, 0);

  const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const formatDateTime = (d: Date) => d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[
        { label: "Type Reclassification", href: "/agent/ctr" },
        { label: row.cis.tradeName ?? "CTR Detail" },
      ]} />

      {/* ─── Header ─── */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 shrink-0">
              <GitMerge className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-zinc-900">{row.cis.tradeName ?? "CTR"}</h1>
                {statusBadge(status)}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Created {formatDate(row.createdAt)}
                {row.updatedAt > row.createdAt && <> &middot; Updated {formatDate(row.updatedAt)}</>}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Workflow stepper ─── */}
        {!isTerminal && (
          <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 py-3">
            <div className="flex items-center gap-0">
              {WORKFLOW_STEPS.map((step, i) => {
                const isActive = i === currentStep;
                const isComplete = i < currentStep;
                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex items-center gap-1.5">
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : isActive ? (
                        <CircleDot className="h-4 w-4 text-indigo-600 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-zinc-300 shrink-0" />
                      )}
                      <span className={`text-xs font-medium whitespace-nowrap ${
                        isActive ? "text-indigo-700" : isComplete ? "text-green-700" : "text-zinc-400"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className={`flex-1 h-px mx-2 ${isComplete ? "bg-green-300" : "bg-zinc-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Status / Action banner ─── */}
      {isApproved && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Reclassification Approved</p>
            <p className="text-sm text-green-700 mt-0.5">
              Customer type has been changed from{" "}
              <strong>{humanizeType(row.cis.customerType)}</strong> to{" "}
              <strong>{humanizeType(row.targetCustomerType)}</strong>. No further action needed.
            </p>
          </div>
        </div>
      )}

      {isDenied && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <XCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Reclassification Denied{deniedEvent?.actorName ? ` by ${deniedEvent.actorName}` : ""}
            </p>
            {deniedEvent?.note && (
              <p className="text-sm text-red-700 mt-1 bg-red-100/50 rounded-lg px-3 py-2 border border-red-100">{deniedEvent.note}</p>
            )}
          </div>
        </div>
      )}

      {isDraft && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Draft — Not Yet Submitted</p>
            <p className="text-sm text-amber-700 mt-0.5">
              This request is still a draft. Submit it to send it to <strong>{reviewerLabel}</strong> for review.
            </p>
          </div>
        </div>
      )}

      {isUnderReview && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
          <Hourglass className="h-5 w-5 shrink-0 text-indigo-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-800">Under Review by {reviewerLabel}</p>
            <p className="text-sm text-indigo-700 mt-0.5">
              Your request is being evaluated. You&apos;ll be notified if documents are needed or when a decision is made.
            </p>
          </div>
        </div>
      )}

      {isPendingApproval && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-5 py-4">
          <Hourglass className="h-5 w-5 shrink-0 text-sky-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sky-800">Awaiting Senior Approver Decision</p>
            <p className="text-sm text-sky-700 mt-0.5">
              The reviewer has forwarded this request. A senior approver will make the final decision.
            </p>
          </div>
        </div>
      )}

      {isPendingDocs && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Action Required — Upload Documents</p>
            <p className="text-sm text-orange-700 mt-0.5">
              The reviewer requested additional documents. Upload them below and resubmit.
            </p>
          </div>
        </div>
      )}

      {/* ─── Main content grid ─── */}
      <div className="grid gap-5 lg:grid-cols-4">

        {/* ─── Left column: Details ─── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Reclassification details */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3">
              <h2 className="text-sm font-semibold text-zinc-700">Request Details</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Customer info row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Customer</p>
                  <p className="text-sm font-semibold text-zinc-900">{row.cis.tradeName ?? "—"}</p>
                  {row.cis.contactPerson && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <User className="h-3 w-3 shrink-0" />
                      {row.cis.contactPerson}
                    </div>
                  )}
                  {row.cis.cityMunicipality && (
                    <p className="text-xs text-zinc-400">{row.cis.cityMunicipality}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Assigned Reviewer</p>
                  <p className="text-sm font-semibold text-zinc-900">{reviewerLabel}</p>
                  <p className="text-xs text-zinc-400">
                    {row.targetCustomerType === "dealer" ? "Dealer reclassifications route to Legal" : "Non-dealer reclassifications route to Finance"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Type Change</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${fromTypeColor}`}>
                      {humanizeType(row.cis.customerType)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-300 shrink-0" />
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${toTypeColor}`}>
                      {humanizeType(row.targetCustomerType)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason */}
              {row.reason && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Reason for Reclassification</p>
                  <div className="rounded-lg bg-zinc-50 border border-zinc-100 px-4 py-3">
                    <p className="text-sm text-zinc-700 leading-relaxed">{row.reason}</p>
                  </div>
                </div>
              )}

              {/* Metadata row */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
                  Created {formatDate(row.createdAt)}
                </div>
                {row.updatedAt > row.createdAt && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                    Last updated {formatDate(row.updatedAt)}
                  </div>
                )}
                <Link
                  href={`/agent/${row.cisId}`}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-auto"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Original CIS
                </Link>
              </div>
            </div>
          </div>

          {/* Agent actions (draft submit / pending docs upload) */}
          <CtrAgentActions
            ctrId={id}
            status={status}
            cisId={row.cisId}
            requiredSlotsDisplay={requiredSlotsDisplay}
            requiredDocsNote={(row.requiredDocsNote as string | null) ?? null}
            docsRequestedNote={docsRequestedEvent?.note ?? null}
          />

          {/* Pending docs required list */}
          {isPendingDocs && requiredSlotsDisplay.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-orange-100 bg-orange-50">
                <Tag className="h-4 w-4 text-orange-600 shrink-0" />
                <h2 className="text-sm font-semibold text-orange-800">Required Documents</h2>
                {row.requiredDocsNote && (
                  <span className="text-xs text-orange-600 ml-auto">{row.requiredDocsNote}</span>
                )}
              </div>
              <div className="p-4 space-y-2">
                {requiredSlotsDisplay.map((slot) => (
                  <div key={slot.key} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3.5 py-2.5">
                    <span className="text-sm text-zinc-700">{slot.label}</span>
                    {slot.files.length > 0 ? (
                      <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {slot.files.length} file{slot.files.length !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-orange-500 font-semibold">Needs upload</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded documents */}
          {!isDraft && uploadedDocs.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-700">Submitted Documents</h2>
                <span className="ml-auto text-xs text-zinc-500">
                  {totalFiles} file{totalFiles !== 1 ? "s" : ""} in {uploadedDocs.length} categor{uploadedDocs.length !== 1 ? "ies" : "y"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
                {uploadedDocs.map((slot) => {
                  const files = ((row as Record<string, unknown>)[slot.key] as FileEntry[]);
                  return (
                    <div key={slot.key} className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-zinc-500 mb-2">{slot.label}</p>
                      <ul className="space-y-1.5">
                        {files.map((f) => (
                          <li key={f.url} className="flex items-center gap-2 group">
                            <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <a href={f.url} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-zinc-700 group-hover:text-indigo-600 hover:underline truncate flex-1">
                              {f.name}
                            </a>
                            <ExternalLink className="h-3 w-3 text-zinc-300 group-hover:text-indigo-400 shrink-0" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ─── Right column: Activity timeline ─── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Quick info card */}
          {!isTerminal && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">What Happens Next</h3>
              {isDraft && (
                <div className="space-y-2 text-sm text-zinc-600">
                  <div className="flex gap-2">
                    <span className="text-indigo-500 font-bold shrink-0">1.</span>
                    <span>Submit this request for review</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-400 font-bold shrink-0">2.</span>
                    <span className="text-zinc-400">{reviewerLabel} reviews your request</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-400 font-bold shrink-0">3.</span>
                    <span className="text-zinc-400">Senior Approver makes final decision</span>
                  </div>
                </div>
              )}
              {(isUnderReview || isPendingDocs) && (
                <div className="space-y-2 text-sm text-zinc-600">
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-400">Request submitted</span>
                  </div>
                  <div className="flex gap-2">
                    <CircleDot className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{isPendingDocs ? "Upload required documents and resubmit" : `${reviewerLabel} is reviewing`}</span>
                  </div>
                  <div className="flex gap-2">
                    <Circle className="h-4 w-4 text-zinc-300 shrink-0 mt-0.5" />
                    <span className="text-zinc-400">Senior Approver decides</span>
                  </div>
                </div>
              )}
              {isPendingApproval && (
                <div className="space-y-2 text-sm text-zinc-600">
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-400">Request submitted</span>
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-400">Reviewer forwarded</span>
                  </div>
                  <div className="flex gap-2">
                    <CircleDot className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>Awaiting Senior Approver decision</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity timeline */}
          {events.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-700">Activity</h2>
                <span className="text-xs text-zinc-400">{events.length} event{events.length !== 1 ? "s" : ""}</span>
              </div>
              <ol className="p-4 space-y-0">
                {events.map((ev, i) => {
                  const iconBg = ev.action === "approved" ? "bg-green-100"
                    : ev.action === "denied" ? "bg-red-100"
                    : ev.action === "documents_requested" ? "bg-orange-100"
                    : ev.action === "forwarded_to_approver" ? "bg-sky-100"
                    : "bg-zinc-100";
                  const icon = ev.action === "approved" ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                    : ev.action === "denied" ? <XCircle className="h-3 w-3 text-red-600" />
                    : ev.action === "documents_requested" ? <AlertTriangle className="h-3 w-3 text-orange-600" />
                    : ev.action === "forwarded_to_approver" ? <ArrowRight className="h-3 w-3 text-sky-600" />
                    : <Send className="h-3 w-3 text-zinc-500" />;
                  return (
                    <li key={ev.id} className="flex items-start gap-2.5">
                      <div className="flex flex-col items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                          {icon}
                        </div>
                        {i < events.length - 1 && <div className="w-px flex-1 bg-zinc-100 min-h-7" />}
                      </div>
                      <div className="pb-3 min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-800 leading-snug">
                          {ACTION_LABELS[ev.action] ?? ev.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {ev.actorName} &middot; {formatDateTime(ev.createdAt)}
                        </p>
                        {ev.note && (
                          <p className="mt-1.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg px-2.5 py-2 leading-relaxed">
                            {ev.note}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* No activity yet (draft) */}
          {events.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-5 text-center">
              <MessageSquare className="h-5 w-5 text-zinc-300 mx-auto" />
              <p className="text-xs text-zinc-400 mt-2">No activity yet. Submit the request to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
