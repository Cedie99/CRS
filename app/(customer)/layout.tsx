import { PageTransition } from "@/components/page-transition";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-100 via-zinc-50 to-zinc-100">
      <header className="border-b border-zinc-200/80 bg-white/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Oracle Petroleum</p>
            <p className="text-sm font-semibold leading-snug text-zinc-900 sm:text-base">Customer Request Submission</p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            Secure Form
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
