import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const CONFIG_FILE = "eris.json";
export const DEFAULT_REGISTRY = "https://erisui.dev/r";

export interface ErisConfig {
  $schema?: string;
  /** Where components come from: a URL, or a local folder of registry JSON for development. */
  registry: string;
  /** The global CSS file that imports Tailwind. The theme is imported next to it. */
  css: string;
  aliases: { lib: string; components: string };
  paths: { lib: string; components: string };
}

export function defaultConfig(overrides: Partial<Pick<ErisConfig, "registry" | "css">> = {}): ErisConfig {
  return {
    $schema: "https://erisui.dev/schema/eris.json",
    registry: overrides.registry ?? DEFAULT_REGISTRY,
    css: overrides.css ?? "src/styles/global.css",
    aliases: { lib: "@/lib/eris", components: "@/components/ui" },
    paths: { lib: "src/lib/eris", components: "src/components/ui" },
  };
}

export async function readConfig(cwd: string): Promise<ErisConfig | null> {
  const file = join(cwd, CONFIG_FILE);
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, "utf8")) as ErisConfig;
}

export async function writeConfig(cwd: string, config: ErisConfig) {
  await writeFile(join(cwd, CONFIG_FILE), JSON.stringify(config, null, 2) + "\n");
}
