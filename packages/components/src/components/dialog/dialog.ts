import * as dialog from "@zag-js/dialog";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, parts, type Cleanup } from "@/lib/eris/mount";

/** Start a Zag dialog machine for one [data-eris="dialog"] root. Returns its cleanup. */
export function createDialog(root: HTMLElement): Cleanup {
  const data = root.dataset;
  const machine = new VanillaMachine(dialog.machine, {
    id: data.erisId!,
    defaultOpen: data.defaultOpen === "true",
    role: data.role === "alertdialog" ? "alertdialog" : "dialog",
    closeOnInteractOutside: data.closeOnInteractOutside !== "false",
  });

  const triggers = parts(root, "trigger");
  const backdrop = part(root, "backdrop");
  const positioner = part(root, "positioner");
  const content = part(root, "content");
  const title = part(root, "title");
  const description = part(root, "description");
  const closers = parts(root, "close");

  const render = () => {
    const api = dialog.connect(machine.service, normalizeProps);
    triggers.forEach((el) => spreadProps(el, api.getTriggerProps()));
    if (backdrop) spreadProps(backdrop, api.getBackdropProps());
    if (positioner) spreadProps(positioner, api.getPositionerProps());
    if (content) spreadProps(content, api.getContentProps());
    if (title) spreadProps(title, api.getTitleProps());
    if (description) spreadProps(description, api.getDescriptionProps());
    closers.forEach((el) => spreadProps(el, api.getCloseTriggerProps()));
    root.dataset.state = api.open ? "open" : "closed";
  };

  const unsubscribe = machine.subscribe(render);
  machine.start();
  render();

  return () => {
    unsubscribe();
    machine.stop();
  };
}
