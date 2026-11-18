import { defineConfig } from "@playwright/test";

// Screen checks on the built app (npm run e2e). In CI: the « Qualité » workflow, beside the deploy.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:4173/",
    serviceWorkers: "block",
    // Local runs may point to an installed Chrome; CI uses Playwright's own Chromium.
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  },
  webServer: { command: "npx vite preview --port 4173 --strictPort", port: 4173, reuseExistingServer: true },
  projects: [
    { name: "small-light", use: { viewport: { width: 320, height: 640 }, colorScheme: "light" } },
    { name: "phone-dark", use: { viewport: { width: 393, height: 820 }, colorScheme: "dark" } },
  ],
});
