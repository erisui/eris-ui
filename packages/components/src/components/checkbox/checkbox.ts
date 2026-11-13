import * as checkbox from "@zag-js/checkbox";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, type Cleanup } from "@/lib/eris/mount";

export type CheckedState = boolean | "indeterminate";

const setters = new WeakMap<HTMLElement, (state: CheckedState) => void>();
const pending = new WeakMap<HTMLElement, CheckedState>();

/**
 * Set a checkbox from your own script. This is the only way to reach the mixed state
 * after load. `root` is the checkbox's <label data-eris="checkbox">. Safe to call before
 * the checkbox has mounted: the state is applied when it does. Like setting
 * `input.checked`, it fires no change event.
 */
export function setChecked(root: HTMLElement, state: CheckedState) {
  const set = setters.get(root);
  if (set) set(state);
  else pending.set(root, state);
}

/** Start a Zag checkbox machine for one [data-eris="checkbox"] root. Returns its cleanup. */
export function createCheckbox(root: HTMLElement): Cleanup {
  const data = root.dataset;
  const input = part<HTMLInputElement>(root, "hidden-input");
  const control = part(root, "control");
  const label = part(root, "label");
  // The name comes from the label text when there is some, else from the input's aria-label.
  const ariaLabel = input?.getAttribute("aria-label");

  // The input is real and server-rendered, so its state is the starting point. A browser
  // that restored the form after a reload has already set `checked` to the restored value.
  const machine = new VanillaMachine(checkbox.machine, {
    id: data.erisId!,
    // "indeterminate" is the mixed state. A click from it checks the box.
    defaultChecked: data.defaultIndeterminate !== undefined ? "indeterminate" : (input?.checked ?? false),
    disabled: input?.disabled ?? false,
    required: input?.required ?? false,
    readOnly: data.readOnly === "true",
    invalid: data.invalidField === "true",
    name: input?.name || undefined,
    form: input?.getAttribute("form") || undefined,
    value: input?.value ?? "on",
  });

  const render = () => {
    const api = checkbox.connect(machine.service, normalizeProps);
    spreadProps(root, api.getRootProps());
    if (input) {
      const { style: _style, ...props } = api.getHiddenInputProps();
      spreadProps(input, props);
      // Zag points the input at the label part. Without one, keep the aria-label instead.
      if (!label) input.removeAttribute("aria-labelledby");
      if (ariaLabel) input.setAttribute("aria-label", ariaLabel);
    }
    if (control) spreadProps(control, api.getControlProps());
    if (label) spreadProps(label, api.getLabelProps());
  };

  // Render once before start so every part has the id Zag looks it up by.
  render();
  const unsubscribe = machine.subscribe(render);
  machine.start();
  root.dataset.ready = "";

  // Sent as trusted so Zag does not fire a change event, the same as setting
  // input.checked by hand. Page code can then tell its own updates from the user's.
  const set = (state: CheckedState) =>
    machine.service.send({ type: "CHECKED.SET", checked: state, isTrusted: true });
  setters.set(root, set);
  const early = pending.get(root);
  if (early !== undefined) set(early);
  pending.delete(root);

  return () => {
    setters.delete(root);
    unsubscribe();
    machine.stop();
    delete root.dataset.ready;
  };
}
