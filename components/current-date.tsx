export function CurrentDate() {
  const now = new Date();
  const formatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <time dateTime={now.toISOString()} className="text-sm font-medium text-zinc-400">
      {formatted}
    </time>
  );
}
