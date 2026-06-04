import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ctrSubmissions, ctrEvents, cisSubmissions, users } from "@/lib/db/schema";
import { SCORING_DOC_SLOTS, type FileEntry } from "@/lib/doc-types";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  Building2, User, Tag, ExternalLink, FileText,
  MessageSquare, CheckCircle2, Send, XCircle,
  GitMerge, MapPin, ArrowRight,
} from "lucide-react";
import { CtrApproverActions } from "./ctr-approver-actions";

export const metadata = { title: "CTR Detail — Approver — CRS" };

export default async function ApproverCtrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role } = session.user as { role: string };
  if (role !== "senior_approver" && role !== "admin") redirect("/approver");

  const [ctr] = await db
    .select({
      id: ctrSubmissions.id,
      cisId: ctrSubmissions.cisId,
      agentId: ctrSubmissions.agentId,
      status: ctrSubmissions.status,
      targetCustomerType: ctrSubmissions.targetCustomerType,
      reason: ctrSubmissions.reason,
      financeCreditLimit: ctrSubmissions.financeCreditLimit,
      financeCreditTerms: ctrSubmissions.financeCreditTerms,
      beforeSnapshot: ctrSubmissions.beforeSnapshot,
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
  if (ctr.status !== "pending_approval" && ctr.status !== "approved" && ctr.status !== "denied") notFound();

  const [cis] = await db
    .select({
      id: cisSubmissions.id,
      tradeName: cisSubmissions.tradeName,
      contactPerson: cisSubmissions.contactPerson,
      customerType: cisSubmissions.customerType,
      cityMunicipality: cisSubmissions.cityMunicipality,
      postalCode: cisSubmissions.postalCode,
      agentCode: cisSubmissions.agentCode,
      businessType: cisSubmissions.businessType,
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
  const uploadedSlots = docSlots.filter(
    (slot) => ((ctr as Record<string, unknown>)[slot.key] as FileEntry[] | null)?.length
  );

  const canAct = ctr.status === "pending_approval";

  const actionLabels: Record<string, string> = {
    submitted: "Submitted for review",
    resubmitted: "Documents resubmitted",
    documents_requested: "Documents requested",
    forwarded_to_approver: "Forwarded to Senior Approver",
    approved: "Approved",
    denied: "Denied",
  };

  function humanizeType(val: string | null) {
    if (!val) return "—";
    return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const deniedEvent = events.findLast((e) => e.action === "denied");

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[
        { label: "CTR Queue", href: "/approver/ctr" },
        { label: cis?.tradeName ?? "CTR Detail" },
      ]} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-sky-50 p-2.5 shrink-0">
          <GitMerge className="h-5 w-5 text-sky-600" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-900">{cis?.tradeName ?? "CTR"}</h1>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
              {ctr.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-sm text-zinc-500">
            <span className="capitalize">{humanizeType(cis?.customerType ?? null)}</span>
            <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-semibold text-zinc-700 capitalize">{humanizeType(ctr.targetCustomerType)}</span>
          </div>
        </div>
      </div>

      {ctr.status === "approved" && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Approved — Customer Type Updated</p>
            <p className="text-sm text-green-700 mt-0.5">
              Customer type changed to <strong>{humanizeType(ctr.targetCustomerType)}</strong>.
            </p>
          </div>
        </div>
      )}

      {ctr.status === "denied" && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <XCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Denied</p>
            {deniedEvent?.note && <p className="text-sm text-red-700 mt-0.5">{deniedEvent.note}</p>}
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Left */}
        <div className="xl:col-span-3 min-w-0 space-y-5">
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
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Current Type</p>
                  <p className="mt-0.5 font-medium text-zinc-800 capitalize">{humanizeType(cis?.customerType ?? null)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Target Type</p>
                  <p className="mt-0.5 font-semibold text-zinc-900 capitalize">{humanizeType(ctr.targetCustomerType)}</p>
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
              </div>

              {ctr.reason && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Reason</p>
                  </div>
                  <p className="text-sm text-zinc-700">{ctr.reason}</p>
                </div>
              )}

              {(ctr.financeCreditTerms || ctr.financeCreditLimit) && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                    Credit Evaluation (set by reviewer)
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    {ctr.financeCreditTerms && (
                      <span className="font-semibold text-zinc-800 capitalize">
                        {ctr.financeCreditTerms.replace(/_/g, " ")}
                      </span>
                    )}
                    {ctr.financeCreditLimit && (
                      <span className="text-zinc-600">Limit: {ctr.financeCreditLimit}</span>
                    )}
                  </div>
                </div>
              )}

              <Link
                href={`/approver/${ctr.cisId}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                <ExternalLink className="h-3 w-3" />
                View original CIS
              </Link>
            </div>
          </div>

          {/* Documents */}
          {uploadedSlots.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-zinc-400" />
                  <h2 className="text-sm font-semibold text-zinc-700">Submitted Documents</h2>
                </div>
                <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-zinc-100 text-zinc-600">
                  {uploadedSlots.length} slot{uploadedSlots.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="p-5 space-y-3">
                {uploadedSlots.map((slot) => {
                  const files = (ctr as Record<string, unknown>)[slot.key] as FileEntry[];
                  return (
                    <div key={slot.key} className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 space-y-2">
                      <p className="text-xs font-semibold text-zinc-600">{slot.label}</p>
                      <ul className="space-y-1.5">
                        {files.map((f) => (
                          <li key={f.url} className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <a href={f.url} target="_blank" rel="noopener noreferrer"
                              className="text-sm text-zinc-700 hover:underline truncate flex-1">
                              {f.name}
                            </a>
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

        {/* Right */}
        <div className="xl:col-span-2 min-w-0 space-y-5">
          {canAct && <CtrApproverActions ctrId={id} />}

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
