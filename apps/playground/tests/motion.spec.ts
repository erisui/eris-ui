import { expect, test, type Locator, type Page } from "@playwright/test";
import { erisRoot } from "./helpers";

/** The transform values in the keyframes of the CSS animations running on `el`. */
const animatedTransforms = (el: Locator) =>
  el.evaluate((node) =>
    node
      .getAnimations()
      .flatMap((a) => (a.effect as KeyframeEffect).getKeyframes())
      .map((frame) => frame.transform)
      .filter((value) => value !== undefined && value !== "none"),
  );

const openPopover = async (page: Page) => {
  await page.goto("/popover");
  await expect(erisRoot(page, "basic")).toHaveAttribute("data-ready", "");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  return page.getByRole("dialog", { name: "Share this page", exact: true });
};

test.describe("Motion", () => {
  test("a popover pops in with movement by default", async ({ page }) => {
    expect(await animatedTransforms(await openPopover(page))).not.toEqual([]);
  });

  test.describe("with prefers-reduced-motion: reduce", () => {
    test.use({ reducedMotion: "reduce" });

    test("a popover fades in without moving", async ({ page }) => {
      const shown = await openPopover(page);
      await expect(shown).toBeVisible();
      expect(await animatedTransforms(shown)).toEqual([]);
    });

    test("the tabs indicator jumps instead of sliding", async ({ page }) => {
      await page.goto("/tabs");
      const settings = erisRoot(page, "settings");
      await expect(settings).toHaveAttribute("data-ready", "");
      const indicator = settings.locator('[data-part="indicator"]');
      await expect(indicator).toHaveCSS("transition-duration", "0s");
      await settings.getByRole("tab", { name: "Password", exact: true }).click();
      expect(await indicator.evaluate((el) => el.getAnimations().length)).toBe(0);
    });

    test("the accordion chevron turns at once", async ({ page }) => {
      await page.goto("/accordion");
      const chevron = erisRoot(page, "faq").getByRole("button").first().locator("svg");
      await expect(chevron).toHaveCSS("transition-property", "none");
    });

    test("the switch thumb jumps, and only its colour fades", async ({ page }) => {
      await page.goto("/switch");
      const thumb = erisRoot(page, "basic").locator('[data-part="thumb"]');
      await expect(thumb).toHaveCSS("transition-property", "background-color");
    });
  });
});
