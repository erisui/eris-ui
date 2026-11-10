import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { defaultConfig } from "../src/config.ts";
import { addThemeImport, rewrite, targetPath } from "../src/files.ts";
import { resolveItems } from "../src/registry.ts";

const config = defaultConfig();
const REGISTRY = fileURLToPath(new URL("../../../apps/docs/public/r", import.meta.url));

test("maps registry paths into the project", () => {
  assert.equal(
    targetPath({ path: "lib/eris/mount.ts", type: "registry:lib", content: "" }, config),
    "src/lib/eris/mount.ts",
  );
  assert.equal(
    targetPath({ path: "components/dialog/Dialog.astro", type: "registry:ui", content: "" }, config),
    "src/components/ui/dialog/Dialog.astro",
  );
  assert.equal(
    targetPath({ path: "styles/theme.css", type: "registry:style", content: "" }, config),
    "src/styles/eris-theme.css",
  );
});

test("rewrites the lib alias and leaves other imports alone", () => {
  const custom = { ...config, aliases: { ...config.aliases, lib: "~/eris" } };
  const src = `import { cn } from "@/lib/eris/utils";\nimport x from "@/lib/erisx";\nimport y from "../button/variants";`;
  assert.equal(
    rewrite(src, custom),
    `import { cn } from "~/eris/utils";\nimport x from "@/lib/erisx";\nimport y from "../button/variants";`,
  );
});

test("imports the theme right after Tailwind, once", () => {
  const out = addThemeImport('@import "tailwindcss";\n\nbody { color: red; }\n')!;
  assert.equal(out, '@import "tailwindcss";\n@import "./eris-theme.css";\n\nbody { color: red; }\n');
  assert.equal(addThemeImport(out), null);
  assert.ok(addThemeImport("body {}\n")!.startsWith('@import "tailwindcss";\n@import "./eris-theme.css";'));
});

test("resolves dependencies first, each once", async () => {
  const items = await resolveItems(REGISTRY, ["dialog", "tabs"], process.cwd());
  assert.deepEqual(
    items.map((i) => i.name),
    ["eris-core", "button", "dialog", "tabs"],
  );
});

test("explains an unknown component", async () => {
  await assert.rejects(resolveItems(REGISTRY, ["nope"], process.cwd()), /No component named "nope"/);
});
