"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { cisFormSchema, LINE_OF_BUSINESS_OPTIONS, BUSINESS_ACTIVITY_OPTIONS } from "@/lib/validations/cis";
import { SignaturePad, SignaturePadRef } from "@/components/signature-pad";
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
import { Loader2, Plus, X, Upload, FileText, Trash2, ChevronLeft, ChevronRight, Pencil, Check } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type FieldErrors = Partial<Record<keyof z.infer<typeof cisFormSchema> | "_form", string>>;

interface OwnerRow { name: string; nationality: string; percentage: string; contact: string }
interface OfficerRow { name: string; position: string; contact: string }
interface TradeRefRow { company: string; address: string; contact: string; years: string }
interface BankRefRow { bank: string; branch: string; accountType: string; accountNo: string }
interface FileEntry { name: string; url: string; size: number; type: string }

// ─── Constants ───────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: "corporation",     label: "Corporation" },
  { value: "partnership",     label: "Partnership" },
  { value: "sole_proprietor", label: "Sole Proprietor" },
  { value: "cooperative",     label: "Cooperative" },
  { value: "other",           label: "Other" },
];

const PAYMENT_TERMS = [
  { value: "cod",       label: "COD (Cash on Delivery)" },
  { value: "credit_30", label: "Credit – 30 days" },
  { value: "credit_60", label: "Credit – 60 days" },
  { value: "credit_90", label: "Credit – 90 days" },
];

const DOC_SLOTS: { key: string; label: string; required?: boolean }[] = [
  { key: "docValidId",              label: "Valid Government ID",                            required: true },
  { key: "docMayorsPermit",         label: "Mayor or Barangay Permit",                       required: true },
  { key: "docSecDti",               label: "SEC / DTI Registration Certificate",              required: true },
  { key: "docBirCertificate",       label: "BIR Registration Certificate",                   required: true },
  { key: "docLocationMap",          label: "Location Map / Vicinity Map" },
  { key: "docFinancialStatement",   label: "Financial Statement / ITR" },
  { key: "docBankStatement",        label: "3-Month Bank Statement / Bank Authorization Letter" },
  { key: "docProofOfBilling",       label: "Proof of Billing" },
  { key: "docLeaseContract",        label: "Lease Contract / Title (if applicable)" },
  { key: "docProofOfOwnership",     label: "Proof of Ownership (if applicable)" },
  { key: "docStorePhoto",           label: "Photo of Plant / Office / Store with Signage" },
  { key: "docSupplierInvoice",      label: "Supplier Invoice (latest)" },
  { key: "docSocialMedia",          label: "Social Media / Website Screenshot" },
  { key: "docCertifications",       label: "Certifications (ISO / Halal Certificate)" },
  { key: "docGovCertifications",    label: "Government and Other Certifications" },
  { key: "docOther",                label: "Other Supporting Documents" },
];

