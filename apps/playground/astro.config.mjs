// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const components = fileURLToPath(new URL("../../packages/components/src", import.meta.url));

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    // The components live in another workspace package, so Vite's startup scan misses their
    // dependencies. Without this, the first page that uses one triggers a re-bundle, its
    // scripts 404/504 as "Outdated Optimize Dep", and the component never mounts.
    optimizeDeps: {
      entries: ["src/**/*.astro", `${components}/**/*.ts`],
    },
    resolve: {
      // Same alias a user's project gets from `eris-ui init`.
      alias: { "@/lib/eris": `${components}/lib/eris`, "@eris": components },
    },
  },
});
