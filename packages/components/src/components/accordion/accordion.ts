import * as accordion from "@zag-js/accordion";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { parts, type Cleanup } from "@/lib/eris/mount";

/** Start a Zag accordion machine for one [data-eris="accordion"] root. Returns its cleanup. */
export function createAccordion(root: HTMLElement): Cleanup {
  const data = root.dataset;
  const multiple = data.multiple === "true";

  // A trigger, content or indicator takes its value from the item it sits in.
  const itemOf = (el: HTMLElement) => el.closest<HTMLElement>('[data-part="item"]');
  const items = parts(root, "item");
  // Read once: Zag rewrites data-disabled on every render.
  const disabled = new Set(items.filter((el) => el.dataset.itemDisabled !== undefined));
  const propsOf = (item: HTMLElement) => ({ value: item.dataset.value!, disabled: disabled.has(item) });
  const inItems = (name: string) =>
    parts(root, name).flatMap((el) => {
      const item = itemOf(el);
      return item ? [{ el, item }] : [];
    });
  const triggers = inItems("trigger");
  const contents = inItems("content");
  const indicators = inItems("indicator");

  const open = items.filter((el) => el.dataset.defaultOpen !== undefined).map((el) => el.dataset.value!);

  const machine = new VanillaMachine(accordion.machine, {
    id: data.erisId!,
    multiple,
    collapsible: data.collapsible !== "false",
    disabled: data.allDisabled === "true",
    defaultValue: multiple ? open : open.slice(0, 1),
  });

  const render = () => {
    const api = accordion.connect(machine.service, normalizeProps);
    spreadProps(root, api.getRootProps());
    items.forEach((el) => spreadProps(el, api.getItemProps(propsOf(el))));
    triggers.forEach(({ el, item }) => spreadProps(el, api.getItemTriggerProps(propsOf(item))));
    contents.forEach(({ el, item }) => spreadProps(el, api.getItemContentProps(propsOf(item))));
    indicators.forEach(({ el, item }) => spreadProps(el, api.getItemIndicatorProps(propsOf(item))));
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
