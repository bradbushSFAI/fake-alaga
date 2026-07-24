import { defineConfig } from "@playwright/test";

const staticBuild = process.env.PLAYWRIGHT_STATIC === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.pw.ts",
  reporter: "line",
  use: {
    baseURL: staticBuild ? "http://fake-alaga.test" : "http://localhost:5174",
    headless: true,
    launchOptions: staticBuild ? { args: ["--single-process"] } : undefined,
  },
  webServer: staticBuild
    ? undefined
    : {
        command: "npm run dev -- --host localhost --port 5174",
        url: "http://localhost:5174",
        reuseExistingServer: true,
      },
});
