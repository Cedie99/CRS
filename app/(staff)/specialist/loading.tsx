export default function SpecialistLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-zinc-100" />
        <div className="space-y-1.5">
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-100" />
          <div className="h-3.5 w-56 animate-pulse rounded bg-zinc-100" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border bg-zinc-50" />
        ))}
      </div>
    </div>
  );
}
