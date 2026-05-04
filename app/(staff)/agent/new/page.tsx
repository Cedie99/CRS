"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Copy, Check, Link as LinkIcon,
  QrCode, Download, MessageSquare, UserRound, FileText, GitBranch, Lightbulb, PenLine,
} from "lucide-react";
import { sileo as toast } from "sileo";
import QRCode from "qrcode";
import { DeleteDraftButton } from "@/components/delete-draft-button";

const CUSTOMER_TYPES = [
  { value: "dealer",         label: "Dealer",          desc: "Motorcycle shops, resellers" },
  { value: "distributor",    label: "Distributor",     desc: "Bulk buyers, 2,000L+ minimum order" },
  { value: "private_label",  label: "Private Label",   desc: "Products under customer's own brand" },
  { value: "toll_blend",     label: "Toll Blend",      desc: "Custom blending arrangements" },
  { value: "end_user",       label: "End-User",       desc: "Individual or business buying for own use" },
] as const;

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

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link
        href="/agent"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my submissions
      </Link>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ── Left: Main card ── */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>New Customer Submission</CardTitle>
              <CardDescription>
                Enter an optional trade name, then generate a unique form link to share
                with your customer. You&apos;ll fill in the customer type after they submit.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isLoadingDraft ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                </div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  {!generatedLink ? (
                    /* ── Step 1 ── */
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="space-y-5"
                    >
                      <div className="space-y-1.5">
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
                        <p className="text-xs text-zinc-400">
                          This determines the required documents and approval route for the customer.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-zinc-700">
                          Customer / Trade Name{" "}
                          <span className="font-normal text-zinc-400">(optional)</span>
                        </Label>
                        <Input
                          placeholder="e.g. Dela Cruz Trading Co."
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          disabled={isLoading}
                          maxLength={255}
                        />
                        <p className="text-xs text-zinc-400">
                          Pre-labels this submission in your dashboard before the customer fills anything in.
                        </p>
                      </div>

                      <AnimatePresence>
                        {error && (
                          <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"
                          >
                            {error}
                          </motion.p>
                        )}
                      </AnimatePresence>

                      <div className="flex flex-wrap gap-3">
                        <Button onClick={handleGenerate} disabled={isLoading}>
                          {isLoading && fillMode === "link" ? "Generating…" : "Generate Customer Link"}
                        </Button>
                        <Button variant="outline" onClick={handleFillDirectly} disabled={isLoading}>
                          <PenLine className="h-4 w-4" />
                          {isLoading && fillMode === "direct" ? "Creating…" : "Fill Up Directly"}
                        </Button>
                        <Button variant="ghost" onClick={() => router.back()} disabled={isLoading}>
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    /* ── Step 2 ── */
                    <motion.div
                      key="step2"
                      variants={listVariants}
                      initial="hidden"
                      animate="show"
                      className="space-y-4"
                    >
                      {/* Success banner */}
                      <motion.div
                        variants={itemVariants}
                        className="rounded-lg border border-green-200 bg-green-50 p-4"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                          <LinkIcon className="h-4 w-4 shrink-0" />
                          Link ready — share it with your customer!
                        </div>
                        {customerName.trim() && (
                          <p className="mt-1.5 text-sm font-semibold text-green-800">{customerName.trim()}</p>
                        )}
                        {customerType && (
                          <p className="mt-1 text-xs text-green-700">
                            Type: <span className="font-semibold capitalize">{CUSTOMER_TYPES.find(t => t.value === customerType)?.label ?? customerType}</span>
                          </p>
                        )}
                        <p className="mt-1 text-xs text-green-600">
                          Once your customer submits, you&apos;ll complete the account specialist details.
                        </p>
                      </motion.div>

                      {/* Shareable link */}
                      <motion.div variants={itemVariants} className="space-y-1.5">
                        <Label>Shareable link</Label>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={generatedLink}
                            className="flex-1 rounded-lg border bg-zinc-50 px-3 py-2 text-sm font-mono text-zinc-700 outline-none"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <Button variant="outline" onClick={handleCopy} className="shrink-0 min-w-22 overflow-hidden">
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={copied ? "check" : "copy"}
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.6, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                className="flex items-center gap-1.5"
                              >
                                {copied ? (
                                  <><Check className="h-4 w-4 text-green-500" /> Copied</>
                                ) : (
                                  <><Copy className="h-4 w-4" /> Copy</>
                                )}
                              </motion.span>
                            </AnimatePresence>
                          </Button>
                        </div>
                      </motion.div>

                      {/* Copy as message */}
                      <motion.div variants={itemVariants} className="space-y-1.5">
                        <Label>Copy as message</Label>
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2.5">
                          <p className="text-xs text-zinc-500">
                            The message below will be copied to your clipboard — ready to paste into chat or email.
                          </p>
                          <div className="rounded-md border border-zinc-100 bg-white px-3 py-2.5 text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap wrap-break-word">
                            {messageText}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full overflow-hidden"
                            onClick={handleCopyAsMessage}
                          >
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={messageCopied ? "check" : "msg"}
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.6, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                className="flex items-center gap-2"
                              >
                                {messageCopied ? (
                                  <><Check className="h-4 w-4 text-green-500" /> Copied!</>
                                ) : (
                                  <><MessageSquare className="h-4 w-4" /> Copy Message</>
                                )}
                              </motion.span>
                            </AnimatePresence>
                          </Button>
                        </div>
                      </motion.div>

                      {/* Action buttons */}
                      <motion.div variants={itemVariants} className="flex flex-wrap gap-3 pt-1">
                        <Button onClick={() => router.push("/agent")}>Back to Dashboard</Button>
                        {existingDraftId ? (
                          <DeleteDraftButton cisId={existingDraftId} />
                        ) : (
                          <Button variant="outline" onClick={handleGenerateAnother}>
                            Generate Another
                          </Button>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Contextual sidebar ── */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait" initial={false}>
            {!generatedLink ? (
              /* How it works */
              <motion.div
                key="howto"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <Card>
                  <CardContent className="pt-5 pb-5 space-y-5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      How it works
                    </p>

                    {fillMode === null ? (
                      /* Options overview — Step 1 branches into two paths */
                      <ol className="space-y-0">
                        {/* Step 1 — branching */}
                        <li className="relative flex gap-3.5">
                          <div className="absolute left-[15px] top-8 bottom-0 w-px bg-zinc-100" />
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 bg-blue-100 text-blue-600 ring-blue-200/70">
                            <FileText className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 pb-3 pt-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500">Step 1</p>
                            <p className="mt-0.5 text-sm font-semibold text-zinc-800">Start the submission</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">Choose how to collect the customer&apos;s information:</p>
                            <div className="mt-2 space-y-1.5">
                              <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2">
                                <LinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                                <div>
                                  <p className="text-xs font-semibold text-blue-800">Send a link</p>
                                  <p className="text-[11px] text-blue-600">Your customer fills the form themselves via a unique link or QR code.</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2">
                                <PenLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                                <div>
                                  <p className="text-xs font-semibold text-amber-800">Fill up directly</p>
                                  <p className="text-[11px] text-amber-600">You complete the form on behalf of your customer, on the spot.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>

                        {/* Step 2 — routing */}
                        <li className="relative flex gap-3.5">
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 bg-orange-100 text-orange-600 ring-orange-200/70">
                            <GitBranch className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 pb-0 pt-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Step 2</p>
                            <p className="mt-0.5 text-sm font-semibold text-zinc-800">Auto-routed for approval</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">Either way, the form is routed to Legal (Dealer) or Finance (others) based on customer type.</p>
                          </div>
                        </li>
                      </ol>
                    ) : (
                      <ol className="space-y-0">
                        {(fillMode === "direct" ? HOW_IT_WORKS_DIRECT : HOW_IT_WORKS_LINK).map((step, i, arr) => {
                          const Icon = step.icon;
                          const isLast = i === arr.length - 1;
                          return (
                            <li key={i} className="relative flex gap-3.5">
                              {!isLast && (
                                <div className="absolute left-[15px] top-8 bottom-0 w-px bg-zinc-100" />
                              )}
                              <div
                                className={[
                                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
                                  step.color.bg,
                                  step.color.text,
                                  step.color.ring,
                                ].join(" ")}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className={`min-w-0 ${isLast ? "pb-0" : "pb-5"} pt-0.5`}>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${step.color.label}`}>
                                  Step {i + 1}
                                </p>
                                <p className="mt-0.5 text-sm font-semibold text-zinc-800">{step.title}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{step.desc}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}

                    {/* Tip box */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="rounded-md bg-amber-100 p-1">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <span className="text-xs font-semibold text-amber-800">Tip</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-amber-700">
                        {fillMode === "link"
                          ? "Each link is unique and single-use per customer. You can generate as many as you need — one per customer."
                          : fillMode === "direct"
                          ? "Use this mode when you're meeting the customer in person and can fill the form on their behalf right away."
                          : "Choose 'Generate Customer Link' to let your customer fill the form themselves, or 'Fill Up Directly' to complete it on their behalf."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* QR Code */
              <motion.div
                key="qrcode"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <Card>
                  <CardContent className="pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        QR Code
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={handleDownloadQr}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    </div>

                    <div className="flex justify-center">
                      {generatedQr ? (
                        <motion.img
                          src={generatedQr}
                          alt="QR code for customer form link"
                          initial={{ scale: 0.82, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.05 }}
                          className="h-52 w-52 rounded-xl border border-zinc-100 shadow-sm"
                        />
                      ) : (
                        <div className="h-52 w-52 animate-pulse rounded-xl bg-zinc-100" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <QrCode className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      Customer can scan this to open the form directly on their phone.
                    </div>

                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3.5 py-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                        Tip
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        Print this QR code and hand it to your customer in person — no need to type or forward a link.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
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
