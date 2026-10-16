import { expect, test } from "@playwright/test";

test("@phone fits a 375px screen and the takeover works by touch-sized layout", async ({ page }) => {
  await page.goto("/");
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  await page.getByTestId("play-scenario").click();
  const banner = page.getByTestId("takeover-banner");
  await expect(banner).toBeVisible({ timeout: 15_000 });
  await banner.getByRole("button", { name: "Take over" }).click();
  await expect(page.getByTestId("conversation-state")).toHaveText("Human talking");
});
