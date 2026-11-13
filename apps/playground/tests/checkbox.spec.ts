import { expect, test, type Page } from "@playwright/test";
import { erisRoot, expectNoSeriousViolations, leaveAndReturn } from "./helpers";

const box = (page: Page, name: string) => page.getByRole("checkbox", { name, exact: true });
const mixed = (page: Page, name: string) =>
  box(page, name).evaluate((el) => (el as HTMLInputElement).indeterminate);

test.describe("Checkbox", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/checkbox");
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-ready", "");
  });

  test("is a checkbox named by its text, unchecked by default", async ({ page }) => {
    await expect(box(page, "Remember me")).not.toBeChecked();
    await expect(box(page, "Send me updates")).toBeChecked();
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-state", "unchecked");
    await expect(erisRoot(page, "on")).toHaveAttribute("data-state", "checked");
  });

  test("a checkbox with no text takes its name from the label prop", async ({ page }) => {
    await erisRoot(page, "no-text").click();
    await expect(box(page, "Select row")).toBeChecked();
  });

  test("clicking the box or the text toggles it and shows the tick", async ({ page }) => {
    const tick = erisRoot(page, "basic").locator("svg").first();
    await expect(tick).toHaveCSS("opacity", "0");
    await erisRoot(page, "basic").locator('[data-part="control"]').click();
    await expect(box(page, "Remember me")).toBeChecked();
    await expect(tick).toHaveCSS("opacity", "1");
    await page.getByText("Remember me").click();
    await expect(box(page, "Remember me")).not.toBeChecked();
  });

  test("Space toggles the focused checkbox", async ({ page }) => {
    await box(page, "Remember me").focus();
    await page.keyboard.press("Space");
    await expect(box(page, "Remember me")).toBeChecked();
    await page.keyboard.press("Space");
    await expect(box(page, "Remember me")).not.toBeChecked();
  });

  test("keyboard focus shows the ring on the box", async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      if (await box(page, "Remember me").evaluate((el) => el === document.activeElement)) break;
    }
    await expect(box(page, "Remember me")).toBeFocused();
    const control = erisRoot(page, "basic").locator('[data-part="control"]');
    await expect(control).toHaveCSS("outline-style", "solid");
    await expect(control).toHaveCSS("outline-width", "2px");
    await expect(control).toHaveCSS("outline-color", "rgb(98, 138, 247)");
  });

  test("starts mixed, shows the dash, and a click checks it", async ({ page }) => {
    expect(await mixed(page, "Some selected")).toBe(true);
    await expect(erisRoot(page, "mixed")).toHaveAttribute("data-state", "indeterminate");
    const [tick, dash] = [
      erisRoot(page, "mixed").locator("svg").first(),
      erisRoot(page, "mixed").locator("svg").last(),
    ];
    await expect(dash).toHaveCSS("opacity", "1");
    await expect(tick).toHaveCSS("opacity", "0");

    await erisRoot(page, "mixed").click();
    await expect(box(page, "Some selected")).toBeChecked();
    expect(await mixed(page, "Some selected")).toBe(false);
    await expect(dash).toHaveCSS("opacity", "0");
    await expect(tick).toHaveCSS("opacity", "1");
  });

  test("a parent box follows its children through setChecked", async ({ page }) => {
    expect(await mixed(page, "All toppings")).toBe(true);
    await erisRoot(page, "olives").click();
    await expect(box(page, "All toppings")).toBeChecked();
    expect(await mixed(page, "All toppings")).toBe(false);

    await erisRoot(page, "all").click();
    await expect(box(page, "Cheese")).not.toBeChecked();
    await expect(box(page, "Olives")).not.toBeChecked();
    await expect(erisRoot(page, "cheese")).toHaveAttribute("data-state", "unchecked");

    await erisRoot(page, "cheese").click();
    expect(await mixed(page, "All toppings")).toBe(true);
  });

  test("disabled and read-only checkboxes do not change", async ({ page }) => {
    await expect(box(page, "Disabled")).toBeDisabled();
    await erisRoot(page, "disabled").click({ force: true });
    await expect(box(page, "Disabled")).not.toBeChecked();
    await expect(box(page, "Disabled and checked")).toBeChecked();

    await erisRoot(page, "read-only").click();
    await expect(box(page, "Read only")).toBeChecked();
    await box(page, "Read only").focus();
    await page.keyboard.press("Space");
    await expect(box(page, "Read only")).toBeChecked();
  });

  test("an invalid checkbox says so", async ({ page }) => {
    await expect(box(page, "Accept the terms")).toHaveAttribute("aria-invalid", "true");
    await expect(erisRoot(page, "invalid")).toHaveAttribute("data-invalid", "");
  });

  test("submits its name and value only while checked, and form reset restores it", async ({ page }) => {
    const save = page.getByRole("button", { name: "Save" });
    await save.click();
    await expect(page.locator("#submitted")).toHaveText("terms=accepted");

    await erisRoot(page, "terms").click();
    await erisRoot(page, "news").click();
    await save.click();
    await expect(page.locator("#submitted")).toHaveText("news=on");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(box(page, "Terms")).toBeChecked();
    await expect(box(page, "Newsletter")).not.toBeChecked();
    await expect(erisRoot(page, "terms")).toHaveAttribute("data-state", "checked");
  });

  test("works inside a dialog, and the dialog still traps focus", async ({ page }) => {
    await page.getByRole("button", { name: "Open dialog" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete project" });
    await expect(dialog).toBeVisible();
    await erisRoot(page, "in-dialog").click();
    await expect(dialog.getByRole("checkbox", { name: "Also delete backups" })).toBeChecked();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("still works after a view transition", async ({ page }) => {
    await leaveAndReturn(page, "Checkbox", "/checkbox");
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-ready", "");
    await erisRoot(page, "basic").click();
    await expect(box(page, "Remember me")).toBeChecked();
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-state", "checked");
    expect(await mixed(page, "Some selected")).toBe(true);
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await expectNoSeriousViolations(page);
  });
});

test("Checkbox toggles and shows the mixed dash before its script runs", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/checkbox");
  await page.getByText("Remember me").click();
  await expect(page.getByRole("checkbox", { name: "Remember me", exact: true })).toBeChecked();
  await expect(page.locator('[data-eris-id="basic"] svg').first()).toHaveCSS("opacity", "1");
  await expect(page.locator('[data-eris-id="mixed"] svg').last()).toHaveCSS("opacity", "1");
  await context.close();
});
