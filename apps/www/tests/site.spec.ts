import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const pages = [
  "/",
  "/docs",
  "/docs/installation",
  "/docs/theming",
  "/docs/components/button",
  "/docs/components/dialog",
  "/docs/components/kbd",
  "/docs/components/tabs",
];

for (const path of pages) {
  test(`${path} loads without errors or serious a11y issues`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).toHaveTitle(/Eris UI/);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => [v.id, v.nodes.map((n) => n.target)]))).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("serves the registry as JSON", async ({ request }) => {
  const index = await request.get("/r/registry.json");
  expect(index.ok()).toBe(true);
  const names = (await index.json()).items.map((i: { name: string }) => i.name);
  expect(names).toEqual(expect.arrayContaining(["eris-core", "button", "dialog", "tabs"]));
  const dialog = await (await request.get("/r/dialog.json")).json();
  expect(dialog.files.length).toBeGreaterThan(3);
  expect(dialog.files.every((f: { content: string }) => f.content.length > 0)).toBe(true);
});

test("returns the 404 page for unknown paths", async ({ page }) => {
  const res = await page.goto("/nope");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "This page does not exist." })).toBeVisible();
});

test("demos on docs pages work, including after client-side navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Docs", exact: true }).click();
  await page.getByRole("link", { name: "Dialog", exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/components\/dialog/);

  await page.getByRole("button", { name: "Create project", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create project" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("link", { name: "Tabs", exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/components\/tabs/);
  const demo = page.locator('[data-eris-id="settings"]');
  await demo.getByRole("tab", { name: "Account" }).click();
  await page.keyboard.press("ArrowRight");
  await expect(demo.getByRole("tab", { name: "Password" })).toHaveAttribute("aria-selected", "true");
});

test("the Code tab shows the demo source", async ({ page }) => {
  await page.goto("/docs/components/dialog");
  const demo = page.locator('[data-eris-id="demo-dialog-basic"]');
  await demo.getByRole("tab", { name: "Code" }).click();
  await expect(demo.locator("pre")).toContainText(
    'import Dialog from "@/components/ui/dialog/Dialog.astro";',
  );
});

test("install commands come from the registry", async ({ page }) => {
  await page.goto("/docs/components/tabs");
  await expect(page.locator('[data-eris-id="install-tabs"]').locator("pre").first()).toContainText(
    "npx eris-ui@latest add tabs",
  );
  await expect(page.getByText("@zag-js/tabs").first()).toBeVisible();
});

test("install note lists npm deps and added registry items", async ({ page }) => {
  await page.goto("/docs/components/tabs");
  const tabsNote = page.locator('[data-eris-id="install-tabs"] + p');
  await expect(tabsNote).toHaveText("Installs @zag-js/tabs, @zag-js/vanilla.");

  await page.goto("/docs/components/dialog");
  const dialogNote = page.locator('[data-eris-id="install-dialog"] + p');
  await expect(dialogNote).toHaveText("Installs @zag-js/dialog, @zag-js/vanilla. Also adds button.");
});

test("⌘K opens search, finds a heading and goes to it", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Search docs" });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole("combobox", { name: "Search docs" });
  await expect(input).toBeFocused();
  await expect(dialog.getByRole("option")).toHaveCount(7);

  await input.fill("activation");
  const first = dialog.getByRole("option").first();
  await expect(first).toContainText("Manual activation");
  await expect(first).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/docs\/components\/tabs#manual-activation$/);
  await expect(dialog).toBeHidden();

  await page.keyboard.press("ControlOrMeta+k");
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue("");
  await input.fill("zzzz");
  await expect(dialog.getByText("No results for “zzzz”")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Search docs" })).toBeFocused();
});

test("search arrow keys move the selection and clicking a result navigates", async ({ page }) => {
  await page.goto("/docs");
  await page.getByRole("button", { name: "Search docs" }).click();
  const dialog = page.getByRole("dialog", { name: "Search docs" });
  await dialog.getByRole("combobox").fill("dialog");
  const options = dialog.getByRole("option");
  await page.keyboard.press("ArrowDown");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowUp");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await options.first().click();
  await expect(page).toHaveURL(/\/docs\/components\/dialog$/);
  await expect(page.locator("h1")).toHaveText("Dialog");
});
