import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { TOTAL_CHILDREN } from '../../js/config.js';
import { normalizeCollection } from '../../js/collections.js';
import { PLN } from '../../js/utils.js';

const load = async (name) => JSON.parse(await readFile(new URL(`../../data/${name}`, import.meta.url), 'utf8'));
const collections = (await load('collections.json')).collections.map((c) => normalizeCollection(c, TOTAL_CHILDREN));
const openCols = collections.filter((c) => c.status === 'open');
const closedCols = collections.filter((c) => c.status !== 'open');
const { expenses } = await load('expenses.json');
const { incomes } = await load('incomes.json');

const norm = (s) => s.replace(/\s+/g, ' ').trim();

let errors;

async function openSite(page, fixtures = {}) {
    errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', (r) => errors.push(`${r.url()} ${r.failure()?.errorText}`));
    page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });
    for (const [file, body] of Object.entries(fixtures)) {
        await page.route(`**/data/${file}`, (route) => route.fulfill({ json: body }));
    }
    await page.goto('/');
    await expect(page.locator('#balance-summary')).not.toBeEmpty();
}

async function lookup(page, n) {
    await page.selectOption('#child-number', String(n));
    await page.click('#lookup-form button[type=submit]');
    const result = page.locator('#lookup-result');
    await expect(result).toContainText(`numerka ${n}:`);
    return result;
}

test.afterEach(() => {
    expect(errors, 'błędy JS / nieudane żądania na stronie').toEqual([]);
});

test.describe('aktualne dane', () => {
    test.beforeEach(({ page }) => openSite(page));

    test('saldo zgadza się z danymi', async ({ page }) => {
        const fromCollections = collections.reduce((s, c) => s + c.collected, 0);
        const other = incomes.reduce((s, i) => s + Number(i.amount || 0), 0);
        const spent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        await expect(page.locator('#balance-summary')).toHaveText(norm(PLN(fromCollections + other - spent)));
    });

    test('karty zbiórek: otwarte i zamknięte', async ({ page }) => {
        await expect(page.locator('#current-list .collection')).toHaveCount(openCols.length);
        await expect(page.locator('#past-list .collection')).toHaveCount(closedCols.length);
        for (const c of openCols) {
            await expect(page.locator('#current-list .collection', { hasText: c.name }))
                .toContainText(`${c.paidCount}/${c.totalChildren}`);
        }
    });

    test('„Czy zapłaciliśmy?” pokazuje właściwy status dla każdego dziecka', async ({ page }) => {
        await expect(page.locator('#child-number option')).toHaveCount(TOTAL_CHILDREN);
        for (let n = 1; n <= TOTAL_CHILDREN; n++) {
            const result = await lookup(page, n);
            let due = 0;
            for (const c of openCols) {
                const row = result.locator('li', { hasText: c.name });
                if (c.paid.includes(n)) {
                    await expect(row).toContainText('Opłacono');
                } else if (c.absent.includes(n)) {
                    await expect(row).toContainText('Nieobecność zgłoszona');
                } else {
                    due += c.halfPrice.includes(n) ? c.amount / 2 : c.amount;
                    await expect(row).toContainText('Czas zapłacić');
                }
            }
            const sum = result.locator('.sum');
            if (due) await expect(sum).toContainText(norm(PLN(due)));
            else await expect(sum).toContainText('Wszystko opłacone');
        }
    });

    test('tabela wydatków ma wszystkie pozycje', async ({ page }) => {
        await expect(page.locator('#expenses-body tr')).toHaveCount(expenses.length);
    });

    test('przełącznik motywu działa', async ({ page }) => {
        const html = page.locator('html');
        const wasDark = await html.evaluate((el) => el.classList.contains('dark'));
        await page.click('#theme-toggle');
        expect(await html.evaluate((el) => el.classList.contains('dark'))).toBe(!wasDark);
    });
});

test.describe('dane testowe (nieobecność, rodzeństwo, zamknięte zbiórki)', () => {
    const fixtures = {
        'collections.json': {
            collections: [
                { name: 'Test A', amountPerChild: 10, status: 'open', paid: [1], absent: [2], halfPrice: [3] },
                { name: 'Test B', amountPerChild: 20, status: 'open', paid: [1, 2], halfPrice: [2] },
                { name: 'Stara', amountPerChild: 5, status: 'closed', paid: [1], totalChildren: 3 },
            ],
        },
        'incomes.json': { incomes: [{ source: 'Inne', amount: 1.5 }] },
        'expenses.json': { expenses: [{ date: '2026-01-01', what: 'Zakup', amount: 20, receipt: '' }] },
    };

    test.beforeEach(({ page }) => openSite(page, fixtures));

    test('saldo: zbiórki (z rabatem) + wpływy − wydatki', async ({ page }) => {
        // A: 10, B: 20 + 10 (nr 2 rodzeństwo), Stara: 5, wpływy 1,5, wydatki 20
        await expect(page.locator('#balance-summary')).toHaveText(norm(PLN(26.5)));
    });

    test('karta zbiórki pokazuje nieobecnych i rodzeństwo', async ({ page }) => {
        const card = page.locator('#current-list .collection', { hasText: 'Test A' });
        await expect(card).toContainText('Nieobecni (nr 2)');
        await expect(card).toContainText('Rodzeństwo (nr 3)');
        await expect(page.locator('#past-list .collection', { hasText: 'Stara' })).toContainText('1/3');
    });

    test('nieobecne dziecko nie ma zaległości', async ({ page }) => {
        const result = await lookup(page, 2);
        await expect(result.locator('li', { hasText: 'Test A' })).toContainText('Nieobecność zgłoszona');
        await expect(result.locator('.sum')).toContainText('Wszystko opłacone');
    });

    test('rodzeństwo płaci połowę, zamknięte zbiórki pominięte', async ({ page }) => {
        const result = await lookup(page, 3);
        await expect(result.locator('li', { hasText: 'Test A' })).toContainText(norm(PLN(5)));
        await expect(result.locator('li')).toHaveCount(2);
        await expect(result.locator('.sum')).toContainText(norm(PLN(25)));
    });

    test('opłacone wszystko', async ({ page }) => {
        const result = await lookup(page, 1);
        await expect(result.locator('.sum')).toContainText('Wszystko opłacone');
    });
});
