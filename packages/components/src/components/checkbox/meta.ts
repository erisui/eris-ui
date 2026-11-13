import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "checkbox",
  type: "registry:ui",
  title: "Checkbox",
  description:
    "Checkbox with a mixed state, built on a real input so it submits with forms and works before its script loads.",
  dependencies: ["@zag-js/checkbox", "@zag-js/vanilla"],
  registryDependencies: ["eris-core"],
  files: ["components/checkbox/Checkbox.astro", "components/checkbox/checkbox.ts"],
  status: "beta",
} satisfies RegistryMeta;
