import { expect, test, type Page } from "@playwright/test";
import { erisRoot, expectNoSeriousViolations, leaveAndReturn } from "./helpers";

const header = (page: Page, id: string, name: string) =>
  erisRoot(page, id).getByRole("button", { name, exact: true });

test.describe("Accordion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accordion");
  });

  test("wires each header to its panel inside a heading", async ({ page }) => {
    const first = header(page, "faq", "Does it work without a framework?");
    await expect(first).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator(`[id="${await first.getAttribute("aria-controls")}"]`);
    await expect(panel).toHaveRole("region");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAccessibleName("Does it work without a framework?");
    expect(await first.evaluate((el) => el.parentElement!.tagName)).toBe("H3");
    await expect(header(page, "faq", "Can I change the styles?")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("The code is copied into your project")).toBeHidden();
  });

  test("opening one item closes the other, and the open item can be closed", async ({ page }) => {
    const first = header(page, "faq", "Does it work without a framework?");
    const second = header(page, "faq", "Can I change the styles?");
    await second.click();
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Every component is a plain .astro file.")).toBeHidden();
    await second.click();
    await expect(second).toHaveAttribute("aria-expanded", "false");
  });

  test("Enter and Space toggle the focused header", async ({ page }) => {
    const second = header(page, "faq", "Can I change the styles?");
    await second.focus();
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Space");
    await expect(second).toHaveAttribute("aria-expanded", "false");
  });

  test("arrow keys, Home and End move between headers and skip disabled ones", async ({ page }) => {
    await header(page, "faq", "Does it work without a framework?").focus();
    await page.keyboard.press("ArrowDown");
    await expect(header(page, "faq", "Can I change the styles?")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(header(page, "faq", "What is the license?")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(header(page, "faq", "Does it work without a framework?")).toBeFocused();
    await page.keyboard.press("End");
    await expect(header(page, "faq", "What is the license?")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(header(page, "faq", "Can I change the styles?")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(header(page, "faq", "Does it work without a framework?")).toBeFocused();
    // Moving focus does not open anything.
    await expect(header(page, "faq", "What is the license?")).toHaveAttribute("aria-expanded", "false");
  });

  test("a disabled item cannot be opened", async ({ page }) => {
    const pro = header(page, "faq", "Is there a Pro version?");
    await expect(pro).toBeDisabled();
    await pro.click({ force: true });
    await expect(page.getByText("Not yet.")).toBeHidden();
  });

  test("multiple keeps several items open", async ({ page }) => {
    await expect(header(page, "multi", "First")).toHaveAttribute("aria-expanded", "true");
    await expect(header(page, "multi", "Second")).toHaveAttribute("aria-expanded", "true");
    await header(page, "multi", "Third").click();
    for (const name of ["First", "Second", "Third"]) {
      await expect(header(page, "multi", name)).toHaveAttribute("aria-expanded", "true");
    }
    await header(page, "multi", "First").click();
    await expect(header(page, "multi", "First")).toHaveAttribute("aria-expanded", "false");
    await expect(header(page, "multi", "Second")).toHaveAttribute("aria-expanded", "true");
  });

  test("with collapsible off, the open item stays open when clicked", async ({ page }) => {
    const one = header(page, "pinned", "Pinned one");
    await one.click();
    await expect(one).toHaveAttribute("aria-expanded", "true");
    await header(page, "pinned", "Pinned two").click();
    await expect(one).toHaveAttribute("aria-expanded", "false");
  });

  test("the indicator turns when its item opens", async ({ page }) => {
    const second = header(page, "faq", "Can I change the styles?");
    const indicator = second.locator("svg");
    await expect(indicator).toHaveAttribute("data-state", "closed");
    await second.click();
    await expect(indicator).toHaveAttribute("data-state", "open");
    await expect(indicator).toHaveCSS("rotate", "180deg");
  });

  test("an accordion and a dialog inside a panel keep their own parts", async ({ page }) => {
    const inner = header(page, "inner", "Inner one");
    await inner.click();
    await expect(inner).toHaveAttribute("aria-expanded", "true");
    await expect(header(page, "nested", "Outer")).toHaveAttribute("aria-expanded", "true");
    expect(await inner.evaluate((el) => el.parentElement!.tagName)).toBe("H4");

    // Arrow keys in the outer accordion never land on the inner header.
    await header(page, "nested", "Outer").focus();
    await page.keyboard.press("ArrowDown");
    await expect(header(page, "nested", "Other")).toBeFocused();

    const open = page.getByRole("button", { name: "Open nested dialog" });
    await expect(open).toHaveAttribute("aria-haspopup", "dialog");
    await open.click();
    await expect(page.getByRole("dialog", { name: "Nested dialog" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(open).toBeFocused();
  });

  test("still works after a view transition", async ({ page }) => {
    await leaveAndReturn(page, "Accordion", "/accordion");
    const second = header(page, "faq", "Can I change the styles?");
    await second.click();
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("The code is copied into your project")).toBeVisible();
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await expectNoSeriousViolations(page);
  });
});
