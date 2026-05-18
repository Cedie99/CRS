"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, User, MapPin, ArrowRight, Plus, Trash2, Paperclip, X, ChevronDown, FileText } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  LINE_OF_BUSINESS_OPTIONS,
  BUSINESS_ACTIVITY_OPTIONS,
} from "@/lib/validations/cis";
import { SCORING_DOC_SLOTS } from "@/lib/doc-types";

// Sentinel used so Select stays controlled (never undefined) while showing "No change" placeholder
const NO_CHANGE = "__none__";

const CUSTOMER_TYPE_OPTIONS = [
  { value: "dealer", label: "Dealer" },
  { value: "distributor", label: "Distributor" },
  { value: "private_label", label: "Private Label" },
  { value: "toll_blend", label: "Toll Blend" },
  { value: "end_user", label: "End User" },
];

const BUSINESS_TYPE_OPTIONS = [
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "sole_proprietor", label: "Sole Proprietor" },
  { value: "cooperative", label: "Cooperative" },
  { value: "other", label: "Other" },
];

const PAYMENT_TERMS_OPTIONS = [
  { value: "cod", label: "COD" },
  { value: "prepaid", label: "Prepaid" },
  { value: "with_terms", label: "With Terms" },
];

interface ApprovedCis {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType: string | null;
  status: string;
  cityMunicipality: string | null;
  businessType: string | null;
}

interface OwnerRow { name: string; nationality: string; percentage: string; contact: string }
interface OfficerRow { name: string; position: string; contact: string }
interface TradeRefRow { company: string; address: string; contact: string; years: string }
interface BankRefRow { bank: string; branch: string; accountType: string; accountNo: string }

function humanizeType(val: string | null) {
  if (!val) return "—";
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 pt-1">
      {children}
    </p>
  );
}

function emptyOwner(): OwnerRow { return { name: "", nationality: "", percentage: "", contact: "" }; }
function emptyOfficer(): OfficerRow { return { name: "", position: "", contact: "" }; }
function emptyTradeRef(): TradeRefRow { return { company: "", address: "", contact: "", years: "" }; }
function emptyBankRef(): BankRefRow { return { bank: "", branch: "", accountType: "", accountNo: "" }; }

const ALL_DOC_SLOTS = [...SCORING_DOC_SLOTS, { key: "docOther", label: "Other Supporting Documents" }] as const;

