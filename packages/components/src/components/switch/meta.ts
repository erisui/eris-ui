import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "switch",
  type: "registry:ui",
  title: "Switch",
  description:
    "On and off toggle built on a real checkbox, so it submits with forms and works before its script loads.",
  dependencies: ["@zag-js/switch", "@zag-js/vanilla"],
  registryDependencies: ["eris-core"],
  files: ["components/switch/Switch.astro", "components/switch/switch.ts"],
  status: "beta",
} satisfies RegistryMeta;
