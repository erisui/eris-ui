import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createTwoFilesPatch } from "diff";
import { readConfig } from "./config.ts";
import { rewrite, targetPath } from "./files.ts";
import { log } from "./log.ts";
import { fetchItem } from "./registry.ts";

/** Show how local copies differ from the registry. Returns the number of changed files. */
export async function diff(cwd: string, names: string[]) {
  const config = await readConfig(cwd);
  if (!config) throw new Error("No eris.json here. Run `eris-ui init` first.");
  if (!names.length) throw new Error("Name a component, for example `eris-ui diff dialog`.");

  let changed = 0;
  for (const name of names) {
    const item = await fetchItem(config.registry, name, cwd);
    for (const file of item.files) {
      const rel = targetPath(file, config);
      const dest = join(cwd, rel);
      const upstream = rewrite(file.content, config);
      if (!existsSync(dest)) {
        log.warn(`${rel} is missing locally`);
        changed++;
        continue;
      }
      const local = await readFile(dest, "utf8");
      if (local === upstream) continue;
      changed++;
      process.stdout.write(createTwoFilesPatch(`${rel} (yours)`, `${rel} (registry)`, local, upstream));
    }
  }
  if (!changed) log.step(`${names.join(", ")}: up to date`);
  return changed;
}
