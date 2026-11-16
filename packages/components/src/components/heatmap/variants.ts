import { cn } from "@/lib/eris/utils";

export type HeatmapSize = "sm" | "md" | "lg";

/** A cell with its own hover text, such as "12 deploys on 3 March". */
export interface HeatmapCell {
  value: number | null;
  label?: string;
}
export type HeatmapValue = number | null | HeatmapCell;

// The grid has no gap of its own. A column is one cell plus one gap wide, and each cell keeps half a
// gap on every side as a margin in percent, so cells and gaps shrink together on a narrow screen: a
// year of weeks still reads on a phone. The negative margin puts the outer cells flush with the edge.
// Sizes are in rem, so they grow with the text size.
const sizes: Record<HeatmapSize, string> = {
  sm: "[--heatmap-track:0.75rem] [--heatmap-gap:2px] [--heatmap-inset:8.3333%]", // 10px cell
  md: "[--heatmap-track:0.9375rem] [--heatmap-gap:3px] [--heatmap-inset:10%]", // 12px cell
  lg: "[--heatmap-track:1.25rem] [--heatmap-gap:4px] [--heatmap-inset:10%]", // 16px cell
};
const legendSizes: Record<HeatmapSize, string> = {
  sm: "gap-0.5 [--heatmap-cell:0.625rem]",
  md: "gap-[3px] [--heatmap-cell:0.75rem]",
  lg: "gap-1 [--heatmap-cell:1rem]",
};

export function heatmapSize(size: HeatmapSize = "md") {
  return sizes[size];
}
export function heatmapLegendSize(size: HeatmapSize = "md") {
  return legendSizes[size];
}

// A squircle. The Eris curve (1.25) is tuned for pills and cards; on a box this small it reads as a
// plain rounded square, so cells take a rounder radius and a stronger curve. Browsers without
// corner-shape keep the 3px radius. The fill mixes the empty colour towards the hot one by --heat.
//
// Only colour and opacity change over time: a cell that grew on hover would shake its neighbours.
const cell =
  "m-(--heatmap-inset) block aspect-square rounded-[3px] supports-[corner-shape:superellipse(1.6)]:rounded-[42%] supports-[corner-shape:superellipse(1.6)]:[corner-shape:superellipse(1.6)] bg-[color-mix(in_oklab,var(--eris-heatmap)_var(--heat),var(--eris-heatmap-empty))] transition-[background-color,opacity] duration-(--eris-duration-state) ease-eris data-dim:opacity-30 data-active:outline data-active:outline-1 data-active:outline-offset-1 data-active:outline-foreground";

export function heatmapCell(className?: string) {
  return cn(cell, className);
}

/** Which step a value falls in: 0 for nothing, 1 to `levels` for the rest. */
export function heatmapLevel(value: number, max: number, levels: number) {
  if (!(value > 0) || !(max > 0)) return 0;
  return Math.min(levels, Math.max(1, Math.ceil((value / max) * levels)));
}

/** How far a step is mixed towards the hot colour. Step 1 starts at 28%, so it stands apart from empty. */
export function heatmapHeat(level: number, levels: number) {
  if (level <= 0) return "0%";
  if (levels <= 1) return "100%";
  return `${Math.round(28 + (72 * (level - 1)) / (levels - 1))}%`;
}
