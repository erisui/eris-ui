import { expect, test, type Page } from "@playwright/test";
import { erisRoot } from "./helpers";

/**
 * Open the Share popover and return the keyframes of each animation that starts on it,
 * caught as it starts so a short animation cannot finish before it is read.
 */
const popoverKeyframes = async (page: Page) => {
  await page.goto("/popover");
  await expect(erisRoot(page, "basic")).toHaveAttribute("data-ready", "");
  await page.evaluate(() => {
    const seen: Keyframe[][] = ((window as unknown as { seen: Keyframe[][] }).seen = []);
    document.addEventListener("animationstart", (event) => {
      if (!(event.target as Element).matches('[role="dialog"]')) return;
      for (const animation of (event.target as Element).getAnimations()) {
        seen.push((animation.effect as KeyframeEffect).getKeyframes());
      }
    });
  });
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Share this page", exact: true })).toBeVisible();
  const seen = () => page.evaluate(() => (window as unknown as { seen: Keyframe[][] }).seen);
  await expect.poll(async () => (await seen()).length).toBeGreaterThan(0);
  const frames = (await seen()).flat();
  return {
    fades: frames.some((frame) => frame.opacity !== undefined),
    moves: frames.some((frame) => frame.transform !== undefined && frame.transform !== "none"),
  };
};

test.describe("Motion", () => {
  test("a popover pops in with movement by default", async ({ page }) => {
    expect(await popoverKeyframes(page)).toEqual({ fades: true, moves: true });
  });

  test.describe("with prefers-reduced-motion: reduce", () => {
    test.use({ reducedMotion: "reduce" });

    test("a popover fades in without moving", async ({ page }) => {
      expect(await popoverKeyframes(page)).toEqual({ fades: true, moves: false });
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
