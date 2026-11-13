import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { expectNoSeriousViolations } from "./helpers";

/**
 * Every playground page, at rest and with its overlays open, in both themes: no serious
 * accessibility violations (which covers text contrast), and a screenshot for review.
 *
 *   pnpm --filter playground exec playwright test theme   → test-results/theme/<theme>/<page>-<state>.png
 *
 * A new page or overlay goes in STATES, and both themes are checked from then on.
 */
const click = (name: string) => (page: Page) =>
  page.getByRole("button", { name, exact: true }).first().click();

const STATES: Record<string, Record<string, (page: Page) => Promise<unknown>>> = {
  "/": { dialog: click("Create project"), "alert-dialog": click("Delete project") },
  "/tabs": {},
  "/snippet": {},
  "/kbd": {},
  "/accordion": {},
  "/switch": {},
  "/checkbox": {},
  "/popover": { open: click("Share"), form: click("Rename") },
  "/tooltip": {
    open: async (page) => {
      await page.getByRole("button", { name: "Instant", exact: true }).hover();
      await expect(page.getByRole("tooltip", { name: "Opens at once" })).toBeVisible();
    },
    rich: async (page) => {
      await page.getByRole("button", { name: "Shortcut", exact: true }).hover();
      await expect(page.getByRole("tooltip")).toBeVisible();
    },
  },
  "/menu": {
    open: async (page) => {
      await click("Actions")(page);
      await page.keyboard.press("ArrowDown");
    },
    "checks-and-radios": click("View"),
  },
  "/select": {
    open: async (page) => {
      await page.getByRole("combobox").first().click();
      await page.keyboard.press("ArrowDown");
    },
  },
};

const OUT = "test-results/theme";

for (const theme of ["dark", "light"] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      if (theme === "light") {
        await page.addInitScript(() => {
          const apply = () => document.documentElement?.setAttribute("data-theme", "light");
          apply();
          document.addEventListener("DOMContentLoaded", apply);
        });
      }
    });

    for (const [path, states] of Object.entries(STATES)) {
      for (const [state, open] of Object.entries({ rest: async () => {}, ...states })) {
        test(`${path} ${state}`, async ({ page }) => {
          await page.goto(path);
          await open(page);
          // Let open animations finish, so colours and opacity are final.
          await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
          if (theme === "light") {
            await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
          }
          mkdirSync(`${OUT}/${theme}`, { recursive: true });
          const name = path === "/" ? "index" : path.slice(1);
          // A full-page capture scrolls, which closes tooltips, so open states keep the viewport.
          await page.screenshot({ path: `${OUT}/${theme}/${name}-${state}.png`, fullPage: state === "rest" });
          await expectNoSeriousViolations(page);
        });
      }
    }
  });
}
