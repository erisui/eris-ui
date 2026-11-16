import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousViolations, leaveAndReturn } from "./helpers";

const box = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });
const fill = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
const opacity = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).opacity);
/** The centre of the nth child of a heatmap's grid, counting gaps. */
const centre = async (page: Page, id: string, nth: number) => {
  // The mouse does not scroll the page, so on a short screen the cell has to be brought into view.
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  const b = await box(page, `#${id} [data-part="grid"] > :nth-child(${nth})`);
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
};
const readout = (page: Page, id: string) => page.locator(`#${id} [data-part="readout"]`);
const active = (page: Page, id: string) => page.locator(`#${id} [data-active]`);

test.describe("Heatmap", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/heatmap");
    await expect(page.locator("#scrub")).toHaveAttribute("data-ready", "");
    // The readout is measured to centre it, so its font has to be the final one.
    await page.evaluate(() => document.fonts.ready);
  });

  test("is one image named by its label", async ({ page }) => {
    await expect(
      page.locator("#basic").getByRole("img", { name: "Commits per day over 26 weeks" }),
    ).toBeVisible();
    await expect(page.locator('#basic [data-part="cell"]')).toHaveCount(26 * 7);
  });

  test("fills each column from the top, seven cells deep", async ({ page }) => {
    const first = await box(page, '#basic [data-part="cell"]:nth-child(1)');
    const second = await box(page, '#basic [data-part="cell"]:nth-child(2)');
    const eighth = await box(page, '#basic [data-part="cell"]:nth-child(8)');
    expect(second.left).toBeCloseTo(first.left, 1);
    expect(second.top).toBeGreaterThan(first.top);
    expect(eighth.top).toBeCloseTo(first.top, 1);
    expect(eighth.left).toBeGreaterThan(first.left);
  });

  test("gives each step its own colour, from empty to full", async ({ page }) => {
    const cells = page.locator('#steps [data-part="cell"]');
    await expect(cells).toHaveCount(5);
    expect(await cells.evaluateAll((els) => els.map((el) => el.getAttribute("data-level")))).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
    ]);
    const fills = await cells.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
    expect(new Set(fills).size).toBe(5);
  });

  test("scales to the largest value unless max is set", async ({ page }) => {
    // 2, 0 and 9 with no max: 9 is full, 2 is the first step.
    const levels = await page
      .locator('#labelled [data-part="cell"]')
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-level")));
    expect(levels).toEqual(["1", "0", "4"]);
  });

  test("without interactive, a labelled cell keeps a native title", async ({ page }) => {
    await expect(page.locator('#labelled [data-part="cell"]').first()).toHaveAttribute(
      "title",
      "2 deploys on Monday",
    );
    await expect(page.locator('#basic [data-part="cell"]').first()).not.toHaveAttribute("title");
  });

  test("a null value leaves a gap and keeps the next cell in its place", async ({ page }) => {
    await expect(page.locator('#offset [data-part="gap"]')).toHaveCount(3);
    const root = await box(page, "#offset");
    const firstCell = await box(page, '#offset [data-part="cell"]');
    expect(firstCell.left).toBeCloseTo(root.left, 1);
    expect(firstCell.top - root.top).toBeGreaterThanOrEqual(firstCell.height * 3);
  });

  test("cells are square at every size", async ({ page }) => {
    // Wide enough that no heatmap has to shrink.
    await page.setViewportSize({ width: 1280, height: 720 });
    for (const [id, px] of [
      ["#small", 10],
      ["#basic", 12],
      ["#large", 16],
    ] as const) {
      const cell = await box(page, `${id} [data-part="cell"]`);
      expect(cell.width, id).toBeCloseTo(px, 1);
      expect(cell.height, id).toBeCloseTo(px, 1);
    }
  });

  test("takes another colour from --eris-heatmap", async ({ page }) => {
    const hot = '[data-part="cell"][data-level="6"]';
    await expect(page.locator(`#danger ${hot}`).first()).toBeVisible();
    expect(await fill(page, `#danger ${hot}`)).not.toBe(
      await fill(page, '#steps [data-part="cell"][data-level="4"]'),
    );
  });

  test.describe("on a narrow screen", () => {
    // Every heatmap on the page, a full year included, at the two narrowest phones we support.
    for (const width of [320, 375]) {
      test(`fits ${width}px: cells shrink, stay square, and nothing scrolls sideways`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto("/heatmap");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        ).toBe(0);
        const column = await box(page, "main");
        for (const id of await page
          .locator('[data-eris="heatmap"]')
          .evaluateAll((els) => els.map((el) => el.id))) {
          const grid = await box(page, `#${id} [data-part="grid"]`);
          expect(grid.right, id).toBeLessThanOrEqual(column.right + 0.5);
          const cell = await box(page, `#${id} [data-part="cell"]`);
          expect(Math.abs(cell.width - cell.height), id).toBeLessThan(0.1);
          expect(cell.width, id).toBeGreaterThan(0);
        }
        // 52 columns cannot stay 12px wide. Cells and gaps shrink together, so a cell stays readable
        // and keeps its share of the column: four parts cell to one part gap.
        const year = await box(page, '#year [data-part="cell"]');
        const next = await box(page, '#year [data-part="cell"]:nth-child(8)');
        expect(year.width).toBeLessThan(12);
        expect(year.width).toBeGreaterThanOrEqual(4);
        expect(year.width / (next.left - year.left)).toBeCloseTo(0.8, 1);
      });
    }

    test("a finger dragged across reads each cell and keeps the readout on screen", async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 320, height: 800 }, hasTouch: true });
      const page = await context.newPage();
      await page.goto("/heatmap");
      await expect(page.locator("#scrub")).toHaveAttribute("data-ready", "");
      await page.locator("#scrub").scrollIntoViewIfNeeded();

      const touch = async (type: "pointerdown" | "pointermove" | "pointerup", at: { x: number; y: number }) =>
        page.locator('#scrub [data-part="grid"]').dispatchEvent(type, {
          pointerType: "touch",
          pointerId: 1,
          isPrimary: true,
          clientX: at.x,
          clientY: at.y,
          bubbles: true,
        });
      // The third child is the first cell: two gaps come before it.
      await touch("pointerdown", await centre(page, "scrub", 3));
      await expect(readout(page, "scrub")).toHaveText(/ commits on day 3$/);
      // Drag to the last column: the readout would hang off the right edge if it stayed centred.
      await touch("pointermove", await centre(page, "scrub", 26 * 7));
      await expect(readout(page, "scrub")).toHaveText(/ commits on day 182$/);
      const tip = await box(page, '#scrub [data-part="readout"]');
      expect(tip.right).toBeLessThanOrEqual(320 - 8 + 0.5);
      // The finger covers the cell, so the readout sits clear above it.
      const cell = await box(page, "#scrub [data-active]");
      expect(cell.top - tip.bottom).toBeGreaterThanOrEqual(13);

      await touch("pointerup", await centre(page, "scrub", 26 * 7));
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "open");
      await page.locator("h1").dispatchEvent("pointerdown", { pointerType: "touch", bubbles: true });
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "closed");
      await context.close();
    });
  });

  test.describe("legend", () => {
    test("shows every step between its two words", async ({ page }) => {
      const legend = page.locator("#legend");
      await expect(legend).toHaveText(/Less\s*More/);
      await expect(legend.locator("[data-level]")).toHaveCount(5);
      expect(await fill(page, '#legend [data-level="4"]')).toBe(
        await fill(page, '#steps [data-part="cell"][data-level="4"]'),
      );
    });

    test("pointing at a step dims every other cell, and leaving restores them", async ({ page }) => {
      await page.locator('#legend [data-level="4"]').hover();
      await expect(page.locator('#basic [data-part="cell"][data-level="4"][data-dim]')).toHaveCount(0);
      await expect(
        page.locator('#basic [data-part="cell"]:not([data-level="4"]):not([data-dim])'),
      ).toHaveCount(0);
      await expect.poll(() => opacity(page, '#basic [data-part="cell"][data-level="0"]')).toBe("0.3");
      expect(await opacity(page, '#basic [data-part="cell"][data-level="4"]')).toBe("1");

      await page.locator("h1").hover();
      await expect(page.locator("#basic [data-dim]")).toHaveCount(0);
    });

    test("clicking a step pins it, and clicking again lets go", async ({ page }) => {
      const step = page.locator('#legend [data-level="2"]');
      await step.click();
      await page.locator("h1").hover();
      await expect(page.locator('#basic [data-part="cell"][data-level="3"]').first()).toHaveAttribute(
        "data-dim",
        "",
      );
      await step.click();
      await page.locator("h1").hover();
      await expect(page.locator("#basic [data-dim]")).toHaveCount(0);
    });

    test("only dims the heatmap it belongs to", async ({ page }) => {
      await page.locator('#legend [data-level="4"]').hover();
      await expect(page.locator("#basic [data-dim]").first()).toBeAttached();
      await expect(page.locator("#scrub [data-dim]")).toHaveCount(0);
    });
  });

  test.describe("interactive", () => {
    test("the grid is one tab stop named by its label, and the readout is closed at rest", async ({
      page,
    }) => {
      const grid = page.locator('#scrub [data-part="grid"]');
      await expect(grid).toHaveAttribute("aria-label", "Commits per day over 26 weeks");
      await expect(grid).toHaveAttribute("tabindex", "0");
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "closed");
      await expect(active(page, "scrub")).toHaveCount(0);
    });

    test("hovering a cell marks it and shows its label above it", async ({ page }) => {
      const at = await centre(page, "scrub", 30);
      await page.mouse.move(at.x, at.y);
      await expect(readout(page, "scrub")).toHaveText(/ commits on day 30$/);
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "open");
      await expect(active(page, "scrub")).toHaveCount(1);
      const tip = await box(page, '#scrub [data-part="readout"]');
      const cell = await box(page, "#scrub [data-active]");
      expect(tip.bottom).toBeLessThanOrEqual(cell.top);
      expect(Math.abs((tip.left + tip.right) / 2 - (cell.left + cell.right) / 2)).toBeLessThanOrEqual(1);
    });

    test("moving between cells jumps the readout with no transition on its position", async ({ page }) => {
      const first = await centre(page, "scrub", 30);
      await page.mouse.move(first.x, first.y);
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "open");
      expect(await readout(page, "scrub").evaluate((el) => getComputedStyle(el).transitionProperty)).toBe(
        "opacity",
      );
      const before = await box(page, '#scrub [data-part="readout"]');
      const next = await centre(page, "scrub", 100);
      await page.mouse.move(next.x, next.y);
      await expect(active(page, "scrub")).toHaveCount(1);
      expect((await box(page, '#scrub [data-part="readout"]')).left).toBeGreaterThan(before.left);
    });

    test("the space between two cells keeps the readout open", async ({ page }) => {
      const a = await box(page, '#scrub [data-part="grid"] > :nth-child(30)');
      await page.mouse.move(a.left + a.width / 2, a.top + a.height / 2);
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "open");
      await page.mouse.move(a.left + a.width / 2, a.bottom + 1);
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "open");
      await expect(active(page, "scrub")).toHaveCount(1);
    });

    test("leaving the grid closes the readout", async ({ page }) => {
      const at = await centre(page, "scrub", 30);
      await page.mouse.move(at.x, at.y);
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "open");
      await page.locator("h1").hover();
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "closed");
      await expect(active(page, "scrub")).toHaveCount(0);
    });

    test("a cell with no label reads out its value", async ({ page }) => {
      const at = await centre(page, "plain-values", 3);
      await page.mouse.move(at.x, at.y);
      await expect(readout(page, "plain-values")).toHaveText("8");
    });

    test("Tab starts on the first cell, skips gaps, and announces it", async ({ page }) => {
      await page.locator('#scrub [data-part="grid"]').focus();
      await expect(readout(page, "scrub")).toHaveText(/ commits on day 3$/);
      await expect(page.locator('#scrub [data-part="announce"]')).toHaveText(/ commits on day 3$/);
    });

    test("ArrowDown and ArrowUp move within the column and stop at its ends", async ({ page }) => {
      await page.locator('#scrub [data-part="grid"]').focus();
      await page.keyboard.press("ArrowDown");
      await expect(readout(page, "scrub")).toHaveText(/ on day 4$/);
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("ArrowUp");
      // Above day 3 there are only gaps, so it stays.
      await expect(readout(page, "scrub")).toHaveText(/ on day 3$/);
      for (let i = 0; i < 9; i++) await page.keyboard.press("ArrowDown");
      await expect(readout(page, "scrub")).toHaveText(/ on day 7$/);
    });

    test("ArrowRight and ArrowLeft move a column at a time", async ({ page }) => {
      await page.locator('#scrub [data-part="grid"]').focus();
      await page.keyboard.press("ArrowRight");
      await expect(readout(page, "scrub")).toHaveText(/ on day 10$/);
      await expect(page.locator('#scrub [data-part="announce"]')).toHaveText(/ on day 10$/);
      await page.keyboard.press("ArrowLeft");
      await expect(readout(page, "scrub")).toHaveText(/ on day 3$/);
      await page.keyboard.press("ArrowLeft");
      await expect(readout(page, "scrub")).toHaveText(/ on day 3$/);
    });

    test("Home and End go to the first and last cell", async ({ page }) => {
      await page.locator('#scrub [data-part="grid"]').focus();
      await page.keyboard.press("End");
      await expect(readout(page, "scrub")).toHaveText(/ on day 182$/);
      await page.keyboard.press("Home");
      await expect(readout(page, "scrub")).toHaveText(/ on day 3$/);
    });

    test("Escape and Tab away close the readout", async ({ page }) => {
      const grid = page.locator('#scrub [data-part="grid"]');
      await grid.focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Escape");
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "closed");
      await page.keyboard.press("ArrowDown");
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "open");
      await page.keyboard.press("Tab");
      await expect(readout(page, "scrub")).toHaveAttribute("data-state", "closed");
    });

    test("still works after a view transition", async ({ page }) => {
      await leaveAndReturn(page, "Heatmap", "/heatmap");
      await expect(page.locator("#scrub")).toHaveAttribute("data-ready", "");
      const at = await centre(page, "scrub", 30);
      await page.mouse.move(at.x, at.y);
      await expect(readout(page, "scrub")).toHaveText(/ commits on day 30$/);
      await expect(active(page, "scrub")).toHaveCount(1);
      await page.locator('#legend [data-level="4"]').hover();
      await expect(page.locator("#basic [data-dim]").first()).toBeAttached();
    });
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await expectNoSeriousViolations(page);
  });
});
