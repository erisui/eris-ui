import { expect, test, type Page } from "@playwright/test";
import { erisRoot, expectNoSeriousViolations, leaveAndReturn, settled } from "./helpers";

const trigger = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const panel = (page: Page, name: string) => page.getByRole("dialog", { name, exact: true });
const rect = (page: Page, selector: string) => settled(page.locator(selector));

test.describe("Popover", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/popover");
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-ready", "");
  });

  test("the trigger opens a labelled, described panel", async ({ page }) => {
    const share = trigger(page, "Share");
    await expect(share).toHaveAttribute("aria-expanded", "false");
    await expect(share).toHaveAttribute("aria-haspopup", "dialog");
    await share.click();
    await expect(share).toHaveAttribute("aria-expanded", "true");
    const shown = panel(page, "Share this page");
    await expect(shown).toBeVisible();
    await expect(shown).toHaveAccessibleDescription("Anyone with the link can view it.");
    expect(await share.getAttribute("aria-controls")).toBe(await shown.getAttribute("id"));
  });

  test("Enter and Space open it and focus moves inside", async ({ page }) => {
    await trigger(page, "Share").focus();
    await page.keyboard.press("Enter");
    await expect(panel(page, "Share this page")).toBeVisible();
    await expect(trigger(page, "Copy link")).toBeFocused();
    await page.keyboard.press("Escape");
    await trigger(page, "Share").focus();
    await page.keyboard.press("Space");
    await expect(panel(page, "Share this page")).toBeVisible();
  });

  test("Escape closes it and returns focus to the trigger", async ({ page }) => {
    await trigger(page, "Share").click();
    await expect(panel(page, "Share this page")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel(page, "Share this page")).toBeHidden();
    await expect(trigger(page, "Share")).toBeFocused();
  });

  test("the close button and a second click on the trigger close it", async ({ page }) => {
    await trigger(page, "Share").click();
    await trigger(page, "Done").click();
    await expect(panel(page, "Share this page")).toBeHidden();
    await expect(trigger(page, "Share")).toBeFocused();
    await trigger(page, "Share").click();
    await expect(panel(page, "Share this page")).toBeVisible();
    await trigger(page, "Share").click();
    await expect(panel(page, "Share this page")).toBeHidden();
  });

  test("a click outside closes it, unless closeOnInteractOutside is off", async ({ page }) => {
    await trigger(page, "Share").click();
    await expect(panel(page, "Share this page")).toBeVisible();
    await page.locator("h1").click();
    await expect(panel(page, "Share this page")).toBeHidden();

    await trigger(page, "Sticky").click();
    await expect(panel(page, "Sticky popover")).toBeVisible();
    await page.locator("h1").click();
    await expect(panel(page, "Sticky popover")).toBeVisible();
    await trigger(page, "Close sticky").click();
    await expect(panel(page, "Sticky popover")).toBeHidden();
  });

  test("Tab leaves a non-modal popover in page order", async ({ page }) => {
    await trigger(page, "Share").click();
    await expect(trigger(page, "Copy link")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(trigger(page, "Done")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#outside")).toBeFocused();
  });

  test("a modal popover traps Tab and hides the page behind it", async ({ page }) => {
    await trigger(page, "Rename").click();
    const name = page.getByRole("textbox", { name: "Project name" });
    await expect(name).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(trigger(page, "Cancel")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(name).toBeFocused();
    await expect(panel(page, "Rename project")).toHaveAttribute("aria-modal", "true");
    await page.keyboard.press("Escape");
    await expect(trigger(page, "Rename")).toBeFocused();
  });

  test("sits on the side it was given, at its gutter", async ({ page }) => {
    await trigger(page, "Top").click();
    const top = await rect(page, '[data-eris-id="top"] [role="dialog"]');
    const topTrigger = (await trigger(page, "Top").boundingBox())!;
    expect(Math.round(topTrigger.y - (top.y + top.height))).toBe(8);
    await page.keyboard.press("Escape");

    await trigger(page, "Right").click();
    const right = await rect(page, '[data-eris-id="right"] [role="dialog"]');
    const rightTrigger = (await trigger(page, "Right").boundingBox())!;
    expect(Math.round(right.x - (rightTrigger.x + rightTrigger.width))).toBe(20);
    await page.keyboard.press("Escape");

    await trigger(page, "Bottom start").click();
    const start = await rect(page, '[data-eris-id="bottom-start"] [role="dialog"]');
    const startTrigger = (await trigger(page, "Bottom start").boundingBox())!;
    expect(Math.round(start.x)).toBe(Math.round(startTrigger.x));
    expect(Math.round(start.y - (startTrigger.y + startTrigger.height))).toBe(8);
  });

  test("flips to the other side when there is no room", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 420 });
    const share = trigger(page, "Share");
    await share.evaluate((el) =>
      window.scrollTo(0, el.getBoundingClientRect().bottom + window.scrollY - 410),
    );
    await share.click();
    const shown = await settled(panel(page, "Share this page"));
    const at = (await share.boundingBox())!;
    expect(shown.y + shown.height).toBeLessThanOrEqual(at.y);
  });

  test("is not clipped by a parent with overflow hidden", async ({ page }) => {
    await trigger(page, "In a clipped box").click();
    const shown = page.locator('[data-eris-id="clipped"] [role="dialog"]');
    const box = await settled(shown);
    const clip = (await page.locator("#clip").boundingBox())!;
    expect(box.y + box.height).toBeGreaterThan(clip.y + clip.height);
    // The point in the middle of the panel really is the panel, not the page behind it.
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('[role="dialog"]') !== null,
      [box.x + box.width / 2, box.y + box.height - 6],
    );
    expect(hit).toBe(true);
  });

  test("inside a dialog, Escape closes the popover first and the dialog second", async ({ page }) => {
    await trigger(page, "Open dialog").click();
    const dialog = panel(page, "Project settings");
    await expect(dialog).toBeVisible();
    await trigger(page, "More info").click();
    await expect(panel(page, "About projects")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel(page, "About projects")).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(trigger(page, "More info")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("still works after a view transition", async ({ page }) => {
    await leaveAndReturn(page, "Popover", "/popover");
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-ready", "");
    await trigger(page, "Share").click();
    await expect(panel(page, "Share this page")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel(page, "Share this page")).toBeHidden();
  });

  test("has no serious accessibility violations, closed and open", async ({ page }) => {
    await expectNoSeriousViolations(page);
    await trigger(page, "Share").click();
    await settled(panel(page, "Share this page"));
    await expectNoSeriousViolations(page);
  });
});
