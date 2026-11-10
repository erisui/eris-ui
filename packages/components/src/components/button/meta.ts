import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "button",
  type: "registry:ui",
  title: "Button",
  description: "Pill button with primary, accent, secondary, ghost and danger variants.",
  registryDependencies: ["eris-core"],
  files: ["components/button/Button.astro", "components/button/variants.ts"],
  status: "beta",
} satisfies RegistryMeta;
