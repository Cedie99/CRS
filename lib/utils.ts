import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) {
    const rem = n % 10;
    return TENS[Math.floor(n / 10)] + (rem ? " " + ONES[rem] : "");
  }
  const rem = n % 100;
  return ONES[Math.floor(n / 100)] + " Hundred" + (rem ? " " + below1000(rem) : "");
}

export function numberToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const b = Math.floor(n / 1_000_000_000);
  const m = Math.floor((n % 1_000_000_000) / 1_000_000);
  const t = Math.floor((n % 1_000_000) / 1_000);
  const r = n % 1_000;
  if (b) parts.push(below1000(b) + " Billion");
  if (m) parts.push(below1000(m) + " Million");
  if (t) parts.push(below1000(t) + " Thousand");
  if (r) parts.push(below1000(r));
  return parts.join(" ");
}

export function humanizeDisplayValue(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
