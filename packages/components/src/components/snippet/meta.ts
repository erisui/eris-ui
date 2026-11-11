import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "snippet",
  type: "registry:ui",
  title: "Snippet",
  description: "A shell command on a code surface, with a copy button that confirms the copy.",
  dependencies: ["@zag-js/clipboard", "@zag-js/vanilla"],
  registryDependencies: ["eris-core", "button"],
  files: ["components/snippet/Snippet.astro", "components/snippet/snippet.ts"],
  status: "beta",
} satisfies RegistryMeta;