const TOTAL_STEPS = 6;
const STEP_LABELS = [
  "Business Info",
  "Addresses",
  "Classification",
  "Ownership",
  "Documents",
  "Background & Sign",
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-400">Step {current} of {total}</span>
        <span className="text-sm font-semibold text-zinc-800">{labels[current - 1]}</span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-zinc-100">
        <div
          className="h-1.5 rounded-full bg-zinc-900 transition-all duration-300"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between">
        {labels.map((label, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i + 1 <= current ? "bg-zinc-900" : "bg-zinc-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Section header helper ────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</p>
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
        <div key={i} className="relative rounded-lg border border-zinc-200 bg-zinc-50 p-3">
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

// ─── File upload slot ─────────────────────────────────────────────────────────

function FileRow({
  file,
  docType,
  token,
  disabled,
  onRemove,
  onRename,
}: {
  file: FileEntry;
  docType: string;
  token: string;
  disabled: boolean;
  onRemove: () => void;
  onRename: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(file.name);
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(file.name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commitRename() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === file.name) {
      setEditing(false);
      return;
    }
    setRenaming(true);
    try {
      await fetch(`/api/form/${token}/upload`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, url: file.url, newName: trimmed }),
      });
      onRename(trimmed);
    } catch { /* ignore */ }
    setRenaming(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commitRename(); }
    if (e.key === "Escape") { setEditing(false); }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-1.5">
      <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          disabled={renaming}
          className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs text-zinc-700 outline-none focus:border-zinc-500"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-xs text-zinc-700">{file.name}</span>
      )}
      <span className="shrink-0 text-[10px] text-zinc-400">{(file.size / 1024).toFixed(0)} KB</span>
      {editing ? (
        <button
          type="button"
          onClick={commitRename}
          disabled={renaming || disabled}
          className="shrink-0 text-zinc-400 hover:text-zinc-700 disabled:opacity-40"
        >
          {renaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          disabled={disabled}
          className="shrink-0 text-zinc-400 hover:text-zinc-700 disabled:opacity-40"
          title="Rename file"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled || editing}
        className="shrink-0 text-zinc-400 hover:text-red-500 disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DocUploadSlot({
  docType,
  label,
  required,
  token,
  files,
  onChange,
  disabled,
}: {
  docType: string;
  label: string;
  required?: boolean;
  token: string;
  files: FileEntry[];
  onChange: (files: FileEntry[]) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setError("");
    setUploading(true);
    const results: FileEntry[] = [];
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("docType", docType);
      try {
        const res = await fetch(`/api/form/${token}/upload`, { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? "Upload failed"); break; }
        results.push(json as FileEntry);
      } catch {
        setError("Upload failed. Please try again.");
        break;
      }
    }
    if (results.length) onChange([...files, ...results]);
    setUploading(false);
  }

  async function handleRemove(file: FileEntry) {
    try {
      await fetch(`/api/form/${token}/upload`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, url: file.url }),
      });
    } catch { /* ignore */ }
    onChange(files.filter((f) => f.url !== file.url));
  }

  function handleRename(file: FileEntry, newName: string) {
    onChange(files.map((f) => f.url === file.url ? { ...f, name: newName } : f));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">
          {label}
          {required && <span className="ml-1 text-zinc-400 text-xs">(required)</span>}
        </Label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => handleFiles(e.target.files)}
          onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f) => (
            <FileRow
              key={f.url}
              file={f}
              docType={docType}
              token={token}
              disabled={disabled}
              onRemove={() => handleRemove(f)}
              onRename={(newName) => handleRename(f, newName)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

interface CustomerFormProps {
  token: string;
  agentCode: string;
  customerType: string;
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

export function CustomerForm({ token, agentCode, customerType }: CustomerFormProps) {
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
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [declarationError, setDeclarationError] = useState("");

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
      if (!fd.get("contactNumber")) errs.contactNumber = "Required";
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
    if (step === 5) {
      const missing = DOC_SLOTS.filter((slot) => slot.required && (docs[slot.key]?.length ?? 0) === 0);
      if (missing.length > 0) {
        errs._form = `Please upload required document(s): ${missing.map((m) => m.label).join(", ")}`;
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setDeclarationError("");

    const fd = new FormData(e.currentTarget);

    const missingRequiredDocs = DOC_SLOTS.filter((slot) => slot.required && (docs[slot.key]?.length ?? 0) === 0);
    if (missingRequiredDocs.length > 0) {
      setErrors({ _form: `Please upload required document(s): ${missingRequiredDocs.map((m) => m.label).join(", ")}` });
      return;
    }

    if (signatureRef.current?.isEmpty()) {
      setErrors({ customerSignature: "Signature is required" });
      return;
    }

    if (!declarationChecked) {
      setDeclarationError("Please confirm the declaration before submitting.");
      return;
    }

    const customerSignature = signatureRef.current?.toDataURL() ?? "";

    // Filter out empty rows
    const cleanOwners   = owners.filter((r) => r.name.trim());
    const cleanOfficers = officers.filter((r) => r.name.trim());
    const cleanTradeRefs = tradeRefs.filter((r) => r.company.trim());
    const cleanBankRefs  = bankRefs.filter((r) => r.bank.trim());

    const data = {
      corporateName:     fd.get("corporateName") as string,
      tradeName:         fd.get("tradeName") as string,
      dateOfBusinessReg: (fd.get("dateOfBusinessReg") as string) || undefined,
      numberOfEmployees: (fd.get("numberOfEmployees") as string) || undefined,

      contactPerson:    fd.get("contactPerson") as string,
      emailAddress:     fd.get("emailAddress") as string,
      contactNumber:    fd.get("contactNumber") as string,
      telephoneNumber:  (fd.get("telephoneNumber") as string) || undefined,
      website:          (fd.get("website") as string) || undefined,

      businessAddress:  fd.get("businessAddress") as string,
      cityMunicipality: fd.get("cityMunicipality") as string,
      landmarks:        (fd.get("landmarks") as string) || undefined,

      deliverySameAsOffice,
      deliveryAddress:   deliverySameAsOffice ? undefined : (fd.get("deliveryAddress") as string) || undefined,
      deliveryLandmarks: deliverySameAsOffice ? undefined : (fd.get("deliveryLandmarks") as string) || undefined,
      deliveryMobile:    deliverySameAsOffice ? undefined : (fd.get("deliveryMobile") as string) || undefined,
      deliveryTelephone: deliverySameAsOffice ? undefined : (fd.get("deliveryTelephone") as string) || undefined,

      lineOfBusiness:        lineOfBusiness || undefined,
      lineOfBusinessOther:   (fd.get("lineOfBusinessOther") as string) || undefined,
      businessActivity:      businessActivity || undefined,
      businessActivityOther: (fd.get("businessActivityOther") as string) || undefined,
      businessType,
      tinNumber:             (fd.get("tinNumber") as string) || undefined,

      owners:       cleanOwners.length ? cleanOwners : undefined,
      officers:     cleanOfficers.length ? cleanOfficers : undefined,
      paymentTerms: paymentTerms || undefined,

      businessLife:      (fd.get("businessLife") as string) || undefined,
      howLongAtAddress:  (fd.get("howLongAtAddress") as string) || undefined,
      numberOfBranches:  (fd.get("numberOfBranches") as string) || undefined,
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
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0]])));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/form/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.error?._form) setErrors({ _form: json.error._form[0] });
        else if (typeof json.error === "string") setErrors({ _form: json.error });
        else setErrors(Object.fromEntries(Object.entries(json.error ?? {}).map(([k, v]) => [k, (v as string[])[0]])));
        return;
      }
      router.push(`/form/${token}/submitted`);
    } catch {
      setErrors({ _form: "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  }

  const submitDisabled = isLoading || !businessType || signatureEmpty || !declarationChecked;

  return (
    <Card ref={cardRef}>
      <CardHeader className="pb-4">
        <CardTitle>Customer Registration Sheet</CardTitle>
        <CardDescription>
          Fields marked with <span className="font-medium text-zinc-700">*</span> are required.
          <span className="mt-1 block text-xs text-zinc-400">
            Agent: <span className="font-mono">{agentCode}</span>
            {customerType !== "standard" && (
              <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 capitalize text-zinc-600">
                {customerType.replace("_", " ")}
              </span>
            )}
          </span>
        </CardDescription>
      </CardHeader>

      <form ref={formRef} onSubmit={handleSubmit}>
        <CardContent className="space-y-6">

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
                  <Label htmlFor="corporateName">Registered corporate name *</Label>
                  <Input id="corporateName" name="corporateName" placeholder="ABC Corporation" disabled={isLoading} />
                  {errors.corporateName && <p className="text-xs text-red-600">{errors.corporateName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tradeName">Trade / business name *</Label>
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
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="e.g. 10"
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
                  <Label htmlFor="contactPerson">Contact person *</Label>
                  <Input id="contactPerson" name="contactPerson" placeholder="Juan dela Cruz" disabled={isLoading} />
                  {errors.contactPerson && <p className="text-xs text-red-600">{errors.contactPerson}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emailAddress">Email address *</Label>
                  <Input id="emailAddress" name="emailAddress" type="email" placeholder="contact@business.com" disabled={isLoading} />
                  {errors.emailAddress && <p className="text-xs text-red-600">{errors.emailAddress}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactNumber">Mobile number *</Label>
                  <Input
                    id="contactNumber"
                    name="contactNumber"
                    placeholder="09XX XXX XXXX"
                    inputMode="tel"
                    pattern="[0-9+()\-\s]*"
                    title="Use numbers and phone symbols only"
                    onChange={(e) => {
                      e.currentTarget.value = sanitizePhoneInput(e.currentTarget.value);
                    }}
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
                    pattern="[0-9+()\-\s]*"
                    title="Use numbers and phone symbols only"
                    onChange={(e) => {
                      e.currentTarget.value = sanitizePhoneInput(e.currentTarget.value);
                    }}
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
                  <Label htmlFor="businessAddress">Street address *</Label>
                  <Input id="businessAddress" name="businessAddress" placeholder="123 Main St., Brgy. Example" disabled={isLoading} />
                  {errors.businessAddress && <p className="text-xs text-red-600">{errors.businessAddress}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cityMunicipality">City / Municipality *</Label>
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
                        pattern="[0-9+()\-\s]*"
                        title="Use numbers and phone symbols only"
                        onChange={(e) => {
                          e.currentTarget.value = sanitizePhoneInput(e.currentTarget.value);
                        }}
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
                        pattern="[0-9+()\-\s]*"
                        title="Use numbers and phone symbols only"
                        onChange={(e) => {
                          e.currentTarget.value = sanitizePhoneInput(e.currentTarget.value);
                        }}
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
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
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
                  <Label>Business type *</Label>
                  <Select value={businessType} onValueChange={(v) => setBusinessType(v ?? "")} disabled={isLoading}>
                    <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.businessType && <p className="text-xs text-red-600">{errors.businessType}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tinNumber">TIN number</Label>
                  <Input
                    id="tinNumber"
                    name="tinNumber"
                    placeholder="000-000-000-000"
                    inputMode="numeric"
                    pattern="[0-9-]*"
                    title="Use numbers and hyphens only"
                    onChange={(e) => {
                      e.currentTarget.value = sanitizeTinInput(e.currentTarget.value);
                    }}
                    disabled={isLoading}
                  />
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
                    type: "number",
                    inputMode: "decimal",
                    min: 0,
                    max: 100,
                    step: 0.01,
                    title: "Enter a value from 0 to 100",
                  },
                  {
                    key: "contact",
                    label: "Contact number",
                    placeholder: "09XX XXX XXXX",
                    inputMode: "tel",
                    pattern: "[0-9+()\\-\\s]*",
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
                    pattern: "[0-9+()\\-\\s]*",
                    title: "Use numbers and phone symbols only",
                    sanitize: sanitizePhoneInput,
                  },
                ]}
              />
            </section>

            <Separator />

            <div className="max-w-xs space-y-1.5">
              <Label>Payment terms</Label>
              <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v ?? "")} disabled={isLoading}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Step 5: Supporting Documents ── */}
          <div className={currentStep !== 5 ? "hidden" : "space-y-4"}>
            <section>
              <SectionHeader title="Supporting Documents" />
              <p className="mb-4 text-sm text-zinc-500">
                Upload PDF, JPG, or PNG files. Max 10MB per file.
              </p>
              <div className="space-y-4">
                {DOC_SLOTS.map((slot) => (
                  <DocUploadSlot
                    key={slot.key}
                    docType={slot.key}
                    label={slot.label}
                    required={slot.required}
                    token={token}
                    files={docs[slot.key]}
                    onChange={(files) => setDocFiles(slot.key, files)}
                    disabled={isLoading}
                  />
                ))}
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
                    type="number"
                    min={0}
                    step={0.1}
                    inputMode="decimal"
                    placeholder="e.g. 5"
                    disabled={isLoading}
                  />
                  {errors.businessLife && <p className="text-xs text-red-600">{errors.businessLife}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="howLongAtAddress">Years at current address</Label>
                  <Input
                    id="howLongAtAddress"
                    name="howLongAtAddress"
                    type="number"
                    min={0}
                    step={0.1}
                    inputMode="decimal"
                    placeholder="e.g. 3"
                    disabled={isLoading}
                  />
                  {errors.howLongAtAddress && <p className="text-xs text-red-600">{errors.howLongAtAddress}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numberOfBranches">Number of branches</Label>
                  <Input
                    id="numberOfBranches"
                    name="numberOfBranches"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="e.g. 2"
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
                      pattern: "[0-9+()\\-\\s]*",
                      title: "Use numbers and phone symbols only",
                      sanitize: sanitizePhoneInput,
                    },
                    {
                      key: "years",
                      label: "Years known",
                      placeholder: "2",
                      type: "number",
                      inputMode: "decimal",
                      min: 0,
                      step: 0.1,
                      title: "Enter years as a number",
                    },
                  ]}
                />
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Bank References</p>
                <DynamicTable<BankRefRow>
                  rows={bankRefs}
                  onChange={setBankRefs}
                  emptyRow={EMPTY_BANK}
                  disabled={isLoading}
                  columns={[
                    { key: "bank",        label: "Bank name",    placeholder: "BDO" },
                    { key: "branch",      label: "Branch",       placeholder: "Makati Branch" },
                    { key: "accountType", label: "Account type", placeholder: "Savings" },
                    { key: "accountNo",   label: "Account no.",  placeholder: "1234-5678-9012" },
                  ]}
                />
              </div>

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
                onChange={(isEmpty) => setSignatureEmpty(isEmpty)}
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
          <div className="flex items-center gap-3 pt-2">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div className="flex-1" />
            {currentStep < TOTAL_STEPS ? (
              <Button type="button" onClick={handleNext} disabled={isLoading} className="gap-1.5">
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitDisabled}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </span>
                ) : "Submit My Information"}
              </Button>
            )}
          </div>

        </CardContent>
      </form>
    </Card>
  );
}
