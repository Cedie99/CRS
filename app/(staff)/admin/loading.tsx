export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-44 rounded bg-zinc-200" />
          <div className="h-4 w-72 rounded bg-zinc-200" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-zinc-200" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-4">
            <div className="h-3 w-16 rounded bg-zinc-200" />
            <div className="mt-2 h-7 w-10 rounded bg-zinc-200" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b bg-zinc-50 px-4 py-3">
          <div className="flex gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-3 w-20 rounded bg-zinc-200" />
            ))}
          </div>
        </div>
        <div className="divide-y divide-zinc-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3">
              <div className="h-4 w-36 rounded bg-zinc-200" />
              <div className="h-4 w-16 rounded bg-zinc-200" />
              <div className="h-4 w-20 rounded bg-zinc-200" />
              <div className="h-5 w-24 rounded-full bg-zinc-200" />
              <div className="h-4 w-16 rounded bg-zinc-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
