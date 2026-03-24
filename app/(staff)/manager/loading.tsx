import { CisCardSkeleton } from "@/components/cis-card-skeleton";

export default function ManagerLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 animate-pulse">
        <div className="h-7 w-48 rounded bg-zinc-200" />
        <div className="h-4 w-64 rounded bg-zinc-200" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CisCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
