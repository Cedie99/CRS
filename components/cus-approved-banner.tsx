import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { cusSubmissions } from "@/lib/db/schema";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { humanizeDisplayValue } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  tradeName:          "Trade Name",
  corporateName:      "Corporate Name",
  contactPerson:      "Contact Person",
  contactNumber:      "Contact Number",
  telephoneNumber:    "Telephone",
  emailAddress:       "Email",
  website:            "Website",
  numberOfEmployees:  "No. of Employees",
  customerType:       "Customer Type",
  businessType:       "Business Type",
  dateOfBusinessReg:  "Date of Reg.",
  tinNumber:          "TIN Number",
  businessAddress:    "Business Address",
  cityMunicipality:   "City / Municipality",
  landmarks:          "Landmarks",
  deliveryAddress:    "Delivery Address",
  deliveryLandmarks:  "Delivery Landmarks",
  deliveryMobile:     "Delivery Mobile",
  deliveryTelephone:  "Delivery Telephone",
  lineOfBusiness:     "Line of Business",
  businessActivity:   "Business Activity",
  salesChannel:       "Sales Channel",
  paymentTerms:       "Payment Terms",
  owners:             "Owners",
  officers:           "Officers",
  businessLife:       "Years in Business",
  howLongAtAddress:   "Years at Address",
  numberOfBranches:   "No. of Branches",
  govCertifications:  "Gov. Certifications",
  tradeReferences:    "Trade References",
  bankReferences:     "Bank References",
  achievements:       "Achievements",
  otherMerits:        "Other Merits",
  additionalNotes:    "Additional Notes",
  financeCreditTerms: "Credit Terms",
  financeCreditLimit: "Credit Limit",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatValue(field: string, val: any): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (
    field === "financeCreditTerms" ||
    field === "customerType" ||
    field === "businessType" ||
    field === "lineOfBusiness" ||
    field === "businessActivity" ||
    field === "salesChannel" ||
    field === "paymentTerms"
  ) {
    return humanizeDisplayValue(String(val));
  }
  if (field === "owners" && Array.isArray(val)) {
    if (val.length === 0) return null;
    return val.map((o: { name?: string; percentage?: string }) =>
      [o.name, o.percentage ? `(${o.percentage}%)` : ""].filter(Boolean).join(" ")
    ).join(", ");
  }
  if (field === "officers" && Array.isArray(val)) {
    if (val.length === 0) return null;
    return val.map((o: { name?: string; position?: string }) =>
      [o.name, o.position ? `(${o.position})` : ""].filter(Boolean).join(" ")
    ).join(", ");
  }
  if (field === "tradeReferences" && Array.isArray(val)) {
    if (val.length === 0) return null;
    return val.map((r: { company?: string }) => r.company).filter(Boolean).join(", ");
  }
  if (field === "bankReferences" && Array.isArray(val)) {
    if (val.length === 0) return null;
    return val.map((r: { bank?: string; branch?: string }) =>
      [r.bank, r.branch].filter(Boolean).join(" - ")
    ).join(", ");
  }
  return String(val);
}

/**
 * Screen-only component — shows ALL approved CUS updates for this CIS,
 * one section per update in chronological order.
 * Hidden in print (the CIS info card handles the print version inline).
 */
