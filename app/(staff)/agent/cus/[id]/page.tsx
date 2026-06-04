import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, asc, isNotNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cusSubmissions, cusEvents, cisSubmissions, users, notifications } from "@/lib/db/schema";
import { SCORING_DOC_SLOTS, type FileEntry } from "@/lib/doc-types";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  MessageSquare,
  RefreshCw,
  Send,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { CusSubmitButton } from "./cus-submit-button";
import { CusDocSection } from "@/components/cus-doc-section";

export const metadata = { title: "Customer Update Sheet — CRS" };

const STEPS = [
  { key: "draft",     label: "Draft",        Icon: FileCheck2  },
  { key: "submitted", label: "Submitted",    Icon: Send        },
  { key: "review",    label: "Under Review", Icon: Clock       },
  { key: "approved",  label: "Approved",     Icon: CheckCircle2 },
];

function stepIndex(status: string) {
  if (status === "draft") return 0;
  if (status === "submitted") return 1;
  if (status === "pending_finance_review" || status === "pending_legal_review") return 2;
  if (status === "approved") return 3;
  return -1;
}

export default async function AgentCusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, id: userId } = session.user as { id: string; role: string };
  if (role !== "sales_agent" && role !== "rsr") redirect("/agent");

  const [cus] = await db
    .select({
      id: cusSubmissions.id,
      cisId: cusSubmissions.cisId,
      agentId: cusSubmissions.agentId,
      status: cusSubmissions.status,
      note: cusSubmissions.note,
      financeCreditLimit: cusSubmissions.financeCreditLimit,
      financeCreditTerms: cusSubmissions.financeCreditTerms,
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
      newPostalCode: cusSubmissions.newPostalCode,
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
  if (cus.agentId !== userId) redirect("/agent/cus");

  // Mark unread CUS notifications for this record as read
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(
      eq(notifications.recipientId, userId),
      eq(notifications.cusId, id),
      eq(notifications.isRead, false),
      isNotNull(notifications.cusId),
    ));

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
      postalCode: cisSubmissions.postalCode,
      landmarks: cisSubmissions.landmarks,
      deliveryAddress: cisSubmissions.deliveryAddress,
      deliveryLandmarks: cisSubmissions.deliveryLandmarks,
      deliveryMobile: cisSubmissions.deliveryMobile,
      deliveryTelephone: cisSubmissions.deliveryTelephone,
      corporateName: cisSubmissions.corporateName,
      dateOfBusinessReg: cisSubmissions.dateOfBusinessReg,
      tinNumber: cisSubmissions.tinNumber,
      businessType: cisSubmissions.businessType,
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
      financeCreditTerms: cisSubmissions.financeCreditTerms,
      financeCreditLimit: cisSubmissions.financeCreditLimit,
      docValidId: cisSubmissions.docValidId,
      docMayorsPermit: cisSubmissions.docMayorsPermit,
      docSecDti: cisSubmissions.docSecDti,
      docBirCertificate: cisSubmissions.docBirCertificate,
      docLocationMap: cisSubmissions.docLocationMap,
      docFinancialStatement: cisSubmissions.docFinancialStatement,
      docBankStatement: cisSubmissions.docBankStatement,
      docProofOfBilling: cisSubmissions.docProofOfBilling,
      docLeaseContract: cisSubmissions.docLeaseContract,
      docProofOfOwnership: cisSubmissions.docProofOfOwnership,
      docStorePhoto: cisSubmissions.docStorePhoto,
      docSupplierInvoice: cisSubmissions.docSupplierInvoice,
      docSocialMedia: cisSubmissions.docSocialMedia,
      docCompanyWebsite: cisSubmissions.docCompanyWebsite,
      docIsoCertification: cisSubmissions.docIsoCertification,
      docHalalCertificate: cisSubmissions.docHalalCertificate,
      docOther: cisSubmissions.docOther,
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

  const isDraft      = cus.status === "draft";
  const isSubmitted  = cus.status === "submitted";
  const isPendingFinance = cus.status === "pending_finance_review";
  const isPendingLegal   = cus.status === "pending_legal_review";
  const isUnderReview = isPendingFinance || isPendingLegal;
  const isApproved   = cus.status === "approved";
  const isDenied     = cus.status === "denied";
  const currentStep  = stepIndex(cus.status);
  const reviewerLabel = cis?.customerType === "dealer" ? "Legal Review" : "Finance Review";
  const deniedEvent  = events.findLast((e) => e.action === "denied");

  // Check if changing to credit terms
  const currentPaymentTerms = cis?.paymentTerms?.toLowerCase() || "";
  const newPaymentTerms = cus.newPaymentTerms?.toLowerCase() || "";
  const isMovingToWithTerms = newPaymentTerms === "with_terms" && currentPaymentTerms !== "with_terms";
  const requiredDocKeys = ["docValidId", "docSecDti", "docBirCertificate", "docBankStatement"];

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

  // All customer fields — all rows shown, changed ones highlighted
  type CompRow = { label: string; section: string; current: string | null; requested: string | null };
  const allRows: CompRow[] = [
    { section: "Identity",       label: "Trade Name",          current: cis?.tradeName ?? null,                      requested: cus.newTradeName ?? null },
    { section: "Identity",       label: "Corporate Name",      current: cis?.corporateName ?? null,                  requested: cus.newCorporateName ?? null },
    { section: "Identity",       label: "Customer Type",       current: humanize(cis?.customerType) ?? null,         requested: humanize(cus.newCustomerType) ?? null },
    { section: "Identity",       label: "Business Type",       current: humanize(cis?.businessType) ?? null,         requested: humanize(cus.newBusinessType) ?? null },
    { section: "Identity",       label: "Date of Reg.",        current: cis?.dateOfBusinessReg ?? null,              requested: cus.newDateOfBusinessReg ?? null },
    { section: "Identity",       label: "No. of Employees",    current: cis?.numberOfEmployees ?? null,              requested: cus.newNumberOfEmployees ?? null },
    { section: "Identity",       label: "TIN Number",          current: cis?.tinNumber ?? null,                      requested: cus.newTinNumber ?? null },
    { section: "Contact",        label: "Contact Person",      current: cis?.contactPerson ?? null,                  requested: cus.newContactPerson ?? null },
    { section: "Contact",        label: "Mobile",              current: cis?.contactNumber ?? null,                  requested: cus.newContactNumber ?? null },
    { section: "Contact",        label: "Telephone",           current: cis?.telephoneNumber ?? null,                requested: cus.newTelephoneNumber ?? null },
    { section: "Contact",        label: "Email",               current: cis?.emailAddress ?? null,                   requested: cus.newEmailAddress ?? null },
    { section: "Contact",        label: "Website",             current: cis?.website ?? null,                        requested: cus.newWebsite ?? null },
    { section: "Office Address", label: "Street Address",      current: cis?.businessAddress ?? null,                requested: cus.newBusinessAddress ?? null },
    { section: "Office Address", label: "City / Municipality", current: cis?.cityMunicipality ?? null,               requested: cus.newCityMunicipality ?? null },
    { section: "Office Address", label: "Postal Code",        current: cis?.postalCode ?? null,                  requested: cus.newPostalCode ?? null },
    { section: "Office Address", label: "Landmarks",           current: cis?.landmarks ?? null,                      requested: cus.newLandmarks ?? null },
    { section: "Delivery",       label: "Delivery Address",    current: cis?.deliveryAddress ?? null,                requested: cus.newDeliveryAddress ?? null },
    { section: "Delivery",       label: "Delivery Landmarks",  current: cis?.deliveryLandmarks ?? null,              requested: cus.newDeliveryLandmarks ?? null },
    { section: "Delivery",       label: "Delivery Mobile",     current: cis?.deliveryMobile ?? null,                 requested: cus.newDeliveryMobile ?? null },
    { section: "Delivery",       label: "Delivery Tel",        current: cis?.deliveryTelephone ?? null,              requested: cus.newDeliveryTelephone ?? null },
    { section: "Classification", label: "Line of Business",    current: humanize(cis?.lineOfBusiness) ?? null,       requested: humanize(cus.newLineOfBusiness) ?? null },
    { section: "Classification", label: "Business Activity",   current: humanize(cis?.businessActivity) ?? null,     requested: humanize(cus.newBusinessActivity) ?? null },
    { section: "Classification", label: "Sales Channel",       current: humanize(cis?.salesChannel) ?? null,         requested: humanize(cus.newSalesChannel) ?? null },
    { section: "Classification", label: "Payment Terms",       current: humanize(cis?.paymentTerms) ?? null,         requested: humanize(cus.newPaymentTerms) ?? null },
    { section: "Ownership",      label: "Owners",              current: ownersSummary(cis?.owners),                  requested: ownersSummary(cus.newOwners) },
    { section: "Ownership",      label: "Officers",            current: officersSummary(cis?.officers),              requested: officersSummary(cus.newOfficers) },
    { section: "Background",     label: "Business Life",       current: cis?.businessLife ?? null,                   requested: cus.newBusinessLife ?? null },
    { section: "Background",     label: "How Long at Address", current: cis?.howLongAtAddress ?? null,               requested: cus.newHowLongAtAddress ?? null },
    { section: "Background",     label: "No. of Branches",     current: cis?.numberOfBranches ?? null,               requested: cus.newNumberOfBranches ?? null },
    { section: "Background",     label: "Gov. Certifications", current: cis?.govCertifications ?? null,              requested: cus.newGovCertifications ?? null },
    { section: "Background",     label: "Trade References",    current: tradeRefSummary(cis?.tradeReferences),       requested: tradeRefSummary(cus.newTradeReferences) },
    { section: "Background",     label: "Bank References",     current: bankRefSummary(cis?.bankReferences),         requested: bankRefSummary(cus.newBankReferences) },
    { section: "Background",     label: "Achievements",        current: cis?.achievements ?? null,                   requested: cus.newAchievements ?? null },
    { section: "Background",     label: "Other Merits",        current: cis?.otherMerits ?? null,                    requested: cus.newOtherMerits ?? null },
    { section: "Background",     label: "Additional Notes",    current: cis?.additionalNotes ?? null,                requested: cus.newAdditionalNotes ?? null },
  ];

  const changedCount = allRows.filter((r) => r.requested && r.requested !== r.current).length;

  // Approved before/after rows from snapshot
  type ChangeRow = { label: string; before: string | null; after: string };
  const approvedChangeRows: ChangeRow[] = [];
  if (isApproved && cus.beforeSnapshot) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = cus.beforeSnapshot as Record<string, any>;
    const CHANGE_FIELDS: Array<{ label: string; cisKey: string; after: string | null | undefined }> = [
      { label: "Trade Name",          cisKey: "tradeName",            after: cus.newTradeName },
      { label: "Corporate Name",      cisKey: "corporateName",        after: cus.newCorporateName },
      { label: "Customer Type",       cisKey: "customerType",         after: humanize(cus.newCustomerType) },
      { label: "Business Type",       cisKey: "businessType",         after: humanize(cus.newBusinessType) },
      { label: "Date of Reg.",        cisKey: "dateOfBusinessReg",    after: cus.newDateOfBusinessReg },
      { label: "No. of Employees",    cisKey: "numberOfEmployees",    after: cus.newNumberOfEmployees },
      { label: "TIN Number",          cisKey: "tinNumber",            after: cus.newTinNumber },
      { label: "Contact Person",      cisKey: "contactPerson",        after: cus.newContactPerson },
      { label: "Mobile",              cisKey: "contactNumber",        after: cus.newContactNumber },
      { label: "Telephone",           cisKey: "telephoneNumber",      after: cus.newTelephoneNumber },
      { label: "Email",               cisKey: "emailAddress",         after: cus.newEmailAddress },
      { label: "Website",             cisKey: "website",              after: cus.newWebsite },
      { label: "Business Address",    cisKey: "businessAddress",      after: cus.newBusinessAddress },
      { label: "City/Municipality",   cisKey: "cityMunicipality",     after: cus.newCityMunicipality },
      { label: "Postal Code",        cisKey: "postalCode",          after: cus.newPostalCode },
      { label: "Landmarks",           cisKey: "landmarks",            after: cus.newLandmarks },
      { label: "Delivery Address",    cisKey: "deliveryAddress",      after: cus.newDeliveryAddress },
      { label: "Delivery Landmarks",  cisKey: "deliveryLandmarks",    after: cus.newDeliveryLandmarks },
      { label: "Delivery Mobile",     cisKey: "deliveryMobile",       after: cus.newDeliveryMobile },
      { label: "Delivery Tel",        cisKey: "deliveryTelephone",    after: cus.newDeliveryTelephone },
      { label: "Line of Business",    cisKey: "lineOfBusiness",       after: humanize(cus.newLineOfBusiness) },
      { label: "Business Activity",   cisKey: "businessActivity",     after: humanize(cus.newBusinessActivity) },
      { label: "Sales Channel",       cisKey: "salesChannel",         after: humanize(cus.newSalesChannel) },
      { label: "Payment Terms",       cisKey: "paymentTerms",         after: humanize(cus.newPaymentTerms) },
      { label: "Owners",              cisKey: "owners",               after: ownersSummary(cus.newOwners) },
      { label: "Officers",            cisKey: "officers",             after: officersSummary(cus.newOfficers) },
      { label: "Business Life",       cisKey: "businessLife",         after: cus.newBusinessLife },
      { label: "How Long at Address", cisKey: "howLongAtAddress",     after: cus.newHowLongAtAddress },
      { label: "No. of Branches",     cisKey: "numberOfBranches",     after: cus.newNumberOfBranches },
      { label: "Gov. Certifications", cisKey: "govCertifications",    after: cus.newGovCertifications },
      { label: "Trade References",    cisKey: "tradeReferences",      after: tradeRefSummary(cus.newTradeReferences) },
      { label: "Bank References",     cisKey: "bankReferences",       after: bankRefSummary(cus.newBankReferences) },
      { label: "Achievements",        cisKey: "achievements",         after: cus.newAchievements },
      { label: "Other Merits",        cisKey: "otherMerits",          after: cus.newOtherMerits },
      { label: "Additional Notes",    cisKey: "additionalNotes",      after: cus.newAdditionalNotes },
      { label: "Credit Terms",        cisKey: "financeCreditTerms",   after: humanize(cus.financeCreditTerms) },
      { label: "Credit Limit",        cisKey: "financeCreditLimit",   after: cus.financeCreditLimit },
    ];
    for (const { label, cisKey, after } of CHANGE_FIELDS) {
      if (after && cisKey in snap) {
        const before = snap[cisKey];
        approvedChangeRows.push({ label, before: before ? String(before).replace(/_/g, " ") : null, after });
      }
    }
  }

  const docSlots = [...SCORING_DOC_SLOTS, { key: "docOther", label: "Other Supporting Documents" }];
  const uploadedSlots = docSlots.filter(
    (slot) => ((cus as Record<string, unknown>)[slot.key] as FileEntry[] | null)?.length
  );
  const emptySlots = docSlots.filter(
    (slot) => !((cus as Record<string, unknown>)[slot.key] as FileEntry[] | null)?.length
  );

  const actionLabels: Record<string, string> = {
    submitted: "Submitted for review",
    approved: "Approved",
    denied: "Denied",
  };

  // Docs for CusDocSection (client component needs serializable data)
  const DOC_KEYS = docSlots.map((s) => s.key);
  const initialDocs = DOC_KEYS.reduce<Record<string, FileEntry[]>>((acc, k) => {
    acc[k] = ((cus as Record<string, unknown>)[k] as FileEntry[] | null) ?? [];
    return acc;
  }, {});
  const cisDocs = DOC_KEYS.reduce<Record<string, FileEntry[]>>((acc, k) => {
    acc[k] = ((cis as Record<string, unknown> | null)?.[k] as FileEntry[] | null) ?? [];
    return acc;
  }, {});

  // Group rows by section for rendering
  const sections = Array.from(new Set(allRows.map((r) => r.section)));

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: "Customer Updates", href: "/agent/cus" },
        { label: cis?.tradeName ?? "CUS Detail" },
      ]} />

      {/* ── Header card: title + stepper + actions ── */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {/* Top row: icon + title + badges + actions */}
        <div className="px-5 py-5 sm:px-6 flex items-start gap-4 border-b border-zinc-100">
          <div className={`rounded-xl p-2.5 shrink-0 border mt-0.5
            ${isApproved ? "bg-green-50 border-green-200"
              : isDenied ? "bg-red-50 border-red-200"
              : isDraft ? "bg-zinc-50 border-zinc-200"
              : "bg-amber-50 border-amber-200"}`}>
            <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5
              ${isApproved ? "text-green-500"
                : isDenied ? "text-red-500"
                : isDraft ? "text-zinc-400"
                : "text-amber-500"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
                {cis?.tradeName ?? "Customer Update Sheet"}
              </h1>
              <Link
                href={`/agent/${cus.cisId}`}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-white hover:text-zinc-900 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">View CIS</span>
              </Link>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold
                ${isApproved ? "bg-green-50 text-green-700 border-green-200"
                  : isDenied ? "bg-red-50 text-red-700 border-red-200"
                  : isDraft ? "bg-zinc-100 text-zinc-600 border-zinc-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {isDraft ? "Draft"
                  : isSubmitted ? "Submitted"
                  : isPendingFinance ? "Pending Finance Review"
                  : isPendingLegal ? "Pending Legal Review"
                  : isApproved ? "Approved"
                  : isDenied ? "Denied"
                  : cus.status.replace(/_/g, " ")}
              </span>
              {changedCount > 0 && !isApproved && (
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-500">
                  {changedCount} field{changedCount !== 1 ? "s" : ""} changing
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
              {isApproved
                ? "Changes have been applied to the customer record."
                : isDenied
                ? "This request was denied. Create a new CUS to try again."
                : isDraft
                ? `Will route to ${reviewerLabel} for review.`
                : `Under review by ${reviewerLabel} — no further action needed.`}
            </p>
            {/* Current credit terms — always visible */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
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
        </div>

        {/* Stepper row */}
        {!isDenied && (
          <div className="px-5 py-6 sm:px-8 sm:py-5 bg-zinc-50/50">
            <div className="flex items-start relative">
              <div className="absolute top-4 left-0 right-0 h-px bg-zinc-200 z-0 mx-8 sm:mx-10" />
              {STEPS.map((step, i) => {
                const isPast    = i < currentStep || (isApproved && i === currentStep);
                const isCurrent = i === currentStep && !isApproved;
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5 flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors
                      ${isPast ? "bg-teal-500 border-teal-500" : isCurrent ? "bg-white border-teal-500" : "bg-white border-zinc-200"}`}>
                      <step.Icon className={`h-3.5 w-3.5 ${isPast ? "text-white" : isCurrent ? "text-teal-600" : "text-zinc-300"}`} />
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
      </div>

      {/* ── Status banners (full width) ── */}
      {isDenied && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <XCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-red-800">
              Request Denied{deniedEvent?.actorName ? ` by ${deniedEvent.actorName}` : ""}
            </p>
            {deniedEvent?.note
              ? <p className="text-sm text-red-700">{deniedEvent.note}</p>
              : <p className="text-sm text-red-600/70">No reason provided.</p>}
          </div>
        </div>
      )}
      {isDraft && isMovingToWithTerms && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Documents Required for Credit Terms</p>
            <p className="text-sm text-amber-700 mt-1">Changing to credit terms requires the following documents to be uploaded before submission:</p>
            <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
              <li>Valid ID</li>
              <li>SEC/DTI Registration</li>
              <li>BIR Certificate</li>
              <li>Bank Statement</li>
            </ul>
          </div>
        </div>
      )}
      {isUnderReview && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Clock className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Under Review</p>
            <p className="text-sm text-amber-800/70 mt-0.5">
              Being reviewed by <strong className="text-amber-900">{reviewerLabel}</strong>. No further action needed from you.
            </p>
          </div>
        </div>
      )}
      {isApproved && approvedChangeRows.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 sm:px-5 border-b border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm font-semibold text-green-800">Changes Applied to Customer Record</p>
          </div>
          {/* Mobile layout */}
          <div className="divide-y divide-green-100 sm:hidden">
            {approvedChangeRows.map((row) => (
              <div key={row.label} className="px-4 py-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-700/60">{row.label}</p>
                <div className="flex items-start gap-2">
                  <p className="text-sm text-zinc-400 line-through decoration-zinc-300 flex-1">{row.before ?? "—"}</p>
                  <ArrowRight className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-green-900 flex-1">{row.after}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop layout */}
          <div className="hidden sm:block divide-y divide-green-100">
            <div className="grid grid-cols-[160px_1fr_20px_1fr] bg-green-100/50">
              <div className="px-4 py-2"><p className="text-[10px] font-bold uppercase tracking-wider text-green-700/60">Field</p></div>
              <div className="px-4 py-2"><p className="text-[10px] font-bold uppercase tracking-wider text-green-700/60">Before</p></div>
              <div />
              <div className="px-4 py-2"><p className="text-[10px] font-bold uppercase tracking-wider text-green-700/60">After</p></div>
            </div>
            {approvedChangeRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[160px_1fr_20px_1fr] items-start">
                <div className="px-4 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{row.label}</p>
                </div>
                <div className="px-4 py-2.5">
                  <p className="text-sm text-zinc-400 line-through decoration-zinc-300">{row.before ?? "—"}</p>
                </div>
                <div className="flex items-start justify-center pt-3 bg-green-50/40">
                  <ArrowRight className="h-3 w-3 text-green-500 shrink-0" />
                </div>
                <div className="px-4 py-2.5 bg-green-50/40">
                  <p className="text-sm font-semibold text-green-900">{row.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two-column body ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px] items-start">

        {/* ── LEFT: customer info + documents ── */}
        <div className="space-y-4">

          {/* Agent note */}
          {cus.note && (
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 flex items-start gap-2.5">
              <MessageSquare className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">Agent Note</p>
                <p className="text-sm text-zinc-700">{cus.note}</p>
              </div>
            </div>
          )}

          {/* Customer information table — all fields */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">

            {/* ── Mobile layout ── */}
            <div className="sm:hidden">
              {sections.map((section) => {
                const rows = allRows.filter((r) => r.section === section);
                return (
                  <div key={section}>
                    <div className="bg-zinc-50 border-t border-zinc-100 px-4 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{section}</p>
                    </div>
                    {rows.map(({ label, current, requested: req }) => {
                      const hasChange = !!req && req !== current;
                      return (
                        <div key={label} className={`border-t border-zinc-100 px-4 py-3 ${hasChange ? "bg-amber-50/30" : ""}`}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">{label}</p>
                          {hasChange ? (
                            <div className="flex items-start gap-2">
                              <p className="text-sm text-zinc-400 line-through leading-snug flex-1 break-words">{current ?? "—"}</p>
                              <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-sm font-semibold text-amber-900 leading-snug flex-1 break-words">{req}</p>
                            </div>
                          ) : (
                            <p className={`text-sm leading-snug break-words ${current ? "text-zinc-800" : "text-zinc-300 italic"}`}>
                              {current ?? "—"}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* ── Desktop layout ── */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-[160px_1fr_1fr] border-b border-zinc-200 bg-zinc-50">
                <div className="px-4 py-3 border-r border-zinc-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Field</p>
                </div>
                <div className="px-4 py-3 border-r border-zinc-200 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <p className="text-xs font-semibold text-zinc-600">Current on File</p>
                </div>
                <div className="px-4 py-3 flex items-center gap-1.5 bg-amber-50/60">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs font-semibold text-amber-600">Requested Change</p>
                </div>
              </div>
              {sections.map((section) => {
                const rows = allRows.filter((r) => r.section === section);
                return (
                  <div key={section}>
                    <div className="grid grid-cols-[160px_1fr_1fr] bg-zinc-50/60 border-t border-zinc-100">
                      <div className="px-4 py-1.5 col-span-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{section}</p>
                      </div>
                    </div>
                    {rows.map(({ label, current, requested: req }) => {
                      const hasChange = !!req && req !== current;
                      return (
                        <div key={label} className={`grid grid-cols-[160px_1fr_1fr] border-t border-zinc-100 ${hasChange ? "bg-amber-50/40" : ""}`}>
                          <div className="px-4 py-2.5 border-r border-zinc-100 flex items-start">
                            <p className="text-[11px] font-semibold text-zinc-400 leading-snug mt-0.5">{label}</p>
                          </div>
                          <div className="px-4 py-2.5 border-r border-zinc-100">
                            <p className={`text-sm break-words leading-snug ${current ? (hasChange ? "text-zinc-400" : "text-zinc-800") : "text-zinc-300 italic"}`}>
                              {current ?? "—"}
                            </p>
                          </div>
                          <div className="px-4 py-2.5">
                            {hasChange ? (
                              <div className="flex items-start gap-1.5">
                                <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-sm font-semibold text-amber-900 break-words leading-snug">{req}</p>
                              </div>
                            ) : (
                              <p className="text-xs text-zinc-300 italic">—</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Documents — below the info table */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-700">Documents</h2>
              </div>
              {uploadedSlots.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex h-1.5 rounded-full overflow-hidden w-20 bg-zinc-200">
                    <div
                      className={`h-full rounded-full transition-all ${uploadedSlots.length === docSlots.length ? "bg-green-500" : "bg-amber-400"}`}
                      style={{ width: `${(uploadedSlots.length / docSlots.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-zinc-500">
                    {uploadedSlots.length}/{docSlots.length}
                  </span>
                </div>
              )}
            </div>
            <div className="p-4">
              {isDraft ? (
                <CusDocSection
                  cusId={cus.id}
                  initialDocs={initialDocs}
                  cisDocs={cisDocs}
                  disabled={false}
                  isMovingToWithTerms={isMovingToWithTerms}
                  requiredDocKeys={requiredDocKeys}
                />
              ) : uploadedSlots.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 py-10 text-center">
                  <FileText className="mx-auto h-7 w-7 text-zinc-300" />
                  <p className="mt-2 text-sm text-zinc-500">No documents submitted.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {uploadedSlots.map((slot) => {
                    const files = (cus as Record<string, unknown>)[slot.key] as FileEntry[];
                    return (
                      <div key={slot.key} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-zinc-700 leading-snug">{slot.label}</p>
                          <span className="shrink-0 text-[10px] font-medium text-zinc-400">{files.length} file{files.length !== 1 ? "s" : ""}</span>
                        </div>
                        <ul className="space-y-1">
                          {files.map((f) => (
                            <li key={f.url} className="flex items-center gap-1.5">
                              <FileText className="h-3 w-3 text-zinc-400 shrink-0" />
                              <a href={f.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline truncate flex-1">
                                {f.name}
                              </a>
                              {f.uploadedAt && (
                                <span className="text-[10px] text-zinc-400 shrink-0">
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
                    <details className="group sm:col-span-2">
                      <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 list-none flex items-center gap-1 select-none py-1">
                        <span className="group-open:hidden">▸</span>
                        <span className="hidden group-open:inline">▾</span>
                        {emptySlots.length} slot{emptySlots.length !== 1 ? "s" : ""} not submitted
                      </summary>
                      <ul className="mt-1 grid sm:grid-cols-2 gap-x-4 gap-y-0.5 pl-3 border-l-2 border-zinc-100">
                        {emptySlots.map((slot) => (
                          <li key={slot.key} className="text-xs text-zinc-400 py-0.5">{slot.label}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: activity only ── */}
        {events.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
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
        )}
      </div>

      {/* ── Submit button ── */}
      {isDraft && (
        <div className="flex justify-end pt-2">
          <CusSubmitButton cusId={cus.id} />
        </div>
      )}
    </div>
  );
}
