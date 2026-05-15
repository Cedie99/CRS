/**
 * Typed toast helpers — wraps sileo with per-action title colours.
 *
 * Usage: import { toast } from "@/lib/toast"
 *
 * Colour convention:
 *   success  → brand green   (#2d6e1e)
 *   error    → red           (text-red-600)
 *   warning  → amber         (text-amber-600)
 *   info     → blue          (text-blue-600)
 *   loading  → zinc          (text-zinc-600)
 */
import { sileo } from "sileo";
import type { SileoOptions } from "sileo";

const FONT = "text-sm font-semibold";
const DESC = "text-xs text-black";

function withTitle(color: string, opts: SileoOptions): SileoOptions {
  return {
    ...opts,
    styles: {
      title: `${FONT} ${color}`,
      description: DESC,
      ...opts.styles,
    },
  };
}

export const toast = {
  success: (opts: SileoOptions) =>
    sileo.success(withTitle("text-[#2d6e1e]", opts)),

  error: (opts: SileoOptions) =>
    sileo.error(withTitle("text-red-600", opts)),

  warning: (opts: SileoOptions) =>
    sileo.warning(withTitle("text-amber-600", opts)),

  info: (opts: SileoOptions) =>
    sileo.info(withTitle("text-blue-600", opts)),

  promise: sileo.promise.bind(sileo),
  dismiss: sileo.dismiss.bind(sileo),
  clear: sileo.clear.bind(sileo),
};
