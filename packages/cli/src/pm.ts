import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "bun.lock")) || existsSync(join(cwd, "bun.lockb"))) return "bun";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(join(cwd, "package-lock.json"))) return "npm";
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("bun")) return "bun";
  if (agent.startsWith("yarn")) return "yarn";
  return "npm";
}

export async function readPackageJson(cwd: string): Promise<Record<string, any> | null> {
  const file = join(cwd, "package.json");
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, "utf8"));
}

export function installedDeps(pkg: Record<string, any>): Set<string> {
  return new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
}

/**
 * The environment for commands the CLI runs in the user's project. `yarn dlx` starts the CLI
 * with NODE_OPTIONS pointing at its own throwaway Plug'n'Play loader. Passed on, that loader
 * breaks the project's package manager (Yarn 1 fails with "Cannot find module 'pnpapi'"),
 * so drop it and keep any other options.
 */
export function childEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const options = env.NODE_OPTIONS;
  if (!options || !/\.pnp\.(c?js|loader\.mjs)/.test(options)) return env;
  const isPnp = (value: string) => /\.pnp\.(c?js|loader\.mjs)/.test(value);
  const tokens = options.split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const flag = token.match(/^(--require|-r|--loader|--experimental-loader|--import)(=.*)?$/);
    if (!flag) kept.push(token);
    else if (flag[2]) {
      if (!isPnp(flag[2])) kept.push(token);
    } else {
      const value = tokens[++i] ?? "";
      if (!isPnp(value)) kept.push(token, value);
    }
  }
  const next = { ...env };
  if (kept.length) next.NODE_OPTIONS = kept.join(" ");
  else delete next.NODE_OPTIONS;
  return next;
}

export function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: childEnv(),
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited with ${code}`)),
    );
  });
}

export function addArgs(pm: PackageManager, deps: string[]): [string, string[]] {
  return pm === "npm" ? ["npm", ["install", ...deps]] : [pm, ["add", ...deps]];
}

/** `astro add tailwind`, run through the project's package manager. */
export function astroAddArgs(pm: PackageManager): [string, string[]] {
  if (pm === "npm") return ["npx", ["astro", "add", "tailwind", "--yes"]];
  if (pm === "bun") return ["bunx", ["astro", "add", "tailwind", "--yes"]];
  return [pm, ["astro", "add", "tailwind", "--yes"]];
}
