#!/usr/bin/env node
/**
 * Keeps the two themes honest, from the source alone:
 *
 *  1. every colour token in :root has a light value, unless it is listed as shared;
 *  2. the light block sets no token that :root does not define;
 *  3. no component hard-codes a colour (a hex, rgb(), or Tailwind's white/black), so every
 *     colour goes through a token and follows the theme;
 *  4. every --eris-* token a component uses is defined in the theme;
 *  5. the accent button's text reaches 4.5:1 on every point of its gradient, at rest and on hover;
 *  6. no component transitions outline-color, so the focus ring appears at once instead of
 *     fading in from the text colour (transition, transition-colors and transition-all all do);
 *  7. motion respects prefers-reduced-motion: a component line that moves something (a transform
 *     transition, the tabs indicator) carries a motion-reduce: variant, and every theme keyframe
 *     that moves has a still version under @media (prefers-reduced-motion: reduce).
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

// 5. Accent text contrast (WCAG 2 AA for normal text). The gradient is sampled the way CSS
//    draws it between two hex stops (in sRGB). Hover may point a stop at another accent token
//    (hover:[--eris-accent-top:var(--eris-accent-bottom)]) or apply brightness(), which scales
//    each channel of the whole button, the text as well as the gradient.
const AA = 4.5;
const rgb = (value) => {
  const hex = value.replace("#", "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
};
const luminance = (c) => {
  const [r, g, b] = c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const ruleBody = (css, selector) => {
  const start = css.indexOf(`${selector} {`);
  return start < 0 ? "" : css.slice(start, css.indexOf("}", start));
};
const accentText = ruleBody(theme, ".eris-accent")
  .match(/[^-]color:\s*([^;]+);/)?.[1]
  .trim();
const accentVariant =
  readFileSync(join(src, "components/button/variants.ts"), "utf8").match(/accent:\s*"([^"]+)"/)?.[1] ?? "";
const stops = { top: "--eris-accent-top", bottom: "--eris-accent-bottom" };
const hover = { ...stops };
for (const [, stop, token] of accentVariant.matchAll(
  /hover:\[--eris-accent-(top|bottom):var\((--eris-[\w-]+)\)\]/g,
)) {
  hover[stop] = token;
}
const hoverBrightness = Number(accentVariant.match(/hover:brightness-(\d+)/)?.[1] ?? 100) / 100;
const states = [
  ["at rest", stops, 1],
  ["on hover", hover, hoverBrightness],
];
if (!accentText) problems.push(".eris-accent sets no text colour");
else {
  for (const [state, { top: topToken, bottom: bottomToken }, brightness] of states) {
    const [top, bottom] = [dark.get(topToken), dark.get(bottomToken)].map(rgb);
    const lit = (c) => c.map((v) => Math.min(1, v * brightness));
    let worst = Infinity;
    for (let i = 0; i <= 20; i++) {
      const stop = top.map((v, j) => v + (bottom[j] - v) * (i / 20));
      worst = Math.min(worst, contrast(lit(rgb(accentText)), lit(stop)));
    }
    if (worst < AA) {
      problems.push(`accent button text is ${worst.toFixed(2)}:1 on its gradient ${state}, under ${AA}:1`);
    }
  }
}

// 6 and 7 read every component line.
const transitionsOutline =
  /(?<![\w-])transition(?:-colors|-all)?(?![\w[-])|(?<![\w-])transition-\[[^\]]*outline[^\]]*\]/g;
const moves =
  /(?<![\w-])transition-transform\b|(?<![\w-])transition-\[[^\]]*\b(?:transform|translate|scale|rotate)\b[^\]]*\]|--transition-duration|(?<![\w-])animate-(?:spin|bounce|ping)\b/;
for (const file of files(join(src, "components"))) {
  const name = relative(src, file);
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const [match] of line.matchAll(transitionsOutline)) {
        problems.push(
          `${name}:${i + 1} "${match}" transitions outline-color, so the focus ring fades in (list the properties, e.g. transition-[color,background-color,border-color])`,
        );
      }
      if (moves.test(line) && !line.includes("motion-reduce:")) {
        problems.push(
          `${name}:${i + 1} moves something with no motion-reduce: variant (prefers-reduced-motion)`,
        );
      }
    });
}

// 7, theme side: keyframes that move need a still version for reduced motion.
const blockAt = (css, open) => {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open, i + 1);
  }
  return "";
};
const keyframes = (css) =>
  new Map(
    [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)].map((m) => [
      m[1],
      blockAt(css, m.index + m[0].length - 1),
    ]),
  );
const reduceAt = theme.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/);
const reduced = reduceAt < 0 ? "" : blockAt(theme, theme.indexOf("{", reduceAt));
const still = keyframes(reduced);
const movement = /transform|translate|scale|rotate/;
for (const [name, body] of keyframes(theme.replace(reduced, ""))) {
  if (!movement.test(body)) continue;
  if (!still.has(name)) {
    problems.push(`@keyframes ${name} moves but has no version under prefers-reduced-motion: reduce`);
  } else if (movement.test(still.get(name))) {
    problems.push(`@keyframes ${name} still moves under prefers-reduced-motion: reduce`);
  }
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log(
  `theme: ${dark.size} tokens, ${light.size} with a light value, no hard-coded colours in components, ` +
    `accent text at ${AA}:1 or more, no outline transitions, reduced motion respected`,
);
