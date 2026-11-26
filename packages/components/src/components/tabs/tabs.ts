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

  // When the tabs scroll inside the list, keep the focused or selected tab, with its focus
  // ring (held by the list's padding), inside the list. Only the list scrolls, not the page.
  const reveal = (tab: Element | null) => {
    if (!list || !(tab instanceof HTMLElement) || list.scrollWidth <= list.clientWidth) return;
    const pad = parseFloat(getComputedStyle(list).paddingLeft) || 0;
    const start = tab.offsetLeft - pad;
    const end = tab.offsetLeft + tab.offsetWidth + pad - list.clientWidth;
    // A tab wider than the list shows the start of its label.
    if (list.scrollLeft > start || end > start) list.scrollLeft = start;
    else if (list.scrollLeft < end) list.scrollLeft = end;
  };
  const onFocusIn = (event: FocusEvent) => reveal(event.target as Element);
  list?.addEventListener("focusin", onFocusIn);

  // Render once before start so every part has the id Zag looks it up by.
  render();
  const unsubscribe = machine.subscribe(render);
  machine.start();
  root.dataset.ready = "";

  // Show the selected tab once the list has a size: now, or when a hidden parent opens.
  const firstLayout = new ResizeObserver(() => {
    if (!list?.clientWidth) return;
    firstLayout.disconnect();
    // A tab focused in the meantime wins over the selected one.
    const focused = triggers.find((el) => el === document.activeElement);
    reveal(focused ?? triggers.find((el) => el.getAttribute("aria-selected") === "true") ?? null);
  });
  if (list) firstLayout.observe(list);

  return () => {
    firstLayout.disconnect();
    list?.removeEventListener("focusin", onFocusIn);
    unsubscribe();
    machine.stop();
    delete root.dataset.ready;
  };
}
