import { part, type Cleanup } from "@/lib/eris/mount";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Wire one [data-eris="heatmap"] root. Returns its cleanup.
 *
 * Every heatmap gets the legend filter: point at a step in its legend and the other cells dim.
 * An `interactive` one also gets the readout, which follows the pointer, a dragged finger or
 * the arrow keys from cell to cell.
 */
export function createHeatmap(root: HTMLElement): Cleanup {
  const grid = part(root, "grid")!;
  // Cells and gaps in source order, so an index is column * rows + row.
  const cells = [...grid.children] as HTMLElement[];
  const rows = Number(root.dataset.rows);
  const isCell = (i: number) => cells[i]?.dataset.part === "cell";

  const undo: Cleanup[] = [];
  const on = <K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Document,
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
  ) => {
    target.addEventListener(type, handler as EventListener);
    undo.push(() => target.removeEventListener(type, handler as EventListener));
  };

  // ── Legend filter ─────────────────────────────────────────────────────────────────
  const legend = part(root, "legend");
  const steps = legend ? [...legend.querySelectorAll<HTMLElement>("[data-level]")] : [];
  let pinned: string | null = null;
  const filter = (level: string | null) => {
    for (const el of [...cells, ...steps]) {
      el.toggleAttribute("data-dim", level !== null && el.dataset.level !== level);
    }
  };
  const stepAt = (event: Event) => (event.target as HTMLElement).closest<HTMLElement>("[data-level]");
  if (legend) {
    // Hover previews a step. A click or tap pins it, since a finger cannot hover.
    on(legend, "pointerover", (event) => {
      // Crossing the space between two steps keeps the last one, so the cells do not flash.
      const step = stepAt(event);
      if (event.pointerType === "mouse" && step) filter(step.dataset.level!);
    });
    on(legend, "pointerleave", () => filter(pinned));
    on(legend, "click", (event) => {
      const level = stepAt(event)?.dataset.level;
      if (level === undefined) return;
      pinned = pinned === level ? null : level;
      filter(pinned);
    });
  }

  // ── Readout ───────────────────────────────────────────────────────────────────────
  if (root.dataset.interactive !== undefined) {
    const readout = part(root, "readout")!;
    const announce = part(root, "announce")!;
    let active = -1;
    let scrubbing = false;

    const place = (cell: HTMLElement, gutter: number) => {
      const box = cell.getBoundingClientRect();
      const origin = root.getBoundingClientRect();
      const width = readout.offsetWidth;
      const height = readout.offsetHeight;
      // Centred over the cell, but never off either side of the screen.
      const left = clamp(
        box.left + box.width / 2 - width / 2,
        8,
        document.documentElement.clientWidth - width - 8,
      );
      const above = box.top - height - gutter;
      const top = above < 8 ? box.bottom + gutter : above;
      // Set on the readout itself, not through a variable on the root, which would restyle every cell.
      readout.style.transform = `translate(${Math.round(left - origin.left)}px, ${Math.round(top - origin.top)}px)`;
    };

    const show = (i: number, how: { touch?: boolean; speak?: boolean } = {}) => {
      const cell = cells[i];
      if (!cell || !isCell(i)) return;
      if (i !== active) {
        cells[active]?.removeAttribute("data-active");
        cell.setAttribute("data-active", "");
        readout.textContent = cell.dataset.label ?? cell.dataset.value ?? "";
        active = i;
        if (how.speak) announce.textContent = readout.textContent;
      }
      // Clear of the fingertip on touch, close to the cell otherwise.
      place(cell, how.touch ? 14 : 6);
      readout.dataset.state = "open";
    };
    const hide = () => {
      cells[active]?.removeAttribute("data-active");
      active = -1;
      readout.dataset.state = "closed";
    };

    // From geometry, not from the event target: the gaps between cells and a finger that has
    // drifted off the grid both resolve to the nearest cell, so the readout never flickers.
    const at = (x: number, y: number) => {
      const box = grid.getBoundingClientRect();
      const cols = Math.ceil(cells.length / rows);
      const col = clamp(Math.floor(((x - box.left) / box.width) * cols), 0, cols - 1);
      const row = clamp(Math.floor(((y - box.top) / box.height) * rows), 0, rows - 1);
      return col * rows + row;
    };

    on(grid, "pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      scrubbing = true;
      grid.setPointerCapture(event.pointerId);
      show(at(event.clientX, event.clientY), { touch: true });
    });
    on(grid, "pointermove", (event) => {
      if (event.pointerType === "mouse") show(at(event.clientX, event.clientY));
      else if (scrubbing) show(at(event.clientX, event.clientY), { touch: true });
    });
    // After a touch the readout stays, so it can be read once the finger is out of the way.
    const release = () => (scrubbing = false);
    on(grid, "pointerup", release);
    on(grid, "pointercancel", release);
    on(grid, "pointerleave", (event) => {
      if (event.pointerType === "mouse") hide();
    });
    on(document, "pointerdown", (event) => {
      if (!grid.contains(event.target as Node)) hide();
    });

    on(grid, "focus", () => {
      // Keyboard focus starts on the first cell. A click focuses too, and must not move the readout.
      if (active < 0 && grid.matches(":focus-visible"))
        show(
          cells.findIndex((_, i) => isCell(i)),
          { speak: true },
        );
    });
    on(grid, "blur", hide);
    on(grid, "keydown", (event) => {
      const first = cells.findIndex((_, i) => isCell(i));
      const last = cells.length - 1 - [...cells].reverse().findIndex((c) => c.dataset.part === "cell");
      const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -rows, ArrowRight: rows }[event.key];
      let next = -1;
      if (event.key === "Home") next = first;
      else if (event.key === "End") next = last;
      else if (event.key === "Escape") return hide();
      else if (step === undefined) return;
      else if (active < 0) next = first;
      else {
        // Skip gaps. Up and down stay inside the column.
        const column = Math.floor(active / rows);
        const inReach = (i: number) =>
          i >= 0 && i < cells.length && (Math.abs(step) > 1 || Math.floor(i / rows) === column);
        next = active + step;
        while (inReach(next) && !isCell(next)) next += step;
        if (!inReach(next)) next = active;
      }
      event.preventDefault();
      show(next, { speak: true });
    });

    undo.push(hide);
  }

  root.dataset.ready = "";
  return () => {
    undo.forEach((fn) => fn());
    pinned = null;
    filter(null);
    delete root.dataset.ready;
  };
}
