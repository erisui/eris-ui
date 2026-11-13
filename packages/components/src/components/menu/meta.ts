import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "menu",
  type: "registry:ui",
  title: "Menu",
  description:
    "Dropdown menu with arrow-key navigation, typeahead, links, checkbox and radio items, groups and separators.",
  dependencies: ["@zag-js/menu", "@zag-js/vanilla"],
  registryDependencies: ["eris-core", "button"],
  files: [
    "components/menu/Menu.astro",
    "components/menu/MenuTrigger.astro",
    "components/menu/MenuContent.astro",
    "components/menu/MenuItem.astro",
    "components/menu/MenuCheckboxItem.astro",
    "components/menu/MenuRadioGroup.astro",
    "components/menu/MenuRadioItem.astro",
    "components/menu/MenuGroup.astro",
    "components/menu/MenuSeparator.astro",
    "components/menu/menu.ts",
  ],
  status: "beta",
} satisfies RegistryMeta;
