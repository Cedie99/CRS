"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

export function CurrentDate() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  if (!now) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700">
        <CalendarDays className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        <span>Loading date...</span>
      </span>
    );
  }

  const formattedLong = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedShort = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <time
      dateTime={now.toISOString()}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700"
    >
      <CalendarDays className="h-4 w-4 text-emerald-700" aria-hidden="true" />
      <span className="sm:hidden">{formattedShort}</span>
      <span className="hidden sm:inline">{formattedLong}</span>
    </time>
  );
}
