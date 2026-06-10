"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { AlertCircle, ArrowRight, PencilLine, Plus, Save, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/lib/toast";

const BUSINESS_TYPE_OPTIONS = [
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "sole_proprietor", label: "Sole Proprietor" },
  { value: "cooperative", label: "Cooperative" },
  { value: "other", label: "Other" },
];

const LINE_OF_BUSINESS_OPTIONS = [
  { value: "automotive_equipment", label: "Automotive/Equipment" },
  { value: "logistics_transportation", label: "Logistics/Transportation" },
  { value: "construction_mining", label: "Construction & Mining" },
  { value: "agriculture", label: "Agriculture" },
  { value: "electronics_technology", label: "Electronics/Technology" },
  { value: "energy_chemicals", label: "Energy/Chemicals" },
  { value: "merchandising", label: "Merchandising" },
  { value: "other", label: "Others" },
];

const BUSINESS_ACTIVITY_OPTIONS = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "distributor", label: "Distributor" },
  { value: "retailer", label: "Retailer" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "service", label: "Service" },
  { value: "other", label: "Others" },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "cod", label: "COD" },
  { value: "prepaid", label: "Prepaid" },
  { value: "with_terms", label: "With Terms" },
];

const CUSTOMER_TYPE_OPTIONS = [
  { value: "dealer", label: "Dealer" },
  { value: "distributor", label: "Distributor" },
  { value: "private_label", label: "Private Label" },
  { value: "toll_blend", label: "Toll Blend" },
  { value: "end_user", label: "End User" },
];

interface BankRefRow {
  bank: string;
  branch: string;
  accountType: string;
  accountNo: string;
}

function emptyBankRef(): BankRefRow {
  return { bank: "", branch: "", accountType: "", accountNo: "" };
}

interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FieldGroup({ label, children, defaultOpen = true }: FieldGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-zinc-50 px-4 py-3 text-left text-sm font-semibold text-zinc-700"
      >
        {label}
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>
      {open && <div className="space-y-4 p-4">{children}</div>}
    </div>
  );
}

interface AgentEditCustomerInfoProps {
  cisId: string;
  initialData: Record<string, string | boolean | null | undefined>;
  initialBankReferences?: BankRefRow[];
}

function F({ value, onChange, disabled, placeholder, type }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      type={type}
      className="w-full min-h-[48px] text-base px-4"
    />
  );
}

function TA({ value, onChange, disabled, placeholder, rows = 3 }: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-base px-4"
    />
  );
}

function L({ children }: { children: React.ReactNode }) {
  return <Label className="block text-sm font-medium text-zinc-700 mb-1.5">{children}</Label>;
}

