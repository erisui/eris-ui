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

export function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
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
