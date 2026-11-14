// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { CODE_THEMES, SITE } from "./src/const.ts";

const components = fileURLToPath(new URL("../../packages/components/src", import.meta.url));

export default defineConfig({
  site: SITE.url,
  // The sitemap lists every built page; the 404 page is not one to index.
  integrations: [mdx(), sitemap({ filter: (page) => !page.endsWith("/404/") })],
  markdown: {
    shikiConfig: { themes: CODE_THEMES, defaultColor: "dark" },
  },
  vite: {
    plugins: [tailwindcss()],
    // Scan the component sources up front so dev does not re-bundle mid-load.
    optimizeDeps: { entries: ["src/**/*.astro", `${components}/**/*.ts`] },
    resolve: {
      // Demos import components the way a user project does after `eris-ui add`.
      alias: {
        "@/lib/eris": `${components}/lib/eris`,
        "@/components/ui": `${components}/components`,
        "@eris/registry": `${components}/registry.ts`,
      },
    },
  },
});
