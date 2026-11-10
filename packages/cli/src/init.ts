import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { defaultConfig, readConfig, writeConfig, CONFIG_FILE } from "./config.ts";
import { installItems } from "./add.ts";
import { addThemeImport, THEME_FILE } from "./files.ts";
import { log } from "./log.ts";
import { astroAddArgs, detectPackageManager, installedDeps, readPackageJson, run } from "./pm.ts";

export interface InitOptions {
  registry?: string;
  css?: string;
  skipInstall?: boolean;
}

/** Make `@/…` resolve to `src/…`. Astro reads these paths for its Vite alias too. */
async function ensureAlias(cwd: string): Promise<"added" | "present" | "manual"> {
  const file = join(cwd, "tsconfig.json");
  if (!existsSync(file)) {
    await writeFile(
      file,
      JSON.stringify(
        { extends: "astro/tsconfigs/strict", compilerOptions: { paths: { "@/*": ["./src/*"] } } },
        null,
        2,
      ) + "\n",
    );
    return "added";
  }
  let json: any;
  try {
    json = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return "manual"; // has comments or trailing commas; do not risk rewriting it
  }
  json.compilerOptions ??= {};
  json.compilerOptions.paths ??= {};
  if (json.compilerOptions.paths["@/*"]) return "present";
  json.compilerOptions.paths["@/*"] = ["./src/*"];
  await writeFile(file, JSON.stringify(json, null, 2) + "\n");
  return "added";
}

export async function init(cwd: string, opts: InitOptions = {}) {
  const pkg = await readPackageJson(cwd);
  if (!pkg) throw new Error("No package.json here. Run this in the root of an Astro project.");
  const deps = installedDeps(pkg);
  if (!deps.has("astro"))
    throw new Error("This does not look like an Astro project (no `astro` dependency).");

  const existing = await readConfig(cwd);
  const config = existing ?? defaultConfig({ registry: opts.registry, css: opts.css });
  if (existing && opts.registry) config.registry = opts.registry;
  const pm = detectPackageManager(cwd);

  // 1. Tailwind v4 through Astro's own installer.
  if (!deps.has("tailwindcss") || !deps.has("@tailwindcss/vite")) {
    if (opts.skipInstall) {
      log.warn("Skipping Tailwind setup (--skip-install). Run `astro add tailwind` yourself.");
    } else {
      log.step("Adding Tailwind CSS v4 with `astro add tailwind`");
      const [cmd, args] = astroAddArgs(pm);
      await run(cmd, args, cwd);
    }
  } else {
    log.step("Tailwind CSS already set up");
  }

  // 2. Global CSS with the theme imported after Tailwind.
  const cssFile = join(cwd, config.css);
  if (!existsSync(cssFile)) {
    await mkdir(dirname(cssFile), { recursive: true });
    await writeFile(cssFile, '@import "tailwindcss";\n');
    log.step(`Created ${config.css}`);
  }
  const css = await readFile(cssFile, "utf8");
  const withTheme = addThemeImport(css);
  if (withTheme !== null) {
    await writeFile(cssFile, withTheme);
    log.step(`Imported ${THEME_FILE} in ${config.css}`);
  }

  // 3. The @/ alias the components import from.
  const alias = await ensureAlias(cwd);
  if (alias === "added") log.step('Added the "@/*" path alias to tsconfig.json');
  if (alias === "manual")
    log.warn('Add `"paths": { "@/*": ["./src/*"] }` to compilerOptions in tsconfig.json.');

  // 4. Config, then eris-core (lifecycle, helpers, theme).
  await writeConfig(cwd, config);
  log.step(`${existing ? "Updated" : "Wrote"} ${CONFIG_FILE}`);
  await installItems(cwd, config, ["eris-core"], { skipInstall: opts.skipInstall });
  log.step("Added eris-core");

  console.log(
    `\nDone. Make sure a layout imports ${config.css}, then add components:\n\n  npx eris-ui add dialog tabs\n\n` +
      `The theme uses the Geist font. Load it in your layout, or change --eris-font-sans in ${THEME_FILE}.\n`,
  );
  return config;
}
