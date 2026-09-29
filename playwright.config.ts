import { defineConfig } from '@playwright/test'

const base = process.env.BASE_PATH || '/'
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:4173${base}`,
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'pnpm preview',
    url: `http://localhost:4173${base}`,
    reuseExistingServer: false,
  },
})
