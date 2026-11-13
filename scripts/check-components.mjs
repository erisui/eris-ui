#!/usr/bin/env node
/**
 * Fails when a component is only half added. For every folder in
 * packages/components/src/components it checks the source files, the registry entry,
 * the playground page and spec, and the docs page, nav entry and demo.
 *
 *   pnpm check:components
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => (existsSync(join(root, path)) ? readFileSync(join(root, path), "utf8") : null);
const src = "packages/components/src";

// Components that predate their own playground page or spec. Do not add to these lists:
// give a new component its own page and spec instead.
const SHARES_PLAYGROUND_PAGE = { button: "index", dialog: "index" };
const TESTED_IN_OTHER_SPECS = { button: ["dialog.spec.ts", "focus.spec.ts"] };

const registry = read(`${src}/registry.ts`);
const nav = read("apps/www/src/nav.ts");
const layout = read("apps/playground/src/layouts/Base.astro");
const deps = JSON.parse(read("packages/components/package.json")).dependencies;

const problems = [];
const names = readdirSync(join(root, src, "components"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

for (const name of names) {
  const fail = (message) => problems.push(`${name}: ${message}`);
  const dir = `${src}/components/${name}`;

  const meta = read(`${dir}/meta.ts`);
  if (!meta) {
    fail("has no meta.ts");
    continue;
  }
  if (!meta.includes(`name: "${name}"`)) fail(`meta.ts name is not "${name}"`);
  const listed = [...(meta.match(/files: \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const onDisk = readdirSync(join(root, dir))
    .filter((f) => f !== "meta.ts")
    .map((f) => `components/${name}/${f}`);
  for (const file of listed)
    if (!existsSync(join(root, src, file))) fail(`meta.ts lists ${file}, which does not exist`);
  for (const file of onDisk)
    if (!listed.includes(file)) fail(`${file} is not listed in meta.ts, so the CLI will not install it`);

  for (const dep of [...(meta.match(/\bdependencies: \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)]) {
    if (!deps[dep[1]]) fail(`meta.ts needs ${dep[1]}, missing from packages/components/package.json`);
  }
  for (const file of onDisk) {
    for (const used of (read(`${src}/${file}`) ?? "").matchAll(/from "(@zag-js\/[\w-]+)"/g)) {
      if (!meta.includes(`"${used[1]}"`))
        fail(`${file} imports ${used[1]}, missing from meta.ts dependencies`);
    }
  }

  if (!registry.includes(`"./components/${name}/meta"`)) fail("is not imported in registry.ts");

  // Playground
  const pageName = SHARES_PLAYGROUND_PAGE[name] ?? name;
  const page = read(`apps/playground/src/pages/${pageName}.astro`);
  if (!page) fail(`has no playground page (apps/playground/src/pages/${pageName}.astro)`);
  else if (!page.includes(`/${name}/`)) fail(`playground page ${pageName}.astro does not use it`);
  if (!SHARES_PLAYGROUND_PAGE[name] && !layout.includes(`href="/${name}"`))
    fail("has no link in the playground nav");

  const specNames = TESTED_IN_OTHER_SPECS[name] ?? [`${name}.spec.ts`];
  const specs = specNames.map((s) => read(`apps/playground/tests/${s}`));
  if (specs.includes(null)) fail(`has no spec (apps/playground/tests/${specNames.join(", ")})`);
  else {
    const spec = specs.join("\n");
    if (/TODO|test\.fixme/.test(spec) && !TESTED_IN_OTHER_SPECS[name])
      fail("spec still has TODO or test.fixme");
    if (!/AxeBuilder|expectNoSeriousViolations/.test(spec)) fail("spec has no axe test");
    const hasMachine = existsSync(join(root, dir, `${name}.ts`));
    if (hasMachine && !/Second page|leaveAndReturn/.test(spec)) fail("spec has no view-transition test");
  }

  // Docs
  const doc = read(`apps/www/src/content/docs/components/${name}.mdx`);
  if (!doc) fail("has no docs page");
  else {
    if (!doc.includes(`<Install name="${name}"`)) fail(`docs page has no <Install name="${name}" />`);
    if (doc.includes("TODO")) fail("docs page still has TODO");
    if (!doc.includes("## Parts") && !doc.includes("## Props")) fail("docs page has no Parts or Props table");
  }
  if (!nav.includes(`"/docs/components/${name}"`)) fail("is not in the docs nav (apps/www/src/nav.ts)");
  const demos = `apps/www/src/demos/${name}`;
  if (!existsSync(join(root, demos)) || !readdirSync(join(root, demos)).some((f) => f.endsWith(".astro"))) {
    fail("has no demo");
  }

  for (const file of onDisk)
    if ((read(`${src}/${file}`) ?? "").includes("TODO")) fail(`${file} still has TODO`);
  if (meta.includes("TODO")) fail("meta.ts still has TODO");
}

if (problems.length) {
  console.error(
    `${problems.length} problem${problems.length === 1 ? "" : "s"}:\n` +
      problems.map((p) => `  ${p}`).join("\n"),
  );
  process.exit(1);
}
console.log(`${names.length} components complete: ${names.join(", ")}`);
