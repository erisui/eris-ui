import { cn } from "@/lib/eris/utils";

export type KbdSize = "sm" | "md";

// A keycap: a raised face on a thicker bottom edge. At least as wide as it is tall, so single glyphs
// like ↑ and ↓ line up in a row. min-h, not h, so a larger text size grows the cap instead of clipping it.
const base =
  "eris-curve inline-flex items-center justify-center whitespace-nowrap rounded-[6px] border border-b-2 border-border-strong bg-raised font-mono font-normal text-foreground";

// Line height comes after the text size: a text-* class also sets one, and tailwind-merge keeps the last.
const sizes: Record<KbdSize, string> = {
  // UI chrome: menus, search hints, tooltips
  sm: "min-h-5 min-w-5 px-1 text-[11px] leading-none",
  // Body text and tables
  md: "min-h-6 min-w-6 px-1.5 text-xs leading-none",
};

export function kbdVariants(opts: { size?: KbdSize; class?: string } = {}) {
  const { size = "md" } = opts;
  return cn(base, sizes[size], opts.class);
}
