import * as tabs from "@zag-js/tabs";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, parts, type Cleanup } from "@/lib/eris/mount";

/** Start a Zag tabs machine for one [data-eris="tabs"] root. Returns its cleanup. */
export function createTabs(root: HTMLElement): Cleanup {
  const data = root.dataset;
  const triggers = parts(root, "trigger");
  const contents = parts(root, "content");
  const list = part(root, "list");
  const indicator = part(root, "indicator");
  // Read once: Zag rewrites data-disabled on every render.
  const disabled = new Set(triggers.filter((el) => el.hasAttribute("disabled")));

  const machine = new VanillaMachine(tabs.machine, {
    id: data.erisId!,
    defaultValue: data.defaultValue || triggers[0]?.dataset.value || null,
    orientation: data.orientation === "vertical" ? "vertical" : "horizontal",
    activationMode: data.activationMode === "manual" ? "manual" : "automatic",
    loopFocus: data.loopFocus !== "false",
  });

  const render = () => {
    const api = tabs.connect(machine.service, normalizeProps);
    spreadProps(root, api.getRootProps());
    if (list) spreadProps(list, api.getListProps());
    triggers.forEach((el) =>
      spreadProps(el, api.getTriggerProps({ value: el.dataset.value!, disabled: disabled.has(el) })),
    );
    contents.forEach((el) => spreadProps(el, api.getContentProps({ value: el.dataset.value! })));
    if (indicator) spreadProps(indicator, api.getIndicatorProps());
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
