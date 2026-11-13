import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "tooltip",
  type: "registry:ui",
  title: "Tooltip",
  description:
    "Short hint shown on hover and keyboard focus, with open and close delays, Escape to dismiss, and placement that flips to stay on screen.",
  dependencies: ["@zag-js/tooltip", "@zag-js/vanilla"],
  registryDependencies: ["eris-core"],
  files: ["components/tooltip/Tooltip.astro", "components/tooltip/tooltip.ts"],
  status: "beta",
} satisfies RegistryMeta;
