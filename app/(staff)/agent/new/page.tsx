"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Copy, Check, Link as LinkIcon,
  QrCode, Download, MessageSquare, UserRound, FileText, GitBranch, Lightbulb, PenLine,
  Scale, BadgeDollarSign, CircleArrowRight,
} from "lucide-react";
import { toast } from "@/lib/toast";
import QRCode from "qrcode";
import { DeleteDraftButton } from "@/components/delete-draft-button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

const CUSTOMER_TYPES = [
  { value: "dealer",         label: "Dealer",          desc: "Motorcycle shops, resellers" },
  { value: "distributor",    label: "Distributor",     desc: "Bulk buyers, 2,000L+ minimum order" },
  { value: "private_label",  label: "Private Label",   desc: "Products under customer's own brand" },
  { value: "toll_blend",     label: "Toll Blend",      desc: "Custom blending arrangements" },
  { value: "end_user",       label: "End-User",       desc: "Individual or business buying for own use" },
] as const;

type RouteTarget = "Legal" | "Finance";

const CUSTOMER_TYPE_DETAILS: Record<string, {
  route: RouteTarget;
  routeDesc: string;
  notes: string;
  highlights: string[];
}> = {
  dealer: {
    route: "Legal",
    routeDesc: "Routed to Legal Approver for review",
    notes: "Motorcycle shops and resellers requiring a dealer agreement.",
    highlights: ["Business registration documents", "Dealer agreement sign-off", "Valid government-issued IDs"],
  },
  distributor: {
    route: "Finance",
    routeDesc: "Routed to Finance Reviewer for review",
    notes: "Bulk buyers with a minimum order of 2,000 liters.",
    highlights: ["2,000L minimum order requirement", "Proof of storage/warehouse capacity", "Business permit & SEC/DTI registration"],
  },
  private_label: {
    route: "Finance",
    routeDesc: "Routed to Finance Reviewer for review",
    notes: "Products sold under the customer's own brand name.",
    highlights: ["Branding and label approval", "Packaging specification sheet", "Trademark documents (if applicable)"],
  },
  toll_blend: {
    route: "Finance",
    routeDesc: "Routed to Finance Reviewer for review",
    notes: "Custom blending arrangements using customer-provided formulations.",
    highlights: ["Formulation requirements document", "Quality/spec agreement", "Volume commitment details"],
  },
  end_user: {
    route: "Finance",
    routeDesc: "Routed to Finance Reviewer for review",
    notes: "Individuals or businesses purchasing for their own internal use.",
    highlights: ["Valid ID or business permit", "Intended use declaration", "No resale or distribution allowed"],
  },
};

const HOW_IT_WORKS_LINK = [
  {
    icon: LinkIcon,
    title: "Generate a unique link",
    desc: "A one-time form link and QR code are created specifically for this customer.",
    color: {
      bg: "bg-blue-100",
      text: "text-blue-600",
      ring: "ring-blue-200/70",
      label: "text-blue-500",
    },
  },
  {
    icon: FileText,
    title: "Customer fills the form",
    desc: "They open the link and submit their business information directly.",
    color: {
      bg: "bg-teal-100",
      text: "text-teal-600",
      ring: "ring-teal-200/70",
      label: "text-teal-500",
    },
  },
  {
    icon: UserRound,
    title: "Agent fills out details",
    desc: "After customer submits, you complete the account specialist and TPC details.",
    color: {
      bg: "bg-violet-100",
      text: "text-violet-600",
      ring: "ring-violet-200/70",
      label: "text-violet-500",
    },
  },
  {
    icon: GitBranch,
    title: "Auto-routed for approval",
    desc: "Based on the customer type, the form routes to Legal (Dealer) or Finance (others).",
    color: {
      bg: "bg-orange-100",
      text: "text-orange-600",
      ring: "ring-orange-200/70",
      label: "text-orange-500",
    },
  },
];

const HOW_IT_WORKS_DIRECT = [
  {
    icon: UserRound,
    title: "Select customer type",
    desc: "Choose the account type that matches this customer.",
    color: { bg: "bg-blue-100", text: "text-blue-600", ring: "ring-blue-200/70", label: "text-blue-500" },
  },
  {
    icon: PenLine,
    title: "You fill the form on the spot",
    desc: "Complete the Customer Registration Sheet on behalf of your customer.",
    color: { bg: "bg-amber-100", text: "text-amber-600", ring: "ring-amber-200/70", label: "text-amber-500" },
  },
  {
    icon: GitBranch,
    title: "Auto-routed for approval",
    desc: "Based on the customer type, the form routes to Legal (Dealer) or Finance (others).",
    color: { bg: "bg-orange-100", text: "text-orange-600", ring: "ring-orange-200/70", label: "text-orange-500" },
  },
];


