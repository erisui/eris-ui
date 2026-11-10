import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names, letting later Tailwind classes win over earlier ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Unique, stable-enough id for a component instance rendered on the server. */
export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
