import { dirname, join, posix } from "node:path";
import type { ErisConfig } from "./config.ts";
import type { RegistryFile } from "./registry.ts";

export const THEME_FILE = "eris-theme.css";

/** Where a registry file lands in the user's project, relative to the project root. */
export function targetPath(file: RegistryFile, config: ErisConfig): string {
  const p = file.path;
  if (p.startsWith("lib/eris/")) return posix.join(config.paths.lib, p.slice("lib/eris/".length));
  if (p.startsWith("components/")) return posix.join(config.paths.components, p.slice("components/".length));
  if (p === "styles/theme.css") return posix.join(posix.dirname(config.css), THEME_FILE);
  throw new Error(`Do not know where to put ${p}`);
}

/** Point the component's imports at the user's aliases. */
export function rewrite(content: string, config: ErisConfig): string {
  return content.replaceAll(/(["'])@\/lib\/eris(?=[/"'])/g, `$1${config.aliases.lib}`);
}

/** Add `@import "./eris-theme.css";` right after the Tailwind import. Returns null if already there. */
export function addThemeImport(css: string): string | null {
  if (css.includes(THEME_FILE)) return null;
  const line = `@import "./${THEME_FILE}";`;
  const tw = css.match(/^@import\s+["']tailwindcss["'];?.*$/m);
  if (!tw) return `@import "tailwindcss";\n${line}\n\n${css}`;
  const at = tw.index! + tw[0].length;
  return `${css.slice(0, at)}\n${line}${css.slice(at)}`;
}

export const abs = (cwd: string, rel: string) => join(cwd, rel);
export const parent = dirname;