const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
};

function NewCisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("id");

  const [customerName, setCustomerName] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fillMode, setFillMode] = useState<"link" | "direct" | null>(null);

  const [generatedLink, setGeneratedLink] = useState("");
  const [generatedQr, setGeneratedQr] = useState("");
  const [existingDraftId, setExistingDraftId] = useState<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);

  useEffect(() => {
    if (!draftId) return;
    async function loadDraft() {
      setIsLoadingDraft(true);
      try {
        const res = await fetch(`/api/cis/${draftId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== "draft" || !data.publicToken) return;
        const link = `${window.location.origin}/form/${data.publicToken}`;
        const qr = await QRCode.toDataURL(link, { width: 260, margin: 1 });
        setCustomerName(data.tradeName ?? "");
        setCustomerType(data.customerType ?? "");
        setGeneratedLink(link);
        setGeneratedQr(qr);
        setExistingDraftId(draftId);
      } finally {
        setIsLoadingDraft(false);
      }
    }
    loadDraft();
  }, [draftId]);

  const messageText = [
    customerName.trim() ? `Hello ${customerName.trim()},` : "Hello,",
    "",
    "I'm reaching out from Oracle Petroleum – Toll Blend Division. We have initiated a Customer Information Sheet (CIS) for your account.",
    "",
    "Please fill out and submit your information using the link below:",
    generatedLink,
    "",
    "Should you have any questions, feel free to reach out. Thank you!",
  ].join("\n");

  async function handleFillDirectly() {
    if (!customerName.trim()) {
      setError("Please enter the customer name before continuing.");
      return;
    }
    if (!customerType) {
      setError("Please select a customer type before continuing.");
      return;
    }
    setError("");
    setIsLoading(true);
    setFillMode("direct");
    try {
      const res = await fetch("/api/cis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeName: customerName.trim() || undefined,
          customerType,
          directFill: true,
        }),
      });

      let json: unknown = null;
      try { json = await res.json(); } catch { json = null; }

      const data = json as { error?: unknown; id?: unknown } | null;

      if (!res.ok) {
        const errorMessage =
          typeof data?.error === "string"
            ? data.error
            : "Unable to create the form. Please try again.";
        setError(errorMessage);
        setFillMode(null);
        return;
      }

      if (typeof data?.id !== "string" || data.id.length === 0) {
        setError("Unable to create the form. Please try again.");
        setFillMode(null);
        return;
      }

      router.push(`/agent/fill/${data.id}`);
    } catch {
      setError("Unable to create the form. Please try again.");
      setFillMode(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate() {
    if (!customerName.trim()) {
      setError("Please enter the customer name before generating the link.");
      return;
    }
    if (!customerType) {
      setError("Please select a customer type before generating the link.");
      return;
    }
    setError("");
    setIsLoading(true);
    setFillMode("link");
    try {
      const res = await fetch("/api/cis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradeName: customerName.trim() || undefined,
          customerType,
        }),
      });

      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      const data = json as { error?: unknown; publicToken?: unknown } | null;

      if (!res.ok) {
        const errorMessage =
          typeof data?.error === "string"
            ? data.error
            : "Unable to generate a customer link right now. Please try again.";
        setError(errorMessage);
        return;
      }

      if (typeof data?.publicToken !== "string" || data.publicToken.length === 0) {
        setError("Unable to generate a customer link right now. Please try again.");
        return;
      }

      const link = `${window.location.origin}/form/${data.publicToken}`;
      const qr = await QRCode.toDataURL(link, { width: 260, margin: 1 });
      setGeneratedLink(link);
      setGeneratedQr(qr);
      setExistingDraftId(null);
      toast.success({
        title: "Customer form link generated.",
        description: "Send the link to your customer to start their submission.",
      });
    } catch {
      setError("Unable to generate a customer link right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success({ title: "Link copied.", description: "Ready to share via chat or email." });
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyAsMessage() {
    await navigator.clipboard.writeText(messageText);
    setMessageCopied(true);
    toast.success({ title: "Message copied.", description: "Ready to paste in chat or email." });
    setTimeout(() => setMessageCopied(false), 2000);
  }

  function handleDownloadQr() {
    if (!generatedQr) return;
    const a = document.createElement("a");
    a.href = generatedQr;
    a.download = "customer-form-qr.png";
    a.click();
  }

  function handleGenerateAnother() {
    setGeneratedLink("");
    setGeneratedQr("");
    setExistingDraftId(null);
    setCustomerName("");
    setCustomerType("");
    setCopied(false);
    setMessageCopied(false);
    setFillMode(null);
    router.replace("/agent/new");
  }

  /* ─────────────────── helpers ─────────────────── */
  const selectedDetail = customerType ? CUSTOMER_TYPE_DETAILS[customerType] : null;
  const isLegalRoute = selectedDetail?.route === "Legal";

  /* ─────────────────── render ─────────────────── */
  return (
    <div className="mx-auto mt-3 w-full max-w-7xl pb-4">
      {draftId && (
        <Breadcrumbs
          items={[
            { label: "My Submissions", href: "/agent" },
            { label: "Drafts", href: "/agent/drafts" },
            { label: customerName.trim() || "Draft" },
          ]}
          className="mb-4"
        />
      )}
      {isLoadingDraft ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>

          {/* ══════════════════════════════════════
              STEP 1 — bento: form + sidebar tiles
              ══════════════════════════════════════ */}
          {!generatedLink && (
            <motion.div
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="relative overflow-hidden rounded-3xl border border-emerald-200/50 bg-linear-to-br from-emerald-50 via-white to-cyan-50 p-3 sm:p-4 lg:p-5"
            >
              <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-200/45 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-cyan-200/45 blur-3xl" />

              <div className="relative grid gap-4 lg:grid-cols-12">
                <Card className="overflow-hidden border-zinc-900/10 bg-white/90 py-0 shadow-lg backdrop-blur lg:col-span-8 lg:row-span-2">
                  <CardHeader className="border-b border-zinc-200/80 bg-linear-to-r from-zinc-900 to-emerald-900 pb-4 text-white">
                    <CardTitle className="pt-4 text-xl leading-tight sm:text-2xl">New Customer Submission</CardTitle>
                    <CardDescription className="text-sm text-emerald-100/90">
                      Select customer type and enter the customer name, then choose link or direct fill.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-5 p-4 sm:p-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-zinc-700">
                        Customer Type <span className="text-red-500">*</span>
                      </Label>
                      <Select value={customerType} onValueChange={(v) => setCustomerType(v ?? "")} disabled={isLoading}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select customer type…">
                            {customerType ? CUSTOMER_TYPES.find((t) => t.value === customerType)?.label : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CUSTOMER_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <span className="font-medium">{t.label}</span>
                              <span className="ml-2 text-xs text-zinc-400">{t.desc}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-zinc-500">Determines required docs and approval route.</p>
                    </div>

                    <AnimatePresence>
                      {selectedDetail && (
                        <motion.div
                          key={customerType}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 6 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className={`rounded-xl border p-4 ${isLegalRoute ? "border-violet-200 bg-violet-50" : "border-amber-200 bg-amber-50"}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {isLegalRoute ? <Scale className="h-4 w-4 shrink-0 text-violet-500" /> : <BadgeDollarSign className="h-4 w-4 shrink-0 text-amber-500" />}
                              <p className={`text-xs font-semibold ${isLegalRoute ? "text-violet-800" : "text-amber-800"}`}>{selectedDetail.routeDesc}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isLegalRoute ? "bg-violet-100 text-violet-700" : "bg-amber-100 text-amber-700"}`}>
                              {selectedDetail.route}
                            </span>
                          </div>
                          <p className={`mt-2 text-xs leading-relaxed ${isLegalRoute ? "text-violet-700" : "text-amber-700"}`}>{selectedDetail.notes}</p>
                          <ul className="mt-3 space-y-1.5">
                            {selectedDetail.highlights.map((h) => (
                              <li key={h} className={`flex items-start gap-1.5 text-xs ${isLegalRoute ? "text-violet-700" : "text-amber-700"}`}>
                                <CircleArrowRight className={`mt-0.5 h-3 w-3 shrink-0 ${isLegalRoute ? "text-violet-400" : "text-amber-400"}`} />
                                {h}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-zinc-700">
                        Trade/Business Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g. Dela Cruz Trading Co."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={isLoading}
                        maxLength={255}
                      />
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200/80 pt-4">
                      <Button className="min-w-44" onClick={handleGenerate} disabled={isLoading}>
                        <LinkIcon className="h-4 w-4" />
                        {isLoading && fillMode === "link" ? "Generating…" : "Generate Customer Link"}
                      </Button>
                      <Button variant="outline" className="min-w-40" onClick={handleFillDirectly} disabled={isLoading}>
                        <PenLine className="h-4 w-4" />
                        {isLoading && fillMode === "direct" ? "Creating…" : "Fill Out Directly"}
                      </Button>
                      <Button variant="ghost" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hidden overflow-hidden border-zinc-200/80 bg-white/95 shadow-lg shadow-zinc-200/60 lg:col-span-4 lg:row-span-1 lg:block">
                  <CardContent className="space-y-3.5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Route Matrix</p>
                        <p className="mt-1 text-xs text-zinc-500">Approval lane per customer profile.</p>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-1.5">
                        <GitBranch className="h-3.5 w-3.5 text-zinc-600" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      {CUSTOMER_TYPES.map((t) => {
                        const detail = CUSTOMER_TYPE_DETAILS[t.value];
                        const isLegal = detail.route === "Legal";
                        const isSelected = t.value === customerType;
                        const RouteIcon = isLegal ? Scale : BadgeDollarSign;
                        return (
                          <div
                            key={t.value}
                            className={`rounded-xl border px-3 py-2.5 transition-colors ${
                              isSelected
                                ? isLegal
                                  ? "border-violet-200 bg-violet-50"
                                  : "border-amber-200 bg-amber-50"
                                : "border-zinc-200/80 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <RouteIcon className={`h-3.5 w-3.5 shrink-0 ${isLegal ? "text-violet-500" : "text-amber-500"}`} />
                                <p className={`truncate text-xs font-semibold ${isSelected ? (isLegal ? "text-violet-800" : "text-amber-800") : "text-zinc-700"}`}>{t.label}</p>
                              </div>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isLegal ? "border-violet-200 bg-violet-100 text-violet-700" : "border-amber-200 bg-amber-100 text-amber-700"}`}>
                                {detail.route}
                              </span>
                            </div>
                            <p className={`mt-1 text-[11px] leading-relaxed ${isSelected ? (isLegal ? "text-violet-700" : "text-amber-700") : "text-zinc-500"}`}>
                              {detail.notes}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="hidden overflow-hidden border-zinc-200/80 bg-white/95 shadow-lg shadow-zinc-200/60 lg:col-span-4 lg:row-span-1 lg:block">
                  <CardContent className="space-y-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Mission Flow</p>

                    {fillMode === null ? (
                      /* ── No mode chosen yet: show both paths side-by-side ── */
                      <div className="space-y-3">
                        {/* Link path */}
                        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <div className="rounded-lg bg-blue-100 p-1.5 ring-1 ring-blue-200/70">
                              <LinkIcon className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <p className="text-xs font-bold text-blue-800">Generate Customer Link</p>
                          </div>
                          <ol className="space-y-1.5">
                            {HOW_IT_WORKS_LINK.map((step, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-blue-700">
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-200 text-[9px] font-bold text-blue-700">{i + 1}</span>
                                {step.title}
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Direct path */}
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <div className="rounded-lg bg-amber-100 p-1.5 ring-1 ring-amber-200/70">
                              <PenLine className="h-3.5 w-3.5 text-amber-600" />
                            </div>
                            <p className="text-xs font-bold text-amber-800">Fill Out Directly</p>
                          </div>
                          <ol className="space-y-1.5">
                            {HOW_IT_WORKS_DIRECT.map((step, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[9px] font-bold text-amber-700">{i + 1}</span>
                                {step.title}
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-zinc-700">Pro Tip</span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                            Use direct mode for in-person onboarding. Use link mode for remote clients.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* ── Mode chosen: show full steps for selected path ── */
                      <motion.ol variants={listVariants} initial="hidden" animate="show" className="space-y-2.5">
                        {(fillMode === "direct" ? HOW_IT_WORKS_DIRECT : HOW_IT_WORKS_LINK).map((step, i) => {
                          const Icon = step.icon;
                          return (
                            <motion.li
                              key={`${step.title}-${i}`}
                              variants={itemVariants}
                              className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={`mt-0.5 rounded-lg p-1.5 ring-1 ${step.color.bg} ${step.color.text} ${step.color.ring}`}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <p className={`text-[10px] font-bold uppercase tracking-widest ${step.color.label}`}>Stage {i + 1}</p>
                                  <p className="mt-0.5 text-sm font-semibold text-zinc-800">{step.title}</p>
                                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{step.desc}</p>
                                </div>
                              </div>
                            </motion.li>
                          );
                        })}
                      </motion.ol>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════
              STEP 2 — bento: link + QR tiles
              ══════════════════════════════════════ */}
          {generatedLink && (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="relative overflow-hidden rounded-3xl border border-blue-200/55 bg-linear-to-br from-blue-50 via-white to-emerald-50 p-3 sm:p-4 lg:p-5"
            >
              <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-blue-200/40 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />

              <div className="relative grid gap-4 lg:grid-cols-12">
                <Card className="overflow-hidden border-zinc-900/10 bg-white/92 py-0 shadow-lg backdrop-blur lg:col-span-8 lg:row-span-2">
                  <CardHeader className="border-b border-zinc-200/80 bg-linear-to-r from-blue-900 to-emerald-900 pb-5 text-white">
                    
                    <CardTitle className="mt-2 pt-2 text-xl">Customer Link Ready</CardTitle>
                    <CardDescription className="text-sm text-blue-100/90">
                      Share the URL, send the prepared message, or use the QR panel for instant mobile access.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="text-sm font-semibold text-emerald-800">Link generated successfully</p>
                      {customerName.trim() && <p className="mt-1 text-sm text-emerald-700">{customerName.trim()}</p>}
                      {customerType && (
                        <p className="mt-1 text-xs text-emerald-700">
                          Type: <span className="font-semibold">{CUSTOMER_TYPES.find((t) => t.value === customerType)?.label ?? customerType}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Shareable link</Label>
                      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                        <input
                          readOnly
                          value={generatedLink}
                          className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-mono text-zinc-700 outline-none sm:flex-1"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <Button variant="outline" onClick={handleCopy} className="min-w-24 overflow-hidden">
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={copied ? "check" : "copy"}
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              className="flex items-center gap-1.5"
                            >
                              {copied ? <><Check className="h-4 w-4 text-green-500" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
                            </motion.span>
                          </AnimatePresence>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ready-to-send message</Label>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="mb-2 text-xs text-zinc-500">Paste this into chat, SMS, or email.</p>
                        <div className="max-h-52 overflow-y-auto rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap text-zinc-700">
                          {messageText}
                        </div>
                        <Button type="button" variant="outline" className="mt-3 w-full overflow-hidden" onClick={handleCopyAsMessage}>
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={messageCopied ? "check" : "msg"}
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              className="flex items-center gap-2"
                            >
                              {messageCopied ? <><Check className="h-4 w-4 text-green-500" /> Copied!</> : <><MessageSquare className="h-4 w-4" /> Copy Message</>}
                            </motion.span>
                          </AnimatePresence>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-zinc-200/80 bg-white/95 shadow-lg shadow-zinc-200/60 lg:col-span-4 lg:row-span-1">
                  <CardContent className="space-y-4 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">QR Access Panel</p>
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handleDownloadQr}>
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    </div>

                    <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      {generatedQr ? (
                        <motion.img
                          src={generatedQr}
                          alt="QR code for customer form link"
                          initial={{ scale: 0.82, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.05 }}
                          className="h-48 w-48 rounded-xl border border-zinc-200 bg-white shadow-sm"
                        />
                      ) : (
                        <div className="h-48 w-48 animate-pulse rounded-xl bg-zinc-100" />
                      )}
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                        <QrCode className="h-3.5 w-3.5 text-zinc-500" />
                        Fast-share option
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                        Let customers scan and submit instantly during meetings, events, or field visits.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm lg:col-span-4 lg:row-span-1">
                  <Button onClick={() => router.push("/agent")}>Back to Dashboard</Button>
                  {existingDraftId ? (
                    <DeleteDraftButton cisId={existingDraftId} />
                  ) : (
                    <Button variant="outline" onClick={handleGenerateAnother}>Generate Another</Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      )}
    </div>
  );
}

export default function NewCisPage() {
  return (
    <Suspense>
      <NewCisContent />
    </Suspense>
  );
}
