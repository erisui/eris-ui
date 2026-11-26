import { expect, test, type Locator, type Page } from "@playwright/test";

// Brand rule: focus is always visible, a 2px ring in
// #628AF7 with a 2px gap, on every keyboard focus. Moving focus is not enough; the ring
// has to be drawn. Tailwind v4's `outline-none` once left it at `outline-style: none`.
const RING = "rgb(98, 138, 247)";

/** Press Tab until `target` has focus, the way a keyboard user gets there. */
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the target");
}

async function expectRing(target: Locator) {
  await expect(target).toBeFocused();
  await expect(target).toHaveCSS("outline-style", "solid");
  await expect(target).toHaveCSS("outline-width", "2px");
  await expect(target).toHaveCSS("outline-offset", "2px");
  await expect(target).toHaveCSS("outline-color", RING);
}

/**
 * The ring is the ring colour from the first frame. A control that transitions outline-color
 * (Tailwind's transition-colors does) fades it in from the text colour instead.
 */
async function expectRingAtOnce(page: Page, focused: Locator, ring: Locator = focused) {
  await tabTo(page, focused);
  const style = await ring.evaluate((el) => {
    const css = getComputedStyle(el);
    return { color: css.outlineColor, transitions: css.transitionProperty };
  });
  expect(style.transitions).not.toMatch(/\b(all|outline-color|outline)\b/);
  expect(style.color).toBe(RING);
}

test.describe("Focus ring", () => {
  test("buttons and dialog triggers show the ring on keyboard focus", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Save changes", "Get All-Access", "Create project"]) {
      const button = page.getByRole("button", { name, exact: true });
      await tabTo(page, button);
      await expectRing(button);
    }
  });

  test("tabs and tab panels show the ring on keyboard focus", async ({ page }) => {
    await page.goto("/tabs");
    const settings = page.locator('[data-eris-id="settings"]');
    const trigger = settings.getByRole("tab", { name: "Account", exact: true });
    await tabTo(page, trigger);
    await expectRing(trigger);

    const panel = settings.getByRole("tabpanel");
    await tabTo(page, panel);
    await expectRing(panel);
  });

  test("library controls draw the ring at once, without fading it in", async ({ page }) => {
    await page.goto("/tabs");
    await expectRingAtOnce(page, page.getByRole("tab", { name: "Account", exact: true }));
    await page.goto("/accordion");
    await expectRingAtOnce(page, page.locator('[data-eris-id="faq"]').getByRole("button").first());
    await page.goto("/select");
    await expectRingAtOnce(page, page.locator('[data-eris-id="framework"]').getByRole("combobox"));
    for (const name of ["checkbox", "switch"]) {
      await page.goto(`/${name}`);
      const root = page.locator('[data-eris-id="basic"]');
      await expectRingAtOnce(page, root.locator("input"), root.locator('[data-part="control"]'));
    }
  });

  test("a mouse click does not show the ring", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Save changes", exact: true });
    await button.click();
    await expect(button).toBeFocused();
    await expect(button).toHaveCSS("outline-style", "none");
  });
});
