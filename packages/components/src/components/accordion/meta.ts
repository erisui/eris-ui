import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "accordion",
  type: "registry:ui",
  title: "Accordion",
  description:
    "Stacked sections that expand and collapse, with arrow-key navigation, Home and End, and single or multiple open items.",
  dependencies: ["@zag-js/accordion", "@zag-js/vanilla"],
  registryDependencies: ["eris-core"],
  files: [
    "components/accordion/Accordion.astro",
    "components/accordion/AccordionItem.astro",
    "components/accordion/AccordionTrigger.astro",
    "components/accordion/AccordionContent.astro",
    "components/accordion/accordion.ts",
  ],
  status: "beta",
} satisfies RegistryMeta;
