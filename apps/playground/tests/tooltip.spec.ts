import { expect, test, type Page } from "@playwright/test";
import { erisRoot, expectNoSeriousViolations, leaveAndReturn, settled } from "./helpers";

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const tip = (page: Page, text: string) => page.getByRole("tooltip", { name: text, exact: true });
/** Move the pointer onto an element the way a hand does, so Zag sees real movement. */
async function rest(page: Page, name: string) {
  const box = (await button(page, name).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 2);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe("Tooltip", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tooltip");
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-ready", "");
    await page.mouse.move(0, 0);
  });

  test("opens after its delay on hover, describes the trigger, and closes on leave", async ({ page }) => {
    const save = button(page, "Save");
    await expect(save).not.toHaveAttribute("aria-describedby");
    await rest(page, "Save");
    await page.waitForTimeout(150);
    await expect(tip(page, "Save your changes")).toBeHidden();
    await expect(tip(page, "Save your changes")).toBeVisible();
    await expect(save).toHaveAccessibleDescription("Save your changes");

    await page.mouse.move(0, 0);
    await expect(tip(page, "Save your changes")).toBeHidden();
    await expect(save).not.toHaveAttribute("aria-describedby");
  });

  test("opens on keyboard focus and closes on blur", async ({ page }) => {
    await page.keyboard.press("Tab");
    for (
      let i = 0;
      i < 20 && !(await button(page, "Save").evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press("Tab");
    }
    await expect(tip(page, "Save your changes")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(tip(page, "Save your changes")).toBeHidden();
    await expect(tip(page, "Opens at once")).toBeVisible();
  });

  test("Escape hides it without moving focus", async ({ page }) => {
    await button(page, "Instant").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(tip(page, "Opens at once")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tip(page, "Opens at once")).toBeHidden();
    await expect(button(page, "Instant")).toBeFocused();
  });

  test("pressing the trigger hides it", async ({ page }) => {
    await rest(page, "Instant");
    await expect(tip(page, "Opens at once")).toBeVisible();
    await page.mouse.down();
    await expect(tip(page, "Opens at once")).toBeHidden();
    await page.mouse.up();
  });

  test("a disabled tooltip never opens", async ({ page }) => {
    await rest(page, "Disabled hint");
    await page.waitForTimeout(300);
    await expect(page.getByText("Never shown")).toBeHidden();
  });

  test("only one tooltip shows at a time", async ({ page }) => {
    await rest(page, "Bottom");
    await expect(tip(page, "Below")).toBeVisible();
    await rest(page, "Right");
    await expect(tip(page, "Beside")).toBeVisible();
    await expect(tip(page, "Below")).toBeHidden();
  });

  test("sits on the side it was given, at its gutter", async ({ page }) => {
    await rest(page, "Bottom");
    const below = await settled(tip(page, "Below"));
    const bottom = (await button(page, "Bottom").boundingBox())!;
    expect(Math.round(below.y - (bottom.y + bottom.height))).toBe(6);
    expect(Math.abs(below.x + below.width / 2 - (bottom.x + bottom.width / 2))).toBeLessThan(1);

    await rest(page, "Right");
    const beside = await settled(tip(page, "Beside"));
    const right = (await button(page, "Right").boundingBox())!;
    expect(Math.round(beside.x - (right.x + right.width))).toBe(12);
  });

  test("the content slot takes markup", async ({ page }) => {
    await rest(page, "Shortcut");
    const rich = page.getByRole("tooltip").filter({ hasText: "Search" });
    await expect(rich).toBeVisible();
    await expect(rich.locator("kbd")).toHaveText("⌘K");
  });

  test("an interactive tooltip stays open while the pointer is on it", async ({ page }) => {
    await rest(page, "Interactive");
    const box = await settled(tip(page, "Select this text"));
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.waitForTimeout(400);
    await expect(tip(page, "Select this text")).toBeVisible();
  });

  test("works on a link, and keeps a trigger's own id and description", async ({ page }) => {
    await page.getByRole("link", { name: "A link" }).hover();
    await expect(tip(page, "Opens the docs")).toBeVisible();

    const own = button(page, "Own id");
    await rest(page, "Own id");
    await expect(tip(page, "Second description")).toBeVisible();
    await expect(own).toHaveAttribute("id", "own-id");
    await expect(own).toHaveAccessibleDescription("First description Second description");
    await page.mouse.move(0, 0);
    await expect(tip(page, "Second description")).toBeHidden();
    await expect(own).toHaveAttribute("aria-describedby", "existing-help");
  });

  test("around a popover trigger, both the hint and the popover work", async ({ page }) => {
    const filters = button(page, "Filters");
    await expect(filters).toHaveAttribute("aria-haspopup", "dialog");
    await rest(page, "Filters");
    await expect(tip(page, "Filter the list")).toBeVisible();

    await filters.click();
    const panel = page.getByRole("dialog", { name: "Filter by status" });
    await expect(panel).toBeVisible();
    await expect(filters).toHaveAttribute("aria-expanded", "true");
    await expect(tip(page, "Filter the list")).toBeHidden();

    // A tooltip inside the popover does not take over the popover's own content.
    await settled(panel);
    await rest(page, "Reset filters");
    await expect(tip(page, "Clears every filter")).toBeVisible();
    await expect(panel).toBeVisible();

    // One Escape is enough: it hides the hint and closes the popover it sits in.
    await page.keyboard.press("Escape");
    await expect(tip(page, "Clears every filter")).toBeHidden();
    await expect(panel).toBeHidden();
    await expect(filters).toBeFocused();
  });

  test("around a dialog trigger, both the hint and the dialog work", async ({ page }) => {
    await rest(page, "Invite");
    await expect(tip(page, "Invite a teammate")).toBeVisible();
    await button(page, "Invite").click();
    await expect(page.getByRole("dialog", { name: "Invite people" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(button(page, "Invite")).toBeFocused();
  });

  test("still works after a view transition", async ({ page }) => {
    await leaveAndReturn(page, "Tooltip", "/tooltip");
    await expect(erisRoot(page, "basic")).toHaveAttribute("data-ready", "");
    await page.mouse.move(0, 0);
    await rest(page, "Instant");
    await expect(tip(page, "Opens at once")).toBeVisible();
    await button(page, "Filters").click();
    await expect(page.getByRole("dialog", { name: "Filter by status" })).toBeVisible();
  });

  test("has no serious accessibility violations, closed and open", async ({ page }) => {
    await expectNoSeriousViolations(page);
    await rest(page, "Instant");
    await settled(tip(page, "Opens at once"));
    await expectNoSeriousViolations(page);
  });
});
