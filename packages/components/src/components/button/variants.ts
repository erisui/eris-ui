import { cn } from "@/lib/eris/utils";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "eris-curve inline-flex cursor-pointer select-none items-center justify-center gap-2 max-w-full rounded-pill border border-transparent font-medium tracking-[-0.01em] no-underline " +
  "transition-[background-color,color,filter,opacity] duration-(--eris-duration-state) ease-eris " +
  "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
  "disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0";

// Every filled variant shares one lighting model: a border, a 1px highlight on the top edge and
// the same drop shadow. Class names stay written out in full so Tailwind can find them.
const variants: Record<ButtonVariant, string> = {
  primary:
    "border-(--eris-primary-border) bg-foreground text-background shadow-[inset_0_1px_0_var(--eris-primary-highlight),0_1px_2px_var(--eris-button-shadow)] hover:bg-(--eris-primary-hover)",
  // Gradient, border, highlight and shadow live in the .eris-accent class in theme.css.
  accent: "eris-accent hover:brightness-110",
  secondary:
    "border-border bg-raised text-foreground shadow-[inset_0_1px_0_var(--eris-raised-highlight),0_1px_2px_var(--eris-button-shadow)] hover:bg-(--eris-raised-hover)",
  ghost: "text-ghost hover:bg-(--eris-raised-hover) hover:text-foreground",
  danger:
    "border-border bg-raised text-danger shadow-[inset_0_1px_0_var(--eris-raised-highlight),0_1px_2px_var(--eris-button-shadow)] hover:bg-(--eris-raised-hover)",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3.5 text-sm",
  md: "min-h-10 px-[18px] text-[15px]",
  lg: "min-h-12 px-6 text-base",
  icon: "size-10",
};

export function buttonVariants(opts: { variant?: ButtonVariant; size?: ButtonSize; class?: string } = {}) {
  const { variant = "primary", size = "md" } = opts;
  return cn(base, variants[variant], sizes[size], opts.class);
}
