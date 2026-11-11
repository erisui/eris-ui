import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "kbd",
  type: "registry:ui",
  title: "Kbd",
  description: "A key or shortcut drawn as a keycap.",
  registryDependencies: ["eris-core"],
  files: ["components/kbd/Kbd.astro", "components/kbd/KbdGroup.astro", "components/kbd/variants.ts"],
  status: "beta",
} satisfies RegistryMeta;
