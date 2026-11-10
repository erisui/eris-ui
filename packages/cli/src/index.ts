#!/usr/bin/env node
import { parseArgs } from "node:util";
import { add } from "./add.ts";
import { diff } from "./diff.ts";
import { init } from "./init.ts";
import { log } from "./log.ts";

const HELP = `eris-ui: add Eris UI components to an Astro project

Usage
  eris-ui init                 Set up Tailwind v4, the theme, the @/ alias and eris.json
  eris-ui add <name...>        Copy components into src/components/ui
  eris-ui diff <name...>       Show how your copies differ from the registry

Options
  --registry <url|dir>         Registry to use (default https://erisui.dev/r)
  --overwrite                  add: replace files you have changed
  --skip-install               Do not run the package manager
  --cwd <dir>                  Project root (default: current folder)
  -h, --help                   Show this help
`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      registry: { type: "string" },
      css: { type: "string" },
      cwd: { type: "string" },
      overwrite: { type: "boolean" },
      "skip-install": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, ...names] = positionals;
  const cwd = values.cwd ?? process.cwd();
  const skipInstall = values["skip-install"];

  if (values.help || !command) {
    console.log(HELP);
    return;
  }
  if (command === "init") await init(cwd, { registry: values.registry, css: values.css, skipInstall });
  else if (command === "add")
    await add(cwd, names, { overwrite: values.overwrite, skipInstall, registry: values.registry });
  else if (command === "diff") process.exitCode = (await diff(cwd, names)) ? 1 : 0;
  else throw new Error(`Unknown command "${command}". Run eris-ui --help.`);
}

main().catch((err: unknown) => {
  log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
