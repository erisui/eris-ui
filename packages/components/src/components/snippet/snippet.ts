import * as clipboard from "@zag-js/clipboard";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, type Cleanup } from "@/lib/eris/mount";

/** Start a Zag clipboard machine for one [data-eris="snippet"] root. Returns its cleanup. */
export function createSnippet(root: HTMLElement): Cleanup {
  const trigger = part<HTMLButtonElement>(root, "trigger");
  const status = part(root, "status");
  if (!trigger) return () => {};

  const copyLabel = root.dataset.copyLabel ?? "Copy";
  const copiedLabel = root.dataset.copiedLabel ?? "Copied";

  const machine = new VanillaMachine(clipboard.machine, {
    id: root.dataset.erisId!,
    value: root.dataset.value ?? "",
    timeout: 2000,
    // The button shows only an icon, so this aria-label is its whole name.
    translations: { triggerLabel: (copied) => (copied ? copiedLabel : copyLabel) },
  });

  const render = () => {
    const api = clipboard.connect(machine.service, normalizeProps);
    spreadProps(trigger, api.getTriggerProps());
    // The icon changes without a focus move, so a live region says it too.
    if (status) status.textContent = api.copied ? copiedLabel : "";
  };

  // Render once before start so the trigger has the attributes Zag reads.
  render();
  const unsubscribe = machine.subscribe(render);
  machine.start();

  return () => {
    unsubscribe();
    machine.stop();
  };
}
