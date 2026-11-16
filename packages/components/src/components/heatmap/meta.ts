import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "heatmap",
  type: "registry:ui",
  title: "Heatmap",
  description:
    "A grid of small squares, each shaded by its value, such as activity per day. Hover, drag or use the arrow keys to read one cell at a time.",
  registryDependencies: ["eris-core"],
  files: [
    "components/heatmap/Heatmap.astro",
    "components/heatmap/HeatmapLegend.astro",
    "components/heatmap/heatmap.ts",
    "components/heatmap/variants.ts",
  ],
  status: "beta",
} satisfies RegistryMeta;
