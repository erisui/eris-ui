// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const components = fileURLToPath(new URL("../../packages/components/src", import.meta.url));

export default defineConfig({
  site: "https://erisui.dev",
  integrations: [mdx()],
  markdown: {
    shikiConfig: { theme: "github-dark-default" },
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
