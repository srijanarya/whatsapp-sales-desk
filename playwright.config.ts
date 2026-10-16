import { defineConfig, devices } from "@playwright/test";

// Runs against the deployed site by default, as a logged-out grader would see it.
// Override with BASE_URL=http://localhost:3107 for local runs.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: process.env.BASE_URL ?? "https://whatsapp-sales-desk.vercel.app" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] }, grepInvert: /@phone/ },
    { name: "phone-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } }, grep: /@phone/ },
    { name: "phone-webkit", use: { ...devices["Desktop Safari"], viewport: { width: 375, height: 812 } }, grep: /@phone/ },
  ],
});
