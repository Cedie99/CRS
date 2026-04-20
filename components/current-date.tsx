"use client";

import { useEffect, useState } from "react";

export function CurrentDate() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  if (!now) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700">
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
      <span className="sm:hidden">{formattedShort}</span>
      <span className="hidden sm:inline">{formattedLong}</span>
    </time>
  );
}