export function CusNewForm({ approvedCisList }: { approvedCisList: ApprovedCis[] }) {
  const router = useRouter();
  const [cisId, setCisId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Staged documents: files picked locally, uploaded after CUS creation
  const [stagedDocs, setStagedDocs] = useState<Record<string, File[]>>({});
  const [docsExpanded, setDocsExpanded] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function stageFiles(key: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setStagedDocs((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), ...Array.from(files)],
    }));
  }

  function removeStagedFile(key: string, idx: number) {
    setStagedDocs((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, i) => i !== idx),
    }));
  }

  const totalStagedCount = Object.values(stagedDocs).reduce((acc, arr) => acc + arr.length, 0);

  // Note
  const [note, setNote] = useState("");

  // Identity
  const [newTradeName, setNewTradeName] = useState("");
  const [newCorporateName, setNewCorporateName] = useState("");
  const [newCustomerType, setNewCustomerType] = useState(NO_CHANGE);
  const [newDateOfBusinessReg, setNewDateOfBusinessReg] = useState("");
  const [newNumberOfEmployees, setNewNumberOfEmployees] = useState("");
  const [newTinNumber, setNewTinNumber] = useState("");

  // Contact
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newTelephoneNumber, setNewTelephoneNumber] = useState("");
  const [newEmailAddress, setNewEmailAddress] = useState("");
  const [newWebsite, setNewWebsite] = useState("");

  // Office address
  const [newBusinessAddress, setNewBusinessAddress] = useState("");
  const [newCityMunicipality, setNewCityMunicipality] = useState("");
  const [newLandmarks, setNewLandmarks] = useState("");

  // Delivery
  const [newDeliveryAddress, setNewDeliveryAddress] = useState("");
  const [newDeliveryLandmarks, setNewDeliveryLandmarks] = useState("");
  const [newDeliveryMobile, setNewDeliveryMobile] = useState("");
  const [newDeliveryTelephone, setNewDeliveryTelephone] = useState("");

  // Classification
  const [newBusinessType, setNewBusinessType] = useState(NO_CHANGE);
  const [newLineOfBusiness, setNewLineOfBusiness] = useState(NO_CHANGE);
  const [newLineOfBusinessOther, setNewLineOfBusinessOther] = useState("");
  const [newBusinessActivity, setNewBusinessActivity] = useState(NO_CHANGE);
  const [newBusinessActivityOther, setNewBusinessActivityOther] = useState("");
  const [newPaymentTerms, setNewPaymentTerms] = useState(NO_CHANGE);

  // Ownership
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [officers, setOfficers] = useState<OfficerRow[]>([]);

  // Business background
  const [newBusinessLife, setNewBusinessLife] = useState("");
  const [newHowLongAtAddress, setNewHowLongAtAddress] = useState("");
  const [newNumberOfBranches, setNewNumberOfBranches] = useState("");
  const [newGovCertifications, setNewGovCertifications] = useState("");
  const [tradeRefs, setTradeRefs] = useState<TradeRefRow[]>([]);
  const [bankRefs, setBankRefs] = useState<BankRefRow[]>([]);
  const [newAchievements, setNewAchievements] = useState("");
  const [newOtherMerits, setNewOtherMerits] = useState("");
  const [newAdditionalNotes, setNewAdditionalNotes] = useState("");

  const selected = approvedCisList.find((c) => c.id === cisId) ?? null;

  function updateOwner(i: number, field: keyof OwnerRow, val: string) {
    setOwners(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function updateOfficer(i: number, field: keyof OfficerRow, val: string) {
    setOfficers(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function updateTradeRef(i: number, field: keyof TradeRefRow, val: string) {
    setTradeRefs(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }
  function updateBankRef(i: number, field: keyof BankRefRow, val: string) {
    setBankRefs(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cisId) {
      toast.error({ title: "Please select a customer." });
      return;
    }
    setLoading(true);
    try {
      const cleanOwners = owners.filter(r => r.name.trim());
      const cleanOfficers = officers.filter(r => r.name.trim());
      const cleanTradeRefs = tradeRefs.filter(r => r.company.trim());
      const cleanBankRefs = bankRefs.filter(r => r.bank.trim());

      const res = await fetch("/api/cus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cisId,
          note: note.trim() || undefined,
          // Identity
          newTradeName: newTradeName.trim() || undefined,
          newCorporateName: newCorporateName.trim() || undefined,
          newCustomerType: newCustomerType !== NO_CHANGE ? newCustomerType : undefined,
          newDateOfBusinessReg: newDateOfBusinessReg || undefined,
          newNumberOfEmployees: newNumberOfEmployees || undefined,
          newTinNumber: newTinNumber.trim() || undefined,
          // Contact
          newContactPerson: newContactPerson.trim() || undefined,
          newContactNumber: newContactNumber.trim() || undefined,
          newTelephoneNumber: newTelephoneNumber.trim() || undefined,
          newEmailAddress: newEmailAddress.trim() || undefined,
          newWebsite: newWebsite.trim() || undefined,
          // Office address
          newBusinessAddress: newBusinessAddress.trim() || undefined,
          newCityMunicipality: newCityMunicipality.trim() || undefined,
          newLandmarks: newLandmarks.trim() || undefined,
          // Delivery
          newDeliveryAddress: newDeliveryAddress.trim() || undefined,
          newDeliveryLandmarks: newDeliveryLandmarks.trim() || undefined,
          newDeliveryMobile: newDeliveryMobile.trim() || undefined,
          newDeliveryTelephone: newDeliveryTelephone.trim() || undefined,
          // Classification
          newBusinessType: newBusinessType !== NO_CHANGE ? newBusinessType : undefined,
          newLineOfBusiness: newLineOfBusiness !== NO_CHANGE ? newLineOfBusiness : undefined,
          newLineOfBusinessOther: newLineOfBusiness === "other" ? newLineOfBusinessOther.trim() || undefined : undefined,
          newBusinessActivity: newBusinessActivity !== NO_CHANGE ? newBusinessActivity : undefined,
          newBusinessActivityOther: newBusinessActivity === "other" ? newBusinessActivityOther.trim() || undefined : undefined,
          newPaymentTerms: newPaymentTerms !== NO_CHANGE ? newPaymentTerms : undefined,
          // Ownership
          newOwners: cleanOwners.length > 0 ? cleanOwners : undefined,
          newOfficers: cleanOfficers.length > 0 ? cleanOfficers : undefined,
          // Background
          newBusinessLife: newBusinessLife || undefined,
          newHowLongAtAddress: newHowLongAtAddress || undefined,
          newNumberOfBranches: newNumberOfBranches || undefined,
          newGovCertifications: newGovCertifications.trim() || undefined,
          newTradeReferences: cleanTradeRefs.length > 0 ? cleanTradeRefs : undefined,
          newBankReferences: cleanBankRefs.length > 0 ? cleanBankRefs : undefined,
          newAchievements: newAchievements.trim() || undefined,
          newOtherMerits: newOtherMerits.trim() || undefined,
          newAdditionalNotes: newAdditionalNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      const data = await res.json() as { id: string };
      const cusId = data.id;

      // Upload any staged documents
      const uploadEntries = Object.entries(stagedDocs).filter(([, files]) => files.length > 0);
      let uploadFailures = 0;
      for (const [docType, files] of uploadEntries) {
        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("docType", docType);
          const uploadRes = await fetch(`/api/cus/${cusId}/docs`, { method: "POST", body: fd });
          if (!uploadRes.ok) uploadFailures++;
        }
      }

      if (uploadFailures > 0) {
        toast.success({ title: "CUS created.", description: `${uploadFailures} file(s) failed to upload — you can retry on the detail page.` });
      } else if (uploadEntries.length > 0) {
        toast.success({ title: "CUS created.", description: "Documents uploaded. Submit for review when ready." });
      } else {
        toast.success({ title: "CUS created.", description: "Upload documents then submit for review." });
      }
      router.push(`/agent/cus/${cusId}`);
    } catch (err: unknown) {
      toast.error({ title: err instanceof Error ? err.message : "Failed to create CUS." });
    } finally {
      setLoading(false);
    }
  }

  if (approvedCisList.length === 0) {
    return (
      <p className="text-sm text-zinc-500 text-center py-4">
        No eligible customers available. Customers must have a fully approved CIS first.
      </p>
    );
  }

  const effectiveCustomerType = (newCustomerType !== NO_CHANGE ? newCustomerType : null) || selected?.customerType || "";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Customer selection */}
      <div className="space-y-1.5">
        <Label htmlFor="cisId">
          Customer <span className="text-red-500">*</span>
        </Label>
        <Select onValueChange={(v: string | null) => setCisId(v ?? "")}>
          <SelectTrigger id="cisId" className="w-full">
            <SelectValue placeholder="Select a customer...">
              {selected ? (
                <span>
                  {selected.tradeName ?? "(Unnamed)"}
                  {selected.contactPerson && (
                    <span className="text-zinc-500"> — {selected.contactPerson}</span>
                  )}
                </span>
              ) : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {approvedCisList.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="font-medium">{c.tradeName ?? "(Unnamed)"}</span>
                {c.contactPerson && (
                  <span className="text-zinc-500"> — {c.contactPerson}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-400">Only approved / ERP-encoded customers are listed.</p>
      </div>

      {/* Customer preview */}
      {selected && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Selected Customer</p>
          <p className="text-base font-bold text-zinc-900">{selected.tradeName ?? "(Unnamed)"}</p>
          <div className="grid grid-cols-1 gap-1.5 text-sm text-zinc-600">
            {selected.contactPerson && (
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                {selected.contactPerson}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              {humanizeType(selected.customerType)}
            </div>
            {selected.cityMunicipality && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                {selected.cityMunicipality}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-200">
            <ArrowRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-600">
              Will route to{" "}
              <strong className="text-zinc-800">
                {effectiveCustomerType === "dealer" ? "Legal Review" : "Finance Review"}
              </strong>
              {newCustomerType !== NO_CHANGE && newCustomerType !== selected.customerType && (
                <span className="ml-1 text-zinc-400">(reclassified)</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Note */}
      <div className="space-y-1.5">
        <Label htmlFor="note">
          Reason for Update{" "}
          <span className="font-normal text-zinc-400">(optional)</span>
        </Label>
        <Textarea
          id="note"
          placeholder="e.g. Customer is requesting 30-day credit terms. Documents have been updated."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
        <p className="text-xs text-zinc-400">Visible to the reviewer.</p>
      </div>

      {/* Requested changes */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 divide-y divide-zinc-100">
        <div className="px-4 pt-3 pb-2">
          <p className="text-sm font-semibold text-zinc-800">Requested Changes</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Fill in only the fields that need updating. Leave blank to keep existing values.
          </p>
        </div>

        {/* Identity */}
        <div className="px-4 py-3 space-y-3">
          <SectionHeading>Identity</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="newTradeName" className="text-xs">Trade / Business Name</Label>
              <Input id="newTradeName" placeholder="New trade name" value={newTradeName}
                onChange={(e) => setNewTradeName(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newCorporateName" className="text-xs">Registered Corporate Name</Label>
              <Input id="newCorporateName" placeholder="Registered corporate name" value={newCorporateName}
                onChange={(e) => setNewCorporateName(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newCustomerType" className="text-xs">Customer Type</Label>
              <Select value={newCustomerType} onValueChange={(v: string | null) => setNewCustomerType(v ?? NO_CHANGE)}>
                <SelectTrigger id="newCustomerType" className="w-full bg-white text-sm">
                  <SelectValue>
                    {newCustomerType === NO_CHANGE ? "No change" : (CUSTOMER_TYPE_OPTIONS.find((o) => o.value === newCustomerType)?.label ?? newCustomerType)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHANGE} className="text-zinc-400">No change</SelectItem>
                  {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newTinNumber" className="text-xs">TIN Number</Label>
              <Input id="newTinNumber" placeholder="e.g. 123-456-789-000" value={newTinNumber}
                onChange={(e) => setNewTinNumber(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newDateOfBusinessReg" className="text-xs">Date of Business Registration</Label>
              <Input id="newDateOfBusinessReg" type="date" value={newDateOfBusinessReg}
                onChange={(e) => setNewDateOfBusinessReg(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newNumberOfEmployees" className="text-xs">Number of Employees</Label>
              <Input id="newNumberOfEmployees" type="number" min="0" placeholder="e.g. 25" value={newNumberOfEmployees}
                onChange={(e) => setNewNumberOfEmployees(e.target.value)} className="bg-white text-sm" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="px-4 py-3 space-y-3">
          <SectionHeading>Contact</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="newContactPerson" className="text-xs">Contact Person</Label>
              <Input id="newContactPerson" placeholder="Full name" value={newContactPerson}
                onChange={(e) => setNewContactPerson(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newContactNumber" className="text-xs">Mobile Number</Label>
              <Input id="newContactNumber" type="tel" placeholder="09xx-xxx-xxxx" value={newContactNumber}
                onChange={(e) => setNewContactNumber(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newTelephoneNumber" className="text-xs">Telephone Number</Label>
              <Input id="newTelephoneNumber" type="tel" placeholder="(02) xxxx-xxxx" value={newTelephoneNumber}
                onChange={(e) => setNewTelephoneNumber(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newEmailAddress" className="text-xs">Email Address</Label>
              <Input id="newEmailAddress" type="email" placeholder="email@company.com" value={newEmailAddress}
                onChange={(e) => setNewEmailAddress(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="newWebsite" className="text-xs">Website</Label>
              <Input id="newWebsite" type="url" placeholder="https://example.com" value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)} className="bg-white text-sm" />
            </div>
          </div>
        </div>

        {/* Office Address */}
        <div className="px-4 py-3 space-y-3">
          <SectionHeading>Office Address</SectionHeading>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="newBusinessAddress" className="text-xs">Street Address</Label>
              <Input id="newBusinessAddress" placeholder="e.g. 123 Main St, Barangay San Jose" value={newBusinessAddress}
                onChange={(e) => setNewBusinessAddress(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newCityMunicipality" className="text-xs">City / Municipality</Label>
              <Input id="newCityMunicipality" placeholder="e.g. Quezon City" value={newCityMunicipality}
                onChange={(e) => setNewCityMunicipality(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newLandmarks" className="text-xs">Landmarks / Directions</Label>
              <Textarea id="newLandmarks" placeholder="Nearby landmarks or directions to office" value={newLandmarks}
                onChange={(e) => setNewLandmarks(e.target.value)} rows={2} className="bg-white text-sm" />
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="px-4 py-3 space-y-3">
          <SectionHeading>Delivery Address</SectionHeading>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="newDeliveryAddress" className="text-xs">Delivery Street Address</Label>
              <Input id="newDeliveryAddress" placeholder="Delivery address (if different from office)" value={newDeliveryAddress}
                onChange={(e) => setNewDeliveryAddress(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newDeliveryLandmarks" className="text-xs">Delivery Landmarks / Directions</Label>
              <Textarea id="newDeliveryLandmarks" placeholder="Landmarks for delivery address" value={newDeliveryLandmarks}
                onChange={(e) => setNewDeliveryLandmarks(e.target.value)} rows={2} className="bg-white text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="newDeliveryMobile" className="text-xs">Delivery Mobile</Label>
                <Input id="newDeliveryMobile" type="tel" placeholder="09xx-xxx-xxxx" value={newDeliveryMobile}
                  onChange={(e) => setNewDeliveryMobile(e.target.value)} className="bg-white text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newDeliveryTelephone" className="text-xs">Delivery Telephone</Label>
                <Input id="newDeliveryTelephone" type="tel" placeholder="(02) xxxx-xxxx" value={newDeliveryTelephone}
                  onChange={(e) => setNewDeliveryTelephone(e.target.value)} className="bg-white text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="px-4 py-3 space-y-3">
          <SectionHeading>Classification</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="newBusinessType" className="text-xs">Business Type</Label>
              <Select value={newBusinessType} onValueChange={(v: string | null) => setNewBusinessType(v ?? NO_CHANGE)}>
                <SelectTrigger id="newBusinessType" className="w-full bg-white text-sm">
                  <SelectValue>{newBusinessType === NO_CHANGE ? "No change" : (BUSINESS_TYPE_OPTIONS.find((o) => o.value === newBusinessType)?.label ?? newBusinessType)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHANGE} className="text-zinc-400">No change</SelectItem>
                  {BUSINESS_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPaymentTerms" className="text-xs">Payment Terms</Label>
              <Select value={newPaymentTerms} onValueChange={(v: string | null) => setNewPaymentTerms(v ?? NO_CHANGE)}>
                <SelectTrigger id="newPaymentTerms" className="w-full bg-white text-sm">
                  <SelectValue>{newPaymentTerms === NO_CHANGE ? "No change" : (PAYMENT_TERMS_OPTIONS.find((o) => o.value === newPaymentTerms)?.label ?? newPaymentTerms)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHANGE} className="text-zinc-400">No change</SelectItem>
                  {PAYMENT_TERMS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newLineOfBusiness" className="text-xs">Line of Business</Label>
              <Select value={newLineOfBusiness} onValueChange={(v: string | null) => setNewLineOfBusiness(v ?? NO_CHANGE)}>
                <SelectTrigger id="newLineOfBusiness" className="w-full bg-white text-sm">
                  <SelectValue>{newLineOfBusiness === NO_CHANGE ? "No change" : (LINE_OF_BUSINESS_OPTIONS.find((o) => o.value === newLineOfBusiness)?.label ?? newLineOfBusiness)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHANGE} className="text-zinc-400">No change</SelectItem>
                  {LINE_OF_BUSINESS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newLineOfBusiness === "other" && (
              <div className="space-y-1.5">
                <Label htmlFor="newLineOfBusinessOther" className="text-xs">Line of Business (specify)</Label>
                <Input id="newLineOfBusinessOther" placeholder="Specify line of business" value={newLineOfBusinessOther}
                  onChange={(e) => setNewLineOfBusinessOther(e.target.value)} className="bg-white text-sm" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="newBusinessActivity" className="text-xs">Business Activity</Label>
              <Select value={newBusinessActivity} onValueChange={(v: string | null) => setNewBusinessActivity(v ?? NO_CHANGE)}>
                <SelectTrigger id="newBusinessActivity" className="w-full bg-white text-sm">
                  <SelectValue>{newBusinessActivity === NO_CHANGE ? "No change" : (BUSINESS_ACTIVITY_OPTIONS.find((o) => o.value === newBusinessActivity)?.label ?? newBusinessActivity)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHANGE} className="text-zinc-400">No change</SelectItem>
                  {BUSINESS_ACTIVITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newBusinessActivity === "other" && (
              <div className="space-y-1.5">
                <Label htmlFor="newBusinessActivityOther" className="text-xs">Business Activity (specify)</Label>
                <Input id="newBusinessActivityOther" placeholder="Specify business activity" value={newBusinessActivityOther}
                  onChange={(e) => setNewBusinessActivityOther(e.target.value)} className="bg-white text-sm" />
              </div>
            )}
          </div>
        </div>

        {/* Owners */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading>Owners / Partners</SectionHeading>
            <button type="button" onClick={() => setOwners(prev => [...prev, emptyOwner()])}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1 bg-white">
              <Plus className="h-3 w-3" /> Add Row
            </button>
          </div>
          <p className="text-xs text-zinc-400">Leave empty to keep existing owners unchanged.</p>
          {owners.length === 0 ? (
            <p className="text-xs text-zinc-300 italic">No rows added.</p>
          ) : (
            <div className="space-y-2">
              {owners.map((row, i) => (
                <div key={i} className="relative rounded-lg border border-zinc-200 bg-white/60 p-3">
                  <button type="button" onClick={() => setOwners(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pr-6 sm:pr-0">
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Name</p>
                      <Input value={row.name} onChange={e => updateOwner(i, "name", e.target.value)}
                        placeholder="Full name" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Nationality</p>
                      <Input value={row.nationality} onChange={e => updateOwner(i, "nationality", e.target.value)}
                        placeholder="Filipino" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Share %</p>
                      <Input type="number" min="0" max="100" value={row.percentage} onChange={e => updateOwner(i, "percentage", e.target.value)}
                        placeholder="50" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Contact</p>
                      <Input type="tel" value={row.contact} onChange={e => updateOwner(i, "contact", e.target.value)}
                        placeholder="09xx-xxx-xxxx" className="bg-white text-xs h-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Officers */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading>Officers</SectionHeading>
            <button type="button" onClick={() => setOfficers(prev => [...prev, emptyOfficer()])}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1 bg-white">
              <Plus className="h-3 w-3" /> Add Row
            </button>
          </div>
          <p className="text-xs text-zinc-400">Leave empty to keep existing officers unchanged.</p>
          {officers.length === 0 ? (
            <p className="text-xs text-zinc-300 italic">No rows added.</p>
          ) : (
            <div className="space-y-2">
              {officers.map((row, i) => (
                <div key={i} className="relative rounded-lg border border-zinc-200 bg-white/60 p-3">
                  <button type="button" onClick={() => setOfficers(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pr-6 sm:pr-0">
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Name</p>
                      <Input value={row.name} onChange={e => updateOfficer(i, "name", e.target.value)}
                        placeholder="Full name" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Position</p>
                      <Input value={row.position} onChange={e => updateOfficer(i, "position", e.target.value)}
                        placeholder="e.g. CEO" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Contact</p>
                      <Input type="tel" value={row.contact} onChange={e => updateOfficer(i, "contact", e.target.value)}
                        placeholder="09xx-xxx-xxxx" className="bg-white text-xs h-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Business Background */}
        <div className="px-4 py-3 space-y-3">
          <SectionHeading>Business Background</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="newBusinessLife" className="text-xs">Business Life (years)</Label>
              <Input id="newBusinessLife" type="number" min="0" placeholder="e.g. 10" value={newBusinessLife}
                onChange={(e) => setNewBusinessLife(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newHowLongAtAddress" className="text-xs">How Long at Address (years)</Label>
              <Input id="newHowLongAtAddress" type="number" min="0" placeholder="e.g. 5" value={newHowLongAtAddress}
                onChange={(e) => setNewHowLongAtAddress(e.target.value)} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newNumberOfBranches" className="text-xs">Number of Branches</Label>
              <Input id="newNumberOfBranches" type="number" min="0" placeholder="e.g. 3" value={newNumberOfBranches}
                onChange={(e) => setNewNumberOfBranches(e.target.value)} className="bg-white text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newGovCertifications" className="text-xs">Government Certifications</Label>
            <Textarea id="newGovCertifications" placeholder="List any relevant government certifications" value={newGovCertifications}
              onChange={(e) => setNewGovCertifications(e.target.value)} rows={2} className="bg-white text-sm" />
          </div>
        </div>

        {/* Trade References */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading>Trade References</SectionHeading>
            <button type="button" onClick={() => setTradeRefs(prev => [...prev, emptyTradeRef()])}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1 bg-white">
              <Plus className="h-3 w-3" /> Add Row
            </button>
          </div>
          <p className="text-xs text-zinc-400">Leave empty to keep existing trade references unchanged.</p>
          {tradeRefs.length === 0 ? (
            <p className="text-xs text-zinc-300 italic">No rows added.</p>
          ) : (
            <div className="space-y-2">
              {tradeRefs.map((row, i) => (
                <div key={i} className="relative rounded-lg border border-zinc-200 bg-white/60 p-3">
                  <button type="button" onClick={() => setTradeRefs(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pr-6 sm:pr-0">
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Company</p>
                      <Input value={row.company} onChange={e => updateTradeRef(i, "company", e.target.value)}
                        placeholder="Company name" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Address</p>
                      <Input value={row.address} onChange={e => updateTradeRef(i, "address", e.target.value)}
                        placeholder="Address" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Contact</p>
                      <Input type="tel" value={row.contact} onChange={e => updateTradeRef(i, "contact", e.target.value)}
                        placeholder="Contact" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Years</p>
                      <Input type="number" min="0" value={row.years} onChange={e => updateTradeRef(i, "years", e.target.value)}
                        placeholder="Yrs" className="bg-white text-xs h-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bank References */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading>Bank References</SectionHeading>
            <button type="button" onClick={() => setBankRefs(prev => [...prev, emptyBankRef()])}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1 bg-white">
              <Plus className="h-3 w-3" /> Add Row
            </button>
          </div>
          <p className="text-xs text-zinc-400">Leave empty to keep existing bank references unchanged.</p>
          {bankRefs.length === 0 ? (
            <p className="text-xs text-zinc-300 italic">No rows added.</p>
          ) : (
            <div className="space-y-2">
              {bankRefs.map((row, i) => (
                <div key={i} className="relative rounded-lg border border-zinc-200 bg-white/60 p-3">
                  <button type="button" onClick={() => setBankRefs(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-2 top-2 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pr-6 sm:pr-0">
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Bank</p>
                      <Input value={row.bank} onChange={e => updateBankRef(i, "bank", e.target.value)}
                        placeholder="Bank name" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Branch</p>
                      <Input value={row.branch} onChange={e => updateBankRef(i, "branch", e.target.value)}
                        placeholder="Branch" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Account Type</p>
                      <Input value={row.accountType} onChange={e => updateBankRef(i, "accountType", e.target.value)}
                        placeholder="Savings / Checking" className="bg-white text-xs h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Account No.</p>
                      <Input value={row.accountNo} onChange={e => updateBankRef(i, "accountNo", e.target.value)}
                        placeholder="Account number" className="bg-white text-xs h-8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Merits & Notes */}
        <div className="px-4 py-3 space-y-3">
          <SectionHeading>Merits &amp; Notes</SectionHeading>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="newAchievements" className="text-xs">Achievements / Awards</Label>
              <Textarea id="newAchievements" placeholder="Notable achievements or awards" value={newAchievements}
                onChange={(e) => setNewAchievements(e.target.value)} rows={2} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newOtherMerits" className="text-xs">Other Merits</Label>
              <Textarea id="newOtherMerits" placeholder="Other relevant merits" value={newOtherMerits}
                onChange={(e) => setNewOtherMerits(e.target.value)} rows={2} className="bg-white text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newAdditionalNotes" className="text-xs">Additional Notes</Label>
              <Textarea id="newAdditionalNotes" placeholder="Any additional information" value={newAdditionalNotes}
                onChange={(e) => setNewAdditionalNotes(e.target.value)} rows={2} className="bg-white text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden">
        <button
          type="button"
          onClick={() => setDocsExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-100/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="text-sm font-semibold text-zinc-800">Documents</span>
            {totalStagedCount > 0 && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                {totalStagedCount} file{totalStagedCount !== 1 ? "s" : ""} staged
              </span>
            )}
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-150 ${docsExpanded ? "rotate-180" : ""}`} />
        </button>
        {docsExpanded && (
          <div className="border-t border-zinc-200 divide-y divide-zinc-100">
            {ALL_DOC_SLOTS.map((slot) => {
              const staged = stagedDocs[slot.key] ?? [];
              return (
                <div key={slot.key} className="px-4 py-3 space-y-2 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs leading-snug ${staged.length > 0 ? "font-medium text-zinc-900" : "text-zinc-600"}`}>
                      {slot.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[slot.key]?.click()}
                      className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-1 bg-zinc-50 hover:bg-white transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                    <input
                      ref={(el) => { fileInputRefs.current[slot.key] = el; }}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => stageFiles(slot.key, e.target.files)}
                      onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
                    />
                  </div>
                  {staged.length > 0 && (
                    <ul className="space-y-1">
                      {staged.map((file, idx) => (
                        <li key={idx} className="flex items-center gap-2 rounded bg-zinc-50 px-2 py-1">
                          <FileText className="h-3 w-3 text-zinc-400 shrink-0" />
                          <span className="text-xs text-zinc-700 truncate flex-1">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeStagedFile(slot.key, idx)}
                            className="shrink-0 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading || !cisId} className="w-full">
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{totalStagedCount > 0 ? "Creating & uploading..." : "Creating..."}</>
        ) : (
          "Create Customer Update Sheet"
        )}
      </Button>
    </form>
  );
}
