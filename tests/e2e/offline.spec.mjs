import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { TOTAL_CHILDREN } from '../../js/config.js';
import { normalizeCollection } from '../../js/collections.js';
import { PLN } from '../../js/utils.js';

const ROOT = new URL('../../', import.meta.url);
const load = async (name) => JSON.parse(await readFile(new URL(`data/${name}`, ROOT), 'utf8'));
const collections = (await load('collections.json')).collections.map((c) => normalizeCollection(c, TOTAL_CHILDREN));
const { expenses } = await load('expenses.json');
const { incomes } = await load('incomes.json');
const balance = collections.reduce((s, c) => s + c.collected, 0)
    + incomes.reduce((s, i) => s + i.amount, 0)
    - expenses.reduce((s, e) => s + e.amount, 0);
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
};

// Playwright nie odcina sieci service workerowi (setOffline / route go nie obejmują),
// więc „brak internetu” to po prostu wyłączony serwer.
function startServer(port = 0) {
    const server = createServer(async (req, res) => {
        const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/$/, '/index.html');
        try {
            const body = await readFile(new URL(`.${path}`, ROOT));
            res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' }).end(body);
        } catch {
            res.writeHead(404).end();
        }
    });
    return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

function stopServer(server) {
    server.closeAllConnections();
    return new Promise((resolve) => server.close(resolve));
}

test.use({ serviceWorkers: 'allow' });

test('aplikacja działa offline i pokazuje baner z datą danych', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let server = await startServer();
    const { port } = server.address();
    const url = `http://localhost:${port}/`;

    try {
        await page.goto(url);
        await expect(page.locator('#balance-summary')).toHaveText(norm(PLN(balance)));
        await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
        await expect(page.locator('#offline-banner')).toBeHidden();

        await stopServer(server);
        await page.reload();
        await expect(page.locator('#balance-summary')).toHaveText(norm(PLN(balance)));
        await expect(page.locator('#offline-banner')).toBeVisible();
        await expect(page.locator('#offline-banner')).toContainText('Tryb offline');
        await expect(page.locator('#current-list .collection'))
            .toHaveCount(collections.filter((c) => c.status === 'open').length);
        await page.selectOption('#child-number', '1');
        await page.click('#lookup-form button[type=submit]');
        await expect(page.locator('#lookup-result')).toContainText('numerka 1:');

        server = await startServer(port);
        await page.reload();
        await expect(page.locator('#offline-banner')).toBeHidden();
        expect(errors).toEqual([]);
    } finally {
        if (server.listening) await stopServer(server);
    }
});

test('manifest aplikacji jest dostępny', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('link[rel=manifest]').getAttribute('href');
    const response = await page.request.get(href);
    expect(response.ok()).toBe(true);
    expect((await response.json()).name).toBe('Kaczuszki Skarbiec');
});
