import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "tabs",
  type: "registry:ui",
  title: "Tabs",
  description:
    "Tabs with arrow-key navigation, Home and End, manual or automatic activation, and a sliding indicator.",
  dependencies: ["@zag-js/tabs", "@zag-js/vanilla"],
  registryDependencies: ["eris-core"],
  files: [
    "components/tabs/Tabs.astro",
    "components/tabs/TabsList.astro",
    "components/tabs/TabsTrigger.astro",
    "components/tabs/TabsContent.astro",
    "components/tabs/tabs.ts",
  ],
  status: "beta",
} satisfies RegistryMeta;
