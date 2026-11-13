/** Site-wide constants for erisui.dev. Docs navigation lives in nav.ts. */

export const SITE = {
  name: "Eris UI",
  url: "https://erisui.dev",
  email: "hello@erisui.dev",
  title: "Eris UI - Accessible components for Astro",
  description:
    "Accessible UI components you can drop into any Astro project. Plain .astro files, Zag state machines, Tailwind v4.",
  /** The browser chrome colour per theme; matches --site-page. */
  themeColor: { dark: "#111111", light: "#f6f6f6" },
} as const;

/** Syntax highlighting palettes. Code is rendered with both and CSS picks one. */
export const CODE_THEMES = { dark: "github-dark-default", light: "github-light-default" } as const;

/** Where the visitor's theme choice is kept. Dark is the default. */
export const THEME_STORAGE_KEY = "eris-theme";

export const LINKS = {
  github: "https://github.com/erisui/eris-ui",
  githubOrg: "https://github.com/erisui",
  zag: "https://zagjs.com",
  tailwind: "https://tailwindcss.com",
} as const;

/** The CLI package as users run it, pinned to the latest release. */
export const CLI_PACKAGE = "eris-ui@latest";

/** How each package manager runs a one-off package, in the order the install tabs show them. */
export const PACKAGE_RUNNERS = [
  { pm: "npm", exec: "npx" },
  { pm: "pnpm", exec: "pnpm dlx" },
  { pm: "bun", exec: "bunx" },
  { pm: "yarn", exec: "yarn dlx" },
] as const;

/** The full CLI command for a package manager runner, e.g. `npx eris-ui@latest add dialog`. */
export function cliCommand(args: string, exec: string = PACKAGE_RUNNERS[0].exec): string {
  return `${exec} ${CLI_PACKAGE} ${args}`;
}
