import * as popover from "@zag-js/popover";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, parts, type Cleanup } from "@/lib/eris/mount";
import { positioningFrom } from "@/lib/eris/positioning";

/** Start a Zag popover machine for one [data-eris="popover"] root. Returns its cleanup. */
export function createPopover(root: HTMLElement): Cleanup {
  const data = root.dataset;
  const triggers = parts(root, "trigger");
  const positioner = part(root, "positioner");
  const content = part(root, "content");
  const title = part(root, "title");
  const description = part(root, "description");
  const closers = parts(root, "close");

  const machine = new VanillaMachine(popover.machine, {
    id: data.erisId!,
    defaultOpen: data.defaultOpen === "true",
    modal: data.modal === "true",
    closeOnInteractOutside: data.closeOnInteractOutside !== "false",
    // The panel stays where it is in the page, next to its trigger. Nothing moves it to <body>.
    portalled: false,
    positioning: positioningFrom(data, "bottom"),
  });

  const render = () => {
    const api = popover.connect(machine.service, normalizeProps);
    triggers.forEach((el) => spreadProps(el, api.getTriggerProps()));
    if (positioner) spreadProps(positioner, api.getPositionerProps());
    if (content) spreadProps(content, api.getContentProps());
    if (title) spreadProps(title, api.getTitleProps());
    if (description) spreadProps(description, api.getDescriptionProps());
    closers.forEach((el) => {
      spreadProps(el, api.getCloseTriggerProps());
      // Zag names every close button "close". Visible text is the better name, and a
      // label that differs from it breaks voice control.
      if (el.textContent?.trim()) el.removeAttribute("aria-label");
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
