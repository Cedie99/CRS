import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, ctrEvents, cisSubmissions, users } from "@/lib/db/schema";
import { SCORING_DOC_SLOTS, type FileEntry } from "@/lib/doc-types";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  User, Tag, ExternalLink, FileText,
  MessageSquare, CheckCircle2, Send, XCircle,
  GitMerge, MapPin, ArrowRight,
} from "lucide-react";
import { CtrReviewerPanel } from "@/components/ctr-reviewer-panel";

export default async function FinanceCtrDetailPage({
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

  const isLegal = role === "legal_approver";
  const backHref = isLegal ? "/legal/ctr" : "/finance/ctr";
  const cisHref = isLegal ? `/legal/${id}` : `/finance/${id}`;

  const [ctr] = await db
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
    })
    .from(ctrSubmissions)
    .where(eq(ctrSubmissions.id, id))
    .limit(1);

  if (!ctr) notFound();

  // Access control: finance handles non-dealer; legal handles dealer
  if (role === "finance_reviewer" && ctr.targetCustomerType === "dealer") notFound();
  if (role === "legal_approver" && ctr.targetCustomerType !== "dealer") notFound();

  const activeStatuses = [
    "pending_finance_review", "pending_legal_review", "pending_documents",
    "approved", "denied",
  ];
  if (!activeStatuses.includes(ctr.status)) notFound();

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      customerType: cisSubmissions.customerType,
      cityMunicipality: cisSubmissions.cityMunicipality,
      agentCode: cisSubmissions.agentCode,
      businessType: cisSubmissions.businessType,
      financeCreditTerms: cisSubmissions.financeCreditTerms,
      financeCreditLimit: cisSubmissions.financeCreditLimit,
    })
    .from(cisSubmissions)
    .where(eq(cisSubmissions.id, ctr.cisId))
    .limit(1);

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

  const docSlots = [...SCORING_DOC_SLOTS, { key: "docOther", label: "Other Supporting Documents" }];
  const requiredSlots = (ctr.requiredDocSlots as string[] | null) ?? [];
  const slotsToShow = requiredSlots.length > 0
    ? docSlots.filter((s) => requiredSlots.includes(s.key))
    : docSlots;
  const uploadedSlots = slotsToShow.filter(
    (slot) => ((ctr as Record<string, unknown>)[slot.key] as FileEntry[] | null)?.length
  );
  const emptySlots = slotsToShow.filter(
    (slot) => !((ctr as Record<string, unknown>)[slot.key] as FileEntry[] | null)?.length
  );

  const isActionable =
    (role === "finance_reviewer" && ctr.status === "pending_finance_review") ||
    (role === "legal_approver" && ctr.status === "pending_legal_review");

  const accentClass = isLegal
    ? "bg-purple-50 text-purple-600"
    : "bg-amber-50 text-amber-600";

  const actionLabels: Record<string, string> = {
    submitted: "Submitted for review",
    resubmitted: "Documents uploaded — resubmitted",
    documents_requested: "Documents requested",
    forwarded_to_approver: "Forwarded to Senior Approver",
    approved: "Approved",
    denied: "Denied",
  };

  function humanizeType(val: string | null) {
    if (!val) return "—";
    return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: "Type Reclassification", href: backHref },
        { label: cis?.tradeName ?? "CTR Detail" },
      ]} />

      {/* Header — title row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`rounded-lg p-2 shrink-0 ${accentClass}`}>
            <GitMerge className={`h-4.5 w-4.5 ${isLegal ? "text-purple-600" : "text-amber-600"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-zinc-900 truncate">
                {cis?.tradeName ?? "Type Reclassification"}
              </h1>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap
                ${isLegal ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {ctr.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-zinc-500">
              <span className="capitalize">{humanizeType(cis?.customerType ?? null)}</span>
              <ArrowRight className="h-3 w-3 text-zinc-400" />
              <span className="font-semibold text-zinc-700 capitalize">{humanizeType(ctr.targetCustomerType)}</span>
            </div>
          </div>
        </div>
        <Link
          href={`${isLegal ? "/legal" : "/finance"}/${ctr.cisId}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 shadow-sm shrink-0 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          View CIS
        </Link>
      </div>

      {/* Customer details — table layout */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[11%]" />
            <col className="w-[22%]" />
            <col className="w-[11%]" />
            <col className="w-[22%]" />
            <col className="w-[11%]" />
            <col className="w-[23%]" />
          </colgroup>
          <tbody className="divide-y divide-zinc-100">
            <tr>
              <td className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-50/60 align-middle">Contact</td>
              <td className="px-3 py-2.5 font-medium text-zinc-800 align-middle">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3 w-3 text-zinc-400" />
                  {cis?.contactPerson ?? "—"}
                </span>
              </td>
              <td className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-50/60 border-l border-zinc-100 align-middle">Location</td>
              <td className="px-3 py-2.5 font-medium text-zinc-800 align-middle">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-zinc-400" />
                  {cis?.cityMunicipality ?? "—"}
                </span>
              </td>
              <td className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-50/60 border-l border-zinc-100 align-middle">Agent Code</td>
              <td className="px-3 py-2.5 font-medium text-zinc-800 align-middle">{cis?.agentCode ?? "—"}</td>
            </tr>
            <tr>
              <td className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-50/60 align-middle">Current Type</td>
              <td className="px-3 py-2.5 font-medium text-zinc-800 capitalize align-middle">{humanizeType(cis?.customerType ?? null)}</td>
              <td className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-50/60 border-l border-zinc-100 align-middle">Target Type</td>
              <td className="px-3 py-2.5 font-semibold text-zinc-900 capitalize align-middle">{humanizeType(ctr.targetCustomerType)}</td>
              <td className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-50/60 border-l border-zinc-100 align-middle">Business Type</td>
              <td className="px-3 py-2.5 font-medium text-zinc-800 capitalize align-middle">{cis?.businessType ?? "—"}</td>
            </tr>
            {ctr.reason && (
              <tr>
                <td className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-50/60 align-top">
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Reason
                  </span>
                </td>
                <td colSpan={5} className="px-3 py-2.5 text-zinc-700">{ctr.reason}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-5 items-start">
        {/* Left: submitted docs + activity */}
        <div className="lg:col-span-3 space-y-4">
          {/* Submitted documents — compact */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-700">Submitted Documents</h2>
              </div>
              <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-zinc-100 text-zinc-600">
                {uploadedSlots.length} / {slotsToShow.length}
              </span>
            </div>
            <div className="p-4">
              {uploadedSlots.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 py-6 text-center">
                  <FileText className="mx-auto h-6 w-6 text-zinc-300" />
                  <p className="mt-1.5 text-sm text-zinc-500">No documents submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadedSlots.map((slot) => {
                    const files = (ctr as Record<string, unknown>)[slot.key] as FileEntry[];
                    return (
                      <div key={slot.key} className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2">
                        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">{slot.label}</p>
                        <div className="mt-1 space-y-1">
                          {files.map((f) => (
                            <div key={f.url} className="flex items-center gap-2 text-sm">
                              <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              <a
                                href={f.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-700 hover:text-zinc-900 hover:underline truncate flex-1"
                              >
                                {f.name}
                              </a>
                              {f.uploadedAt && (
                                <span className="text-[11px] text-zinc-400 shrink-0">
                                  {new Date(f.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {emptySlots.length > 0 && (
                    <details className="group pt-1">
                      <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 list-none flex items-center gap-1 select-none">
                        <span className="group-open:hidden">&#9656;</span>
                        <span className="hidden group-open:inline">&#9662;</span>
                        {emptySlots.length} slot{emptySlots.length !== 1 ? "s" : ""} not submitted
                      </summary>
                      <ul className="mt-1.5 space-y-0.5 pl-3 border-l-2 border-zinc-100">
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

          {/* Activity timeline */}
          {events.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
                <h2 className="text-sm font-semibold text-zinc-700">Activity</h2>
              </div>
              <ol className="px-4 py-3 space-y-3">
                {events.map((ev, i) => (
                  <li key={ev.id} className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center">
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0
                        ${ev.action === "approved" ? "bg-green-100"
                          : ev.action === "denied" ? "bg-red-100"
                          : "bg-zinc-100"}`}>
                        {ev.action === "approved"
                          ? <CheckCircle2 className="h-2.5 w-2.5 text-green-600" />
                          : ev.action === "denied"
                          ? <XCircle className="h-2.5 w-2.5 text-red-600" />
                          : <Send className="h-2.5 w-2.5 text-zinc-500" />}
                      </div>
                      {i < events.length - 1 && <div className="w-px flex-1 bg-zinc-100 mt-1 min-h-2.5" />}
                    </div>
                    <div className="pb-0.5 min-w-0">
                      <p className="text-xs font-medium text-zinc-800 leading-5">
                        {actionLabels[ev.action] ?? ev.action.replace(/_/g, " ")}
                        <span className="font-normal text-zinc-400 ml-1.5">by {ev.actorName}</span>
                      </p>
                      {ev.note && (
                        <p className="mt-0.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 rounded px-2 py-1">
                          {ev.note}
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-400 mt-0.5">
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

        {/* Right: reviewer actions — sticky so always visible */}
        <div className="lg:col-span-2 lg:sticky lg:top-4">
          {isActionable ? (
            <CtrReviewerPanel
              ctrId={id}
              initialCreditLimit={ctr.financeCreditLimit ?? ""}
              initialCreditTerms={ctr.financeCreditTerms ?? ""}
              backHref={backHref}
              isLegal={isLegal}
            />
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-zinc-700">Status</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  This CTR is {ctr.status.replace(/_/g, " ")}.
                </p>
              </div>
              <div className="p-5 space-y-3">
                {ctr.financeCreditLimit && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Credit Limit</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{ctr.financeCreditLimit}</p>
                  </div>
                )}
                {ctr.financeCreditTerms && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Credit Terms</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900 capitalize">
                      {ctr.financeCreditTerms.replace(/_/g, " ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
