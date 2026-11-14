import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { docsNav } from "../src/nav";

// Every docs page in the sidebar, so a new component page is covered without editing this list.
const pages = ["/", ...docsNav.flatMap((group) => group.items.map((item) => item.href))];

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
  expect(names).toEqual(expect.arrayContaining(["eris-core", "accordion", "button", "dialog", "tabs"]));
  const dialog = await (await request.get("/r/dialog.json")).json();
  expect(dialog.files.length).toBeGreaterThan(3);
  expect(dialog.files.every((f: { content: string }) => f.content.length > 0)).toBe(true);
});

test("the sitemap lists every page and robots.txt points to it", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://erisui.dev/sitemap-index.xml");
  const index = await request.get("/sitemap-index.xml");
  expect(index.ok()).toBe(true);
  expect(await index.text()).toContain("https://erisui.dev/sitemap-0.xml");
  const urls = await (await request.get("/sitemap-0.xml")).text();
  // Sitemap entries match the canonical URLs, which end in a slash.
  for (const path of pages) expect(urls).toContain(`<loc>https://erisui.dev${path.replace(/\/?$/, "/")}</loc>`);
  expect(urls).not.toContain("404");
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

test("the snippet demo copies its command and confirms it", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/components/snippet");
  const copy = page.locator('[data-eris-id="snippet-init"]').getByRole("button");
  await expect(copy).toHaveAccessibleName("Copy");
  await copy.click();
  await expect(copy).toHaveAccessibleName("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npx eris-ui@latest init");
  await expect(page.locator('[data-eris-id="install-snippet"] + p')).toHaveText(
    "Installs @zag-js/clipboard, @zag-js/vanilla. Also adds button.",
  );
});

test("⌘K opens search, finds a heading and goes to it", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog", { name: "Search docs" });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole("combobox", { name: "Search docs" });
  await expect(input).toBeFocused();
  await expect(dialog.getByRole("option")).toHaveCount(pages.length - 1);

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

test.describe("light theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("eris-theme", "light"));
  });

  for (const path of pages) {
    test(`${path} has no serious a11y issues in light`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious, JSON.stringify(serious.map((v) => [v.id, v.nodes.map((n) => n.target)]))).toEqual([]);
      await page.screenshot({ path: `test-results/theme/light${path === "/" ? "/index" : path}.png`, fullPage: true });
    });
  }

  test("code blocks use the light palette", async ({ page }) => {
    await page.goto("/docs/theming");
    const pre = page.locator("pre.astro-code").first();
    const luminance = (rgb: string) => rgb.match(/\d+/g)!.slice(0, 3).reduce((sum, n) => sum + Number(n), 0) / 765;
    expect(luminance(await pre.evaluate((el) => getComputedStyle(el).backgroundColor))).toBeGreaterThan(0.9);
    expect(luminance(await pre.evaluate((el) => getComputedStyle(el).color))).toBeLessThan(0.4);
  });
});

test("the theme toggle switches, and the choice survives navigation and a reload", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).not.toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f6f6f6");

  await page.getByRole("link", { name: "Docs", exact: true }).click();
  await expect(page).toHaveURL(/\/docs/);
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(html).not.toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(html).not.toHaveAttribute("data-theme", "light");
});
