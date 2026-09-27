import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: 'tests/e2e',
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['list']] : 'list',
    // Service worker przechwytywałby żądania podmieniane w testach; włączony tylko w offline.spec.mjs.
    use: { baseURL: 'http://localhost:4173', serviceWorkers: 'block' },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
        { name: 'telefon', use: { ...devices['Pixel 7'] } },
    ],
    webServer: {
        command: 'python3 -m http.server 4173',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        stderr: 'ignore',
    },
});
