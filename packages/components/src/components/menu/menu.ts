import * as menu from "@zag-js/menu";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, parts, type Cleanup } from "@/lib/eris/mount";
import { positioningFrom } from "@/lib/eris/positioning";

/** `detail` of the eris:select event an item fires when it is chosen. */
export interface MenuSelectDetail {
  /** The item's `value`. */
  value: string;
  /** New state of a checkbox item. Always true for a radio item. Absent for a plain item. */
  checked?: boolean;
  /** `name` of the MenuRadioGroup a radio item is in. */
  group?: string;
}

/** Start a Zag menu machine for one [data-eris="menu"] root. Returns its cleanup. */
export function createMenu(root: HTMLElement): Cleanup {
  const data = root.dataset;
  const triggers = parts(root, "trigger");
  const positioner = part(root, "positioner");
  const content = part(root, "content");
  const separators = parts(root, "separator");
  const items = parts(root, "item");
  const checkboxItems = parts(root, "checkbox-item");
  const radioItems = parts(root, "radio-item");
  const everyItem = [...items, ...checkboxItems, ...radioItems];

  // Read once: Zag rewrites data-value, data-disabled and data-state on every render.
  const base = new Map(
    everyItem.map((el) => {
      const close = el.dataset.itemCloseOnSelect;
      return [
        el,
        {
          value: el.dataset.value!,
          valueText: el.textContent?.trim() || el.dataset.value!,
          disabled: el.dataset.itemDisabled !== undefined,
          closeOnSelect: close === undefined ? undefined : close === "true",
        },
      ];
    }),
  );
  const byValue = new Map(everyItem.map((el) => [base.get(el)!.value, el]));

  // Zag does not keep checkbox and radio state. It lives here and is drawn on each render.
  const ticked = new Set(checkboxItems.filter((el) => el.dataset.state === "checked"));
  const groupOf = (el: HTMLElement) => el.closest<HTMLElement>('[data-part="radio-group"]');
  const chosen = new Map(
    parts(root, "radio-group").map((group) => [group, group.dataset.groupValue ?? null]),
  );
  const isChosen = (el: HTMLElement) => {
    const group = groupOf(el);
    return !!group && chosen.get(group) === base.get(el)!.value;
  };

  const announce = (el: HTMLElement, detail: MenuSelectDetail) =>
    el.dispatchEvent(new CustomEvent<MenuSelectDetail>("eris:select", { bubbles: true, detail }));

  const machine = new VanillaMachine(menu.machine, {
    id: data.erisId!,
    closeOnSelect: data.closeOnSelect !== "false",
    loopFocus: data.loopFocus === "true",
    positioning: positioningFrom(data, "bottom-start"),
    onSelect({ value }) {
      const el = byValue.get(value);
      // Checkbox and radio items announce themselves once their new state is known.
      if (el && items.includes(el)) announce(el, { value });
    },
  });

  const render = () => {
    const api = menu.connect(machine.service, normalizeProps);
    triggers.forEach((el) => spreadProps(el, api.getTriggerProps()));
    if (positioner) spreadProps(positioner, api.getPositionerProps());
    if (content) spreadProps(content, api.getContentProps());
    separators.forEach((el) => spreadProps(el, api.getSeparatorProps()));
    items.forEach((el) => spreadProps(el, api.getItemProps(base.get(el)!)));
    checkboxItems.forEach((el) => {
      const props = base.get(el)!;
      const option = api.getOptionItemProps({
        ...props,
        type: "checkbox",
        checked: ticked.has(el),
        onCheckedChange(checked) {
          if (checked) ticked.add(el);
          else ticked.delete(el);
          render();
          announce(el, { value: props.value, checked });
        },
      });
      spreadProps(el, option);
    });
    radioItems.forEach((el) => {
      const props = base.get(el)!;
      const group = groupOf(el);
      const option = api.getOptionItemProps({
        ...props,
        type: "radio",
        checked: isChosen(el),
        onCheckedChange() {
          if (!group) return;
          chosen.set(group, props.value);
          group.dataset.groupValue = props.value;
          render();
          announce(el, { value: props.value, checked: true, group: group.dataset.name });
        },
      });
      spreadProps(el, option);
    });
    root.dataset.state = api.open ? "open" : "closed";
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
