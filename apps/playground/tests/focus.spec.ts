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
  // toHaveCSS retries, so this waits out the trigger's colour transition.
  await expect(target).toHaveCSS("outline-color", RING);
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

  test("a mouse click does not show the ring", async ({ page }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "Save changes", exact: true });
    await button.click();
    await expect(button).toBeFocused();
    await expect(button).toHaveCSS("outline-style", "none");
  });
});
