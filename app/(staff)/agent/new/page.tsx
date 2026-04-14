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
  ArrowLeft, Copy, Check, Link as LinkIcon, Building2, Flame, Star, Scale,
  QrCode, Download, MessageSquare, UserRound, FileText, GitBranch, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sileo as toast } from "sileo";
import QRCode from "qrcode";
import { DeleteDraftButton } from "@/components/delete-draft-button";

const CUSTOMER_TYPES = [
  {
    value: "standard",
    label: "Standard",
    description: "Regular customer account. Goes through Manager → Finance → Final Approval.",
    icon: Building2,
    routeNote: null,
    cardColor: "border-zinc-200 hover:border-zinc-400",
    activeColor: "border-[#2d6e1e] bg-green-50 ring-2 ring-[#2d6e1e]/20",
    iconBg: "bg-zinc-100",
    iconColor: "text-zinc-600",
    badgeCn: "bg-zinc-100 text-zinc-700",
  },
  {
    value: "fs_petroleum",
    label: "FS Petroleum",
    description: "Fuel station account. Requires Legal Review before going to Finance.",
    icon: Flame,
    routeNote: "Legal Review required first",
    cardColor: "border-zinc-200 hover:border-purple-300",
    activeColor: "border-purple-400 bg-purple-50 ring-2 ring-purple-400/20",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    badgeCn: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  {
    value: "special",
    label: "Special Account",
    description: "Special or unique cases. Requires Legal Review before going to Finance.",
    icon: Star,
    routeNote: "Legal Review required first",
    cardColor: "border-zinc-200 hover:border-amber-300",
    activeColor: "border-amber-400 bg-amber-50 ring-2 ring-amber-400/20",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    badgeCn: "bg-amber-50 text-amber-700 border border-amber-200",
  },
];

const HOW_IT_WORKS = [
  {
    icon: UserRound,
    title: "Select the customer type",
    desc: "Choose Standard, FS Petroleum, or Special to set the approval route.",
  },
  {
    icon: LinkIcon,
    title: "Generate a unique link",
    desc: "A one-time form link and QR code are created specifically for this customer.",
  },
  {
    icon: FileText,
    title: "Customer fills the form",
    desc: "They open the link and submit their business information directly.",
  },
  {
    icon: GitBranch,
    title: "Auto-routed for approval",
    desc: "The completed form moves through your organisation's review pipeline automatically.",
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

  const [customerType, setCustomerType] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function handleGenerate() {
    if (!customerType) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/cis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerType,
          tradeName: customerName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Failed to generate link.");
        return;
      }
      const link = `${window.location.origin}/form/${json.publicToken}`;
      const qr = await QRCode.toDataURL(link, { width: 260, margin: 1 });
      setGeneratedLink(link);
      setGeneratedQr(qr);
      setExistingDraftId(null);
      toast.success({
        title: "Customer form link generated.",
        description: "Send the link to your customer to start their submission.",
      });
    } catch {
      setError("Something went wrong. Please try again.");
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
    setCustomerType("");
    setCustomerName("");
    setCopied(false);
    setMessageCopied(false);
    router.replace("/agent/new");
  }

  const selectedType = CUSTOMER_TYPES.find((t) => t.value === customerType);

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
                Choose the customer type below. A unique form link will be generated
                for you to share with your customer — they fill it out directly.
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
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-zinc-700">
                          What type of customer is this? *
                        </Label>
                        <div className="grid gap-2.5">
                          {CUSTOMER_TYPES.map((t) => {
                            const Icon = t.icon;
                            const isSelected = customerType === t.value;
                            return (
                              <motion.button
                                key={t.value}
                                type="button"
                                disabled={isLoading}
                                onClick={() => setCustomerType(t.value)}
                                whileHover={!isLoading ? { scale: 1.012 } : {}}
                                whileTap={!isLoading ? { scale: 0.988 } : {}}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className={cn(
                                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-left",
                                  isSelected ? t.activeColor : t.cardColor,
                                  "disabled:cursor-not-allowed disabled:opacity-60"
                                )}
                              >
                                <span className={cn("mt-0.5 rounded-lg p-2", t.iconBg)}>
                                  <Icon className={cn("h-4 w-4", t.iconColor)} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-zinc-900">{t.label}</span>
                                    {t.routeNote && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                                        <Scale className="h-3 w-3" />
                                        {t.routeNote}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-xs text-zinc-500">{t.description}</p>
                                </div>
                                <motion.span
                                  animate={isSelected
                                    ? { scale: 1, backgroundColor: "#2d6e1e", borderColor: "#2d6e1e" }
                                    : { scale: 1, backgroundColor: "#ffffff", borderColor: "#d4d4d8" }
                                  }
                                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                  className="mt-1 h-4 w-4 shrink-0 rounded-full border-2"
                                />
                              </motion.button>
                            );
                          })}
                        </div>
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
                        <Button onClick={handleGenerate} disabled={isLoading || !customerType}>
                          {isLoading ? "Generating…" : "Generate Customer Link"}
                        </Button>
                        <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>
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
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                            <LinkIcon className="h-4 w-4 shrink-0" />
                            Link ready — share it with your customer!
                          </div>
                          {selectedType && (
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", selectedType.badgeCn)}>
                              {selectedType.label}
                            </span>
                          )}
                        </div>
                        {customerName.trim() && (
                          <p className="mt-1.5 text-sm font-semibold text-green-800">{customerName.trim()}</p>
                        )}
                        <p className="mt-1 text-xs text-green-600">
                          Once your customer submits, the form automatically enters the approval pipeline.
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
                          <Button variant="outline" onClick={handleCopy} className="shrink-0 min-w-[88px] overflow-hidden">
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
                          <div className="rounded-md border border-zinc-100 bg-white px-3 py-2.5 text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap break-words">
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
                  <CardContent className="pt-5 space-y-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      How it works
                    </p>
                    <ol className="space-y-4">
                      {HOW_IT_WORKS.map((step, i) => {
                        const Icon = step.icon;
                        return (
                          <li key={i} className="flex gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500">
                              {i + 1}
                            </span>
                            <div className="pt-0.5">
                              <p className="text-sm font-semibold text-zinc-800">{step.title}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{step.desc}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3.5 py-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                        Tip
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        Each link is unique and single-use per customer. You can generate as many as you need — one per customer.
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
