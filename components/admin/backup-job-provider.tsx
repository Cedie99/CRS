"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import {
  downloadCisBackups,
  type BackupMark,
  type BackupProgress,
  type BackupTarget,
} from "@/components/admin/cis-backup";

/** What the Backup Records page needs to know about a selected record, even when it's on another page. */
export interface BackupSelection {
  tradeName: string | null;
  customerCode: string | null;
  lastBackupAt: string | null;
}

interface BackupJob {
  progress: BackupProgress;
  status: "running" | "done" | "error";
  message?: string;
}

interface BackupJobContextValue {
  job: BackupJob | null;
  busy: boolean;
  /** Backup marks set during this session — overlaid on server data until the page refreshes. */
  marks: Record<string, BackupMark>;
  selected: Map<string, BackupSelection>;
  setSelected: React.Dispatch<React.SetStateAction<Map<string, BackupSelection>>>;
  startDownload: (targets: BackupTarget[]) => void;
}

const BackupJobContext = createContext<BackupJobContextValue | null>(null);

export function useBackupJob() {
  const ctx = useContext(BackupJobContext);
  if (!ctx) throw new Error("useBackupJob must be used inside <BackupJobProvider>");
  return ctx;
}

/**
 * Holds the admin backup download job at the staff-shell level so it keeps
 * running (and stays visible) while the admin navigates to other pages.
 */
export function BackupJobProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const [job, setJob] = useState<BackupJob | null>(null);
  const [marks, setMarks] = useState<Record<string, BackupMark>>({});
  const [selected, setSelected] = useState<Map<string, BackupSelection>>(new Map());
  const busy = job?.status === "running";
  const dismiss = useCallback(() => setJob(null), []);

  // A full reload or closing the tab would abort the download — warn first
  useEffect(() => {
    if (!busy) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [busy]);

  const startDownload = useCallback(
    (targets: BackupTarget[]) => {
      if (targets.length === 0 || busy) return;
      setJob({ progress: { done: 0, total: targets.length }, status: "running" });

      downloadCisBackups(targets, (progress) => setJob((j) => (j ? { ...j, progress } : j)))
        .then(({ failed, marks: newMarks }) => {
          setMarks((prev) => ({ ...prev, ...newMarks }));
          setSelected((prev) => {
            const next = new Map(prev);
            for (const id of Object.keys(newMarks)) next.delete(id);
            return next;
          });
          const message =
            failed.length > 0
              ? `${failed.length} form(s) could not be generated and were left out: ${failed
                  .map((t) => t.tradeName ?? t.id.slice(0, 8))
                  .join(", ")}. They stay "Not downloaded" — try them again.`
              : undefined;
          setJob((j) => j && { ...j, status: failed.length > 0 ? "error" : "done", message });
          if (pathnameRef.current.startsWith("/admin/backup")) router.refresh();
        })
        .catch((err) => {
          setJob((j) => j && { ...j, status: "error", message: err instanceof Error ? err.message : String(err) });
        });
    },
    [busy, router]
  );

  return (
    <BackupJobContext.Provider value={{ job, busy, marks, selected, setSelected, startDownload }}>
      {children}
      {job && <BackupJobIndicator job={job} onDismiss={dismiss} />}
    </BackupJobContext.Provider>
  );
}

function BackupJobIndicator({ job, onDismiss }: { job: BackupJob; onDismiss: () => void }) {
  const { done, total } = job.progress;
  const label = total === 1 ? "record" : "records";

  // Auto-hide a clean success after a few seconds
  useEffect(() => {
    if (job.status !== "done") return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [job.status, onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg print:hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        {job.status === "running" && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-emerald-600" />}
        {job.status === "done" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
        {job.status === "error" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-800">
            {job.status === "running"
              ? `Generating CIS form PDF${total === 1 ? "" : "s"} — ${Math.min(done + 1, total)} of ${total}`
              : job.status === "done"
                ? `CIS form${total === 1 ? "" : "s"} downloaded (${total} ${label})`
                : "Download finished with issues"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {job.status === "running"
              ? "You can keep working on other pages. Don't reload or close this tab."
              : (job.message ?? "Check your downloads folder.")}
          </p>
        </div>
        {job.status !== "running" && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {job.status === "running" && (
        <div className="h-1 bg-zinc-100">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
