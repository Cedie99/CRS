"use client";

import { useState } from "react";
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
import { Loader2, Building2, User, MapPin, ArrowRight } from "lucide-react";
import { sileo as toast } from "sileo";

const CUSTOMER_TYPE_OPTIONS = [
  { value: "dealer", label: "Dealer" },
  { value: "distributor", label: "Distributor" },
  { value: "private_label", label: "Private Label" },
  { value: "toll_blend", label: "Toll Blend" },
  { value: "end_user", label: "End User" },
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

export function CusNewForm({ approvedCisList }: { approvedCisList: ApprovedCis[] }) {
  const router = useRouter();
  const [cisId, setCisId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Note
  const [note, setNote] = useState("");

  // Contact & Identity
  const [newTradeName, setNewTradeName] = useState("");
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newTelephoneNumber, setNewTelephoneNumber] = useState("");
  const [newEmailAddress, setNewEmailAddress] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newNumberOfEmployees, setNewNumberOfEmployees] = useState("");

  // Customer type
  const [newCustomerType, setNewCustomerType] = useState("");

  // Office address
  const [newBusinessAddress, setNewBusinessAddress] = useState("");
  const [newCityMunicipality, setNewCityMunicipality] = useState("");
  const [newLandmarks, setNewLandmarks] = useState("");

  // Delivery
  const [newDeliveryAddress, setNewDeliveryAddress] = useState("");
  const [newDeliveryMobile, setNewDeliveryMobile] = useState("");
  const [newDeliveryTelephone, setNewDeliveryTelephone] = useState("");

  const selected = approvedCisList.find((c) => c.id === cisId) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cisId) {
      toast.error({ title: "Please select a customer." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cisId,
          note: note.trim() || undefined,
          newTradeName: newTradeName.trim() || undefined,
          newContactPerson: newContactPerson.trim() || undefined,
          newContactNumber: newContactNumber.trim() || undefined,
          newTelephoneNumber: newTelephoneNumber.trim() || undefined,
          newEmailAddress: newEmailAddress.trim() || undefined,
          newWebsite: newWebsite.trim() || undefined,
          newNumberOfEmployees: newNumberOfEmployees.trim() || undefined,
          newBusinessAddress: newBusinessAddress.trim() || undefined,
          newCityMunicipality: newCityMunicipality.trim() || undefined,
          newLandmarks: newLandmarks.trim() || undefined,
          newDeliveryAddress: newDeliveryAddress.trim() || undefined,
          newDeliveryMobile: newDeliveryMobile.trim() || undefined,
          newDeliveryTelephone: newDeliveryTelephone.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }
      const data = await res.json() as { id: string };
      toast.success({ title: "CUS created.", description: "Upload documents then submit for review." });
      router.push(`/agent/cus/${data.id}`);
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
                {(newCustomerType || selected.customerType) === "dealer" ? "Legal (Maam Cha)" : "Finance (Maam Nida)"}
              </strong>
              {newCustomerType && newCustomerType !== selected.customerType && (
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
              <Input
                id="newTradeName"
                placeholder="New trade name"
                value={newTradeName}
                onChange={(e) => setNewTradeName(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newCustomerType" className="text-xs">Customer Type</Label>
              <Select value={newCustomerType} onValueChange={(v) => setNewCustomerType(v ?? "")}>
                <SelectTrigger id="newCustomerType" className="w-full bg-white text-sm">
                  <SelectValue placeholder="No change" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="px-4 py-3 space-y-3">
          <SectionHeading>Contact</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="newContactPerson" className="text-xs">Contact Person</Label>
              <Input
                id="newContactPerson"
                placeholder="Full name"
                value={newContactPerson}
                onChange={(e) => setNewContactPerson(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newContactNumber" className="text-xs">Mobile Number</Label>
              <Input
                id="newContactNumber"
                placeholder="09xx-xxx-xxxx"
                value={newContactNumber}
                onChange={(e) => setNewContactNumber(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newTelephoneNumber" className="text-xs">Telephone Number</Label>
              <Input
                id="newTelephoneNumber"
                placeholder="(02) xxxx-xxxx"
                value={newTelephoneNumber}
                onChange={(e) => setNewTelephoneNumber(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newEmailAddress" className="text-xs">Email Address</Label>
              <Input
                id="newEmailAddress"
                type="email"
                placeholder="email@company.com"
                value={newEmailAddress}
                onChange={(e) => setNewEmailAddress(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newWebsite" className="text-xs">Website</Label>
              <Input
                id="newWebsite"
                placeholder="https://example.com"
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newNumberOfEmployees" className="text-xs">Number of Employees</Label>
              <Input
                id="newNumberOfEmployees"
                placeholder="e.g. 25"
                value={newNumberOfEmployees}
                onChange={(e) => setNewNumberOfEmployees(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Office Address */}
        <div className="px-4 py-3 space-y-3">
          <SectionHeading>Office Address</SectionHeading>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="newBusinessAddress" className="text-xs">Street Address</Label>
              <Input
                id="newBusinessAddress"
                placeholder="e.g. 123 Main St, Barangay San Jose"
                value={newBusinessAddress}
                onChange={(e) => setNewBusinessAddress(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="newCityMunicipality" className="text-xs">City / Municipality</Label>
                <Input
                  id="newCityMunicipality"
                  placeholder="e.g. Quezon City"
                  value={newCityMunicipality}
                  onChange={(e) => setNewCityMunicipality(e.target.value)}
                  className="bg-white text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newLandmarks" className="text-xs">Landmarks / Directions</Label>
              <Textarea
                id="newLandmarks"
                placeholder="Nearby landmarks or directions to office"
                value={newLandmarks}
                onChange={(e) => setNewLandmarks(e.target.value)}
                rows={2}
                className="bg-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="px-4 py-3 space-y-3">
          <SectionHeading>Delivery Address</SectionHeading>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="newDeliveryAddress" className="text-xs">Delivery Street Address</Label>
              <Input
                id="newDeliveryAddress"
                placeholder="Delivery address (if different from office)"
                value={newDeliveryAddress}
                onChange={(e) => setNewDeliveryAddress(e.target.value)}
                className="bg-white text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="newDeliveryMobile" className="text-xs">Delivery Mobile</Label>
                <Input
                  id="newDeliveryMobile"
                  placeholder="09xx-xxx-xxxx"
                  value={newDeliveryMobile}
                  onChange={(e) => setNewDeliveryMobile(e.target.value)}
                  className="bg-white text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newDeliveryTelephone" className="text-xs">Delivery Telephone</Label>
                <Input
                  id="newDeliveryTelephone"
                  placeholder="(02) xxxx-xxxx"
                  value={newDeliveryTelephone}
                  onChange={(e) => setNewDeliveryTelephone(e.target.value)}
                  className="bg-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading || !cisId} className="w-full">
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
        ) : (
          "Create Customer Update Sheet"
        )}
      </Button>
    </form>
  );
}
