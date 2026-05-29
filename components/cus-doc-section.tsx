"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, CheckCircle2, FolderOpen } from "lucide-react";
import { DocUploadSlot } from "@/components/doc-upload-slot";
import { SCORING_DOC_SLOTS, type FileEntry } from "@/lib/doc-types";

const OTHER_SLOT = { key: "docOther", label: "Other Supporting Documents" } as const;
const ALL_SLOTS = [...SCORING_DOC_SLOTS, OTHER_SLOT];

export function CusDocSection({
  cusId,
  initialDocs,
  cisDocs = {},
  disabled = false,
  onDocChange,
  isMovingToWithTerms = false,
  requiredDocKeys = [],
}: {
  cusId: string;
  initialDocs: Record<string, FileEntry[]>;
  cisDocs?: Record<string, FileEntry[]>;
  disabled?: boolean;
  onDocChange?: (key: string, files: FileEntry[]) => void;
  isMovingToWithTerms?: boolean;
  requiredDocKeys?: string[];
}) {
  const [docs, setDocs] = useState<Record<string, FileEntry[]>>(initialDocs);
  const [expanded, setExpanded] = useState<string | null>(null);
  const router = useRouter();
  const endpoint = `/api/cus/${cusId}/docs`;

  // Auto-expand required document sections when moving to credit terms
  useEffect(() => {
    if (isMovingToWithTerms) {
      const missingRequired = requiredDocKeys.filter((key) => {
        const files = docs[key] ?? [];
        return files.length === 0;
      });
      if (missingRequired.length > 0) {
        setExpanded(missingRequired[0]);
      }
    }
  }, [isMovingToWithTerms, requiredDocKeys, docs]);

  function setDocFiles(key: string, files: FileEntry[]) {
    setDocs((prev) => ({ ...prev, [key]: files }));
    onDocChange?.(key, files);
    if (!onDocChange) router.refresh();
  }

  function toggle(key: string) {
    setExpanded((prev) => (prev === key ? null : key));
  }

  return (
    <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 overflow-hidden">
      {ALL_SLOTS.map((slot) => {
        const cusFiles = docs[slot.key] ?? [];
        const cisFiles = cisDocs[slot.key] ?? [];
        const hasCus = cusFiles.length > 0;
        const hasCis = cisFiles.length > 0;
        const isOpen = expanded === slot.key;
        const isRequired = isMovingToWithTerms && requiredDocKeys.includes(slot.key);
        const isMissing = isRequired && cusFiles.length === 0;

        return (
          <div key={slot.key} className={isMissing ? "doc-required-glow" : ""}>
            {/* Row header — always visible */}
            <button
              type="button"
              onClick={() => toggle(slot.key)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left"
            >
              {/* Status dot */}
              <span className={`shrink-0 h-2 w-2 rounded-full mt-px
                ${hasCus ? "bg-green-500" : hasCis ? "bg-zinc-300" : "bg-zinc-200"}`}
              />

              {/* Label */}
              <span className={`flex-1 text-sm leading-snug min-w-0
                ${hasCus ? "font-medium text-zinc-900" : "text-zinc-600"}`}>
                {slot.label}
              </span>

              {/* Badges */}
              <span className="flex items-center gap-1.5 shrink-0">
                {hasCus && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {cusFiles.length}
                  </span>
                )}
                {hasCis && !hasCus && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                    <FolderOpen className="h-2.5 w-2.5" />
                    on CIS
                  </span>
                )}
                <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
              </span>
            </button>

            {/* Expanded panel */}
            {isOpen && (
              <div className="px-4 pb-4 pt-1 space-y-3 bg-zinc-50 border-t border-zinc-100">
                {/* CIS reference files */}
                {cisFiles.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      On original CIS
                    </p>
                    <ul className="space-y-1">
                      {cisFiles.map((f) => (
                        <li key={f.url} className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-zinc-400 shrink-0" />
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline truncate flex-1"
                          >
                            {f.name}
                          </a>
                          {f.uploadedAt && (
                            <span className="text-[10px] text-zinc-400 shrink-0">
                              {new Date(f.uploadedAt).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                              })}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upload slot */}
                <DocUploadSlot
                  docType={slot.key as never}
                  label=""
                  endpoint={endpoint}
                  files={cusFiles}
                  onChange={(files) => setDocFiles(slot.key, files)}
                  disabled={disabled}
                  allowDelete={false}
                  allowRename={false}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
