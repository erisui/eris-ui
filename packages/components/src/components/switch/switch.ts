import * as zagSwitch from "@zag-js/switch";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, type Cleanup } from "@/lib/eris/mount";

/** Start a Zag switch machine for one [data-eris="switch"] root. Returns its cleanup. */
export function createSwitch(root: HTMLElement): Cleanup {
  const data = root.dataset;
  const input = part<HTMLInputElement>(root, "hidden-input");
  const control = part(root, "control");
  const thumb = part(root, "thumb");
  const label = part(root, "label");
  // The name comes from the label text when there is some, else from the input's aria-label.
  const ariaLabel = input?.getAttribute("aria-label");

  // The input is real and server-rendered, so its state is the starting point. A browser
  // that restored the form after a reload has already set `checked` to the restored value.
  const machine = new VanillaMachine(zagSwitch.machine, {
    id: data.erisId!,
    defaultChecked: input?.checked ?? false,
    disabled: input?.disabled ?? false,
    required: input?.required ?? false,
    readOnly: data.readOnly === "true",
    invalid: data.invalidField === "true",
    name: input?.name || undefined,
    form: input?.getAttribute("form") || undefined,
    value: input?.value ?? "on",
  });

  const render = () => {
    const api = zagSwitch.connect(machine.service, normalizeProps);
    spreadProps(root, api.getRootProps());
    if (input) {
      const { style: _style, ...props } = api.getHiddenInputProps();
      spreadProps(input, props);
      // Zag points the input at the label part. Without one, keep the aria-label instead.
      if (!label) input.removeAttribute("aria-labelledby");
      if (ariaLabel) input.setAttribute("aria-label", ariaLabel);
    }
    if (control) spreadProps(control, api.getControlProps());
    if (thumb) spreadProps(thumb, api.getThumbProps());
    if (label) spreadProps(label, api.getLabelProps());
  };

  // Render once before start so every part has the id Zag looks it up by.
  render();
  const unsubscribe = machine.subscribe(render);
  machine.start();
  root.dataset.ready = "";

  return () => {
    unsubscribe();
    machine.stop();
    delete root.dataset.ready;
  };
}