export function AgentEditCustomerInfo({ cisId, initialData, initialBankReferences = [] }: AgentEditCustomerInfoProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const init = (key: string) => {
    const v = initialData[key];
    return typeof v === "string" ? v : "";
  };

  const initBool = (key: string) => {
    const v = initialData[key];
    return v === true || v === "true";
  };

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    const keys = [
      "tradeName", "corporateName", "dateOfBusinessReg", "numberOfEmployees",
      "contactPerson", "contactNumber", "emailAddress", "telephoneNumber", "website",
      "businessAddress", "cityMunicipality", "postalCode", "landmarks",
      "deliveryAddress", "deliveryLandmarks", "deliveryMobile", "deliveryTelephone",
      "businessType", "tinNumber", "lineOfBusiness", "lineOfBusinessOther",
      "businessActivity", "businessActivityOther",
      "paymentTerms", "customerType",
      "businessLife", "howLongAtAddress", "numberOfBranches",
      "govCertifications", "achievements", "otherMerits",
      "additionalNotes",
    ];
    for (const k of keys) {
      obj[k] = init(k);
    }
    return obj;
  });

  const [deliverySame, setDeliverySame] = useState(initBool("deliverySameAsOffice"));
  const [bankRefs, setBankRefs] = useState<BankRefRow[]>(() =>
    initialBankReferences.length > 0
      ? initialBankReferences.map((r) => ({ ...emptyBankRef(), ...r }))
      : []
  );

  const initialPaymentTerms = init("paymentTerms").toLowerCase();
  const isMovingToWithTerms =
    fields.paymentTerms === "with_terms" && initialPaymentTerms !== "with_terms";
  const customerTypeChanged = fields.customerType !== init("customerType");
  const effectiveCustomerType = fields.customerType || init("customerType");
  const routeTargetLabel = effectiveCustomerType === "dealer" ? "Legal Review" : "Finance Review";

  useEffect(() => {
    if (isMovingToWithTerms && bankRefs.length === 0) {
      setBankRefs([emptyBankRef()]);
    }
  }, [isMovingToWithTerms, bankRefs.length]);

  function updateBankRef(index: number, field: keyof BankRefRow, value: string) {
    setBankRefs((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function setF(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function resetAll() {
    const keys = Object.keys(fields);
    const reset: Record<string, string> = {};
    for (const k of keys) {
      reset[k] = init(k);
    }
    setFields(reset);
    setDeliverySame(initBool("deliverySameAsOffice"));
    setBankRefs(
      initialBankReferences.length > 0
        ? initialBankReferences.map((r) => ({ ...emptyBankRef(), ...r }))
        : []
    );
    setError("");
  }

  function bankRefsChanged(): boolean {
    const initial = initialBankReferences.map((r) => ({
      bank: r.bank ?? "",
      branch: r.branch ?? "",
      accountType: r.accountType ?? "",
      accountNo: r.accountNo ?? "",
    }));
    const current = bankRefs.map((r) => ({
      bank: r.bank.trim(),
      branch: r.branch.trim(),
      accountType: r.accountType.trim(),
      accountNo: r.accountNo.trim(),
    }));
    return JSON.stringify(initial) !== JSON.stringify(current);
  }

  function salesChannelLabel(value: string) {
    return CUSTOMER_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
  }

  function changedFields(): Record<string, unknown> {
    const changed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== init(key)) {
        changed[key] = value;
      }
    }
    if (changed.customerType) {
      changed.salesChannel = fields.customerType;
    }
    if (deliverySame !== initBool("deliverySameAsOffice")) {
      changed.deliverySameAsOffice = deliverySame;
    }
    if (bankRefsChanged()) {
      changed.bankReferences = bankRefs.filter((r) => r.bank.trim());
    }
    return changed;
  }

  async function handleSave() {
    setError("");
    const changed = changedFields();
    if (Object.keys(changed).length === 0) {
      setEditing(false);
      return;
    }

    if (isMovingToWithTerms) {
      const existingRefs = initialBankReferences.filter((r) => r.bank?.trim());
      const newRefs = bankRefs.filter((r) => r.bank.trim());
      const refsToUse = newRefs.length > 0 ? newRefs : existingRefs;
      if (refsToUse.length === 0) {
        setError("Bank references are required when changing payment terms to With Terms.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/cis/${cisId}/agent-update-customer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changed),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = typeof json.error === "string" ? json.error : JSON.stringify(json.error);
        setError(msg);
        return;
      }
      toast.success({ title: "Customer information saved!" });
      setEditing(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <Card className="print:hidden border border-amber-200/70 shadow-sm">
        <div className="flex items-center justify-between bg-amber-50 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-amber-900">Customer Information</p>
            <p className="text-xs text-amber-700 mt-0.5">Review and correct customer details if needed</p>
          </div>
          <Button
            onClick={() => setEditing(true)}
            className="gap-1.5 shrink-0 min-h-[44px] px-5 text-sm"
          >
            <PencilLine className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </Card>
    );
  }

  const missingDelivery = !fields.deliveryAddress && !fields.deliveryLandmarks && !fields.deliveryMobile && !fields.deliveryTelephone;

  return (
    <Card className="print:hidden border border-blue-200/70 shadow-sm">
      <div className="bg-blue-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Edit Customer Information</p>
            <p className="text-xs text-blue-200 mt-0.5">Update the details below as needed</p>
          </div>
          <span className="text-[10px] font-semibold text-yellow-200 bg-yellow-700/30 rounded-full px-2.5 py-1 shrink-0">
            Unsaved
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <FieldGroup
          label="Business Information"
        >
          <div className="space-y-1">
            <L>Trade / Business Name</L>
            <F value={fields.tradeName} onChange={(v) => setF("tradeName", v)} disabled={saving} placeholder="e.g. ABC Trading" />
          </div>
          <div className="space-y-1">
            <L>Corporate / Legal Name</L>
            <F value={fields.corporateName} onChange={(v) => setF("corporateName", v)} disabled={saving} placeholder="e.g. ABC Trading Corporation" />
          </div>
          <div className="space-y-1">
            <L>Date of Business Registration</L>
            <F value={fields.dateOfBusinessReg} onChange={(v) => setF("dateOfBusinessReg", v)} disabled={saving} placeholder="e.g. January 2020" />
          </div>
          <div className="space-y-1">
            <L>Number of Employees</L>
            <F value={fields.numberOfEmployees} onChange={(v) => setF("numberOfEmployees", v)} disabled={saving} placeholder="e.g. 50" />
          </div>
        </FieldGroup>

        <FieldGroup
          label="Contact Details"
        >
          <div className="space-y-1">
            <L>Contact Person</L>
            <F value={fields.contactPerson} onChange={(v) => setF("contactPerson", v)} disabled={saving} placeholder="Full name of contact person" />
          </div>
          <div className="space-y-1">
            <L>Mobile Number</L>
            <F value={fields.contactNumber} onChange={(v) => setF("contactNumber", v)} disabled={saving} placeholder="e.g. 09171234567" type="tel" />
          </div>
          <div className="space-y-1">
            <L>Email Address</L>
            <F value={fields.emailAddress} onChange={(v) => setF("emailAddress", v)} disabled={saving} placeholder="e.g. contact@abc.com" type="email" />
          </div>
          <div className="space-y-1">
            <L>Telephone Number</L>
            <F value={fields.telephoneNumber} onChange={(v) => setF("telephoneNumber", v)} disabled={saving} placeholder="e.g. 02-1234567" type="tel" />
          </div>
          <div className="space-y-1">
            <L>Website</L>
            <F value={fields.website} onChange={(v) => setF("website", v)} disabled={saving} placeholder="e.g. www.abc.com" />
          </div>
        </FieldGroup>

        <FieldGroup
          label="Office Address"
        >
          <div className="space-y-1">
            <L>Street Address</L>
            <TA value={fields.businessAddress} onChange={(v) => setF("businessAddress", v)} disabled={saving} placeholder="Unit/Floor, Building, Street" rows={2} />
          </div>
          <div className="space-y-1">
            <L>City / Municipality</L>
            <F value={fields.cityMunicipality} onChange={(v) => setF("cityMunicipality", v)} disabled={saving} placeholder="e.g. Makati City" />
          </div>
          <div className="space-y-1">
            <L>Postal Code</L>
            <F value={fields.postalCode} onChange={(v) => setF("postalCode", v)} disabled={saving} placeholder="e.g. 1200" />
          </div>
          <div className="space-y-1">
            <L>Landmarks</L>
            <TA value={fields.landmarks} onChange={(v) => setF("landmarks", v)} disabled={saving} placeholder="Nearby landmarks for easy finding" rows={2} />
          </div>
        </FieldGroup>

        {!missingDelivery && (
          <FieldGroup label="Delivery Address">
            <div className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                id="deliverySame"
                checked={deliverySame}
                onChange={(e) => setDeliverySame(e.target.checked)}
                disabled={saving}
                className="h-5 w-5 rounded border-zinc-300"
              />
              <Label htmlFor="deliverySame" className="text-sm font-medium text-zinc-700 !m-0">Same as office address</Label>
            </div>
            {!deliverySame && (
              <>
                <div className="space-y-1">
                  <L>Delivery Address</L>
                  <TA value={fields.deliveryAddress} onChange={(v) => setF("deliveryAddress", v)} disabled={saving} rows={2} />
                </div>
                <div className="space-y-1">
                  <L>Delivery Landmarks</L>
                  <TA value={fields.deliveryLandmarks} onChange={(v) => setF("deliveryLandmarks", v)} disabled={saving} rows={2} />
                </div>
                <div className="space-y-1">
                  <L>Delivery Mobile</L>
                  <F value={fields.deliveryMobile} onChange={(v) => setF("deliveryMobile", v)} disabled={saving} type="tel" />
                </div>
                <div className="space-y-1">
                  <L>Delivery Telephone</L>
                  <F value={fields.deliveryTelephone} onChange={(v) => setF("deliveryTelephone", v)} disabled={saving} type="tel" />
                </div>
              </>
            )}
          </FieldGroup>
        )}

        <FieldGroup
          label="Business Classification"
        >
          <div className="space-y-1">
            <L>Business Type</L>
            <Select value={fields.businessType} onValueChange={(v) => setF("businessType", v ?? "")} disabled={saving}>
              <SelectTrigger className="min-h-[48px] text-base px-4">
                <SelectValue placeholder="Select business type" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-base py-3">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <L>TIN Number</L>
            <F value={fields.tinNumber} onChange={(v) => setF("tinNumber", v)} disabled={saving} placeholder="e.g. 123-456-789-000" />
          </div>
          <div className="space-y-1">
            <L>Line of Business</L>
            <Select value={fields.lineOfBusiness} onValueChange={(v) => setF("lineOfBusiness", v ?? "")} disabled={saving}>
              <SelectTrigger className="min-h-[48px] text-base px-4">
                <SelectValue placeholder="Select line of business" />
              </SelectTrigger>
              <SelectContent>
                {LINE_OF_BUSINESS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-base py-3">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fields.lineOfBusiness === "other" && (
            <div className="space-y-1">
              <L>Other Line of Business</L>
              <F value={fields.lineOfBusinessOther} onChange={(v) => setF("lineOfBusinessOther", v)} disabled={saving} placeholder="Please specify" />
            </div>
          )}
          <div className="space-y-1">
            <L>Business Activity</L>
            <Select value={fields.businessActivity} onValueChange={(v) => setF("businessActivity", v ?? "")} disabled={saving}>
              <SelectTrigger className="min-h-[48px] text-base px-4">
                <SelectValue placeholder="Select business activity" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_ACTIVITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-base py-3">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fields.businessActivity === "other" && (
            <div className="space-y-1">
              <L>Other Business Activity</L>
              <F value={fields.businessActivityOther} onChange={(v) => setF("businessActivityOther", v)} disabled={saving} placeholder="Please specify" />
            </div>
          )}
        </FieldGroup>

        <FieldGroup
          label="Payment & Sales"
        >
          <div className="space-y-1">
            <L>Customer Type</L>
            <Select value={fields.customerType} onValueChange={(v) => setF("customerType", v ?? "")} disabled={saving}>
              <SelectTrigger className="min-h-[48px] text-base px-4">
                <SelectValue placeholder="Select customer type" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-base py-3">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(customerTypeChanged || effectiveCustomerType) && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                <ArrowRight className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <span className="text-xs text-sky-800">
                  Resubmit will route to <strong>{routeTargetLabel}</strong>
                  {customerTypeChanged && <span className="text-sky-600"> (type changed)</span>}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <L>Payment Terms</L>
            <Select value={fields.paymentTerms} onValueChange={(v) => setF("paymentTerms", v ?? "")} disabled={saving}>
              <SelectTrigger className="min-h-[48px] text-base px-4">
                <SelectValue placeholder="Select payment terms" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-base py-3">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isMovingToWithTerms && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-800">Bank References Required</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Changing to With Terms requires at least one bank reference below.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <L>Sales Channel</L>
            <Input
              value={salesChannelLabel(fields.customerType)}
              disabled
              className="w-full min-h-[48px] text-base px-4 bg-zinc-50 text-zinc-600"
            />
            <p className="text-xs text-zinc-500">Automatically set from customer type.</p>
          </div>
        </FieldGroup>

        {(isMovingToWithTerms || bankRefs.length > 0 || initialBankReferences.length > 0) && (
          <FieldGroup label="Bank References" defaultOpen={isMovingToWithTerms}>
            <p className="text-xs text-zinc-500 -mt-1">
              {isMovingToWithTerms
                ? "Required when changing to With Terms."
                : "Update bank references if needed."}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setBankRefs((prev) => [...prev, emptyBankRef()])}
                disabled={saving}
                className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded px-2 py-1 bg-white"
              >
                <Plus className="h-3 w-3" /> Add Row
              </button>
            </div>
            {bankRefs.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No bank references added yet.</p>
            ) : (
              <div className="space-y-3">
                {bankRefs.map((row, i) => (
                  <div key={i} className="relative rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
                    <button
                      type="button"
                      onClick={() => setBankRefs((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={saving}
                      className="absolute right-2 top-2 text-zinc-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pr-8">
                      <div className="space-y-1">
                        <L>Bank Name</L>
                        <F value={row.bank} onChange={(v) => updateBankRef(i, "bank", v)} disabled={saving} placeholder="e.g. BDO" />
                      </div>
                      <div className="space-y-1">
                        <L>Branch</L>
                        <F value={row.branch} onChange={(v) => updateBankRef(i, "branch", v)} disabled={saving} placeholder="e.g. Makati Branch" />
                      </div>
                      <div className="space-y-1">
                        <L>Account Type</L>
                        <F value={row.accountType} onChange={(v) => updateBankRef(i, "accountType", v)} disabled={saving} placeholder="Savings / Checking" />
                      </div>
                      <div className="space-y-1">
                        <L>Account No.</L>
                        <F value={row.accountNo} onChange={(v) => updateBankRef(i, "accountNo", v)} disabled={saving} placeholder="Account number" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FieldGroup>
        )}

        <FieldGroup
          label="Business Background"
          defaultOpen={!!(fields.businessLife || fields.howLongAtAddress || fields.numberOfBranches || fields.govCertifications || fields.achievements || fields.otherMerits)}
        >
          <div className="space-y-1">
            <L>Years in Business</L>
            <F value={fields.businessLife} onChange={(v) => setF("businessLife", v)} disabled={saving} placeholder="e.g. 10" />
          </div>
          <div className="space-y-1">
            <L>Years at Current Address</L>
            <F value={fields.howLongAtAddress} onChange={(v) => setF("howLongAtAddress", v)} disabled={saving} placeholder="e.g. 5" />
          </div>
          <div className="space-y-1">
            <L>Number of Branches</L>
            <F value={fields.numberOfBranches} onChange={(v) => setF("numberOfBranches", v)} disabled={saving} placeholder="e.g. 3" />
          </div>
          <div className="space-y-1">
            <L>Government Certifications</L>
            <TA value={fields.govCertifications} onChange={(v) => setF("govCertifications", v)} disabled={saving} rows={3} placeholder="List relevant government certifications" />
          </div>
          <div className="space-y-1">
            <L>Achievements</L>
            <TA value={fields.achievements} onChange={(v) => setF("achievements", v)} disabled={saving} rows={3} />
          </div>
          <div className="space-y-1">
            <L>Other Merits</L>
            <TA value={fields.otherMerits} onChange={(v) => setF("otherMerits", v)} disabled={saving} rows={3} />
          </div>
        </FieldGroup>

        <FieldGroup label="Additional Notes" defaultOpen={!!fields.additionalNotes}>
          <div className="space-y-1">
            <L>Notes</L>
            <TA value={fields.additionalNotes} onChange={(v) => setF("additionalNotes", v)} disabled={saving} rows={3} />
          </div>
        </FieldGroup>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full min-h-[48px] gap-2 text-base"
          >
            {saving ? (
              <><Save className="h-5 w-5 animate-pulse" />Saving...</>
            ) : (
              <><Save className="h-5 w-5" />Save Changes</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => { resetAll(); setEditing(false); }}
            disabled={saving}
            className="w-full min-h-[48px] gap-2 text-base"
          >
            <X className="h-5 w-5" />
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
