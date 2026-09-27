import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { TOTAL_CHILDREN } from '../../js/config.js';
import { normalizeCollection } from '../../js/collections.js';

const ROOT = new URL('../../', import.meta.url);
const load = async (name) => JSON.parse(await readFile(new URL(`data/${name}`, ROOT), 'utf8'));

const { collections } = await load('collections.json');
const { expenses } = await load('expenses.json');
const { incomes } = await load('incomes.json');
const { events } = await load('events.json');
const banking = await load('banking.json');

const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

function assertChildList(list, max, label) {
    assert.ok(Array.isArray(list), `${label}: musi być tablicą`);
    for (const n of list) {
        assert.ok(Number.isInteger(n) && n >= 1 && n <= max, `${label}: numer ${n} spoza zakresu 1–${max}`);
    }
    assert.equal(new Set(list).size, list.length, `${label}: zdublowane numery`);
}

describe('collections.json', () => {
    test('każda zbiórka ma unikalny numer (id)', () => {
        const ids = collections.map((c) => c.id);
        assert.ok(ids.every((id) => Number.isInteger(id) && id > 0), 'każda zbiórka musi mieć "id" — dodatnią liczbę całkowitą');
        assert.equal(new Set(ids).size, ids.length, 'zdublowany numer zbiórki');
    });

    test('nazwy są niepuste i unikalne', () => {
        const names = collections.map((c) => c.name);
        assert.ok(names.every((n) => typeof n === 'string' && n.trim()), 'pusta nazwa zbiórki');
        assert.equal(new Set(names).size, names.length, 'zdublowana nazwa zbiórki');
    });

    for (const c of collections) {
        test(c.name, () => {
            const max = c.totalChildren ?? TOTAL_CHILDREN;
            assert.ok(['open', 'closed'].includes(c.status), `status musi być "open" lub "closed", jest: ${c.status}`);
            assert.ok(Number.isFinite(c.amountPerChild) && c.amountPerChild > 0, 'amountPerChild musi być kwotą > 0');
            if (c.status === 'closed') {
                assert.ok(Number.isInteger(c.totalChildren) && c.totalChildren > 0,
                    'zamknięta zbiórka musi mieć "totalChildren" (liczba dzieci w chwili zamknięcia)');
            }
            assertChildList(c.paid, max, 'paid');
            if (c.absent !== undefined) assertChildList(c.absent, max, 'absent');
            if (c.halfPrice !== undefined) assertChildList(c.halfPrice, max, 'halfPrice');
            const both = (c.paid).filter((n) => (c.absent || []).includes(n));
            assert.deepEqual(both, [], 'dziecko nie może być jednocześnie w "paid" i "absent"');
        });
    }
});

describe('expenses.json', () => {
    expenses.forEach((e, i) => {
        test(`${e.date} ${e.what ?? `#${i}`}`, async () => {
            assert.ok(isIsoDate(e.date), `niepoprawna data: ${e.date}`);
            assert.ok(typeof e.what === 'string' && e.what.trim(), 'brak opisu wydatku');
            assert.ok(Number.isFinite(e.amount) && e.amount >= 0, 'kwota musi być liczbą ≥ 0');
            if (e.receipt) {
                assert.ok(e.receipt.startsWith('receipts/'), 'paragon musi leżeć w katalogu receipts/');
                await access(new URL(e.receipt, ROOT)).catch(() => assert.fail(`brak pliku paragonu: ${e.receipt}`));
            }
        });
    });
});

test('incomes.json: każdy wpływ ma źródło i kwotę', () => {
    for (const i of incomes) {
        assert.ok(typeof i.source === 'string' && i.source.trim(), 'brak źródła wpływu');
        assert.ok(Number.isFinite(i.amount), `niepoprawna kwota wpływu: ${i.source}`);
    }
});

test('events.json: każde wydarzenie ma datę i tytuł', () => {
    for (const e of events) {
        assert.ok(isIsoDate(e.date), `niepoprawna data wydarzenia: ${e.date}`);
        assert.ok(typeof e.title === 'string' && e.title.trim(), `brak tytułu wydarzenia z ${e.date}`);
    }
});

test('banking.json: numer konta IBAN i szablon tytułu z {nr}', () => {
    assert.match(banking.account_number, /^PL\d{26}$/);
    assert.ok(banking.transfer_title_template.includes('{nr}'));
});

test('saldo skarbca nie jest ujemne', () => {
    const fromCollections = collections
        .map((c) => normalizeCollection(c, TOTAL_CHILDREN))
        .reduce((sum, c) => sum + c.collected, 0);
    const other = incomes.reduce((sum, i) => sum + i.amount, 0);
    const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
    assert.ok(fromCollections + other - spent >= 0, `saldo ujemne: ${(fromCollections + other - spent).toFixed(2)}`);
});
