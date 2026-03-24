export function CisCardSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-4 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="h-3 w-16 rounded bg-zinc-200" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded-full bg-zinc-200" />
          <div className="h-5 w-20 rounded-full bg-zinc-200" />
        </div>
      </div>
      <div className="mt-2 h-4 w-3/4 rounded bg-zinc-200" />
      <div className="mt-3 flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-zinc-200" />
        <div className="h-3 w-14 rounded bg-zinc-200" />
      </div>
    </div>
  );
}
