import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const trigger = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("button", { name, exact: true });

test.describe("Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("opens on click, moves focus inside, closes on Escape and returns focus", async ({ page }) => {
    const open = trigger(page, "Create project");
    // A modal hides the rest of the page from assistive tech, so read the trigger by its part.
    const raw = page.locator('[data-eris-id="create-project"] [data-part="trigger"]');
    await expect(raw).toHaveAttribute("aria-expanded", "false");
    await open.click();

    const dialog = page.getByRole("dialog", { name: "Create project" });
    await expect(dialog).toBeVisible();
    await expect(raw).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("nav")).toHaveAttribute("aria-hidden", "true");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAccessibleDescription("Deploy your new project in one click.");
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });

  test("works from the keyboard and traps focus", async ({ page }) => {
    const open = trigger(page, "Create project");
    await open.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Create project" });
    await expect(dialog).toBeVisible();

    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
  });

  for (const change of ["removed", "hidden", "disabled"] as const) {
    test(`moves focus to main when the trigger is ${change} before close`, async ({ page }) => {
      const raw = page.locator('[data-eris-id="create-project"] [data-part="trigger"]');
      await raw.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Create project" });
      await expect(dialog).toBeVisible();

      await raw.evaluate((el: HTMLButtonElement, change) => {
        if (change === "removed") el.remove();
        if (change === "hidden") el.style.display = "none";
        if (change === "disabled") el.disabled = true;
      }, change);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      const main = page.locator("main");
      await expect(main).toBeFocused();

      // main is only focusable for that landing.
      await page.keyboard.press("Tab");
      await expect(main).not.toBeFocused();
      await expect(main).not.toHaveAttribute("tabindex");
    });
  }

  test("finalFocus sends focus to the chosen element on close", async ({ page }) => {
    await trigger(page, "Archive project").click();
    const dialog = page.getByRole("dialog", { name: "Archive this project?" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator("#projects-heading")).toBeFocused();
  });

  test("finalFocus still applies when the dialog closes in the frame it opened", async ({ page }) => {
    const raw = page.locator('[data-eris-id="archive-project"] [data-part="trigger"]');
    await raw.evaluate(async (el: HTMLButtonElement) => {
      el.focus();
      el.click();
      // One task later the dialog is open but its focus trap has not started.
      await new Promise((resolve) => setTimeout(resolve, 0));
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await expect(raw).toHaveAttribute("data-state", "closed");
    await expect(page.locator("#projects-heading")).toBeFocused();
  });

  test("falls back to the trigger when finalFocus matches nothing", async ({ page }) => {
    await page.locator("#projects-heading").evaluate((el) => el.remove());
    await trigger(page, "Archive project").click();
    const dialog = page.getByRole("dialog", { name: "Archive this project?" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger(page, "Archive project")).toBeFocused();
  });

  test("closes on outside click, but an alertdialog does not", async ({ page }) => {
    await trigger(page, "Create project").click();
    const dialog = page.getByRole("dialog", { name: "Create project" });
    await expect(dialog).toBeVisible();
    // Outside clicks only count once the dialog has taken focus.
    await expect(dialog.getByPlaceholder("Name of your project")).toBeFocused();
    await page.mouse.click(10, 10);
    await expect(dialog).toBeHidden();

    await trigger(page, "Delete project").click();
    const alert = page.getByRole("alertdialog", { name: "Delete this project?" });
    await expect(alert).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(alert).toBeVisible();
    await alert.getByRole("button", { name: "Keep it" }).click();
    await expect(alert).toBeHidden();
  });

  test("locks page scroll while open", async ({ page }) => {
    await trigger(page, "Create project").click();
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await page.keyboard.press("Escape");
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });

  test("remounts cleanly across view transitions", async ({ page }) => {
    await page.getByRole("link", { name: "Second page" }).click();
    await expect(page).toHaveURL(/\/second/);
    await trigger(page, "Open on page two").click();
    await expect(page.getByRole("dialog", { name: "Still works" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("link", { name: "Dialog", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await trigger(page, "Create project").click();
    await expect(page.getByRole("dialog", { name: "Create project" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger(page, "Create project")).toBeFocused();
  });

  test("has no serious accessibility violations when open", async ({ page }) => {
    await trigger(page, "Create project").click();
    await expect(page.getByRole("dialog", { name: "Create project" })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });
});
