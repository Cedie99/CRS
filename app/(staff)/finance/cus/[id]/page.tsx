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
  ExternalLink,
  FileText,
  MessageSquare,
  CheckCircle2,
  Send,
  XCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { CusFinancePanel } from "./cus-finance-panel";
import { CusPrintForm } from "./cus-print-form";

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
    .select({
      id: cusSubmissions.id,
      cisId: cusSubmissions.cisId,
      agentId: cusSubmissions.agentId,
      status: cusSubmissions.status,
      note: cusSubmissions.note,
      financeMetricPoints: cusSubmissions.financeMetricPoints,
      docSirRestySigned: cusSubmissions.docSirRestySigned,
      financeCreditTerms: cusSubmissions.financeCreditTerms,
      financeCreditLimit: cusSubmissions.financeCreditLimit,
      beforeSnapshot: cusSubmissions.beforeSnapshot,
      newTradeName: cusSubmissions.newTradeName,
      newContactPerson: cusSubmissions.newContactPerson,
      newContactNumber: cusSubmissions.newContactNumber,
      newTelephoneNumber: cusSubmissions.newTelephoneNumber,
      newEmailAddress: cusSubmissions.newEmailAddress,
      newWebsite: cusSubmissions.newWebsite,
      newNumberOfEmployees: cusSubmissions.newNumberOfEmployees,
      newCustomerType: cusSubmissions.newCustomerType,
      newBusinessAddress: cusSubmissions.newBusinessAddress,
      newCityMunicipality: cusSubmissions.newCityMunicipality,
      newLandmarks: cusSubmissions.newLandmarks,
      newDeliveryAddress: cusSubmissions.newDeliveryAddress,
      newDeliveryLandmarks: cusSubmissions.newDeliveryLandmarks,
      newDeliveryMobile: cusSubmissions.newDeliveryMobile,
      newDeliveryTelephone: cusSubmissions.newDeliveryTelephone,
      newCorporateName: cusSubmissions.newCorporateName,
      newDateOfBusinessReg: cusSubmissions.newDateOfBusinessReg,
      newTinNumber: cusSubmissions.newTinNumber,
      newBusinessType: cusSubmissions.newBusinessType,
      newLineOfBusiness: cusSubmissions.newLineOfBusiness,
      newLineOfBusinessOther: cusSubmissions.newLineOfBusinessOther,
      newBusinessActivity: cusSubmissions.newBusinessActivity,
      newBusinessActivityOther: cusSubmissions.newBusinessActivityOther,
      newSalesChannel: cusSubmissions.newSalesChannel,
      newPaymentTerms: cusSubmissions.newPaymentTerms,
      newOwners: cusSubmissions.newOwners,
      newOfficers: cusSubmissions.newOfficers,
      newBusinessLife: cusSubmissions.newBusinessLife,
      newHowLongAtAddress: cusSubmissions.newHowLongAtAddress,
      newNumberOfBranches: cusSubmissions.newNumberOfBranches,
      newGovCertifications: cusSubmissions.newGovCertifications,
      newTradeReferences: cusSubmissions.newTradeReferences,
      newBankReferences: cusSubmissions.newBankReferences,
      newAchievements: cusSubmissions.newAchievements,
      newOtherMerits: cusSubmissions.newOtherMerits,
      newAdditionalNotes: cusSubmissions.newAdditionalNotes,
      docValidId: cusSubmissions.docValidId,
      docMayorsPermit: cusSubmissions.docMayorsPermit,
      docSecDti: cusSubmissions.docSecDti,
      docBirCertificate: cusSubmissions.docBirCertificate,
      docLocationMap: cusSubmissions.docLocationMap,
      docFinancialStatement: cusSubmissions.docFinancialStatement,
      docBankStatement: cusSubmissions.docBankStatement,
      docProofOfBilling: cusSubmissions.docProofOfBilling,
      docLeaseContract: cusSubmissions.docLeaseContract,
      docProofOfOwnership: cusSubmissions.docProofOfOwnership,
      docStorePhoto: cusSubmissions.docStorePhoto,
      docSupplierInvoice: cusSubmissions.docSupplierInvoice,
      docSocialMedia: cusSubmissions.docSocialMedia,
      docCompanyWebsite: cusSubmissions.docCompanyWebsite,
      docIsoCertification: cusSubmissions.docIsoCertification,
      docHalalCertificate: cusSubmissions.docHalalCertificate,
      docOther: cusSubmissions.docOther,
      createdAt: cusSubmissions.createdAt,
      updatedAt: cusSubmissions.updatedAt,
    })
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
      contactNumber: cisSubmissions.contactNumber,
      telephoneNumber: cisSubmissions.telephoneNumber,
      emailAddress: cisSubmissions.emailAddress,
      website: cisSubmissions.website,
      numberOfEmployees: cisSubmissions.numberOfEmployees,
      customerType: cisSubmissions.customerType,
      businessAddress: cisSubmissions.businessAddress,
      cityMunicipality: cisSubmissions.cityMunicipality,
      landmarks: cisSubmissions.landmarks,
      deliveryAddress: cisSubmissions.deliveryAddress,
      deliveryLandmarks: cisSubmissions.deliveryLandmarks,
      deliveryMobile: cisSubmissions.deliveryMobile,
      deliveryTelephone: cisSubmissions.deliveryTelephone,
      corporateName: cisSubmissions.corporateName,
      dateOfBusinessReg: cisSubmissions.dateOfBusinessReg,
      tinNumber: cisSubmissions.tinNumber,
      lineOfBusiness: cisSubmissions.lineOfBusiness,
      lineOfBusinessOther: cisSubmissions.lineOfBusinessOther,
      businessActivity: cisSubmissions.businessActivity,
      businessActivityOther: cisSubmissions.businessActivityOther,
      salesChannel: cisSubmissions.salesChannel,
      paymentTerms: cisSubmissions.paymentTerms,
      owners: cisSubmissions.owners,
      officers: cisSubmissions.officers,
      businessLife: cisSubmissions.businessLife,
      howLongAtAddress: cisSubmissions.howLongAtAddress,
      numberOfBranches: cisSubmissions.numberOfBranches,
      govCertifications: cisSubmissions.govCertifications,
      tradeReferences: cisSubmissions.tradeReferences,
      bankReferences: cisSubmissions.bankReferences,
      achievements: cisSubmissions.achievements,
      otherMerits: cisSubmissions.otherMerits,
      additionalNotes: cisSubmissions.additionalNotes,
      status: cisSubmissions.status,
      agentCode: cisSubmissions.agentCode,
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

  function humanize(v: string | null | undefined) {
    if (!v) return null;
    return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function ownersSummary(arr: any): string | null {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((o: { name?: string; percentage?: string }) =>
      [o.name, o.percentage ? `(${o.percentage})` : ""].filter(Boolean).join(" ")
    ).join(", ");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function officersSummary(arr: any): string | null {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((o: { name?: string; position?: string }) =>
      [o.name, o.position ? `(${o.position})` : ""].filter(Boolean).join(" ")
    ).join(", ");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function tradeRefSummary(arr: any): string | null {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((r: { company?: string }) => r.company).filter(Boolean).join(", ");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function bankRefSummary(arr: any): string | null {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map((r: { bank?: string; branch?: string }) =>
      [r.bank, r.branch].filter(Boolean).join(" - ")
    ).join(", ");
  }

  // Build the before/after change rows for approved CUS
  type ChangeRow = { label: string; before: string | null; after: string };
  const changeRows: ChangeRow[] = [];
  if (cus.status === "approved" && cus.beforeSnapshot) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = cus.beforeSnapshot as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Fmt = (v: any) => string | null;
    const CHANGE_FIELDS: Array<{ label: string; cisKey: string; cusValue: string | null; fmt?: Fmt }> = [
      { label: "Trade Name",          cisKey: "tradeName",            cusValue: cus.newTradeName },
      { label: "Corporate Name",      cisKey: "corporateName",        cusValue: cus.newCorporateName },
      { label: "Customer Type",       cisKey: "customerType",         cusValue: humanize(cus.newCustomerType),       fmt: humanize },
      { label: "Business Type",       cisKey: "businessType",         cusValue: humanize(cus.newBusinessType),       fmt: humanize },
      { label: "Date of Reg.",        cisKey: "dateOfBusinessReg",    cusValue: cus.newDateOfBusinessReg },
      { label: "No. of Employees",    cisKey: "numberOfEmployees",    cusValue: cus.newNumberOfEmployees },
      { label: "TIN Number",          cisKey: "tinNumber",            cusValue: cus.newTinNumber },
      { label: "Contact Person",      cisKey: "contactPerson",        cusValue: cus.newContactPerson },
      { label: "Mobile",              cisKey: "contactNumber",        cusValue: cus.newContactNumber },
      { label: "Telephone",           cisKey: "telephoneNumber",      cusValue: cus.newTelephoneNumber },
      { label: "Email",               cisKey: "emailAddress",         cusValue: cus.newEmailAddress },
      { label: "Website",             cisKey: "website",              cusValue: cus.newWebsite },
      { label: "Business Address",    cisKey: "businessAddress",      cusValue: cus.newBusinessAddress },
      { label: "City/Municipality",   cisKey: "cityMunicipality",     cusValue: cus.newCityMunicipality },
      { label: "Landmarks",           cisKey: "landmarks",            cusValue: cus.newLandmarks },
      { label: "Delivery Address",    cisKey: "deliveryAddress",      cusValue: cus.newDeliveryAddress },
      { label: "Delivery Landmarks",  cisKey: "deliveryLandmarks",    cusValue: cus.newDeliveryLandmarks },
      { label: "Delivery Mobile",     cisKey: "deliveryMobile",       cusValue: cus.newDeliveryMobile },
      { label: "Delivery Tel",        cisKey: "deliveryTelephone",    cusValue: cus.newDeliveryTelephone },
      { label: "Line of Business",    cisKey: "lineOfBusiness",       cusValue: humanize(cus.newLineOfBusiness),     fmt: humanize },
      { label: "Business Activity",   cisKey: "businessActivity",     cusValue: humanize(cus.newBusinessActivity),   fmt: humanize },
      { label: "Sales Channel",       cisKey: "salesChannel",         cusValue: humanize(cus.newSalesChannel),       fmt: humanize },
      { label: "Payment Terms",       cisKey: "paymentTerms",         cusValue: humanize(cus.newPaymentTerms),       fmt: humanize },
      { label: "Owners",              cisKey: "owners",               cusValue: ownersSummary(cus.newOwners),        fmt: ownersSummary },
      { label: "Officers",            cisKey: "officers",             cusValue: officersSummary(cus.newOfficers),    fmt: officersSummary },
      { label: "Business Life",       cisKey: "businessLife",         cusValue: cus.newBusinessLife },
      { label: "How Long at Address", cisKey: "howLongAtAddress",     cusValue: cus.newHowLongAtAddress },
      { label: "No. of Branches",     cisKey: "numberOfBranches",     cusValue: cus.newNumberOfBranches },
      { label: "Gov. Certifications", cisKey: "govCertifications",    cusValue: cus.newGovCertifications },
      { label: "Trade References",    cisKey: "tradeReferences",      cusValue: tradeRefSummary(cus.newTradeReferences), fmt: tradeRefSummary },
      { label: "Bank References",     cisKey: "bankReferences",       cusValue: bankRefSummary(cus.newBankReferences),   fmt: bankRefSummary },
      { label: "Achievements",        cisKey: "achievements",         cusValue: cus.newAchievements },
      { label: "Other Merits",        cisKey: "otherMerits",          cusValue: cus.newOtherMerits },
      { label: "Additional Notes",    cisKey: "additionalNotes",      cusValue: cus.newAdditionalNotes },
    ];
    for (const { label, cisKey, cusValue, fmt } of CHANGE_FIELDS) {
      if (cusValue && cisKey in snap) {
        const raw = snap[cisKey];
        const before = fmt ? fmt(raw) : (raw != null ? String(raw) : null);
        changeRows.push({ label, before: before || null, after: cusValue });
      }
    }
  }

  const accentBorder = isLegal ? "border-purple-200" : "border-amber-200";
  const accentBg = isLegal ? "bg-purple-50" : "bg-amber-50";
  const accentText = isLegal ? "text-purple-700" : "text-amber-700";
  const accentIcon = isLegal ? "text-purple-500" : "text-amber-500";
  const accentRowBg = isLegal ? "bg-purple-50/60" : "bg-amber-50/60";

  // All fields shown in the comparison table
  type CompRow = { label: string; current: string | null; requested: string | null };
  const compRows: CompRow[] = [
    { label: "Trade Name",          current: cis?.tradeName ?? null,                       requested: cus.newTradeName ?? null },
    { label: "Corporate Name",      current: cis?.corporateName ?? null,                   requested: cus.newCorporateName ?? null },
    { label: "Customer Type",       current: humanize(cis?.customerType) ?? null,          requested: humanize(cus.newCustomerType) ?? null },
    { label: "Business Type",       current: humanize(cis?.businessType) ?? null,          requested: humanize(cus.newBusinessType) ?? null },
    { label: "Date of Reg.",        current: cis?.dateOfBusinessReg ?? null,               requested: cus.newDateOfBusinessReg ?? null },
    { label: "No. of Employees",    current: cis?.numberOfEmployees ?? null,               requested: cus.newNumberOfEmployees ?? null },
    { label: "TIN Number",          current: cis?.tinNumber ?? null,                       requested: cus.newTinNumber ?? null },
    { label: "Contact Person",      current: cis?.contactPerson ?? null,                   requested: cus.newContactPerson ?? null },
    { label: "Mobile",              current: cis?.contactNumber ?? null,                   requested: cus.newContactNumber ?? null },
    { label: "Telephone",           current: cis?.telephoneNumber ?? null,                 requested: cus.newTelephoneNumber ?? null },
    { label: "Email",               current: cis?.emailAddress ?? null,                    requested: cus.newEmailAddress ?? null },
    { label: "Website",             current: cis?.website ?? null,                         requested: cus.newWebsite ?? null },
    { label: "Business Address",    current: cis?.businessAddress ?? null,                 requested: cus.newBusinessAddress ?? null },
    { label: "City / Municipality", current: cis?.cityMunicipality ?? null,                requested: cus.newCityMunicipality ?? null },
    { label: "Landmarks",           current: cis?.landmarks ?? null,                       requested: cus.newLandmarks ?? null },
    { label: "Delivery Address",    current: cis?.deliveryAddress ?? null,                 requested: cus.newDeliveryAddress ?? null },
    { label: "Delivery Landmarks",  current: cis?.deliveryLandmarks ?? null,               requested: cus.newDeliveryLandmarks ?? null },
    { label: "Delivery Mobile",     current: cis?.deliveryMobile ?? null,                  requested: cus.newDeliveryMobile ?? null },
    { label: "Delivery Tel",        current: cis?.deliveryTelephone ?? null,               requested: cus.newDeliveryTelephone ?? null },
    { label: "Line of Business",    current: humanize(cis?.lineOfBusiness) ?? null,        requested: humanize(cus.newLineOfBusiness) ?? null },
    { label: "Business Activity",   current: humanize(cis?.businessActivity) ?? null,      requested: humanize(cus.newBusinessActivity) ?? null },
    { label: "Sales Channel",       current: humanize(cis?.salesChannel) ?? null,          requested: humanize(cus.newSalesChannel) ?? null },
    { label: "Payment Terms",       current: humanize(cis?.paymentTerms) ?? null,          requested: humanize(cus.newPaymentTerms) ?? null },
    { label: "Owners",              current: ownersSummary(cis?.owners),                   requested: ownersSummary(cus.newOwners) },
    { label: "Officers",            current: officersSummary(cis?.officers),               requested: officersSummary(cus.newOfficers) },
    { label: "Business Life",       current: cis?.businessLife ?? null,                    requested: cus.newBusinessLife ?? null },
    { label: "How Long at Address", current: cis?.howLongAtAddress ?? null,                requested: cus.newHowLongAtAddress ?? null },
    { label: "No. of Branches",     current: cis?.numberOfBranches ?? null,                requested: cus.newNumberOfBranches ?? null },
    { label: "Gov. Certifications", current: cis?.govCertifications ?? null,               requested: cus.newGovCertifications ?? null },
    { label: "Trade References",    current: tradeRefSummary(cis?.tradeReferences),        requested: tradeRefSummary(cus.newTradeReferences) },
    { label: "Bank References",     current: bankRefSummary(cis?.bankReferences),          requested: bankRefSummary(cus.newBankReferences) },
    { label: "Achievements",        current: cis?.achievements ?? null,                    requested: cus.newAchievements ?? null },
    { label: "Other Merits",        current: cis?.otherMerits ?? null,                     requested: cus.newOtherMerits ?? null },
    { label: "Additional Notes",    current: cis?.additionalNotes ?? null,                 requested: cus.newAdditionalNotes ?? null },
  ].filter((r) => r.current || r.requested);

  const changedCount = cus.status === "approved"
    ? changeRows.length
    : compRows.filter((r) => r.requested && r.requested !== r.current).length;

  const submittedEvent = events.find((e) => e.action === "submitted");
  const submittedAt = submittedEvent
    ? new Date(submittedEvent.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date(cus.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
    {/* ── Print-only CUS form ── */}
    <CusPrintForm
      tradeName={cis?.tradeName ?? ""}
      agentCode={cis?.agentCode ?? null}
      submittedAt={submittedAt}
      rows={
        cus.status === "approved" && changeRows.length > 0
          ? changeRows.map((r) => ({ label: r.label, current: r.before, requested: r.after }))
          : compRows
      }
      agentNote={cus.note ?? null}
      uploadedDocs={uploadedSlots.map((slot) => ({
        label: slot.label,
        files: ((cus as Record<string, unknown>)[slot.key] as FileEntry[]).map((f) => ({
          name: f.name,
          url: f.url,
          type: f.type,
        })),
      }))}
    />

    {/* ── Screen UI (hidden on print) ── */}
    <div className="space-y-5 print:hidden">
      <Breadcrumbs items={[
        { label: "Customer Updates", href: isLegal ? "/legal/cus" : "/finance/cus" },
        { label: cis?.tradeName ?? "CUS Detail" },
      ]} />

      {/* ── Page header ── */}
      <div className={`rounded-xl border ${accentBorder} ${accentBg} px-5 py-4 flex items-start gap-4`}>
        <div className={`rounded-lg p-2 shrink-0 bg-white/70 border ${accentBorder}`}>
          <RefreshCw className={`h-5 w-5 ${accentIcon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-zinc-900 leading-tight">
              {cis?.tradeName ?? "Customer Update Sheet"}
            </h1>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${accentBorder} ${accentText} bg-white/60`}>
              {cus.status.replace(/_/g, " ")}
            </span>
            {changedCount > 0 && (
              <span className="rounded-full border border-zinc-200 bg-white/60 px-2.5 py-0.5 text-xs font-semibold text-zinc-500">
                {changedCount} field{changedCount !== 1 ? "s" : ""} changing
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            {cus.status === "approved"
              ? "This CUS has been approved — changes have been applied to the customer record."
              : cus.status === "denied"
              ? "This CUS was denied."
              : "Review the requested changes below, set credit evaluation, then approve or deny."}
          </p>
          {/* Current credit terms — always visible */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Current Credit:</span>
            {cis?.financeCreditTerms ? (
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {cis.financeCreditTerms.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            ) : (
              <span className="text-xs text-zinc-400 italic">No terms set</span>
            )}
            {cis?.financeCreditLimit && (
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {cis.financeCreditLimit}
              </span>
            )}
          </div>
        </div>
        <Link
          href={cisHref}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View CIS
        </Link>
      </div>

      {/* ── Unified card: comparison table + credit evaluation ── */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

        {/* Column headers */}
        <div className="grid lg:grid-cols-[1fr_320px] border-b border-zinc-200">
          <div className="grid grid-cols-[140px_1fr_1fr] border-b lg:border-b-0 lg:border-r border-zinc-200">
            <div className="px-4 py-3 border-r border-zinc-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Field</p>
            </div>
            <div className="px-4 py-3 border-r border-zinc-200 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <p className="text-xs font-semibold text-zinc-600">
                {cus.status === "approved" ? "Before" : "Current"}
              </p>
            </div>
            <div className={`px-4 py-3 flex items-center gap-1.5 ${accentBg}`}>
              <RefreshCw className={`h-3.5 w-3.5 ${accentIcon} shrink-0`} />
              <p className={`text-xs font-semibold ${accentText}`}>
                {cus.status === "approved" ? "After (Applied)" : "Requested"}
              </p>
            </div>
          </div>
          <div className={`px-4 py-3 flex items-center gap-1.5 ${accentBg}`}>
            <p className={`text-xs font-semibold ${accentText}`}>Credit Evaluation</p>
          </div>
        </div>

        {/* Body: table rows on left, panel on right */}
        <div className="grid lg:grid-cols-[1fr_320px]">

          {/* Comparison rows */}
          <div className="divide-y divide-zinc-100 lg:border-r border-zinc-200">
            {(cus.status === "approved" && changeRows.length > 0
              ? changeRows.map((r) => ({ label: r.label, current: r.before, requested: r.after }))
              : compRows
            ).map(({ label, current, requested: req }) => {
              const hasChange = !!req && req !== current;
              return (
                <div
                  key={label}
                  className={`grid grid-cols-[140px_1fr_1fr] ${hasChange ? accentRowBg : ""}`}
                >
                  <div className="px-4 py-2.5 border-r border-zinc-100 flex items-start">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 leading-snug mt-0.5">{label}</p>
                  </div>
                  <div className="px-4 py-2.5 border-r border-zinc-100">
                    <p className={`text-sm break-words leading-snug ${current ? (hasChange ? "text-zinc-500 line-through decoration-zinc-400" : "text-zinc-800") : "text-zinc-300 italic"}`}>
                      {current ?? "—"}
                    </p>
                  </div>
                  <div className="px-4 py-2.5">
                    {hasChange ? (
                      <div className="flex items-start gap-1.5">
                        <ArrowRight className={`h-3.5 w-3.5 ${accentIcon} shrink-0 mt-0.5`} />
                        <p className="text-sm font-semibold text-green-700 break-words leading-snug">{req}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-300 italic">no change</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Agent note inside the table card */}
            {cus.note && (
              <div className="px-4 py-3 flex items-start gap-2.5 bg-zinc-50/60">
                <MessageSquare className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Agent Note</p>
                  <p className="text-sm text-zinc-700">{cus.note}</p>
                </div>
              </div>
            )}
          </div>

          {/* Credit evaluation panel — right column */}
          <div className="lg:self-start lg:sticky lg:top-4">
            {cus.status === "approved" || cus.status === "denied" ? (
              <div className="p-4">
                <p className="text-xs text-zinc-400 capitalize">This CUS was {cus.status}.</p>
              </div>
            ) : (
              <CusFinancePanel
                cusId={id}
                newCustomerType={cus.newCustomerType ?? undefined}
                initialSirRestyFiles={(cus.docSirRestySigned as any) ?? []}
                initialCreditTerms={cus.financeCreditTerms ?? ""}
                initialCreditLimit={cus.financeCreditLimit ?? ""}
                backHref={backHref}
                isLegal={isLegal}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Below-the-fold: documents + activity ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">

        {/* ── Submitted documents ── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-700">Submitted Documents</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-2 rounded-full overflow-hidden w-20 bg-zinc-200">
                <div
                  className={`h-full rounded-full transition-all ${uploadedSlots.length === docSlots.length ? "bg-green-500" : "bg-amber-400"}`}
                  style={{ width: `${(uploadedSlots.length / docSlots.length) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-zinc-500">
                {uploadedSlots.length}/{docSlots.length}
              </span>
            </div>
          </div>
          <div className="p-4">
            {uploadedSlots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 py-10 text-center">
                <FileText className="mx-auto h-7 w-7 text-zinc-300" />
                <p className="mt-2 text-sm text-zinc-500">No documents submitted.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploadedSlots.map((slot) => {
                  const files = (cus as Record<string, unknown>)[slot.key] as FileEntry[];
                  return (
                    <div key={slot.key} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-zinc-600">{slot.label}</p>
                        <span className="text-[10px] font-medium text-zinc-400">{files.length} file{files.length !== 1 ? "s" : ""}</span>
                      </div>
                      <ul className="space-y-1">
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
                                {new Date(f.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {emptySlots.length > 0 && (
                  <details className="group mt-1">
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

        {/* Activity */}
        {events.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-700">Activity</h2>
            </div>
            <ol className="p-4 space-y-3">
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
                    {i < events.length - 1 && <div className="w-px flex-1 bg-zinc-100 mt-1 min-h-[12px]" />}
                  </div>
                  <div className="pb-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 leading-snug">
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
        ) : <div />}
      </div>
    </div>
    </>
  );
}
