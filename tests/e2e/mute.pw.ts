import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

type GameTestWindow = Window & {
  __audio: { muted: boolean };
  __game: { scene: { isActive: (key: string) => boolean } };
};

async function isSceneActive(page: Page, scene: string): Promise<boolean> {
  return page.evaluate(
    (sceneKey) => (window as unknown as GameTestWindow).__game.scene.isActive(sceneKey),
    scene,
  );
}

async function isMuted(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as GameTestWindow).__audio.muted);
}

test("M toggles mute on the title screen and during gameplay", async ({ page }) => {
  if (process.env.PLAYWRIGHT_STATIC === "1") {
    const distDir = path.resolve(process.cwd(), "dist");
    await page.route("http://fake-alaga.test/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
      await route.fulfill({ path: path.join(distDir, relativePath) });
    });
  }

  await page.goto("/");
  await expect.poll(() => isSceneActive(page, "Menu")).toBe(true);

  await expect.poll(() => isMuted(page)).toBe(false);
  await page.keyboard.press("m");
  await expect.poll(() => isMuted(page)).toBe(true);
  console.log("title screen mute state: false -> true");

  await page.keyboard.press("Space");
  await page.waitForTimeout(100);
  await page.keyboard.press("Space");
  await expect.poll(() => isSceneActive(page, "Cutscene")).toBe(true);
  await page.keyboard.press("Space");
  await page.waitForTimeout(100);
  await page.keyboard.press("Space");
  await expect.poll(() => isSceneActive(page, "Game")).toBe(true);

  await expect.poll(() => isMuted(page)).toBe(true);
  await page.keyboard.press("m");
  await expect.poll(() => isMuted(page)).toBe(false);
  console.log("gameplay mute state: true -> false");
});
