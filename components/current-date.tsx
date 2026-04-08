export function CurrentDate() {
  const now = new Date();
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
    <time dateTime={now.toISOString()} className="text-sm font-medium text-zinc-400">
      <span className="sm:hidden">{formattedShort}</span>
      <span className="hidden sm:inline">{formattedLong}</span>
    </time>
  );
}
