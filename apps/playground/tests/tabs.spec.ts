import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const group = (page: Page, id: string) => page.locator(`[data-eris-id="${id}"]`);
const tab = (page: Page, id: string, name: string) => group(page, id).getByRole("tab", { name, exact: true });

test.describe("Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tabs");
  });

  test("wires tabs to panels with the right roles", async ({ page }) => {
    const account = tab(page, "settings", "Account");
    await expect(account).toHaveAttribute("aria-selected", "true");
    const panelId = await account.getAttribute("aria-controls");
    const panel = page.locator(`[id="${panelId}"]`);
    await expect(panel).toHaveRole("tabpanel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAccessibleName("Account");
    await expect(group(page, "settings").getByRole("tabpanel")).toHaveCount(1);
  });

  test("arrow keys select the next tab and skip disabled ones", async ({ page }) => {
    await tab(page, "settings", "Account").click();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "settings", "Password")).toBeFocused();
    await expect(tab(page, "settings", "Password")).toHaveAttribute("aria-selected", "true");
    await expect(group(page, "settings").getByText("Change your password.")).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "settings", "Notifications")).toBeFocused();
    await expect(tab(page, "settings", "Billing")).toHaveAttribute("aria-selected", "false");
  });

  test("Home, End and looping", async ({ page }) => {
    await tab(page, "settings", "Account").click();
    await page.keyboard.press("End");
    await expect(tab(page, "settings", "Notifications")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "settings", "Account")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(tab(page, "settings", "Notifications")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(tab(page, "settings", "Account")).toBeFocused();
  });

  test("Tab key moves from the selected tab into its panel", async ({ page }) => {
    await tab(page, "settings", "Account").click();
    await page.keyboard.press("Tab");
    await expect(group(page, "settings").getByRole("tabpanel")).toBeFocused();
  });

  test("manual activation waits for Enter, and defaultValue is respected", async ({ page }) => {
    await expect(tab(page, "code", "pnpm")).toHaveAttribute("aria-selected", "true");
    await tab(page, "code", "pnpm").focus();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "code", "bun")).toBeFocused();
    await expect(tab(page, "code", "bun")).toHaveAttribute("aria-selected", "false");
    await page.keyboard.press("Enter");
    await expect(tab(page, "code", "bun")).toHaveAttribute("aria-selected", "true");
    await expect(group(page, "code").getByText("bunx eris-ui add tabs")).toBeVisible();
  });

  test("vertical tabs use up and down arrows", async ({ page }) => {
    await expect(group(page, "vertical").getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "vertical",
    );
    await tab(page, "vertical", "General").click();
    await page.keyboard.press("ArrowDown");
    await expect(tab(page, "vertical", "Members")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowUp");
    await expect(tab(page, "vertical", "General")).toHaveAttribute("aria-selected", "true");
  });

  test("the indicator moves under the selected tab", async ({ page }) => {
    const indicator = group(page, "settings").locator('[data-part="indicator"]');
    const box = async () => (await indicator.boundingBox())!;
    const before = await box();
    await tab(page, "settings", "Password").click();
    await page.waitForTimeout(400);
    const after = await box();
    const target = (await tab(page, "settings", "Password").boundingBox())!;
    expect(after.x).toBeGreaterThan(before.x);
    expect(Math.abs(after.x - target.x)).toBeLessThan(2);
    expect(Math.abs(after.width - target.width)).toBeLessThan(2);
  });

  test("still works after a view transition", async ({ page }) => {
    await page.getByRole("link", { name: "Second page" }).click();
    await expect(page).toHaveURL(/\/second/);
    await page.getByRole("link", { name: "Tabs", exact: true }).click();
    await expect(page).toHaveURL(/\/tabs/);
    await tab(page, "settings", "Account").click();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "settings", "Password")).toHaveAttribute("aria-selected", "true");
  });

  test("a Dialog inside a tab panel keeps its own parts", async ({ page }) => {
    const nested = group(page, "nested");
    await expect(nested.getByRole("tab")).toHaveCount(2);
    const open = page.getByRole("button", { name: "Open nested dialog" });
    await expect(open).not.toHaveAttribute("role", "tab");
    await open.click();
    await expect(page.getByRole("dialog", { name: "Nested dialog" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(open).toBeFocused();
    await tab(page, "nested", "One").click();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "nested", "Two")).toHaveAttribute("aria-selected", "true");
  });

  test("has no serious accessibility violations", async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => v.id))).toEqual([]);
  });
});
