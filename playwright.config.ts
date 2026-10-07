import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: true,
  workers: 2,
  use: { baseURL: "http://127.0.0.1:4173", headless: true, viewport: { width: 900, height: 700 } },
  webServer: {
    command: "npm run build && npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/popup.html",
    reuseExistingServer: false,
  },
});
