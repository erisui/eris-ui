#!/usr/bin/env node
/**
 * Keeps the two themes honest, from the source alone:
 *
 *  1. every colour token in :root has a light value, unless it is listed as shared;
 *  2. the light block sets no token that :root does not define;
 *  3. no component hard-codes a colour (a hex, rgb(), or Tailwind's white/black), so every
 *     colour goes through a token and follows the theme;
 *  4. every --eris-* token a component uses is defined in the theme.
 *
 *   pnpm check:theme
 *
 * How it looks is checked by apps/playground/tests/theme.spec.ts.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "packages/components/src");
const theme = readFileSync(join(src, "styles/theme.css"), "utf8");

// The same in both themes on purpose: the accent gradient and the focus ring.
const SHARED = new Set([
  "--eris-accent-top",
  "--eris-accent-bottom",
  "--eris-accent-highlight",
  "--eris-accent-border",
  "--eris-ring",
]);
// Hard-coded on purpose. Keep this list short; a new entry needs a reason.
const ALLOWED_LITERALS = [];

const block = (selector) => {
  const start = theme.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`theme.css has no ${selector} block`);
  return theme.slice(start, theme.indexOf("\n}", start));
};
const tokens = (css) =>
  new Map([...css.matchAll(/(--eris-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const isColour = (value) => /^(#|rgb|hsl|oklch)/.test(value);

const dark = tokens(block(":root"));
const light = tokens(block('[data-theme="light"]'));
const problems = [];

for (const [name, value] of dark) {
  if (isColour(value) && !light.has(name) && !SHARED.has(name)) {
    problems.push(`${name} has no light value (add one, or list it in SHARED)`);
  }
}
for (const name of light.keys()) {
  if (!dark.has(name)) problems.push(`${name} is set for light but not defined in :root`);
  if (SHARED.has(name)) problems.push(`${name} is listed as shared but has a light value`);
}

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : /\.(astro|ts)$/.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );
const literal =
  /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|(?<![\w-])(?:bg|text|border|outline|ring|fill|stroke|shadow|from|via|to|decoration|caret|accent|divide)-(?:white|black)\b/g;

for (const file of files(join(src, "components"))) {
  const name = relative(src, file);
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const [match] of line.matchAll(literal)) {
        if (!ALLOWED_LITERALS.includes(`${name}: ${match}`)) {
          problems.push(`${name}:${i + 1} hard-codes "${match}" (use a theme token)`);
        }
      }
      for (const [, token] of line.matchAll(/(--eris-[\w-]+)(?![\w-]|\s*:)/g)) {
        if (!dark.has(token))
          problems.push(`${name}:${i + 1} uses ${token}, which theme.css does not define`);
      }
    });
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log(
  `theme: ${dark.size} tokens, ${light.size} with a light value, no hard-coded colours in components`,
);
