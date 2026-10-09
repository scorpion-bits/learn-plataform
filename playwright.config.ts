import { defineConfig, devices } from '@playwright/test';

import { loadE2eEnv } from './e2e/support/env';

/**
 * E2E (QA-001/QA-003, ADR-021): o robô usa a plataforma de verdade contra um Supabase local
 * (`supabase start`) e o mock da AbacatePay (e2e/mocks/abacatepay.ts).
 *
 * Projects: Desktop Chrome, Pixel 7 e iPhone 14. O iPhone roda em Chromium com o viewport,
 * o user agent e o toque do aparelho (CI leve: só baixa o Chromium). Para o WebKit de
 * verdade: `E2E_IPHONE_WEBKIT=1` (exige `npx playwright install webkit`).
 */
const env = loadE2eEnv();
const baseURL = process.env.E2E_BASE_URL ?? env.siteUrl;
const isCI = Boolean(process.env.CI);

const iphone = devices['iPhone 14'];

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  outputDir: 'test-results',
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
    {
      name: 'iphone-14',
      use:
        process.env.E2E_IPHONE_WEBKIT === '1'
          ? { ...iphone }
          : { ...iphone, defaultBrowserType: 'chromium' },
    },
  ],
  // O app já buildado (`npm run build` com a mesma env). Reaproveita um servidor em execução.
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3000',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      ABACATEPAY_API_BASE_URL: env.mockBaseUrl,
      ABACATEPAY_API_KEY: env.apiKey,
      ABACATEPAY_WEBHOOK_SECRET: env.webhookSecret,
      NEXT_PUBLIC_SITE_URL: env.siteUrl,
    },
  },
});
