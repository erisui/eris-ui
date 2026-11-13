/**
 * Astro lifecycle for Eris components.
 *
 * A component's <script> calls mountAll("dialog", createDialog). Every element with
 * data-eris="dialog" gets one machine. Machines are stopped before a view transition
 * swaps the page, then new ones start on the next page, so nothing leaks.
 */
export type Cleanup = () => void;
export type Factory = (root: HTMLElement) => Cleanup;

const factories = new Map<string, Factory>();
const mounted = new Map<HTMLElement, Cleanup>();
let listening = false;

function mountName(name: string, factory: Factory) {
  document.querySelectorAll<HTMLElement>(`[data-eris="${name}"]`).forEach((root) => {
    if (mounted.has(root)) return;
    mounted.set(root, factory(root));
  });
}

function mountEverything() {
  factories.forEach((factory, name) => mountName(name, factory));
}

function cleanupEverything() {
  mounted.forEach((cleanup) => cleanup());
  mounted.clear();
}

export function mountAll(name: string, factory: Factory) {
  factories.set(name, factory);
  if (!listening) {
    listening = true;
    // Fires on first load and after each view transition when <ClientRouter /> is used.
    document.addEventListener("astro:page-load", mountEverything);
    document.addEventListener("astro:before-swap", cleanupEverything);
  }
  // Pages without view transitions never fire astro:page-load, so mount now too.
  mountName(name, factory);
}

/**
 * Roots that own parts. A wrapper such as Tooltip marks itself data-eris-wrapper: it sits
 * around another component's trigger and must not take that trigger away from its owner.
 */
const OWNER = "[data-eris]:not([data-eris-wrapper])";

/**
 * A part belongs to its nearest Eris root of any kind. A Dialog inside a Tabs panel
 * has its own "trigger" and "content" parts, and Tabs must not claim them.
 */
const ownedBy = (el: HTMLElement, root: HTMLElement) => el.parentElement?.closest(OWNER) === root;

/** Find a part that belongs to this root, not to a component nested inside it. */
export function part<T extends HTMLElement = HTMLElement>(root: HTMLElement, name: string): T | null {
  for (const el of root.querySelectorAll<T>(`[data-part="${name}"]`)) {
    if (ownedBy(el, root)) return el;
  }
  return null;
}

/** Same as part(), for parts that can appear more than once (several triggers). */
export function parts<T extends HTMLElement = HTMLElement>(root: HTMLElement, name: string): T[] {
  return [...root.querySelectorAll<T>(`[data-part="${name}"]`)].filter((el) => ownedBy(el, root));
}
