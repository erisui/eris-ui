import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

export interface RegistryFile {
  path: string;
  type: string;
  content: string;
}

export interface RegistryItem {
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies: string[];
  registryDependencies: string[];
  files: RegistryFile[];
}

export class RegistryError extends Error {}

const isUrl = (s: string) => /^https?:\/\//.test(s);

export async function fetchItem(registry: string, name: string, cwd: string): Promise<RegistryItem> {
  if (!/^[a-z0-9-]+$/.test(name)) throw new RegistryError(`"${name}" is not a valid component name.`);

  if (!isUrl(registry)) {
    const dir = isAbsolute(registry) ? registry : resolve(cwd, registry);
    try {
      return JSON.parse(await readFile(join(dir, `${name}.json`), "utf8")) as RegistryItem;
    } catch {
      throw new RegistryError(`No component named "${name}" in ${dir}.`);
    }
  }

  const url = `${registry.replace(/\/$/, "")}/${name}.json`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new RegistryError(`Could not reach ${url}. Check your connection.`);
  }
  if (res.status === 404) throw new RegistryError(`No component named "${name}".`);
  if (!res.ok) {
    // The registry server can explain itself, for example an expired license.
    const body = await res.text().catch(() => "");
    let message = body;
    try {
      message = (JSON.parse(body) as { message?: string }).message ?? body;
    } catch {}
    throw new RegistryError(`${res.status} from ${url}${message ? `: ${message}` : ""}`);
  }
  return (await res.json()) as RegistryItem;
}

/** Fetch the named items and everything they depend on, dependencies first. */
export async function resolveItems(registry: string, names: string[], cwd: string): Promise<RegistryItem[]> {
  const order: RegistryItem[] = [];
  const seen = new Map<string, Promise<RegistryItem>>();
  const visiting = new Set<string>();

  const visit = async (name: string): Promise<void> => {
    if (order.some((i) => i.name === name)) return;
    if (visiting.has(name)) throw new RegistryError(`Circular dependency through "${name}".`);
    visiting.add(name);
    if (!seen.has(name)) seen.set(name, fetchItem(registry, name, cwd));
    const item = await seen.get(name)!;
    for (const dep of item.registryDependencies) await visit(dep);
    visiting.delete(name);
    if (!order.some((i) => i.name === name)) order.push(item);
  };

  for (const name of names) await visit(name);
  return order;
}
