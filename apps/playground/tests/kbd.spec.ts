import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const box = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height, top: r.top, right: r.right };
  });

/** Top edge of each key in a group, to tell whether they share a row. */
const keyTops = (page: Page, selector: string) =>
  page.locator(`${selector} > kbd`).evaluateAll((keys) => keys.map((k) => Math.round(k.getBoundingClientRect().top)));

test.describe("Kbd", () => {
  test("renders each key as a <kbd> with its text", async ({ page }) => {
    await page.goto("/kbd");
    const enter = page.locator("#enter");
    await expect(enter).toHaveText("Enter");
    expect(await enter.evaluate((el) => el.tagName)).toBe("KBD");
  });

  test("a label replaces the symbol for screen readers and keeps it on screen", async ({ page }) => {
    await page.goto("/kbd");
    const command = page.locator("#command");
    await expect(command.locator('[aria-hidden="true"]')).toHaveText("⌘");
    await expect(command.locator(".sr-only")).toHaveText("Command");
    await expect(command.locator('[aria-hidden="true"]')).toBeVisible();
  });

  test("a group nests its keys in one outer <kbd>", async ({ page }) => {
    await page.goto("/kbd");
    const group = page.locator("#command-k");
    expect(await group.evaluate((el) => el.tagName)).toBe("KBD");
    await expect(group.locator("> kbd")).toHaveCount(2);
  });

  test("a single glyph is at least as wide as it is tall, at both sizes", async ({ page }) => {
    await page.goto("/kbd");
    for (const id of ["#right", "#small"]) {
      const { width, height } = await box(page, id);
      expect(width, id).toBeGreaterThanOrEqual(height - 0.5);
    }
    expect((await box(page, "#right")).height).toBe(24);
    expect((await box(page, "#small")).height).toBe(20);
  });

  test("a keycap in a sentence does not push its lines apart", async ({ page }) => {
    await page.goto("/kbd");
    const withKeys = (await box(page, "#sentence")).height;
    const plain = (await box(page, "#plain")).height;
    expect(withKeys).toBeLessThanOrEqual(plain + 2);
  });

  test("a shortcut moves to the next line whole instead of splitting at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/kbd");
    expect(new Set(await keyTops(page, "#long-shortcut")).size).toBe(1);
  });

  test("at 200% text on 320px, keys grow instead of clipping and nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/kbd");
    await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));

    const enter = page.locator("#enter");
    expect((await box(page, "#enter")).height).toBeGreaterThanOrEqual(48);
    expect(await enter.evaluate((el) => el.scrollHeight <= el.clientHeight)).toBe(true);

    // Too wide for one line now, so the shortcut wraps between its keys and stays inside its column.
    const column = await page.locator("#long-shortcut").evaluate((el) => el.parentElement!.getBoundingClientRect().right);
    expect((await box(page, "#long-shortcut")).right).toBeLessThanOrEqual(column + 0.5);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
    ).toBe(false);
  });

  test("has no axe violations", async ({ page }) => {
    await page.goto("/kbd");
    const results = await new AxeBuilder({ page }).include("main").analyze();
    expect(results.violations).toEqual([]);
  });
});
