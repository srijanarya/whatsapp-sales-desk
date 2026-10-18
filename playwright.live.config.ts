import { defineConfig, devices } from "@playwright/test";

// Live WhatsApp path, run locally against mocks: a local production server whose Graph API and Anthropic
// base URLs point at a small HTTP mock the test starts. Never touches Meta or production.
const MOCK = "http://127.0.0.1:4010";
export default defineConfig({
  testDir: "e2e-live",
  timeout: 90_000,
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3108", // Basic auth sent up front (the desk redirects to /login instead of issuing a 401 challenge).
    extraHTTPHeaders: { authorization: `Basic ${Buffer.from("desk:e2e-password").toString("base64")}` } },
  webServer: {
    command: "npx next build && npx next start --port 3108", // production build: closest to Vercel, no dev reloads
    url: "http://localhost:3108/api/health",
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
    env: {
      DESK_STORE: "memory",
      LIVE_DESK_PASSWORD: "e2e-password",
      WA_APP_SECRET: "e2e-secret",
      WA_VERIFY_TOKEN: "e2e-verify",
      WA_PHONE_NUMBER_ID: "1111",
      WA_ACCESS_TOKEN: "e2e-token",
      GRAPH_API_BASE: MOCK,
      ANTHROPIC_API_KEY: "e2e-key",
      ANTHROPIC_BASE_URL: MOCK,
    },
  },
});
