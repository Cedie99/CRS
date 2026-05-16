"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { CisCard } from "@/components/cis-card";
import type { CisStatus } from "@/components/status-badge";

type ActionItem = {
  id: string;
  tradeName: string | null;
  contactPerson: string | null;
  customerType?: string | null;
  agentCode: string;
  agentName?: string | null;
  status: CisStatus;
  createdAt: Date;
  updatedAt?: Date | null;
};

interface ActionRequiredSectionProps {
  submissions: ActionItem[];
  totalCount: number;
  hrefPrefix: string;
  label?: string;
  sublabel?: string;
  accentClass?: string;
  badgeClass?: string;
  icon?: "alert" | "return";
  viewAllHref?: string;
}

function getPerPage(): number {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth < 640) return 1;
  if (window.innerWidth < 1280) return 2;
  return 3;
}

const GAP = 16; // px — gap-4

export function ActionRequiredSection({
  submissions,
  totalCount,
  hrefPrefix,
  label = "Needs Your Action",
  sublabel,
  accentClass = "border-red-200 bg-red-50/50",
  badgeClass = "bg-red-100 text-red-800",
  icon = "alert",
  viewAllHref,
}: ActionRequiredSectionProps) {
  const Icon = icon === "return" ? RotateCcw : AlertCircle;
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);

  useEffect(() => {
    function update() {
      setPerPage(getPerPage());
      setPage(0);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (totalCount === 0) return null;

  const totalPages = Math.ceil(submissions.length / perPage);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;
  const overflow = totalCount - submissions.length;

  // Each card width = (viewport% - gaps) / perPage.
  // We express the viewport as 100% of the overflow-hidden container.
  // Shifting one page = perPage cards × (cardWidth + gap).
  // cardWidth = (100% - (perPage-1)*GAP) / perPage
  // One-page shift = (100% - (perPage-1)*GAP) + (perPage-1)*GAP ... simplifies to just 100% of the container + gap.
  // Actually: shift per card = cardWidth + gap = (100% - (perPage-1)*gap)/perPage + gap
  // Shift per page = perPage * shift-per-card = 100% - (perPage-1)*gap + perPage*gap = 100% + gap
  // So: translateX = -page * (100% + GAP)px ... where 100% is the container width.
  const translateX = `calc(${page} * (-100% - ${GAP}px))`;

  return (
    <section className={`rounded-xl border-2 overflow-hidden ${accentClass}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0 opacity-60" />
          <div>
            <h2 className="text-sm font-bold text-zinc-900">{label}</h2>
            {sublabel && (
              <p className="mt-0.5 text-xs text-zinc-500">{sublabel}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${badgeClass}`}>
            {totalCount} form{totalCount === 1 ? "" : "s"}
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={!canPrev}
                aria-label="Previous forms"
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-150",
                  canPrev
                    ? "border-zinc-300 bg-white text-zinc-700 shadow-sm hover:border-zinc-400 hover:shadow active:scale-95"
                    : "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-300",
                ].join(" ")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="min-w-[2.5rem] text-center text-xs font-medium text-zinc-500 tabular-nums">
                {page + 1} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={!canNext}
                aria-label="Next forms"
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-150",
                  canNext
                    ? "border-zinc-300 bg-white text-zinc-700 shadow-sm hover:border-zinc-400 hover:shadow active:scale-95"
                    : "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-300",
                ].join(" ")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Carousel viewport — clips overflowing cards */}
      <div className="overflow-hidden px-4 pb-4">
        {/*
          Track: all cards laid out in a single row.
          Width is (n/perPage) pages × 100% container = fine because overflow is hidden.
          We slide by -(page × (100% container + gap)) which advances exactly perPage cards.
        */}
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ gap: `${GAP}px`, transform: `translateX(${translateX})` }}
        >
          {submissions.map((s) => (
            <div
              key={s.id}
              className="shrink-0"
              style={{
                // Card width accounts for the gaps between cards in one viewport slice.
                width: `calc((100% - ${(perPage - 1) * GAP}px) / ${perPage})`,
              }}
            >
              <CisCard
                id={s.id}
                tradeName={s.tradeName}
                contactPerson={s.contactPerson}
                customerType={s.customerType}
                agentCode={s.agentCode}
                agentName={s.agentName ?? undefined}
                status={s.status}
                createdAt={s.createdAt}
                updatedAt={s.updatedAt ?? undefined}
                href={`/${hrefPrefix}/${s.id}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer: dot indicators + overflow hint */}
      {(totalPages > 1 || overflow > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 px-4 py-2.5">
          {totalPages > 1 ? (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  aria-label={`Go to page ${i + 1}`}
                  className={[
                    "rounded-full transition-all duration-200",
                    i === page
                      ? "h-2 w-5 bg-zinc-500"
                      : "h-2 w-2 bg-zinc-300 hover:bg-zinc-400",
                  ].join(" ")}
                />
              ))}
            </div>
          ) : (
            <span />
          )}

          {overflow > 0 && viewAllHref ? (
            <Link href={viewAllHref} className="text-xs font-medium text-zinc-500 underline-offset-2 hover:underline">
              +{overflow} more — view all
            </Link>
          ) : overflow > 0 ? (
            <p className="text-xs text-zinc-400">
              +{overflow} more — browse by customer type below.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
