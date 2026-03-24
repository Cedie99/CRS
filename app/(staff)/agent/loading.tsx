import { CisCardSkeleton } from "@/components/cis-card-skeleton";

export default function AgentLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5 animate-pulse">
          <div className="h-7 w-40 rounded bg-zinc-200" />
          <div className="h-4 w-52 rounded bg-zinc-200" />
        </div>
        <div className="h-9 w-24 rounded-lg bg-zinc-200 animate-pulse" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-4">
            <div className="h-3 w-16 rounded bg-zinc-200" />
            <div className="mt-2 h-7 w-10 rounded bg-zinc-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CisCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
