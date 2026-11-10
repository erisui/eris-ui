// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const components = fileURLToPath(new URL("../../packages/components/src", import.meta.url));

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // Same alias a user's project gets from `eris-ui init`.
      alias: { "@/lib/eris": `${components}/lib/eris`, "@eris": components },
    },
  },
});
