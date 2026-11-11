import type { RegistryMeta } from "./lib/eris/meta";
import button from "./components/button/meta";
import dialog from "./components/dialog/meta";
import tabs from "./components/tabs/meta";
import snippet from "./components/snippet/meta";
import kbd from "./components/kbd/meta";

/** Every free registry item. Input to packages/registry-build. */
export const core: RegistryMeta = {
  name: "eris-core",
  type: "registry:lib",
  title: "Eris core",
  description: "Mount lifecycle, part helpers, cn() and the theme.",
  dependencies: ["clsx", "tailwind-merge"],
  files: ["lib/eris/mount.ts", "lib/eris/utils.ts", "styles/theme.css"],
  status: "beta",
};

export const registry: RegistryMeta[] = [core, button, dialog, tabs, snippet, kbd];
