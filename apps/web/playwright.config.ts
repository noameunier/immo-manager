import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3100);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      // NODE_ENV explicite : le parcours s'exécute sur http, donc l'API doit
      // rester en développement (cookie sans drapeau Secure).
      command: 'NODE_ENV=development pnpm --filter @immo/api start',
      cwd: '../..',
      url: 'http://127.0.0.1:4100/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      // `next start` sert un build de production : NODE_ENV doit être
      // production, sinon React utilise le runtime de développement et le
      // rendu échoue (`useContext` sur null).
      command: `NODE_ENV=production pnpm --filter @immo/web exec next start --hostname 127.0.0.1 --port ${WEB_PORT}`,
      cwd: '../..',
      // Le serveur écoute uniquement en IPv4 ; on évite une résolution ::1.
      url: `http://127.0.0.1:${WEB_PORT}/connexion`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
