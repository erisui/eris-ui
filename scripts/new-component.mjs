#!/usr/bin/env node
/**
 * Scaffold a component: its source files, playground page, spec, docs page and demo,
 * plus the four places a component is registered.
 *
 *   pnpm new:component accordion --parts Item,Trigger,Content
 *   pnpm new:component badge --no-zag
 *
 * Safe to rerun: existing files are left alone and registrations are added only once.
 * It writes the skeleton. The Zag wiring, classes, real tests and docs prose are still
 * yours to write; every spot that needs you is marked TODO.
 *
 * Options:
 *   --parts A,B     Part components besides the root, in PascalCase (AccordionItem → Item)
 *   --zag <pkg>     Zag machine package without the @zag-js/ prefix. Defaults to the name
 *   --no-zag        Static component with no script
 *   --root <dir>    Write into another checkout (used to test this script)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return args.splice(i, 2)[1];
};
const noZag = args.includes("--no-zag");
if (noZag) args.splice(args.indexOf("--no-zag"), 1);
const root = resolve(flag("root") ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
const partNames = (flag("parts") ?? "").split(",").filter(Boolean);
const zagFlag = flag("zag");
const name = args[0];

if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || partNames.some((p) => !/^[A-Z][A-Za-z0-9]*$/.test(p))) {
  console.error("Usage: pnpm new:component <kebab-name> [--parts Item,Trigger] [--zag <pkg> | --no-zag]");
  process.exit(1);
}

const zag = noZag ? null : (zagFlag ?? name);
const pascal = name.replace(/(^|-)(\w)/g, (_, _dash, c) => c.toUpperCase());
const camel = pascal[0].toLowerCase() + pascal.slice(1);
const kebab = (s) => s.replace(/[A-Z]/g, (c, i) => (i ? "-" : "") + c.toLowerCase());
const partFiles = partNames.map((p) => `${pascal}${p}`);
const componentFiles = [pascal, ...partFiles].map((f) => `${f}.astro`).concat(zag ? [`${name}.ts`] : []);

const log = [];
function write(path, content) {
  const full = join(root, path);
  if (existsSync(full)) return log.push(`  exists   ${path}`);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
  log.push(`  created  ${path}`);
}
/** Change a file through `fn`, which returns the new text, or null when there is nothing to do. */
function edit(path, fn) {
  const full = join(root, path);
  const before = readFileSync(full, "utf8");
  const after = fn(before);
  if (after === null || after === before) return log.push(`  current  ${path}`);
  writeFileSync(full, after);
  log.push(`  updated  ${path}`);
}
function must(text, pattern, path) {
  if (!pattern.test(text)) throw new Error(`${path}: could not find ${pattern}. Has the file changed shape?`);
}

// ── Component source ────────────────────────────────────────────────────────────────
const dir = `packages/components/src/components/${name}`;

write(
  `${dir}/meta.ts`,
  `import type { RegistryMeta } from "@/lib/eris/meta";

export default {
  name: "${name}",
  type: "registry:ui",
  title: "${pascal}",
  description: "TODO: one sentence on what it does and which keys it handles.",
${zag ? `  dependencies: ["@zag-js/${zag}", "@zag-js/vanilla"],\n` : ""}  registryDependencies: ["eris-core"],
  files: [
${componentFiles.map((f) => `    "components/${name}/${f}",`).join("\n")}
  ],
  status: "beta",
} satisfies RegistryMeta;
`,
);

write(
  `${dir}/${pascal}.astro`,
  zag
    ? `---
import { cn, uid } from "@/lib/eris/utils";

interface Props {
  id?: string;
  class?: string;
}

const { id = uid("${name}"), class: className } = Astro.props;
---

<div data-eris="${name}" data-eris-id={id} class={cn("TODO", className)}>
  <slot />
</div>

<script>
  import { mountAll } from "@/lib/eris/mount";
  import { create${pascal} } from "./${name}";
  mountAll("${name}", create${pascal});
</script>
`
    : `---
import { cn } from "@/lib/eris/utils";

interface Props {
  class?: string;
}

const { class: className } = Astro.props;
---

<div class={cn("TODO", className)}>
  <slot />
</div>
`,
);

for (const part of partNames) {
  write(
    `${dir}/${pascal}${part}.astro`,
    `---
import { cn } from "@/lib/eris/utils";

interface Props {
  class?: string;
}

const { class: className } = Astro.props;
---

<div data-part="${kebab(part)}" class={cn("TODO", className)}>
  <slot />
</div>
`,
  );
}

if (zag) {
  const zagNs = zag.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  write(
    `${dir}/${name}.ts`,
    `import * as ${zagNs} from "@zag-js/${zag}";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, parts, type Cleanup } from "@/lib/eris/mount";

/** Start a Zag ${zag} machine for one [data-eris="${name}"] root. Returns its cleanup. */
export function create${pascal}(root: HTMLElement): Cleanup {
  const data = root.dataset;
  // TODO: find each part with part(root, "…") or parts(root, "…"). Read anything Zag
  // rewrites (disabled, data-state) once, here, before the first render.

  const machine = new VanillaMachine(${zagNs}.machine, {
    id: data.erisId!,
    // TODO: machine props, read from the root's data attributes.
  });

  const render = () => {
    const api = ${zagNs}.connect(machine.service, normalizeProps);
    spreadProps(root, api.getRootProps());
    // TODO: spread the props for every part.
  };

  // Render once before start so every part has the id Zag looks it up by.
  render();
  const unsubscribe = machine.subscribe(render);
  machine.start();
  root.dataset.ready = "";

  return () => {
    unsubscribe();
    machine.stop();
    delete root.dataset.ready;
  };
}
`,
  );
}

