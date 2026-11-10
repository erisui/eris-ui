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

  test("closes on outside click, but an alertdialog does not", async ({ page }) => {
    await trigger(page, "Create project").click();
    const dialog = page.getByRole("dialog", { name: "Create project" });
    await expect(dialog).toBeVisible();
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
