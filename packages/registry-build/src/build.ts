/**
 * Build the free registry.
 *
 * Reads packages/components/src/registry.ts and writes, into apps/docs/public/r:
 *   <name>.json     one shadcn-shaped registry item per component, file contents inlined
 *   registry.json   the index of every item
 *
 * Fails if a listed file is missing, or if a file imports an npm package or another
 * Eris item that its metadata does not declare.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "../../components/src/registry.ts";
import type { RegistryMeta } from "../../components/src/lib/eris/meta.ts";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, "../../components/src");
const OUT = resolve(here, "../../../apps/docs/public/r");
const SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";

export interface RegistryFile {
  path: string;
  type: "registry:ui" | "registry:lib" | "registry:style";
  content: string;
}

export interface RegistryItem {
  $schema: string;
  name: string;
  type: RegistryMeta["type"];
  title: string;
  description: string;
  dependencies: string[];
  registryDependencies: string[];
  files: RegistryFile[];
  meta: { status: RegistryMeta["status"] };
}

function fileType(path: string): RegistryFile["type"] {
  if (path.startsWith("lib/")) return "registry:lib";
  if (path.endsWith(".css")) return "registry:style";
  return "registry:ui";
}

/** Bare npm specifiers a file imports (".astro" frontmatter and <script> included). */
function npmImports(content: string): string[] {
  const found = new Set<string>();
  for (const m of content.matchAll(
    /(?:import|export)[^"'`;]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g,
  )) {
    const spec = m[1] ?? m[2]!;
    if (spec.startsWith(".") || spec.startsWith("@/") || spec.startsWith("astro")) continue;
    found.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]!);
  }
  return [...found];
}

/** Other Eris items a file reaches through a relative import ("../button/variants"). */
function itemImports(content: string, ownDir: string): string[] {
  const found = new Set<string>();
  for (const m of content.matchAll(/from\s*["'](\.\.\/[^"']+)["']/g)) {
    const target = join(ownDir, m[1]!);
    const match = target.match(/^components\/([^/]+)\//);
    if (match) found.add(match[1]!);
  }
  return [...found];
}

async function buildItem(meta: RegistryMeta, all: Map<string, RegistryMeta>): Promise<RegistryItem> {
  const files: RegistryFile[] = [];
  const problems: string[] = [];
  const declaredDeps = new Set(meta.dependencies ?? []);
  const declaredItems = new Set(meta.registryDependencies ?? []);

  for (const path of meta.files) {
    let content: string;
    try {
      content = await readFile(join(SRC, path), "utf8");
    } catch {
      problems.push(`missing file ${path}`);
      continue;
    }
    files.push({ path, type: fileType(path), content });

    const imports = path.endsWith(".css") ? [] : npmImports(content);
    for (const dep of imports) {
      if (!declaredDeps.has(dep)) problems.push(`${path} imports "${dep}" but dependencies does not list it`);
    }
    for (const item of itemImports(content, dirname(path))) {
      if (item !== meta.name && !declaredItems.has(item)) {
        problems.push(`${path} imports from "${item}" but registryDependencies does not list it`);
      }
    }
    if (content.includes("@/lib/eris") && meta.name !== "eris-core" && !declaredItems.has("eris-core")) {
      problems.push(`${path} uses @/lib/eris but registryDependencies does not list eris-core`);
    }
  }
  for (const dep of declaredItems) {
    if (!all.has(dep)) problems.push(`registryDependencies lists unknown item "${dep}"`);
  }
  if (problems.length) throw new Error(`${meta.name}:\n  ${problems.join("\n  ")}`);

  return {
    $schema: SCHEMA,
    name: meta.name,
    type: meta.type,
    title: meta.title,
    description: meta.description,
    dependencies: meta.dependencies ?? [],
    registryDependencies: meta.registryDependencies ?? [],
    files,
    meta: { status: meta.status },
  };
}

async function main() {
  const all = new Map(registry.map((m) => [m.name, m]));
  if (all.size !== registry.length) throw new Error("Two registry items share a name");

  const items = await Promise.all(registry.map((m) => buildItem(m, all)));

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const item of items) {
    await writeFile(join(OUT, `${item.name}.json`), JSON.stringify(item, null, 2) + "\n");
  }
  const index = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "eris-ui",
    homepage: "https://erisui.dev",
    items: items.map(({ content: _c, ...rest }: any) => ({
      ...rest,
      files: rest.files.map((f: RegistryFile) => ({ path: f.path, type: f.type })),
    })),
  };
  await writeFile(join(OUT, "registry.json"), JSON.stringify(index, null, 2) + "\n");
  console.log(`registry: ${items.length} items → ${OUT}`);
}

main().catch((err) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