// ── Playground page and spec ────────────────────────────────────────────────────────
const imports = (base) =>
  [pascal, ...partFiles].map((f) => `import ${f} from "${base}/${name}/${f}.astro";`).join("\n");
const usage = (indent, attrs = "") => {
  const inner = partFiles.map((f) => `${indent}  <${f}>TODO</${f}>`).join("\n");
  return `${indent}<${pascal}${attrs}>\n${inner || `${indent}  TODO`}\n${indent}</${pascal}>`;
};

write(
  `apps/playground/src/pages/${name}.astro`,
  `---
import Base from "../layouts/Base.astro";
${imports("@eris/components")}
---

<Base title="${pascal}">
  <section class="flex flex-col gap-4">
    <h1 class="text-[28px] font-semibold tracking-[-0.025em]">${pascal}</h1>
    <p class="text-muted">TODO: what to try on this page.</p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-semibold tracking-[0.08em] text-muted uppercase">Basic</h2>
${usage("    ", zag ? ` id="basic"` : "")}
  </section>
</Base>
`,
);

write(
  `apps/playground/tests/${name}.spec.ts`,
  `import { expect, test } from "@playwright/test";
import { erisRoot, expectNoSeriousViolations${zag ? ", leaveAndReturn" : ""} } from "./helpers";

test.describe("${pascal}", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/${name}");
  });

  test.fixme("TODO: roles and names", async ({ page }) => {
    await expect(erisRoot(page, "basic")).toBeVisible();
  });

  // TODO: one test per row of the docs page's Keyboard table.
${
  zag
    ? `
  // TODO: a test with this component nested inside a Dialog or Tabs panel, and one inside it.

  test.fixme("still works after a view transition", async ({ page }) => {
    await leaveAndReturn(page, "${pascal}", "/${name}");
    // TODO: repeat one interaction from above.
  });
`
    : ""
}
  test("has no serious accessibility violations", async ({ page }) => {
    await expectNoSeriousViolations(page);
  });
});
`,
);

// ── Docs page and demo ──────────────────────────────────────────────────────────────
write(
  `apps/www/src/demos/${name}/Basic.astro`,
  `---
${imports("@/components/ui")}
---

${usage("")}
`,
);

write(
  `apps/www/src/content/docs/components/${name}.mdx`,
  `---
title: ${pascal}
description: TODO, one sentence.
status: beta
---

import Demo from "../../../components/Demo.astro";
import Install from "../../../components/Install.astro";
import Basic from "../../../demos/${name}/Basic.astro";
import basicSrc from "../../../demos/${name}/Basic.astro?raw";

<Demo id="${name}-basic" source={basicSrc}>
  <Basic />
</Demo>

## Installation

<Install name="${name}" />
${
  zag
    ? `
## Keyboard

| Key | Does |
| --- | ---- |
| TODO | TODO |
`
    : ""
}
## Parts

| Component | Renders |
| --------- | ------- |
${[pascal, ...partFiles].map((f) => `| \`${f}\` | TODO |`).join("\n")}
`,
);

// ── Registrations ───────────────────────────────────────────────────────────────────
edit("packages/components/src/registry.ts", (text) => {
  const path = "registry.ts";
  if (text.includes(`"./components/${name}/meta"`)) return null;
  const lastImport = /(import \w+ from "\.\/components\/[\w-]+\/meta";\n)(?!import \w+ from "\.\/components)/;
  const list = /(export const registry: RegistryMeta\[\] = \[[^\]]*?)(\];)/;
  must(text, lastImport, path);
  must(text, list, path);
  return text
    .replace(lastImport, `$1import ${camel} from "./components/${name}/meta";\n`)
    .replace(list, `$1, ${camel}$2`);
});

edit("apps/www/src/nav.ts", (text) => {
  const href = `/docs/components/${name}`;
  if (text.includes(`"${href}"`)) return null;
  const item = /^ *\{ href: "\/docs\/components\/[\w-]+", label: "([^"]+)" \},\n/gm;
  const items = [...text.matchAll(item)];
  if (!items.length) throw new Error("nav.ts: found no component entries. Has the file changed shape?");
  const line = `      { href: "${href}", label: "${pascal}" },\n`;
  // Keep the list in alphabetical order.
  const next = items.find((m) => m[1].localeCompare(pascal) > 0);
  const last = items[items.length - 1];
  const at = next ? next.index : last.index + last[0].length;
  return text.slice(0, at) + line + text.slice(at);
});

edit("apps/playground/src/layouts/Base.astro", (text) => {
  if (text.includes(`href="/${name}"`)) return null;
  const second = /( *)<a href="\/second"/;
  must(text, second, "Base.astro");
  return text.replace(
    second,
    (m, indent) =>
      `${indent}<a href="/${name}" class="hover:text-foreground">\n${indent}  ${pascal}\n${indent}</a>\n${m}`,
  );
});

if (zag) {
  edit("packages/components/package.json", (text) => {
    const pkg = JSON.parse(text);
    const dep = `@zag-js/${zag}`;
    if (pkg.dependencies[dep]) return null;
    pkg.dependencies[dep] = pkg.dependencies["@zag-js/vanilla"];
    pkg.dependencies = Object.fromEntries(
      Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)),
    );
    return JSON.stringify(pkg, null, 2) + "\n";
  });
}

console.log(`${pascal}\n${log.join("\n")}`);
console.log(
  `\nNext: pnpm install, then search for TODO in the files above. pnpm check:components shows what is left.`,
);
