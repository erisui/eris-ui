import * as select from "@zag-js/select";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, parts, type Cleanup } from "@/lib/eris/mount";
import { positioningFrom } from "@/lib/eris/positioning";

interface Choice {
  value: string;
  label: string;
  disabled: boolean;
}

/** Start a Zag select machine for one [data-eris="select"] root. Returns its cleanup. */
export function createSelect(root: HTMLElement): Cleanup {
  const data = root.dataset;
  const hidden = part<HTMLSelectElement>(root, "hidden-select");
  const label = part(root, "label");
  const trigger = part(root, "trigger");
  const valueText = part(root, "value-text");
  const positioner = part(root, "positioner");
  const content = part(root, "content");
  const groups = parts(root, "group");
  const itemEls = parts(root, "item");

  // Read once: Zag rewrites data-value and data-disabled on every render.
  const optionOf = new Map<HTMLElement, Choice>(
    itemEls.map((el) => {
      const text = el.querySelector('[data-part="item-text"]') ?? el;
      const value = el.dataset.value!;
      return [
        el,
        { value, label: text.textContent?.trim() || value, disabled: el.dataset.itemDisabled !== undefined },
      ];
    }),
  );
  const options = [...optionOf.values()];
  const inItem = (name: string) =>
    itemEls.flatMap((item) => {
      const el = item.querySelector<HTMLElement>(`[data-part="${name}"]`);
      return el ? [{ el, option: optionOf.get(item)! }] : [];
    });
  const itemTexts = inItem("item-text");
  const itemIndicators = inItem("item-indicator");
  const placeholder = valueText?.dataset.placeholder ?? "";

  const collection = select.collection<Choice>({
    items: options,
    itemToValue: (option) => option.value,
    itemToString: (option) => option.label,
    isItemDisabled: (option) => option.disabled,
  });
  const start =
    data.defaultValue !== undefined && collection.has(data.defaultValue) ? data.defaultValue : null;

  // The hidden <select> is what a form reads, so it gets the same options as the list.
  // The starting one is marked as its default, which is what a form reset goes back to.
  // The empty first option stands for "nothing chosen", so `required` can fail.
  hidden?.replaceChildren(
    new Option("", "", start === null, start === null),
    ...options.map(
      (option) => new Option(option.label, option.value, option.value === start, option.value === start),
    ),
  );

  const machine = new VanillaMachine(select.machine as select.Machine<Choice>, {
    id: data.erisId!,
    collection,
    defaultValue: start === null ? [] : [start],
    name: hidden?.name || undefined,
    form: hidden?.getAttribute("form") || undefined,
    disabled: hidden?.disabled ?? false,
    required: hidden?.required ?? false,
    readOnly: data.readOnly === "true",
    invalid: data.invalidField === "true",
    loopFocus: data.loopFocus === "true",
    // The list is at least as wide as the trigger, through --reference-width.
    positioning: positioningFrom(data, "bottom-start"),
  });

  // An aria-label on the trigger names a select that has no SelectLabel.
  const ariaLabel = trigger?.getAttribute("aria-label");

  const render = () => {
    const api = select.connect(machine.service, normalizeProps);
    if (label) spreadProps(label, api.getLabelProps());
    if (hidden) {
      const { style: _style, defaultValue: _defaultValue, ...props } = api.getHiddenSelectProps();
      spreadProps(hidden, props);
    }
    if (trigger) {
      spreadProps(trigger, api.getTriggerProps());
      if (!label) trigger.removeAttribute("aria-labelledby");
      if (ariaLabel) trigger.setAttribute("aria-label", ariaLabel);
    }
    if (valueText) {
      spreadProps(valueText, api.getValueTextProps());
      valueText.textContent = api.valueAsString || placeholder;
      valueText.toggleAttribute("data-placeholder-shown", !api.hasSelectedItems);
    }
    if (positioner) spreadProps(positioner, api.getPositionerProps());
    if (content) {
      spreadProps(content, api.getContentProps());
      if (!label && ariaLabel) content.setAttribute("aria-label", ariaLabel);
    }
    groups.forEach((group, index) => {
      const id = String(index);
      spreadProps(group, api.getItemGroupProps({ id }));
      const groupLabel = group.querySelector<HTMLElement>(
        ':scope > [data-part="group-label"], :scope > [data-part="item-group-label"]',
      );
      if (groupLabel) spreadProps(groupLabel, api.getItemGroupLabelProps({ htmlFor: id }));
    });
    itemEls.forEach((el) => spreadProps(el, api.getItemProps({ item: optionOf.get(el)! })));
    itemTexts.forEach(({ el, option }) => spreadProps(el, api.getItemTextProps({ item: option })));
    itemIndicators.forEach(({ el, option }) => spreadProps(el, api.getItemIndicatorProps({ item: option })));
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
