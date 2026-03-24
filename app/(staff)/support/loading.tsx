import { CisCardSkeleton } from "@/components/cis-card-skeleton";

export default function SupportLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1.5 animate-pulse">
        <div className="h-7 w-36 rounded bg-zinc-200" />
        <div className="h-4 w-72 rounded bg-zinc-200" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-40 rounded bg-zinc-200 animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CisCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
