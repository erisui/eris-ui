import * as tooltip from "@zag-js/tooltip";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import type { Cleanup } from "@/lib/eris/mount";
import { positioningFrom } from "@/lib/eris/positioning";

const FOCUSABLE = "a[href], button, input, select, textarea, summary, [tabindex]";

/**
 * The element the hint describes: one marked data-tooltip-trigger, else the first
 * focusable element in the tooltip, else its first element. Keyboard users only see
 * a hint on something they can focus.
 */
function findTrigger(root: HTMLElement, positioner: HTMLElement): HTMLElement | null {
  const pick = (selector: string) =>
    [...root.querySelectorAll<HTMLElement>(selector)].find((el) => !positioner.contains(el)) ?? null;
  return pick("[data-tooltip-trigger]") ?? pick(FOCUSABLE) ?? pick(":scope > *");
}

/** Start a Zag tooltip machine for one [data-eris="tooltip"] root. Returns its cleanup. */
export function createTooltip(root: HTMLElement): Cleanup {
  const data = root.dataset;
  // Named apart from other components' parts: a tooltip often sits inside a Dialog or
  // Popover, around its trigger, and must not be mistaken for that component's content.
  const positioner = root.querySelector<HTMLElement>(':scope > [data-tooltip-part="positioner"]');
  const content = positioner?.querySelector<HTMLElement>(':scope > [data-tooltip-part="content"]');
  const trigger = positioner && findTrigger(root, positioner);
  if (!positioner || !content || !trigger) return () => {};

  const delay = (value: string | undefined, fallback: number) => {
    const ms = Number(value);
    return value !== undefined && Number.isFinite(ms) ? ms : fallback;
  };

  // The trigger is the user's element, and may also be the trigger of a Dialog, Popover
  // or Menu, whose machine sets its id later. So Zag is told to read the id each time.
  if (!trigger.id) trigger.id = `tooltip:${data.erisId}:trigger`;

  const machine = new VanillaMachine(tooltip.machine, {
    id: data.erisId!,
    ids: { trigger: () => trigger.id },
    openDelay: delay(data.openDelay, 400),
    closeDelay: delay(data.closeDelay, 150),
    interactive: data.interactive === "true",
    disabled: data.disabledTip === "true",
    positioning: positioningFrom(data, "top"),
  });
  const connect = () => tooltip.connect(machine.service, normalizeProps);

  // Another machine may be spreading its own props onto the trigger, and spreadProps
  // lets only one do that. So the tooltip adds its listeners by hand and sets a single
  // attribute, leaving the trigger's role, state and other handlers alone.
  type Handlers = Record<string, ((event: Event) => void) | undefined>;
  const events = Object.keys(connect().getTriggerProps())
    // The vanilla adapter names handlers after the DOM event: onpointermove, onfocusin.
    .filter((key) => key.startsWith("on"))
    .map((key) => {
      const listener = (event: Event) => (connect().getTriggerProps() as Handlers)[key]?.(event);
      const type = key.slice(2);
      trigger.addEventListener(type, listener);
      return () => trigger.removeEventListener(type, listener);
    });

  // Zag would mark these data-part="content" and "positioner", the names a surrounding
  // Popover or Menu looks for when it finds its own parts.
  const unnamed = <T extends object>(props: T) => ({ ...props, "data-part": undefined });

  const describedBy = () => (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
  const describe = (on: boolean) => {
    const ids = describedBy().filter((id) => id !== content.id);
    if (on) ids.push(content.id);
    if (ids.length) trigger.setAttribute("aria-describedby", ids.join(" "));
    else trigger.removeAttribute("aria-describedby");
  };

  const render = () => {
    const api = connect();
    spreadProps(positioner, unnamed(api.getPositionerProps()));
    spreadProps(content, unnamed(api.getContentProps()));
    describe(api.open);
    root.dataset.state = api.open ? "open" : "closed";
  };

  // Render once before start so every part has the id Zag looks it up by.
  render();
  const unsubscribe = machine.subscribe(render);
  machine.start();
  root.dataset.ready = "";

  return () => {
    events.forEach((off) => off());
    describe(false);
    unsubscribe();
    machine.stop();
    delete root.dataset.ready;
  };
}
