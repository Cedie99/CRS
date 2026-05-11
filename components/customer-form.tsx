"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { cisFormSchema, LINE_OF_BUSINESS_OPTIONS, BUSINESS_ACTIVITY_OPTIONS, SALES_CHANNEL_OPTIONS } from "@/lib/validations/cis";
import { DOC_SLOTS, SCORING_DOC_SLOTS, type FileEntry } from "@/lib/doc-types";
import { SignaturePad, SignaturePadRef } from "@/components/signature-pad";
import { DocUploadSlot } from "@/components/doc-upload-slot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { humanizeDisplayValue } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<keyof z.infer<typeof cisFormSchema> | "_form" | import("@/lib/doc-types").DocType, string>>;

interface OwnerRow { name: string; nationality: string; percentage: string; contact: string }
interface OfficerRow { name: string; position: string; contact: string }
interface TradeRefRow { company: string; address: string; contact: string; years: string }
interface BankRefRow { bank: string; branch: string; accountType: string; accountNo: string }

// ─── Constants ───────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: "corporation",     label: "Corporation" },
  { value: "partnership",     label: "Partnership" },
  { value: "sole_proprietor", label: "Sole Proprietor" },
  { value: "cooperative",     label: "Cooperative" },
  { value: "other",           label: "Other" },
];

const PAYMENT_TERMS = [
  { value: "cod", label: "COD" },
  { value: "prepaid", label: "Prepaid" },
  { value: "with_terms", label: "With Terms" },
] as const;

const TOTAL_STEPS = 6;
const STEP_LABELS = [
  "Business Info",
  "Addresses",
  "Classification",
  "Ownership",
  "Documents",
  "Background & Sign",
];

function getOptionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string
) {
  return options.find((option) => option.value === value)?.label ?? humanizeDisplayValue(value);
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 sm:p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Step {current} of {total}</span>
        <span className="text-sm font-semibold text-zinc-900">{labels[current - 1]}</span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-zinc-100">
        <div
          className="h-1.5 rounded-full bg-zinc-900 transition-all duration-300"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <div className="hidden grid-cols-2 gap-2 sm:grid lg:grid-cols-3">
        {labels.map((label, i) => (
          <div
            key={i}
            className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
              i + 1 === current
                ? "border-zinc-900 bg-zinc-900 text-white"
                : i + 1 < current
                  ? "border-zinc-300 bg-white text-zinc-700"
                  : "border-zinc-200 bg-zinc-100 text-zinc-500"
            }`}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section header helper ────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-zinc-200" />
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{title}</p>
      <div className="h-px flex-1 bg-zinc-200" />
    </div>
  );
}

// ─── Dynamic row table ────────────────────────────────────────────────────────

function DynamicTable<T extends { [K in keyof T]: string }>({
  rows,
  onChange,
  columns,
  emptyRow,
  disabled,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  columns: {
    key: keyof T;
    label: string;
    placeholder?: string;
    type?: React.HTMLInputTypeAttribute;
    inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
    pattern?: string;
    min?: number;
    max?: number;
    step?: number;
    title?: string;
    sanitize?: (value: string) => string;
  }[];
  emptyRow: T;
  disabled: boolean;
}) {
  const add = () => onChange([...rows, { ...emptyRow }]);
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const update = (i: number, key: keyof T, value: string) => {
    const next = rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="relative rounded-lg border border-zinc-200 bg-white p-3 shadow-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            {columns.map((col) => (
              <div key={String(col.key)} className="space-y-1">
                <Label className="text-xs">{col.label}</Label>
                <Input
                  value={row[col.key]}
                  onChange={(e) => update(i, col.key, col.sanitize ? col.sanitize(e.target.value) : e.target.value)}
                  placeholder={col.placeholder}
                  type={col.type}
                  inputMode={col.inputMode}
                  pattern={col.pattern}
                  min={col.min}
                  max={col.max}
                  step={col.step}
                  title={col.title}
                  disabled={disabled}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={disabled}
              className="absolute right-2 top-2 rounded p-0.5 text-zinc-400 hover:text-red-500 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        Add row
      </button>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

interface CustomerFormProps {
  token: string;
  agentCode: string;
  customerType: string;
  agentFillMode?: boolean;
}

const EMPTY_OWNER: OwnerRow   = { name: "", nationality: "", percentage: "", contact: "" };
const EMPTY_OFFICER: OfficerRow = { name: "", position: "", contact: "" };
const EMPTY_TRADE: TradeRefRow  = { company: "", address: "", contact: "", years: "" };
const EMPTY_BANK: BankRefRow    = { bank: "", branch: "", accountType: "", accountNo: "" };

function sanitizePhoneInput(value: string) {
  return value.replace(/[^0-9+()\-\s]/g, "");
}

function sanitizeTinInput(value: string) {
  return value.replace(/[^0-9-]/g, "");
}

function sanitizeDigitsInput(value: string) {
  return value.replace(/\D/g, "");
}

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, "")}`;
}

function sanitizeAccountNumberInput(value: string) {
  return value.replace(/[^0-9\-\s]/g, "");
}

export function CustomerForm({ token, agentCode, customerType, agentFillMode = false }: CustomerFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Controlled selects
  const [businessType, setBusinessType]         = useState("");
  const [lineOfBusiness, setLineOfBusiness]     = useState("");
  const [businessActivity, setBusinessActivity] = useState("");
  const [paymentTerms, setPaymentTerms]         = useState("");
  const [salesChannel, setSalesChannel]         = useState(customerType ?? "");

  // Controlled phone/sanitized inputs — direct DOM mutation (e.currentTarget.value = …)
  // doesn't update @base-ui/react InputPrimitive's internal state, so values get
  // reset on re-renders when the step div transitions to display:none.
  const [contactNumber, setContactNumber]       = useState("");
  const [telephoneNumber, setTelephoneNumber]   = useState("");
  const [deliveryMobile, setDeliveryMobile]     = useState("");
  const [deliveryTelephone, setDeliveryTelephone] = useState("");
  const [tinNumber, setTinNumber]               = useState("");
  const [numberOfEmployees, setNumberOfEmployees] = useState("");
  const [businessLife, setBusinessLife] = useState("");
  const [howLongAtAddress, setHowLongAtAddress] = useState("");
  const [numberOfBranches, setNumberOfBranches] = useState("");

  // Delivery same as office
  const [deliverySameAsOffice, setDeliverySameAsOffice] = useState(false);

  // Dynamic rows
  const [owners, setOwners]       = useState<OwnerRow[]>([{ ...EMPTY_OWNER }]);
  const [officers, setOfficers]   = useState<OfficerRow[]>([{ ...EMPTY_OFFICER }]);
  const [tradeRefs, setTradeRefs] = useState<TradeRefRow[]>([{ ...EMPTY_TRADE }]);
  const [bankRefs, setBankRefs]   = useState<BankRefRow[]>([{ ...EMPTY_BANK }]);

  // Document uploads
  const [docs, setDocs] = useState<Record<string, FileEntry[]>>(
    Object.fromEntries(DOC_SLOTS.map((s) => [s.key, []]))
  );

  // Signature
  const signatureRef = useRef<SignaturePadRef>(null);
  const [signatureEmpty, setSignatureEmpty] = useState(true);
  const onSignatureChange = useCallback((isEmpty: boolean) => setSignatureEmpty(isEmpty), []);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [declarationError, setDeclarationError] = useState("");
  const [debugStep, setDebugStep] = useState("idle");
  const withTermsSelected = paymentTerms === "with_terms";

  // Documents required based on customer type + payment terms (per business rules from meetings)
  // COD end_user / dealer → ID only
  // COD distributor / private_label / toll_blend → ID + DTI/SEC + BIR
  // With Terms (any type) → ID + DTI/SEC + BIR + Bank Statement
  const isCorporateType = ["distributor", "private_label", "toll_blend"].includes(salesChannel);
  const requiredDocs: string[] = withTermsSelected
    ? ["docValidId", "docSecDti", "docBirCertificate", "docBankStatement"]
    : isCorporateType
      ? ["docValidId", "docSecDti", "docBirCertificate"]
      : ["docValidId"];

  // When the user navigates to the signature step, explicitly size the canvas.
  // ResizeObserver alone is unreliable when a parent transitions from display:none
  // in some production browser environments.
  useEffect(() => {
    if (currentStep === TOTAL_STEPS) {
      requestAnimationFrame(() => {
        signatureRef.current?.init();
      });
    }
  }, [currentStep]);

  function setDocFiles(key: string, files: FileEntry[]) {
    setDocs((prev) => ({ ...prev, [key]: files }));
  }

  function scrollToTop() {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateStep(step: number): boolean {
    const fd = new FormData(formRef.current!);
    const errs: FieldErrors = {};

    if (step === 1) {
      if (!fd.get("corporateName")) errs.corporateName = "Required";
      if (!fd.get("tradeName")) errs.tradeName = "Required";
      if (!fd.get("contactPerson")) errs.contactPerson = "Required";
      if (!fd.get("emailAddress")) errs.emailAddress = "Required";
      if (!contactNumber) errs.contactNumber = "Required";
    }
    if (step === 2) {
      if (!fd.get("businessAddress")) errs.businessAddress = "Required";
      if (!fd.get("cityMunicipality")) errs.cityMunicipality = "Required";
    }
    if (step === 3) {
      if (!businessType) errs.businessType = "Required";

      if (lineOfBusiness === "other" && !String(fd.get("lineOfBusinessOther") ?? "").trim()) {
        errs.lineOfBusinessOther = "Please specify";
      }
      if (businessActivity === "other" && !String(fd.get("businessActivityOther") ?? "").trim()) {
        errs.businessActivityOther = "Please specify";
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  }

  function handleNext() {
    if (!validateStep(currentStep)) return;
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
    scrollToTop();
  }

  function handleBack() {
    setErrors({});
    setCurrentStep((s) => Math.max(s - 1, 1));
    scrollToTop();
  }

  async function handleSubmit() {
    setDebugStep("started");
    setErrors({});
    setDeclarationError("");

    const fd = new FormData(formRef.current!);

    if (signatureRef.current?.isEmpty()) {
      setDebugStep("blocked:sig-ref-empty");
      setErrors({ customerSignature: "Signature is required" });
      return;
    }

    if (!declarationChecked) {
      setDebugStep("blocked:declaration");
      setDeclarationError("Please confirm the declaration before submitting.");
      return;
    }

    const customerSignature = signatureRef.current?.toDataURL() ?? "";
    setDebugStep("got-signature-len:" + customerSignature.length);

    // Filter out empty rows
    const cleanOwners   = owners.filter((r) => r.name.trim());
    const cleanOfficers = officers.filter((r) => r.name.trim());
    const cleanTradeRefs = tradeRefs.filter((r) => r.company.trim());
    const cleanBankRefs  = bankRefs.filter((r) => r.bank.trim());

    const data = {
      corporateName:     fd.get("corporateName") as string,
      tradeName:         fd.get("tradeName") as string,
      dateOfBusinessReg: (fd.get("dateOfBusinessReg") as string) || undefined,
      numberOfEmployees: numberOfEmployees || undefined,

      contactPerson:    fd.get("contactPerson") as string,
      emailAddress:     fd.get("emailAddress") as string,
      contactNumber,
      telephoneNumber:  telephoneNumber || undefined,
      website:          (fd.get("website") as string) || undefined,

      businessAddress:  fd.get("businessAddress") as string,
      cityMunicipality: fd.get("cityMunicipality") as string,
      landmarks:        (fd.get("landmarks") as string) || undefined,

      deliverySameAsOffice,
      deliveryAddress:   deliverySameAsOffice ? undefined : (fd.get("deliveryAddress") as string) || undefined,
      deliveryLandmarks: deliverySameAsOffice ? undefined : (fd.get("deliveryLandmarks") as string) || undefined,
      deliveryMobile:    deliverySameAsOffice ? undefined : deliveryMobile || undefined,
      deliveryTelephone: deliverySameAsOffice ? undefined : deliveryTelephone || undefined,

      lineOfBusiness:        lineOfBusiness || undefined,
      lineOfBusinessOther:   (fd.get("lineOfBusinessOther") as string) || undefined,
      businessActivity:      businessActivity || undefined,
      businessActivityOther: (fd.get("businessActivityOther") as string) || undefined,
      businessType,
      salesChannel:          salesChannel || undefined,
      tinNumber:             tinNumber || undefined,

      owners:       cleanOwners.length ? cleanOwners : undefined,
      officers:     cleanOfficers.length ? cleanOfficers : undefined,
      paymentTerms: paymentTerms || undefined,

      businessLife:      businessLife || undefined,
      howLongAtAddress:  howLongAtAddress || undefined,
      numberOfBranches:  numberOfBranches || undefined,
      tradeReferences:   cleanTradeRefs.length ? cleanTradeRefs : undefined,
      bankReferences:    cleanBankRefs.length ? cleanBankRefs : undefined,
      achievements:      (fd.get("achievements") as string) || undefined,
      otherMerits:       (fd.get("otherMerits") as string) || undefined,

      additionalNotes: (fd.get("additionalNotes") as string) || undefined,
      customerSignature,
    };

    const parsed = cisFormSchema.safeParse(data);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setDebugStep("blocked:zod:" + Object.keys(fe).join(","));
      const flatErrors = Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0]]));
      setErrors(flatErrors);

      // Navigate back to the earliest step that contains a validation error
      // so the user can see which field is failing.
      const step1Fields = ["corporateName", "tradeName", "contactPerson", "emailAddress", "contactNumber", "telephoneNumber", "website"];
      const step2Fields = ["businessAddress", "cityMunicipality", "deliveryAddress", "deliveryMobile", "deliveryTelephone"];
      const step3Fields = ["businessType", "salesChannel", "lineOfBusiness", "lineOfBusinessOther", "businessActivity", "businessActivityOther", "tinNumber"];
      const step4Fields = ["owners", "officers", "paymentTerms"];
      const step5Fields = ["docValidId", "docSecDti", "docBirCertificate", "docBankStatement", "docMayorsPermit"];
      const errorKeys = Object.keys(flatErrors);
      const firstErrStep =
        errorKeys.some((k) => step1Fields.includes(k)) ? 1 :
        errorKeys.some((k) => step2Fields.includes(k)) ? 2 :
        errorKeys.some((k) => step3Fields.includes(k)) ? 3 :
        errorKeys.some((k) => step4Fields.includes(k)) ? 4 :
        errorKeys.some((k) => step5Fields.includes(k)) ? 5 : 6;
      setCurrentStep(firstErrStep);
      scrollToTop();
      return;
    }

    setDebugStep("fetching");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, ...docs }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.error?._form) setErrors({ _form: json.error._form[0] });
        else if (typeof json.error === "string") setErrors({ _form: json.error });
        else if (json.error && typeof json.error === "object") setErrors(Object.fromEntries(Object.entries(json.error).map(([k, v]) => [k, (v as string[])[0]])));
        else setErrors({ _form: json.message ?? "Something went wrong. Please try again." });
        return;
      }
      router.push(agentFillMode ? "/agent" : `/form/${token}/submitted`);
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  const submitDisabled = isLoading || !businessType || signatureEmpty || !declarationChecked;

  return (
    <Card ref={cardRef} className="overflow-hidden border-zinc-200/80 bg-white/95 py-0 shadow-lg shadow-zinc-200/40 backdrop-blur">
      <CardHeader className="border-b border-zinc-200/80 bg-zinc-50/70 pb-5">
        <CardTitle className="text-xl leading-tight sm:text-2xl pt-6">Customer Registration Sheet</CardTitle>
        <CardDescription>
          <span className="block text-sm text-zinc-600">
            Complete all required details to submit your customer profile for review.
          </span>
          <span className="mt-1 block text-xs text-zinc-500">
            Fields marked with <span className="font-bold text-red-600 text-base leading-none">*</span> are required.
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="rounded-full border border-zinc-300 bg-white px-2.5 py-1">
              Agent: <span className="font-mono text-zinc-700">{agentCode}</span>
            </span>
            {customerType !== "standard" && (
              <span className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 capitalize text-zinc-700">
                {humanizeDisplayValue(customerType)}
              </span>
            )}
          </span>
        </CardDescription>
        {agentFillMode && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Agent fill mode —</span> you are completing this form on behalf of the customer.
          </div>
        )}
      </CardHeader>

      <form ref={formRef} noValidate>
        <CardContent className="space-y-7 px-4 pb-4 pt-5 sm:space-y-8 sm:px-6 sm:pb-6">

          <StepIndicator current={currentStep} total={TOTAL_STEPS} labels={STEP_LABELS} />

          {errors._form && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{errors._form}</p>
          )}

          {/* ── Step 1: Business Info + Contact ── */}
          <div className={currentStep !== 1 ? "hidden" : "space-y-6"}>
            <section>
              <SectionHeader title="Business Information" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="corporateName">Registered corporate name <span className="font-bold text-red-600 text-base leading-none">*</span></Label>
                  <Input id="corporateName" name="corporateName" placeholder="ABC Corporation" disabled={isLoading} />
                  {errors.corporateName && <p className="text-xs text-red-600">{errors.corporateName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tradeName">Trade / business name <span className="font-bold text-red-600 text-base leading-none">*</span></Label>
                  <Input id="tradeName" name="tradeName" placeholder="ABC Trading" disabled={isLoading} />
                  {errors.tradeName && <p className="text-xs text-red-600">{errors.tradeName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBusinessReg">Date of business registration</Label>
                  <Input id="dateOfBusinessReg" name="dateOfBusinessReg" type="date" disabled={isLoading} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numberOfEmployees">Number of employees</Label>
                  <Input
                    id="numberOfEmployees"
                    name="numberOfEmployees"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    title="Use numbers only"
                    placeholder="e.g. 10"
                    value={numberOfEmployees}
                    onChange={(e) => setNumberOfEmployees(sanitizeDigitsInput(e.target.value))}
                    disabled={isLoading}
                  />
                  {errors.numberOfEmployees && <p className="text-xs text-red-600">{errors.numberOfEmployees}</p>}
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <SectionHeader title="Contact Details" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contactPerson">Contact person <span className="font-bold text-red-600 text-base leading-none">*</span></Label>
                  <Input id="contactPerson" name="contactPerson" placeholder="Juan dela Cruz" disabled={isLoading} />
                  {errors.contactPerson && <p className="text-xs text-red-600">{errors.contactPerson}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emailAddress">Email address <span className="font-bold text-red-600 text-base leading-none">*</span></Label>
                  <Input id="emailAddress" name="emailAddress" type="email" placeholder="contact@business.com" disabled={isLoading} />
                  {errors.emailAddress && <p className="text-xs text-red-600">{errors.emailAddress}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactNumber">Mobile number <span className="font-bold text-red-600 text-base leading-none">*</span></Label>
                  <Input
                    id="contactNumber"
                    name="contactNumber"
                    placeholder="09XX XXX XXXX"
                    inputMode="tel"
                    title="Use numbers and phone symbols only"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(sanitizePhoneInput(e.target.value))}
                    disabled={isLoading}
                  />
                  {errors.contactNumber && <p className="text-xs text-red-600">{errors.contactNumber}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telephoneNumber">Telephone number</Label>
                  <Input
                    id="telephoneNumber"
                    name="telephoneNumber"
                    placeholder="(02) XXXX-XXXX"
                    inputMode="tel"
                    title="Use numbers and phone symbols only"
                    value={telephoneNumber}
                    onChange={(e) => setTelephoneNumber(sanitizePhoneInput(e.target.value))}
                    disabled={isLoading}
                  />
                  {errors.telephoneNumber && <p className="text-xs text-red-600">{errors.telephoneNumber}</p>}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" type="url" placeholder="https://www.example.com" disabled={isLoading} />
                </div>
              </div>
            </section>
          </div>

          {/* ── Step 2: Addresses ── */}
          <div className={currentStep !== 2 ? "hidden" : "space-y-6"}>
            <section>
              <SectionHeader title="Office Address" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="businessAddress">Street address <span className="font-bold text-red-600 text-base leading-none">*</span></Label>
                  <Input id="businessAddress" name="businessAddress" placeholder="123 Main St., Brgy. Example" disabled={isLoading} />
                  {errors.businessAddress && <p className="text-xs text-red-600">{errors.businessAddress}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cityMunicipality">City / Municipality <span className="font-bold text-red-600 text-base leading-none">*</span></Label>
                  <Input id="cityMunicipality" name="cityMunicipality" placeholder="Makati City" disabled={isLoading} />
                  {errors.cityMunicipality && <p className="text-xs text-red-600">{errors.cityMunicipality}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="landmarks">Landmarks / directions</Label>
                  <Input id="landmarks" name="landmarks" placeholder="Near SM Makati" disabled={isLoading} />
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <SectionHeader title="Delivery Address" />
              <label className="flex cursor-pointer items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={deliverySameAsOffice}
                  onChange={(e) => setDeliverySameAsOffice(e.target.checked)}
                  disabled={isLoading}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <span className="text-sm text-zinc-700">Same as office address</span>
              </label>
              {!deliverySameAsOffice && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="deliveryAddress">Delivery street address</Label>
                    <Input id="deliveryAddress" name="deliveryAddress" placeholder="123 Delivery St." disabled={isLoading} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="deliveryLandmarks">Delivery landmarks</Label>
                    <Input id="deliveryLandmarks" name="deliveryLandmarks" placeholder="Near the warehouse" disabled={isLoading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deliveryMobile">Delivery mobile</Label>
                      <Input
                        id="deliveryMobile"
                        name="deliveryMobile"
                        placeholder="09XX XXX XXXX"
                        inputMode="tel"
                        title="Use numbers and phone symbols only"
                        value={deliveryMobile}
                        onChange={(e) => setDeliveryMobile(sanitizePhoneInput(e.target.value))}
                        disabled={isLoading}
                      />
                      {errors.deliveryMobile && <p className="text-xs text-red-600">{errors.deliveryMobile}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deliveryTelephone">Delivery telephone</Label>
                      <Input
                        id="deliveryTelephone"
                        name="deliveryTelephone"
                        placeholder="(02) XXXX-XXXX"
                        inputMode="tel"
                        title="Use numbers and phone symbols only"
                        value={deliveryTelephone}
                        onChange={(e) => setDeliveryTelephone(sanitizePhoneInput(e.target.value))}
                        disabled={isLoading}
                      />
                      {errors.deliveryTelephone && <p className="text-xs text-red-600">{errors.deliveryTelephone}</p>}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* ── Step 3: Classification ── */}
          <div className={currentStep !== 3 ? "hidden" : "space-y-6"}>
            <section>
              <SectionHeader title="Business Classification" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Line of business</Label>
                  <Select value={lineOfBusiness} onValueChange={(v) => setLineOfBusiness(v ?? "")} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select…">
                        {lineOfBusiness ? getOptionLabel(LINE_OF_BUSINESS_OPTIONS, lineOfBusiness) : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LINE_OF_BUSINESS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {lineOfBusiness === "other" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="lineOfBusinessOther">Please specify</Label>
                    <Input id="lineOfBusinessOther" name="lineOfBusinessOther" disabled={isLoading} />
                    {errors.lineOfBusinessOther && <p className="text-xs text-red-600">{errors.lineOfBusinessOther}</p>}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Business activity</Label>
                  <Select value={businessActivity} onValueChange={(v) => setBusinessActivity(v ?? "")} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select…">
                        {businessActivity ? getOptionLabel(BUSINESS_ACTIVITY_OPTIONS, businessActivity) : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_ACTIVITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {businessActivity === "other" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="businessActivityOther">Please specify</Label>
                    <Input id="businessActivityOther" name="businessActivityOther" disabled={isLoading} />
                    {errors.businessActivityOther && <p className="text-xs text-red-600">{errors.businessActivityOther}</p>}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Business type <span className="font-bold text-red-600 text-base leading-none">*</span></Label>
                  <Select value={businessType} onValueChange={(v) => setBusinessType(v ?? "")} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type…">
                        {businessType ? getOptionLabel(BUSINESS_TYPES, businessType) : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.businessType && <p className="text-xs text-red-600">{errors.businessType}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Sales channel</Label>
                  <Select value={salesChannel} onValueChange={(v) => setSalesChannel(v ?? "")} disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel…">
                        {salesChannel ? getOptionLabel(SALES_CHANNEL_OPTIONS, salesChannel) : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SALES_CHANNEL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(errors as Record<string, string>).salesChannel && <p className="text-xs text-red-600">{(errors as Record<string, string>).salesChannel}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tinNumber">TIN number</Label>
                  <Input
                    id="tinNumber"
                    name="tinNumber"
                    placeholder="Enter TIN (default: 0000000 if none)"
                    inputMode="numeric"
                    pattern="[0-9-]*"
                    title="Use numbers and hyphens only"
                    value={tinNumber}
                    onChange={(e) => setTinNumber(sanitizeTinInput(e.target.value))}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-zinc-400">Leave blank to use 0000000 as default.</p>
                  {errors.tinNumber && <p className="text-xs text-red-600">{errors.tinNumber}</p>}
                </div>
              </div>
            </section>
          </div>

          {/* ── Step 4: Ownership & Officers ── */}
          <div className={currentStep !== 4 ? "hidden" : "space-y-6"}>
            <section>
              <SectionHeader title="Owners / Partners" />
              <DynamicTable<OwnerRow>
                rows={owners}
                onChange={setOwners}
                emptyRow={EMPTY_OWNER}
                disabled={isLoading}
                columns={[
                  { key: "name",        label: "Full name",      placeholder: "Juan dela Cruz" },
                  { key: "nationality", label: "Nationality",    placeholder: "Filipino" },
                  {
                    key: "percentage",
                    label: "% ownership",
                    placeholder: "50",
                    type: "text",
                    inputMode: "decimal",
                    pattern: "^100(\\.0+)?$|^\\d{1,2}(\\.\\d+)?$",
                    title: "Enter a value from 0 to 100",
                    sanitize: sanitizeDecimalInput,
                  },
                  {
                    key: "contact",
                    label: "Contact number",
                    placeholder: "09XX XXX XXXX",
                    inputMode: "tel",
                    title: "Use numbers and phone symbols only",
                    sanitize: sanitizePhoneInput,
                  },
                ]}
              />
            </section>

            <Separator />

            <section>
              <SectionHeader title="Officers / Authorized Representatives" />
              <DynamicTable<OfficerRow>
                rows={officers}
                onChange={setOfficers}
                emptyRow={EMPTY_OFFICER}
                disabled={isLoading}
                columns={[
                  { key: "name",     label: "Full name", placeholder: "Maria Santos" },
                  { key: "position", label: "Position",  placeholder: "President" },
                  {
                    key: "contact",
                    label: "Contact",
                    placeholder: "09XX XXX XXXX",
                    inputMode: "tel",
                    title: "Use numbers and phone symbols only",
                    sanitize: sanitizePhoneInput,
                  },
                ]}
              />
            </section>

            <Separator />

            <div className="max-w-xs space-y-1.5">
              <Label>Payment terms</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {PAYMENT_TERMS.map((t) => {
                  const checked = paymentTerms === t.value;
                  return (
                    <label
                      key={t.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        checked
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentTermsRadio"
                        value={t.value}
                        checked={checked}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        disabled={isLoading}
                        className="h-4 w-4 border-zinc-300 text-emerald-700"
                      />
                      <span className="font-medium">{t.label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-500">
                If With Terms is selected, additional document requirements apply.
              </p>
            </div>
          </div>

          {/* ── Step 5: Supporting Documents ── */}
          <div className={currentStep !== 5 ? "hidden" : "space-y-4"}>
            <section>
              <SectionHeader title="Supporting Documents" />
              <p className="mb-4 text-sm text-zinc-500">
                Upload PDF, JPG, or PNG files. Max 10MB per file.{" "}
                <span className="text-red-500 font-medium">*</span> marks required documents.
              </p>

              {/* Required document guidance banner */}
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p className="font-semibold">
                  Recommended for {customerType === "end_user" ? "End-User" : customerType === "dealer" ? "Dealer" : customerType === "distributor" ? "Distributor" : customerType === "private_label" ? "Private Label" : customerType === "toll_blend" ? "Toll Blend" : "your account type"}
                  {withTermsSelected ? " (With Terms)" : " (COD/Prepaid)"}:
                </p>
                <ul className="mt-1.5 list-disc pl-4 text-xs space-y-0.5">
                  <li>Valid Government ID</li>
                  {(isCorporateType || withTermsSelected) && <li>SEC / DTI Registration Certificate</li>}
                  {(isCorporateType || withTermsSelected) && <li>BIR Certificate of Registration</li>}
                  {withTermsSelected && <li>3-Month Bank Statement / Bank Authorization Letter</li>}
                </ul>
                <p className="mt-2 text-xs text-blue-600">You may continue without uploading, but these will be needed for review.</p>
              </div>

              <div className="space-y-4">
                {SCORING_DOC_SLOTS.filter((s) => s.key !== "docIsoCertification" && s.key !== "docHalalCertificate").map((slot) => {
                  const isRequired = requiredDocs.includes(slot.key);
                  return (
                    <div key={slot.key}>
                      {isRequired && (
                        <p className="mb-1 text-xs font-semibold text-amber-600 flex items-center gap-1">
                          <span className="font-bold text-amber-600 text-base leading-none">*</span> Recommended
                        </p>
                      )}
                      <DocUploadSlot
                        docType={slot.key}
                        label={slot.label}
                        endpoint={`/api/form/${token}/upload`}
                        files={docs[slot.key]}
                        onChange={(files) => setDocFiles(slot.key, files)}
                        disabled={isLoading}
                        allowDelete={slot.key !== "docMayorsPermit"}
                      />
                    </div>
                  );
                })}

                {/* Certifications group */}
                <div className="rounded-lg border border-zinc-200 overflow-hidden">
                  <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2">
                    <p className="text-xs font-semibold text-zinc-700">Certifications</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Upload any applicable certification documents</p>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {(["docIsoCertification", "docHalalCertificate"] as const).map((key) => {
                      const slot = SCORING_DOC_SLOTS.find((s) => s.key === key)!;
                      return (
                        <div key={key} className="p-3">
                          <DocUploadSlot
                            docType={slot.key}
                            label={slot.label}
                            endpoint={`/api/form/${token}/upload`}
                            files={docs[slot.key]}
                            onChange={(files) => setDocFiles(slot.key, files)}
                            disabled={isLoading}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ── Step 6: Background, Notes & Signature ── */}
          <div className={currentStep !== 6 ? "hidden" : "space-y-6"}>
            <section>
              <SectionHeader title="Business Background" />
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="businessLife">Years in business</Label>
                  <Input
                    id="businessLife"
                    name="businessLife"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    placeholder="e.g. 5"
                    value={businessLife}
                    onChange={(e) => setBusinessLife(sanitizeDecimalInput(e.target.value))}
                    disabled={isLoading}
                  />
                  {errors.businessLife && <p className="text-xs text-red-600">{errors.businessLife}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="howLongAtAddress">Years at current address</Label>
                  <Input
                    id="howLongAtAddress"
                    name="howLongAtAddress"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    placeholder="e.g. 3"
                    value={howLongAtAddress}
                    onChange={(e) => setHowLongAtAddress(sanitizeDecimalInput(e.target.value))}
                    disabled={isLoading}
                  />
                  {errors.howLongAtAddress && <p className="text-xs text-red-600">{errors.howLongAtAddress}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numberOfBranches">Number of branches</Label>
                  <Input
                    id="numberOfBranches"
                    name="numberOfBranches"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 2"
                    value={numberOfBranches}
                    onChange={(e) => setNumberOfBranches(sanitizeDigitsInput(e.target.value))}
                    disabled={isLoading}
                  />
                  {errors.numberOfBranches && <p className="text-xs text-red-600">{errors.numberOfBranches}</p>}
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Trade References</p>
                <DynamicTable<TradeRefRow>
                  rows={tradeRefs}
                  onChange={setTradeRefs}
                  emptyRow={EMPTY_TRADE}
                  disabled={isLoading}
                  columns={[
                    { key: "company", label: "Company",     placeholder: "XYZ Supplies Inc." },
                    { key: "address", label: "Address",     placeholder: "Brgy. Example" },
                    {
                      key: "contact",
                      label: "Contact",
                      placeholder: "09XX XXX XXXX",
                      inputMode: "tel",
                      pattern: "[0-9+\\(\\) -]*",
                      title: "Use numbers and phone symbols only",
                      sanitize: sanitizePhoneInput,
                    },
                    {
                      key: "years",
                      label: "Years known",
                      placeholder: "2",
                      type: "text",
                      inputMode: "decimal",
                      pattern: "[0-9]*[.]?[0-9]*",
                      title: "Enter years as a number",
                      sanitize: sanitizeDecimalInput,
                    },
                  ]}
                />
              </div>

              {withTermsSelected && <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Bank References</p>
                <DynamicTable<BankRefRow>
                  rows={bankRefs}
                  onChange={setBankRefs}
                  emptyRow={EMPTY_BANK}
                  disabled={isLoading}
                  columns={[
                    { key: "bank",        label: "Bank name",    placeholder: "BDO" },
                    { key: "branch",      label: "Branch",       placeholder: "Makati Branch" },
                    {
                      key: "accountType",
                      label: "Account type",
                      placeholder: "Savings",
                    },
                    {
                      key: "accountNo",
                      label: "Account no.",
                      placeholder: "1234-5678-9012",
                      inputMode: "numeric",
                      pattern: "[0-9\\-\\s]*",
                      title: "Use digits, spaces, or hyphens only",
                      sanitize: sanitizeAccountNumberInput,
                    },
                  ]}
                />
              </div>}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="achievements">Awards / achievements</Label>
                  <Textarea id="achievements" name="achievements" rows={2} placeholder="e.g. Best SME Award 2023…" disabled={isLoading} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="otherMerits">Other merits / remarks</Label>
                  <Textarea id="otherMerits" name="otherMerits" rows={2} placeholder="Any other relevant information…" disabled={isLoading} />
                </div>
              </div>
            </section>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="additionalNotes">Additional notes</Label>
              <Textarea id="additionalNotes" name="additionalNotes" rows={3} placeholder="Any other relevant information…" disabled={isLoading} />
            </div>

            <Separator />

            <section>
              <SectionHeader title="Customer Signature" />
              <p className="mb-3 text-xs text-zinc-500">
                By signing below, you confirm that the information above is accurate and authorize Oracle Petroleum Corporation to process your business details.
              </p>
              <SignaturePad
                ref={signatureRef}
                onChange={onSignatureChange}
                disabled={isLoading}
              />
              {errors.customerSignature && (
                <p className="mt-1 text-xs text-red-600">{errors.customerSignature}</p>
              )}

              <label className="mt-4 flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={declarationChecked}
                  onChange={(e) => {
                    setDeclarationChecked(e.target.checked);
                    if (e.target.checked) setDeclarationError("");
                  }}
                  disabled={isLoading}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                />
                <span className="text-sm text-zinc-700">
                  I hereby declare that all information I have provided is correct.
                </span>
              </label>
              {declarationError && (
                <p className="mt-1 text-xs text-red-600">{declarationError}</p>
              )}
            </section>
          </div>

          {/* ── Navigation ── */}
          <div className="sticky bottom-0 z-20 -mx-4 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:hidden">
              Step {currentStep} of {TOTAL_STEPS}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="w-full gap-1.5 sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div className="hidden flex-1 sm:block">
              <span className="text-xs font-medium text-zinc-500">Step {currentStep} of {TOTAL_STEPS}</span>
            </div>
            {currentStep < TOTAL_STEPS ? (
              <Button type="button" onClick={handleNext} disabled={isLoading} className="w-full gap-1.5 sm:w-auto">
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={submitDisabled} className="w-full sm:w-auto">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </span>
                ) : "Submit My Information"}
              </Button>
            )}
            </div>
          </div>

        </CardContent>
      </form>
    </Card>
  );
}
