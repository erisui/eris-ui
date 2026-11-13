import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "select",
  type: "registry:ui",
  title: "Select",
  description:
    "Custom select with arrow-key navigation, typeahead, groups and a hidden native select so it submits with forms.",
  dependencies: ["@zag-js/select", "@zag-js/vanilla"],
  registryDependencies: ["eris-core"],
  files: [
    "components/select/Select.astro",
    "components/select/SelectLabel.astro",
    "components/select/SelectTrigger.astro",
    "components/select/SelectContent.astro",
    "components/select/SelectItem.astro",
    "components/select/SelectGroup.astro",
    "components/select/select.ts",
  ],
  status: "beta",
} satisfies RegistryMeta;
