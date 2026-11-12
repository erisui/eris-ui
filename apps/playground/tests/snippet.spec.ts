import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const COMMAND = "npx eris-ui@latest init";

const root = (page: Page, id: string) => page.locator(`[data-eris-id="${id}"]`);

/** Layout facts for one snippet: its parts sit inside its box, nothing overlaps, and nothing scrolls sideways. */
async function layoutOf(target: Locator) {
  return target.evaluate((el) => {
    const outer = el.getBoundingClientRect();
    const trigger = el.querySelector<HTMLElement>('[data-part="trigger"]')!.getBoundingClientRect();
    const code = el.querySelector("code")!.getBoundingClientRect();
    const inside = (r: DOMRect) => r.left >= outer.left - 0.5 && r.right <= outer.right + 0.5;
    const overlap = !(
      code.right <= trigger.left ||
      trigger.right <= code.left ||
      code.bottom <= trigger.top ||
      trigger.bottom <= code.top
    );
    return {
      triggerInside: inside(trigger),
      codeInside: inside(code),
      overlap,
      rootScrolls: el.scrollWidth > el.clientWidth,
      pageScrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      codeLeftOfTrigger: code.left < trigger.left,
      triggerBelowCode: trigger.top >= code.bottom - 0.5,
    };
  });
}

test.describe("Snippet", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("copies the whole command, confirms it, then resets", async ({ page }) => {
    await page.goto("/snippet");
    const copy = root(page, "install").getByRole("button");
    const [copyIcon, checkIcon] = [copy.locator("svg").first(), copy.locator("svg").last()];
    await expect(copy).toHaveAccessibleName("Copy");
    await expect(copyIcon).toBeVisible();
    await expect(checkIcon).toBeHidden();
    await copy.click();
    await expect(copy).toHaveAccessibleName("Copied");
    await expect(checkIcon).toBeVisible();
    await expect(copyIcon).toBeHidden();
    await expect(root(page, "install").locator('[data-part="status"]')).toHaveText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(COMMAND);
    await expect(copy).toHaveAccessibleName("Copy", { timeout: 4000 });
    await expect(copyIcon).toBeVisible();
  });

  test("the icon button takes its accessible name from the labels", async ({ page }) => {
    await page.goto("/snippet");
    await expect(root(page, "install").getByRole("button")).toHaveAccessibleName("Copy");
    const german = root(page, "german").getByRole("button");
    await expect(german).toHaveAccessibleName("In die Zwischenablage kopieren");
    await expect(german).toHaveText("");
    await german.click();
    await expect(german).toHaveAccessibleName("In die Zwischenablage kopiert");
  });

  test("the copy button is at least 32px square", async ({ page }) => {
    await page.goto("/snippet");
    const box = await root(page, "install").getByRole("button").boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(32);
    expect(box!.height).toBeGreaterThanOrEqual(32);
  });

  test("has no axe violations", async ({ page }) => {
    await page.goto("/snippet");
    const results = await new AxeBuilder({ page }).include('[data-eris="snippet"]').analyze();
    expect(results.violations).toEqual([]);
  });

  test("fits a 320px viewport with no sideways scroll and no clipped controls", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/snippet");
    for (const id of ["short", "install", "long", "german"]) {
      const layout = await layoutOf(root(page, id));
      expect(layout, id).toMatchObject({
        triggerInside: true,
        codeInside: true,
        overlap: false,
        rootScrolls: false,
        pageScrolls: false,
      });
    }
  });

  test("the copy button stays beside the command at 320px, however long the command", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/snippet");
    for (const id of ["short", "install", "long"]) {
      const layout = await layoutOf(root(page, id));
      expect(layout, id).toMatchObject({ triggerBelowCode: false, codeLeftOfTrigger: true });
    }
  });

  test("still fits at 200% text size at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/snippet");
    await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
    for (const id of ["install", "long", "german"]) {
      const layout = await layoutOf(root(page, id));
      expect(layout, id).toMatchObject({
        triggerInside: true,
        codeInside: true,
        overlap: false,
        rootScrolls: false,
        pageScrolls: false,
      });
    }
  });

  test("the command keeps its left-to-right order on an RTL page", async ({ page }) => {
    await page.goto("/snippet");
    await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
    const direction = await root(page, "install").evaluate((el) => getComputedStyle(el).direction);
    expect(direction).toBe("ltr");
    expect((await layoutOf(root(page, "install"))).codeLeftOfTrigger).toBe(true);
  });
});
