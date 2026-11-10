import { cn } from "@/lib/eris/utils";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "eris-curve inline-flex cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-pill border border-transparent font-medium tracking-[-0.01em] " +
  "transition-[background-color,color,filter,opacity] duration-(--eris-duration-state) ease-eris " +
  "outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
  "disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background shadow-[0_1px_2px_rgb(0_0_0/0.55),0_0_0_1px_rgb(255_255_255/0.06),inset_0_-1px_0_rgb(0_0_0/0.1)] hover:bg-white",
  accent: "eris-accent hover:brightness-110",
  secondary: "border-border bg-raised text-foreground hover:bg-border",
  ghost: "text-ghost hover:bg-raised hover:text-foreground",
  danger: "border-border bg-raised text-danger hover:bg-border",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-sm",
  md: "h-10 px-[18px] text-[15px]",
  lg: "h-12 px-6 text-base",
  icon: "size-10",
};

export function buttonVariants(opts: { variant?: ButtonVariant; size?: ButtonSize; class?: string } = {}) {
  const { variant = "primary", size = "md" } = opts;
  return cn(base, variants[variant], sizes[size], opts.class);
}
