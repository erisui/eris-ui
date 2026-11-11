import * as clipboard from "@zag-js/clipboard";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, type Cleanup } from "@/lib/eris/mount";

/** Start a Zag clipboard machine for one [data-eris="snippet"] root. Returns its cleanup. */
export function createSnippet(root: HTMLElement): Cleanup {
  const trigger = part<HTMLButtonElement>(root, "trigger");
  const label = part(root, "label");
  const status = part(root, "status");
  if (!trigger) return () => {};

  const copyLabel = root.dataset.copyLabel ?? "Copy";
  const copiedLabel = root.dataset.copiedLabel ?? "Copied";

  const machine = new VanillaMachine(clipboard.machine, {
    id: root.dataset.erisId!,
    value: root.dataset.value ?? "",
    timeout: 2000,
    // Zag's default aria-label ("Copy to clipboard") would not match the visible text.
    translations: { triggerLabel: (copied) => (copied ? copiedLabel : copyLabel) },
  });

  const render = () => {
    const api = clipboard.connect(machine.service, normalizeProps);
    spreadProps(trigger, api.getTriggerProps());
    if (label) label.textContent = api.copied ? copiedLabel : copyLabel;
    // The visible label changes without a focus move, so a live region says it too.
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
