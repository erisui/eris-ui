import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "dialog",
  type: "registry:ui",
  title: "Dialog",
  description: "Modal dialog with focus trap, Escape and outside-click to close, and focus return.",
  dependencies: ["@zag-js/dialog", "@zag-js/vanilla"],
  registryDependencies: ["eris-core", "button"],
  files: [
    "components/dialog/Dialog.astro",
    "components/dialog/DialogTrigger.astro",
    "components/dialog/DialogContent.astro",
    "components/dialog/DialogTitle.astro",
    "components/dialog/DialogDescription.astro",
    "components/dialog/DialogClose.astro",
    "components/dialog/dialog.ts",
  ],
  status: "beta",
} satisfies RegistryMeta;