export async function CusApprovedBanner({
  cisId,
  hrefPrefix,
}: {
  cisId: string;
  hrefPrefix?: string;
}) {
  const rows = await db
    .select({
      id: cusSubmissions.id,
      status: cusSubmissions.status,
      beforeSnapshot: cusSubmissions.beforeSnapshot,
      newTradeName:            cusSubmissions.newTradeName,
      newCorporateName:        cusSubmissions.newCorporateName,
      newContactPerson:        cusSubmissions.newContactPerson,
      newContactNumber:        cusSubmissions.newContactNumber,
      newTelephoneNumber:      cusSubmissions.newTelephoneNumber,
      newEmailAddress:         cusSubmissions.newEmailAddress,
      newWebsite:              cusSubmissions.newWebsite,
      newNumberOfEmployees:    cusSubmissions.newNumberOfEmployees,
      newCustomerType:         cusSubmissions.newCustomerType,
      newBusinessType:         cusSubmissions.newBusinessType,
      newDateOfBusinessReg:    cusSubmissions.newDateOfBusinessReg,
      newTinNumber:            cusSubmissions.newTinNumber,
      newBusinessAddress:      cusSubmissions.newBusinessAddress,
      newCityMunicipality:     cusSubmissions.newCityMunicipality,
      newLandmarks:            cusSubmissions.newLandmarks,
      newDeliveryAddress:      cusSubmissions.newDeliveryAddress,
      newDeliveryLandmarks:    cusSubmissions.newDeliveryLandmarks,
      newDeliveryMobile:       cusSubmissions.newDeliveryMobile,
      newDeliveryTelephone:    cusSubmissions.newDeliveryTelephone,
      newLineOfBusiness:       cusSubmissions.newLineOfBusiness,
      newBusinessActivity:     cusSubmissions.newBusinessActivity,
      newSalesChannel:         cusSubmissions.newSalesChannel,
      newPaymentTerms:         cusSubmissions.newPaymentTerms,
      newOwners:               cusSubmissions.newOwners,
      newOfficers:             cusSubmissions.newOfficers,
      newBusinessLife:          cusSubmissions.newBusinessLife,
      newHowLongAtAddress:     cusSubmissions.newHowLongAtAddress,
      newNumberOfBranches:     cusSubmissions.newNumberOfBranches,
      newGovCertifications:    cusSubmissions.newGovCertifications,
      newTradeReferences:      cusSubmissions.newTradeReferences,
      newBankReferences:       cusSubmissions.newBankReferences,
      newAchievements:         cusSubmissions.newAchievements,
      newOtherMerits:          cusSubmissions.newOtherMerits,
      newAdditionalNotes:      cusSubmissions.newAdditionalNotes,
      financeCreditTerms:      cusSubmissions.financeCreditTerms,
      financeCreditLimit:      cusSubmissions.financeCreditLimit,
      updatedAt:               cusSubmissions.updatedAt,
    })
    .from(cusSubmissions)
    .where(eq(cusSubmissions.cisId, cisId))
    .orderBy(asc(cusSubmissions.updatedAt))
    .catch(() => [] as never[]);

  const approvedList = rows.filter((r) => r.status === "approved");

  if (approvedList.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50 print:hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-blue-200 px-5 py-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
        <p className="text-sm font-semibold text-blue-900">
          Customer Update History
        </p>
        <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
          {approvedList.length} update{approvedList.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Column header labels */}
      <div className="grid grid-cols-[140px_1fr_1fr] gap-x-4 border-b border-blue-200 bg-blue-100/50 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-blue-600/80 sm:grid-cols-[180px_1fr_1fr]">
        <span />
        <span>Before</span>
        <span>After</span>
      </div>

      {/* One section per approved CUS */}
      {approvedList.map((cus, idx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const snapshot = (cus.beforeSnapshot ?? {}) as Record<string, any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const afterMap: Record<string, any> = {
          tradeName:          cus.newTradeName,
          corporateName:      cus.newCorporateName,
          contactPerson:      cus.newContactPerson,
          contactNumber:      cus.newContactNumber,
          telephoneNumber:    cus.newTelephoneNumber,
          emailAddress:       cus.newEmailAddress,
          website:            cus.newWebsite,
          numberOfEmployees:  cus.newNumberOfEmployees,
          customerType:       cus.newCustomerType,
          businessType:       cus.newBusinessType,
          dateOfBusinessReg:  cus.newDateOfBusinessReg,
          tinNumber:          cus.newTinNumber,
          businessAddress:    cus.newBusinessAddress,
          cityMunicipality:   cus.newCityMunicipality,
          landmarks:          cus.newLandmarks,
          deliveryAddress:    cus.newDeliveryAddress,
          deliveryLandmarks:  cus.newDeliveryLandmarks,
          deliveryMobile:     cus.newDeliveryMobile,
          deliveryTelephone:  cus.newDeliveryTelephone,
          lineOfBusiness:     cus.newLineOfBusiness,
          businessActivity:   cus.newBusinessActivity,
          salesChannel:       cus.newSalesChannel,
          paymentTerms:       cus.newPaymentTerms,
          owners:             cus.newOwners,
          officers:           cus.newOfficers,
          businessLife:        cus.newBusinessLife,
          howLongAtAddress:   cus.newHowLongAtAddress,
          numberOfBranches:   cus.newNumberOfBranches,
          govCertifications:  cus.newGovCertifications,
          tradeReferences:    cus.newTradeReferences,
          bankReferences:     cus.newBankReferences,
          achievements:       cus.newAchievements,
          otherMerits:        cus.newOtherMerits,
          additionalNotes:    cus.newAdditionalNotes,
          financeCreditTerms: cus.financeCreditTerms,
          financeCreditLimit: cus.financeCreditLimit,
        };

        const changedFields = Object.keys(snapshot).filter((f) => f in FIELD_LABELS);
        if (changedFields.length === 0) return null;

        const dateLabel = new Date(cus.updatedAt).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        });

        return (
          <div key={cus.id} className={idx > 0 ? "border-t border-blue-200" : ""}>
            {/* Per-update sub-header */}
            <div className="flex items-center justify-between gap-2 bg-blue-100/60 px-5 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                Update #{idx + 1} &mdash; {dateLabel}
              </span>
              {hrefPrefix && (
                <Link
                  href={`/${hrefPrefix}/cus/${cus.id}`}
                  className="shrink-0 text-[11px] font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
                >
                  View CUS →
                </Link>
              )}
            </div>

            {/* Field rows */}
            <div className="divide-y divide-blue-100">
              {changedFields.map((field) => {
                const before = snapshot[field];
                const after = afterMap[field];
                return (
                  <div
                    key={field}
                    className="grid grid-cols-[140px_1fr_1fr] gap-x-4 px-5 py-2.5 text-sm sm:grid-cols-[180px_1fr_1fr]"
                  >
                    <span className="self-start text-xs font-semibold uppercase tracking-wide text-blue-700/70">
                      {FIELD_LABELS[field] ?? field}
                    </span>
                    <span className="self-start break-words text-zinc-500">
                      {formatValue(field, before) ?? <span className="italic text-zinc-300">—</span>}
                    </span>
                    <span className="self-start break-words font-medium text-zinc-900">
                      {formatValue(field, after) ?? <span className="italic font-normal text-zinc-300">—</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

    </div>
  );
}
