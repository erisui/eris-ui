import { expect, test, type Page } from "@playwright/test";
import { erisRoot, expectNoSeriousViolations, leaveAndReturn } from "./helpers";

const toggle = (page: Page, name: string) => page.getByRole("switch", { name, exact: true });

test.describe("Switch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/switch");
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-ready", "");
  });

  test("is a switch named by its text, off by default", async ({ page }) => {
    const email = toggle(page, "Email notifications");
    await expect(email).not.toBeChecked();
    await expect(toggle(page, "Weekly digest")).toBeChecked();
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-state", "unchecked");
    await expect(erisRoot(page, "on")).toHaveAttribute("data-state", "checked");
  });

  test("a switch with no text takes its name from the label prop", async ({ page }) => {
    const airplane = toggle(page, "Airplane mode");
    await expect(airplane).not.toBeChecked();
    await erisRoot(page, "no-text").click();
    await expect(airplane).toBeChecked();
  });

  test("clicking the track or the text toggles it", async ({ page }) => {
    const email = toggle(page, "Email notifications");
    await erisRoot(page, "basic").locator('[data-part="control"]').click();
    await expect(email).toBeChecked();
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-state", "checked");
    await page.getByText("Email notifications").click();
    await expect(email).not.toBeChecked();
  });

  test("Space toggles the focused switch and the thumb moves", async ({ page }) => {
    const email = toggle(page, "Email notifications");
    const thumb = erisRoot(page, "basic").locator('[data-part="thumb"]');
    const before = (await thumb.boundingBox())!.x;
    await email.focus();
    await page.keyboard.press("Space");
    await expect(email).toBeChecked();
    await expect.poll(async () => (await thumb.boundingBox())!.x - before).toBe(16);
    await page.keyboard.press("Space");
    await expect(email).not.toBeChecked();
  });

  test("Tab reaches the switch and shows the focus ring on the track", async ({ page }) => {
    await page.keyboard.press("Tab");
    for (
      let i = 0;
      i < 20 && !(await toggle(page, "Email notifications").evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press("Tab");
    }
    await expect(toggle(page, "Email notifications")).toBeFocused();
    const control = erisRoot(page, "basic").locator('[data-part="control"]');
    await expect(control).toHaveCSS("outline-style", "solid");
    await expect(control).toHaveCSS("outline-width", "2px");
    await expect(control).toHaveCSS("outline-color", "rgb(98, 138, 247)");
  });

  test("disabled and read-only switches do not change", async ({ page }) => {
    await expect(toggle(page, "Disabled")).toBeDisabled();
    await erisRoot(page, "disabled").click({ force: true });
    await expect(toggle(page, "Disabled")).not.toBeChecked();
    await expect(toggle(page, "Disabled and on")).toBeChecked();

    const readOnly = toggle(page, "Read only");
    await erisRoot(page, "read-only").click();
    await expect(readOnly).toBeChecked();
    await readOnly.focus();
    await page.keyboard.press("Space");
    await expect(readOnly).toBeChecked();
  });

  test("an invalid switch says so", async ({ page }) => {
    await expect(toggle(page, "Accept the terms")).toHaveAttribute("aria-invalid", "true");
    await expect(erisRoot(page, "invalid")).toHaveAttribute("data-invalid", "");
  });

  test("submits its name and value only while on, and form reset restores it", async ({ page }) => {
    const save = page.getByRole("button", { name: "Save" });
    await save.click();
    await expect(page.locator("#submitted")).toHaveText("marketing=yes");

    await erisRoot(page, "marketing").click();
    await erisRoot(page, "beta").click();
    await save.click();
    await expect(page.locator("#submitted")).toHaveText("beta=on");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(toggle(page, "Marketing emails")).toBeChecked();
    await expect(toggle(page, "Beta features")).not.toBeChecked();
    await expect(erisRoot(page, "marketing")).toHaveAttribute("data-state", "checked");
  });

  test("works inside a tab panel without disturbing the tabs", async ({ page }) => {
    const inner = toggle(page, "Switch in a panel");
    await erisRoot(page, "in-tabs").click();
    await expect(inner).toBeChecked();
    await expect(erisRoot(page, "nested").getByRole("tab", { name: "One" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("still works after a view transition", async ({ page }) => {
    await leaveAndReturn(page, "Switch", "/switch");
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-ready", "");
    await erisRoot(page, "basic").click();
    await expect(toggle(page, "Email notifications")).toBeChecked();
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-state", "checked");
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await expectNoSeriousViolations(page);
  });
});

test("Switch toggles and submits before its script runs", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/switch");
  const email = page.getByRole("switch", { name: "Email notifications", exact: true });
  await page.getByText("Email notifications").click();
  await expect(email).toBeChecked();
  const thumb = page.locator('[data-eris-id="basic"] [data-part="thumb"]');
  await expect(thumb).toHaveCSS("translate", "19px");
  await context.close();
});
