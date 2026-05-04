"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

export function CusNewForm({ approvedCisList }: { approvedCisList: ApprovedCis[] }) {
  const router = useRouter();
  const [cisId, setCisId] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify({ cisId, note: note.trim() || undefined }),
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
                {selected.customerType === "dealer" ? "Legal (Maam Cha)" : "Finance (Maam Nida)"}
              </strong>
            </span>
          </div>
        </div>
      )}

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
          rows={3}
        />
        <p className="text-xs text-zinc-400">Visible to the reviewer.</p>
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
