import { expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** One component instance on the page, by the `id` prop it was given. */
export const erisRoot = (page: Page, id: string): Locator => page.locator(`[data-eris-id="${id}"]`);

/** Fails on any serious or critical axe violation in the page's current state. */
export async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious.map((v) => [v.id, v.nodes.map((n) => n.target)]))).toEqual([]);
}

/**
 * Leave through a view transition and come back, so the machines are stopped and started
 * again. Call it, then repeat one interaction to show the component still works.
 */
export async function leaveAndReturn(page: Page, navLabel: string, path: string) {
  await page.getByRole("link", { name: "Second page" }).click();
  await expect(page).toHaveURL(/\/second/);
  await page.getByRole("navigation").getByRole("link", { name: navLabel, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  // While the transition runs, its overlay takes pointer events, so hovers would be lost.
  await page.waitForFunction(() => !document.documentElement.matches(":active-view-transition"));
}

/** Wait for an element's open or close animation to finish, so its box and colours are final. */
export async function settled(target: Locator) {
  await expect(target).toBeVisible();
  await expect.poll(() => target.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
  return (await target.boundingBox())!;
}
