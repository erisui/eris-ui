import { expect, test, type Page } from "@playwright/test";
import { erisRoot, expectNoSeriousViolations, leaveAndReturn, settled } from "./helpers";

const trigger = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const menu = (page: Page, name: string) => page.getByRole("menu", { name, exact: true });
const item = (page: Page, name: string) => page.getByRole("menuitem", { name, exact: true });
const selected = (page: Page) => page.locator("#selected");
/** The item the keyboard is on. Focus stays on the menu; the item is marked highlighted. */
const highlighted = (page: Page, id: string) => erisRoot(page, id).locator("[data-highlighted]");

/** Wait until an opened menu has taken focus and stopped moving, so keys and clicks land on it. */
async function ready(page: Page, name: string) {
  await expect(menu(page, name)).toBeFocused();
  await settled(menu(page, name));
}

test.describe("Menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/menu");
    await expect(erisRoot(page, "actions")).toHaveAttribute("data-ready", "");
  });

  test("the trigger opens a menu named after it", async ({ page }) => {
    const actions = trigger(page, "Actions");
    await expect(actions).toHaveAttribute("aria-haspopup", "menu");
    await expect(actions).toHaveAttribute("aria-expanded", "false");
    await actions.click();
    await expect(actions).toHaveAttribute("aria-expanded", "true");
    await expect(menu(page, "Actions")).toBeVisible();
    await expect(menu(page, "Actions").getByRole("menuitem")).toHaveCount(5);
    await expect(menu(page, "Actions").getByRole("separator")).toHaveCount(1);
    expect(await actions.getAttribute("aria-controls")).toBe(await menu(page, "Actions").getAttribute("id"));
  });

  test("Enter, Space and ArrowDown on the trigger open it on the first item", async ({ page }) => {
    for (const key of ["Enter", "Space", "ArrowDown"]) {
      await trigger(page, "Actions").focus();
      await page.keyboard.press(key);
      await ready(page, "Actions");
      await expect(highlighted(page, "actions")).toHaveText("Edit");
      await page.keyboard.press("Escape");
      await expect(menu(page, "Actions")).toBeHidden();
    }
  });

  test("ArrowUp on the trigger opens it on the last item", async ({ page }) => {
    await trigger(page, "Actions").focus();
    await page.keyboard.press("ArrowUp");
    await ready(page, "Actions");
    await expect(highlighted(page, "actions")).toHaveText("Delete");
  });

  test("arrow keys, Home and End move through items and skip disabled ones", async ({ page }) => {
    await trigger(page, "Actions").focus();
    await page.keyboard.press("Enter");
    await ready(page, "Actions");
    await expect(highlighted(page, "actions")).toHaveText("Edit");
    await page.keyboard.press("ArrowDown");
    await expect(highlighted(page, "actions")).toHaveText("Duplicate");
    await page.keyboard.press("ArrowDown");
    await expect(highlighted(page, "actions")).toHaveText("Second page link");
    await page.keyboard.press("End");
    await expect(highlighted(page, "actions")).toHaveText("Delete");
    // Without loopFocus, the last item is the end.
    await page.keyboard.press("ArrowDown");
    await expect(highlighted(page, "actions")).toHaveText("Delete");
    await page.keyboard.press("Home");
    await expect(highlighted(page, "actions")).toHaveText("Edit");
    await expect(item(page, "Archive")).toHaveAttribute("aria-disabled", "true");
  });

  test("with loopFocus, the arrow keys wrap around", async ({ page }) => {
    await trigger(page, "View").focus();
    await page.keyboard.press("ArrowUp");
    await ready(page, "View");
    await expect(highlighted(page, "view")).toHaveText("Spacious");
    await page.keyboard.press("ArrowDown");
    await expect(highlighted(page, "view")).toHaveText("Toolbar");
  });

  test("typing jumps to the item that starts with those letters", async ({ page }) => {
    await trigger(page, "Actions").click();
    await ready(page, "Actions");
    await expect(menu(page, "Actions")).toBeVisible();
    await page.keyboard.type("de");
    await expect(highlighted(page, "actions")).toHaveText("Delete");
    await page.waitForTimeout(600);
    await page.keyboard.type("du");
    await expect(highlighted(page, "actions")).toHaveText("Duplicate");
  });

  test("Enter chooses the item, closes the menu and returns focus", async ({ page }) => {
    await trigger(page, "Actions").focus();
    await page.keyboard.press("Enter");
    await ready(page, "Actions");
    await expect(highlighted(page, "actions")).toHaveText("Edit");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(selected(page)).toHaveText("duplicate");
    await expect(menu(page, "Actions")).toBeHidden();
    await expect(trigger(page, "Actions")).toBeFocused();
  });

  test("clicking an item chooses it, and a disabled item does nothing", async ({ page }) => {
    await trigger(page, "Actions").click();
    await ready(page, "Actions");
    await item(page, "Archive").click({ force: true });
    await expect(menu(page, "Actions")).toBeVisible();
    await expect(selected(page)).toHaveText("");
    await item(page, "Delete").click();
    await expect(selected(page)).toHaveText("delete");
    await expect(menu(page, "Actions")).toBeHidden();
  });

  test("Escape and an outside click close it, and Tab stays inside", async ({ page }) => {
    await trigger(page, "Actions").click();
    await ready(page, "Actions");
    await page.keyboard.press("Escape");
    await expect(menu(page, "Actions")).toBeHidden();
    await expect(trigger(page, "Actions")).toBeFocused();

    await trigger(page, "Actions").click();
    await ready(page, "Actions");
    await expect(menu(page, "Actions")).toBeVisible();
    await page.locator("h1").click();
    await expect(menu(page, "Actions")).toBeHidden();

    // Tab does not leave an open menu: focus stays in it until it closes.
    await trigger(page, "Actions").focus();
    await page.keyboard.press("Enter");
    await ready(page, "Actions");
    await expect(highlighted(page, "actions")).toHaveText("Edit");
    await page.keyboard.press("Tab");
    await expect(menu(page, "Actions")).toBeVisible();
    await expect(highlighted(page, "actions")).toHaveText("Edit");
  });

  test("a link item navigates on click and on Enter", async ({ page }) => {
    await trigger(page, "Actions").click();
    await ready(page, "Actions");
    const link = item(page, "Second page link");
    expect(await link.evaluate((el) => el.tagName)).toBe("A");
    await link.click();
    await expect(page).toHaveURL(/\/second$/);

    await page.goBack();
    await expect(erisRoot(page, "actions")).toHaveAttribute("data-ready", "");
    await trigger(page, "Actions").focus();
    await page.keyboard.press("Enter");
    await ready(page, "Actions");
    await expect(highlighted(page, "actions")).toHaveText("Edit");
    await page.keyboard.type("se");
    await expect(highlighted(page, "actions")).toHaveText("Second page link");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/second$/);
  });

  test("checkbox items toggle and stay open when closeOnSelect is off", async ({ page }) => {
    await trigger(page, "View").click();
    await ready(page, "View");
    const toolbar = page.getByRole("menuitemcheckbox", { name: "Toolbar" });
    const sidebar = page.getByRole("menuitemcheckbox", { name: "Sidebar" });
    await expect(toolbar).toHaveAttribute("aria-checked", "true");
    await expect(sidebar).toHaveAttribute("aria-checked", "false");
    await expect(sidebar.locator("svg")).toHaveCSS("opacity", "0");

    await sidebar.click();
    await expect(sidebar).toHaveAttribute("aria-checked", "true");
    await expect(sidebar.locator("svg")).toHaveCSS("opacity", "1");
    await expect(selected(page)).toHaveText("sidebar true");
    await expect(menu(page, "View")).toBeVisible();

    await toolbar.click();
    await expect(toolbar).toHaveAttribute("aria-checked", "false");
    await expect(selected(page)).toHaveText("toolbar false");
  });

  test("radio items pick one per group, and an item can close the menu itself", async ({ page }) => {
    await trigger(page, "View").click();
    await ready(page, "View");
    const group = page.getByRole("group", { name: "Density" });
    const radio = (name: string) => group.getByRole("menuitemradio", { name });
    await expect(group.getByRole("menuitemradio")).toHaveCount(3);
    await expect(radio("Comfortable")).toHaveAttribute("aria-checked", "true");
    await expect(radio("Compact")).toHaveAttribute("aria-checked", "false");

    await radio("Compact").click();
    await expect(radio("Compact")).toHaveAttribute("aria-checked", "true");
    await expect(radio("Comfortable")).toHaveAttribute("aria-checked", "false");
    await expect(selected(page)).toHaveText("compact true density");
    await expect(menu(page, "View")).toBeVisible();
    // The checkbox group above is untouched.
    await expect(page.getByRole("menuitemcheckbox", { name: "Toolbar" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await radio("Spacious").click();
    await expect(selected(page)).toHaveText("spacious true density");
    await expect(menu(page, "View")).toBeHidden();
    await trigger(page, "View").click();
    await ready(page, "View");
    await expect(radio("Spacious")).toHaveAttribute("aria-checked", "true");
  });

  test("opens below the trigger, lined up with the edge it was given", async ({ page }) => {
    await trigger(page, "Actions").click();
    await ready(page, "Actions");
    const start = await settled(menu(page, "Actions"));
    const actions = (await trigger(page, "Actions").boundingBox())!;
    expect(Math.round(start.x)).toBe(Math.round(actions.x));
    expect(Math.round(start.y - (actions.y + actions.height))).toBe(6);
    await page.keyboard.press("Escape");

    await trigger(page, "More").click();
    const end = await settled(menu(page, "More"));
    const more = (await trigger(page, "More").boundingBox())!;
    expect(Math.round(end.x + end.width)).toBe(Math.round(more.x + more.width));
  });

  test("an icon trigger keeps its name and its tooltip", async ({ page }) => {
    const more = trigger(page, "More");
    await more.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tooltip", { name: "More options" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(menu(page, "More")).toBeVisible();
    await expect(item(page, "Rename")).toBeVisible();
    await expect(page.getByRole("tooltip", { name: "More options" })).toBeHidden();
  });

  test("inside a dialog, Escape closes the menu first and the dialog second", async ({ page }) => {
    await trigger(page, "Open dialog").click();
    const dialog = page.getByRole("dialog", { name: "Project" });
    await expect(dialog).toBeVisible();
    await trigger(page, "Options").click();
    await ready(page, "Options");
    await expect(menu(page, "Options")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu(page, "Options")).toBeHidden();
    await expect(dialog).toBeVisible();
    await trigger(page, "Options").click();
    await ready(page, "Options");
    await item(page, "Export").click();
    await expect(selected(page)).toHaveText("export");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("still works after a view transition", async ({ page }) => {
    await leaveAndReturn(page, "Menu", "/menu");
    await expect(erisRoot(page, "actions")).toHaveAttribute("data-ready", "");
    await trigger(page, "Actions").focus();
    await page.keyboard.press("Enter");
    await ready(page, "Actions");
    await expect(highlighted(page, "actions")).toHaveText("Edit");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(selected(page)).toHaveText("duplicate");
    await expect(menu(page, "Actions")).toBeHidden();
  });

  test("has no serious accessibility violations, closed and open", async ({ page }) => {
    await expectNoSeriousViolations(page);
    await trigger(page, "View").click();
    await ready(page, "View");
    await settled(menu(page, "View"));
    await expectNoSeriousViolations(page);
  });
});
