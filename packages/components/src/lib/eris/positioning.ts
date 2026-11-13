/** Where a floating panel sits relative to its trigger. It flips when there is no room. */
export type Placement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

/**
 * Zag positioning options from a root's data-placement and data-gutter attributes.
 * The panel is position: fixed, so a parent with overflow: hidden does not clip it.
 */
export function positioningFrom(data: DOMStringMap, fallback: Placement) {
  const gutter = Number(data.gutter);
  return {
    placement: (data.placement as Placement | undefined) || fallback,
    gutter: Number.isFinite(gutter) && data.gutter !== undefined ? gutter : 8,
    strategy: "fixed" as const,
  };
}
