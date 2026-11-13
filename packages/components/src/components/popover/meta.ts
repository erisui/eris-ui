import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "popover",
  type: "registry:ui",
  title: "Popover",
  description:
    "Floating panel anchored to its trigger, with focus management, Escape and outside-click to close, and placement that flips to stay on screen.",
  dependencies: ["@zag-js/popover", "@zag-js/vanilla"],
  registryDependencies: ["eris-core", "button"],
  files: [
    "components/popover/Popover.astro",
    "components/popover/PopoverTrigger.astro",
    "components/popover/PopoverContent.astro",
    "components/popover/PopoverTitle.astro",
    "components/popover/PopoverDescription.astro",
    "components/popover/PopoverClose.astro",
    "components/popover/popover.ts",
  ],
  status: "beta",
} satisfies RegistryMeta;
