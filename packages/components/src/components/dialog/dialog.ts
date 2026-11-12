import * as dialog from "@zag-js/dialog";
import { VanillaMachine, normalizeProps, spreadProps } from "@zag-js/vanilla";
import { part, parts, type Cleanup } from "@/lib/eris/mount";

/** True when focus can land on the element right now: in the page, shown, and not disabled. */
function canFocus(el: Element | null | undefined): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false;
  if (el.matches(":disabled") || el.closest("[inert]")) return false;
  return el.checkVisibility?.({ visibilityProperty: true }) ?? el.getClientRects().length > 0;
}

/**
 * Where focus goes when nothing better is left: the nearest focusable ancestor of the
 * dialog, else the page's main landmark. Keeps focus in the content, not on <body>.
 */
function fallbackFocus(root: HTMLElement): HTMLElement | null {
  const nearest = root.isConnected
    ? root.parentElement?.closest<HTMLElement>("[tabindex], main, [role='main']")
    : null;
  const el = nearest || document.querySelector<HTMLElement>("main, [role='main']");
  if (!canFocus(el)) return null;
  if (!el.hasAttribute("tabindex")) {
    // Focusable just for this landing, so a later click on the page does not focus it.
    el.tabIndex = -1;
    el.addEventListener("blur", () => el.removeAttribute("tabindex"), { once: true });
  }
  return el;
}

/** Start a Zag dialog machine for one [data-eris="dialog"] root. Returns its cleanup. */
export function createDialog(root: HTMLElement): Cleanup {
  const data = root.dataset;
  const triggers = parts(root, "trigger");

  // Runs when the dialog closes. Returning null lets Zag focus the trigger as usual.
  const finalFocusEl = () => {
    const chosen = data.finalFocus ? document.querySelector(data.finalFocus) : null;
    if (canFocus(chosen)) return chosen;
    // The trigger can be removed, hidden or disabled while the dialog is open.
    const usable = triggers.find(canFocus);
    if (usable) return usable === triggers[0] ? null : usable;
    return fallbackFocus(root);
  };

  const machine = new VanillaMachine(dialog.machine, {
    id: data.erisId!,
    defaultOpen: data.defaultOpen === "true",
    role: data.role === "alertdialog" ? "alertdialog" : "dialog",
    closeOnInteractOutside: data.closeOnInteractOutside !== "false",
    finalFocusEl,
  });

  const backdrop = part(root, "backdrop");
  const positioner = part(root, "positioner");
  const content = part(root, "content");
  const title = part(root, "title");
  const description = part(root, "description");
  const closers = parts(root, "close");

  // Zag only moves focus on close once its focus trap is running. A dialog closed in the
  // frame it opened never gets there, so check where focus ended up and correct it.
  let settling = 0;
  const settleFocus = () => {
    cancelAnimationFrame(settling);
    settling = requestAnimationFrame(() => {
      const active = document.activeElement;
      const stranded =
        !active ||
        active === document.body ||
        content?.contains(active) ||
        triggers.includes(active as HTMLElement);
      if (!stranded) return;
      const target = finalFocusEl();
      if (target && target !== active) target.focus({ preventScroll: true });
    });
  };

  let wasOpen = false;
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
    if (wasOpen && !api.open) settleFocus();
    wasOpen = api.open;
  };

  // Render once before start so every part has the id Zag looks it up by.
  render();
  const unsubscribe = machine.subscribe(render);
  machine.start();

  return () => {
    cancelAnimationFrame(settling);
    unsubscribe();
    machine.stop();
  };
}
