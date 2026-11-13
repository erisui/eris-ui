import { expect, test, type Page } from "@playwright/test";
import { erisRoot, expectNoSeriousViolations, leaveAndReturn, settled } from "./helpers";

const trigger = (page: Page, name: string) => page.getByRole("combobox", { name, exact: true });
const list = (page: Page, name: string) => page.getByRole("listbox", { name, exact: true });
const option = (page: Page, name: string) => page.getByRole("option", { name, exact: true });
/** The option the keyboard is on. Focus stays on the list; the option is marked highlighted. */
const highlighted = (page: Page, id: string) => erisRoot(page, id).locator("[data-highlighted][role=option]");
const formValue = (page: Page, id: string) =>
  erisRoot(page, id)
    .locator("select")
    .evaluate((el) => (el as HTMLSelectElement).value);

/** Open a select and wait until its list has focus and has stopped moving. */
async function open(page: Page, name: string, how: "click" | string = "click") {
  if (how === "click") await trigger(page, name).click();
  else {
    await trigger(page, name).focus();
    await page.keyboard.press(how);
  }
  await expect(list(page, name)).toBeFocused();
  await settled(list(page, name));
}

test.describe("Select", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/select");
    await expect(erisRoot(page, "framework")).toHaveAttribute("data-ready", "");
  });

  test("is a combobox named by its label, showing the placeholder", async ({ page }) => {
    const framework = trigger(page, "Framework");
    await expect(framework).toHaveText("Pick a framework");
    await expect(framework).toHaveAttribute("aria-haspopup", "listbox");
    await expect(framework).toHaveAttribute("aria-expanded", "false");
    await open(page, "Framework");
    await expect(framework).toHaveAttribute("aria-expanded", "true");
    await expect(list(page, "Framework").getByRole("option")).toHaveCount(5);
    expect(await framework.getAttribute("aria-controls")).toBe(
      await list(page, "Framework").getAttribute("id"),
    );
  });

  test("clicking the label focuses the trigger", async ({ page }) => {
    await page.getByText("Framework", { exact: true }).click();
    await expect(trigger(page, "Framework")).toBeFocused();
    await expect(list(page, "Framework")).toBeHidden();
  });

  test("a select with no label takes its name from aria-label", async ({ page }) => {
    await expect(trigger(page, "Sort order")).toHaveText("Sort");
    await open(page, "Sort order");
    await option(page, "Descending").click();
    await expect(trigger(page, "Sort order")).toHaveText("Descending");
  });

  test("clicking an option chooses it, shows it and closes the list", async ({ page }) => {
    await open(page, "Framework");
    await option(page, "Remix").click();
    await expect(list(page, "Framework")).toBeHidden();
    await expect(trigger(page, "Framework")).toHaveText("Remix");
    await expect(trigger(page, "Framework")).toBeFocused();
    expect(await formValue(page, "framework")).toBe("remix");
    await expect(page.locator("#changed")).toHaveText("remix");

    await open(page, "Framework");
    await expect(option(page, "Remix")).toHaveAttribute("aria-selected", "true");
    await expect(option(page, "Astro")).toHaveAttribute("aria-selected", "false");
    await expect(option(page, "Remix").locator("svg")).toBeVisible();
    await expect(option(page, "Astro").locator("svg")).toBeHidden();
  });

  test("Enter, Space and the arrow keys open it from the trigger", async ({ page }) => {
    for (const key of ["Enter", "Space", "ArrowDown", "ArrowUp"]) {
      await open(page, "Framework", key);
      await page.keyboard.press("Escape");
      await expect(list(page, "Framework")).toBeHidden();
      await expect(trigger(page, "Framework")).toBeFocused();
    }
  });

  test("arrow keys, Home and End move through options and skip disabled ones", async ({ page }) => {
    await open(page, "Framework", "Enter");
    await expect(highlighted(page, "framework")).toHaveText("Astro");
    await page.keyboard.press("ArrowDown");
    await expect(highlighted(page, "framework")).toHaveText("Next.js");
    await page.keyboard.press("ArrowDown");
    await expect(highlighted(page, "framework")).toHaveText("Remix");
    await page.keyboard.press("End");
    await expect(highlighted(page, "framework")).toHaveText("SvelteKit");
    // Without loopFocus, the last option is the end.
    await page.keyboard.press("ArrowDown");
    await expect(highlighted(page, "framework")).toHaveText("SvelteKit");
    await page.keyboard.press("Home");
    await expect(highlighted(page, "framework")).toHaveText("Astro");
    await expect(option(page, "Nuxt")).toHaveAttribute("aria-disabled", "true");
  });

  test("Enter chooses the highlighted option", async ({ page }) => {
    await open(page, "Framework", "Enter");
    await page.keyboard.press("ArrowDown");
    await expect(highlighted(page, "framework")).toHaveText("Next.js");
    await page.keyboard.press("Enter");
    await expect(list(page, "Framework")).toBeHidden();
    await expect(trigger(page, "Framework")).toHaveText("Next.js");
    expect(await formValue(page, "framework")).toBe("next");
  });

  test("typing jumps to an option, open or closed", async ({ page }) => {
    await open(page, "Framework");
    await page.keyboard.type("sv");
    await expect(highlighted(page, "framework")).toHaveText("SvelteKit");
    await page.keyboard.press("Escape");

    // Closed: typing changes the value directly, as on a native select.
    await trigger(page, "Framework").focus();
    await page.waitForTimeout(600);
    await page.keyboard.type("re");
    await expect(trigger(page, "Framework")).toHaveText("Remix");
    await expect(list(page, "Framework")).toBeHidden();
  });

  test("a disabled option cannot be chosen", async ({ page }) => {
    await open(page, "Framework");
    await option(page, "Nuxt").click({ force: true });
    await expect(list(page, "Framework")).toBeVisible();
    await expect(trigger(page, "Framework")).toHaveText("Pick a framework");
  });

  test("Escape and an outside click close it without changing the value", async ({ page }) => {
    await open(page, "Framework");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    await expect(list(page, "Framework")).toBeHidden();
    await expect(trigger(page, "Framework")).toHaveText("Pick a framework");

    await open(page, "Framework");
    await page.locator("h1").click();
    await expect(list(page, "Framework")).toBeHidden();
    await expect(trigger(page, "Framework")).toHaveText("Pick a framework");
  });

  test("starts on its value, opens on it, and groups are labelled", async ({ page }) => {
    await expect(trigger(page, "Food")).toHaveText("Carrot");
    expect(await formValue(page, "food")).toBe("carrot");
    await open(page, "Food");
    await expect(highlighted(page, "food")).toHaveText("Carrot");
    const vegetables = page.getByRole("group", { name: "Vegetables" });
    await expect(vegetables.getByRole("option")).toHaveCount(2);
    await expect(page.getByRole("group", { name: "Fruit" }).getByRole("option")).toHaveCount(2);
    // loopFocus: down from the last option wraps to the first.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(highlighted(page, "food")).toHaveText("Apple");
  });

  test("disabled, read-only and invalid selects say so", async ({ page }) => {
    await expect(trigger(page, "Disabled")).toBeDisabled();
    await expect(trigger(page, "Disabled")).toHaveText("Option A");

    await trigger(page, "Read only").click();
    await expect(list(page, "Read only")).toBeHidden();
    await expect(trigger(page, "Read only")).toHaveText("Option A");

    await expect(trigger(page, "Invalid")).toHaveAttribute("aria-invalid", "true");
  });

  test("the list is as wide as the trigger, sits below it, and scrolls when long", async ({ page }) => {
    await open(page, "Country");
    const box = await settled(list(page, "Country"));
    const at = (await trigger(page, "Country").boundingBox())!;
    expect(Math.round(box.width)).toBe(Math.round(at.width));
    expect(Math.round(box.x)).toBe(Math.round(at.x));
    expect(Math.round(box.y - (at.y + at.height))).toBe(6);
    expect(box.height).toBeLessThanOrEqual(320);
    expect(await list(page, "Country").evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);

    // The keyboard brings an option that is out of view into view.
    await page.keyboard.press("End");
    await expect(option(page, "Norway")).toBeInViewport();
  });

  test("submits its value, blocks submit while a required one is empty, and resets", async ({ page }) => {
    const save = page.getByRole("button", { name: "Save" });
    await save.click();
    await expect(page.locator("#submitted")).toHaveText("");

    await open(page, "Region");
    await option(page, "Europe").click();
    await open(page, "Plan");
    await option(page, "Team").click();
    await save.click();
    await expect(page.locator("#submitted")).toHaveText("plan=team&region=eu");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(trigger(page, "Plan")).toHaveText("Pro");
    await expect(trigger(page, "Region")).toHaveText("Pick a region");
    expect(await formValue(page, "plan")).toBe("pro");
  });

  test("inside a dialog, Escape closes the list first and the dialog second", async ({ page }) => {
    await page.getByRole("button", { name: "Open dialog" }).click();
    const dialog = page.getByRole("dialog", { name: "Invite" });
    await expect(dialog).toBeVisible();
    await open(page, "Role");
    await page.keyboard.press("Escape");
    await expect(list(page, "Role")).toBeHidden();
    await expect(dialog).toBeVisible();
    await open(page, "Role");
    await option(page, "Editor").click();
    await expect(trigger(page, "Role")).toHaveText("Editor");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("still works after a view transition", async ({ page }) => {
    await leaveAndReturn(page, "Select", "/select");
    await expect(erisRoot(page, "framework")).toHaveAttribute("data-ready", "");
    await expect(trigger(page, "Food")).toHaveText("Carrot");
    await open(page, "Framework", "Enter");
    await expect(highlighted(page, "framework")).toHaveText("Astro");
    await page.keyboard.press("Enter");
    await expect(trigger(page, "Framework")).toHaveText("Astro");
    await expect(page.locator("#changed")).toHaveText("astro");
    // One <option> per item plus the empty one, not doubled by the second mount.
    expect(await erisRoot(page, "framework").locator("option").count()).toBe(6);
  });

  test("has no serious accessibility violations, closed and open", async ({ page }) => {
    await expectNoSeriousViolations(page);
    await open(page, "Food");
    await expectNoSeriousViolations(page);
  });
});
