import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { readConfig, type ErisConfig } from "./config.ts";
import { rewrite, targetPath } from "./files.ts";
import { log } from "./log.ts";
import { addArgs, detectPackageManager, installedDeps, readPackageJson, run } from "./pm.ts";
import { resolveItems } from "./registry.ts";

export interface AddOptions {
  overwrite?: boolean;
  /** Skip the npm install step (tests, or when the caller installs later). */
  skipInstall?: boolean;
  /** Use this registry instead of the one in eris.json. */
  registry?: string;
}

export interface AddResult {
  written: string[];
  unchanged: string[];
  skipped: string[];
  installed: string[];
}

export async function installItems(cwd: string, config: ErisConfig, names: string[], opts: AddOptions = {}) {
  const items = await resolveItems(config.registry, names, cwd);
  const result: AddResult = { written: [], unchanged: [], skipped: [], installed: [] };

  for (const item of items) {
    for (const file of item.files) {
      const rel = targetPath(file, config);
      const dest = join(cwd, rel);
      const content = rewrite(file.content, config);
      if (existsSync(dest)) {
        const current = await readFile(dest, "utf8");
        if (current === content) {
          result.unchanged.push(rel);
          continue;
        }
        if (!opts.overwrite) {
          result.skipped.push(rel);
          continue;
        }
      }
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, content);
      result.written.push(rel);
    }
  }

  const pkg = await readPackageJson(cwd);
  const have = pkg ? installedDeps(pkg) : new Set<string>();
  const needed = [...new Set(items.flatMap((i) => i.dependencies))].filter((d) => !have.has(d));
  if (needed.length && !opts.skipInstall) {
    const [cmd, args] = addArgs(detectPackageManager(cwd), needed);
    log.step(`Installing ${needed.join(", ")}`);
    await run(cmd, args, cwd);
  }
  result.installed = needed;
  return { items, result };
}

export async function add(cwd: string, names: string[], opts: AddOptions = {}) {
  const config = await readConfig(cwd);
  if (!config) throw new Error("No eris.json here. Run `eris-ui init` first.");
  if (opts.registry) config.registry = opts.registry;
  if (!names.length) throw new Error("Name at least one component, for example `eris-ui add dialog`.");

  const { items, result } = await installItems(cwd, config, names, opts);
  const extra = items.map((i) => i.name).filter((n) => !names.includes(n));
  log.step(`Added ${names.join(", ")}${extra.length ? ` (with ${extra.join(", ")})` : ""}`);
  for (const f of result.written) log.info(`wrote ${f}`);
  if (result.skipped.length) {
    log.warn(`Kept ${result.skipped.length} file(s) you have changed. Run with --overwrite to replace them:`);
    for (const f of result.skipped) log.info(f);
  }
  return result;
}
