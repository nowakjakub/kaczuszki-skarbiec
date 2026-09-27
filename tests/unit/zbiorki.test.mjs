import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    parseNumbers, findOpenCollection, applyChange, formatCollectionsJson,
    parseAmount, parseDate, nextId, createCollection, closeCollection, insertExpense, openCollectionsTable, todayIso,
} from '../../scripts/zbiorki.mjs';

const COLLECTIONS = [
    { id: 4, name: 'Kwiaty - Dzień Nauczyciela', amountPerChild: 12, status: 'open', paid: [1] },
    { id: 3, name: 'Rada rodziców', amountPerChild: 180, status: 'open', paid: [] },
    { id: 2, name: 'Składka grupowa', amountPerChild: 50, status: 'open', paid: [] },
    { id: 1, name: 'Kino stare', amountPerChild: 14, status: 'closed', paid: [], totalChildren: 3 },
];

test('parseNumbers: różne separatory, sortowanie, bez duplikatów', () => {
    assert.deepEqual(parseNumbers('7, 3;3 12', 25), [3, 7, 12]);
});

test('parseNumbers: odrzuca numery spoza zakresu i tekst', () => {
    assert.throws(() => parseNumbers('26', 25), /spoza zakresu/);
    assert.throws(() => parseNumbers('0', 25), /spoza zakresu/);
    assert.throws(() => parseNumbers('3a', 25), /nie jest numerem/);
    assert.throws(() => parseNumbers('  ', 25), /co najmniej jeden/);
});

test('findOpenCollection: dopasowuje fragment bez polskich znaków i wielkości liter', () => {
    assert.equal(findOpenCollection(COLLECTIONS, 'rada RODZICOW').name, 'Rada rodziców');
    assert.equal(findOpenCollection(COLLECTIONS, 'skladka').name, 'Składka grupowa');
    assert.equal(findOpenCollection(COLLECTIONS, 'nauczyciel').name, 'Kwiaty - Dzień Nauczyciela');
});

test('findOpenCollection: błąd dla niejednoznacznej, zamkniętej lub nieistniejącej', () => {
    assert.throws(() => findOpenCollection(COLLECTIONS, 'r'), /kilku otwartych/);
    assert.throws(() => findOpenCollection(COLLECTIONS, 'kino'), /zamknięta/);
    assert.throws(() => findOpenCollection(COLLECTIONS, 'basen'), /Nie znaleziono/);
});

test('applyChange wplata: dodaje, pomija opłacone, zdejmuje nieobecność', () => {
    const { collection, changed, skipped } = applyChange({ paid: [1], absent: [4] }, [1, 2, 4], 'wplata');
    assert.deepEqual(collection.paid, [1, 2, 4]);
    assert.equal(collection.absent, undefined);
    assert.deepEqual(changed, [2, 4]);
    assert.deepEqual(skipped.map((s) => s.n), [1]);
});

test('applyChange nieobecnosc: nie oznacza opłaconego dziecka', () => {
    const { collection, changed, skipped } = applyChange({ paid: [1] }, [1, 3], 'nieobecnosc');
    assert.deepEqual(collection.paid, [1]);
    assert.deepEqual(collection.absent, [3]);
    assert.deepEqual(changed, [3]);
    assert.match(skipped[0].reason, /cofnij/);
});

test('applyChange cofnij: usuwa wpłatę i nieobecność, nie rusza halfPrice', () => {
    const { collection, changed } = applyChange({ paid: [1, 2], absent: [3], halfPrice: [2] }, [2, 3, 9], 'cofnij');
    assert.deepEqual(collection.paid, [1]);
    assert.equal(collection.absent, undefined);
    assert.deepEqual(collection.halfPrice, [2]);
    assert.deepEqual(changed, [2, 3]);
});

test('applyChange: nieznany rodzaj zmiany', () => {
    assert.throws(() => applyChange({ paid: [] }, [1], 'zwrot'), /Nieznany rodzaj/);
});

test('formatCollectionsJson: zapis collections.json nie zmienia danych ani formatu', async () => {
    const raw = await readFile(new URL('../../data/collections.json', import.meta.url), 'utf8');
    const formatted = formatCollectionsJson(JSON.parse(raw));
    assert.deepEqual(JSON.parse(formatted), JSON.parse(raw));
    assert.match(formatted, /"paid": \[\d+(, \d+)*\]/);
});

test('findOpenCollection: po numerze (także z #), błąd dla zamkniętej i nieistniejącej', () => {
    assert.equal(findOpenCollection(COLLECTIONS, '3').name, 'Rada rodziców');
    assert.equal(findOpenCollection(COLLECTIONS, ' #4 ').name, 'Kwiaty - Dzień Nauczyciela');
    assert.throws(() => findOpenCollection(COLLECTIONS, '1'), /#1 Kino stare jest już zamknięta/);
    assert.throws(() => findOpenCollection(COLLECTIONS, '99'), /Nie ma zbiórki nr 99[\s\S]*#3 Rada rodziców/);
    assert.throws(() => findOpenCollection(COLLECTIONS, ''), /Podaj numer/);
});

test('parseAmount: przecinek, kropka, „zł”; odrzuca zero, ujemne i >2 miejsca po przecinku', () => {
    assert.equal(parseAmount('12,50'), 12.5);
    assert.equal(parseAmount(' 14 zł'), 14);
    assert.equal(parseAmount('180.00'), 180);
    for (const bad of ['0', '-5', '1,234', 'abc', '']) assert.throws(() => parseAmount(bad), /poprawną kwotą/);
});

test('parseDate: DD.MM.RRRR na ISO, odrzuca nieistniejące daty', () => {
    assert.deepEqual(parseDate('3.10.2026'), { iso: '2026-10-03', display: '03.10.2026' });
    for (const bad of ['31.02.2026', '2026-10-13', '13/10/2026', '']) assert.throws(() => parseDate(bad), /poprawną datą/);
});

test('todayIso: data w strefie Europe/Warsaw', () => {
    assert.equal(todayIso(new Date('2026-09-30T22:30:00Z')), '2026-10-01');
});

test('createCollection: kolejny numer, termin w nazwie, rodzeństwo, pusta lista wpłat', () => {
    assert.equal(nextId(COLLECTIONS), 5);
    assert.deepEqual(createCollection(COLLECTIONS, { name: ' Basen ', amount: '20', deadline: '1.11.2026', halfPrice: [18] }), {
        id: 5, name: 'Basen - do 01.11.2026', amountPerChild: 20, status: 'open', paid: [], halfPrice: [18],
    });
    assert.equal(createCollection(COLLECTIONS, { name: 'Teatr', amount: '15' }).halfPrice, undefined);
    assert.throws(() => createCollection(COLLECTIONS, { name: 'rada RODZICÓW', amount: '1' }), /już istnieje/);
    assert.throws(() => createCollection(COLLECTIONS, { name: ' ', amount: '1' }), /Podaj nazwę/);
});

test('closeCollection: blokuje przy zaległościach, nieobecni nie są zaległością, dopisuje totalChildren', () => {
    const col = { id: 7, name: 'Kino', amountPerChild: 14, status: 'open', paid: [1, 2], absent: [3] };
    const { collection, stats } = closeCollection(col, { totalChildren: 3 });
    assert.equal(collection.status, 'closed');
    assert.equal(collection.totalChildren, 3);
    assert.equal(stats.collected, 28);
    assert.throws(() => closeCollection({ ...col, absent: [] }, { totalChildren: 3 }), /zaległości \(nr 3\)/);
    const forced = closeCollection({ ...col, absent: [] }, { totalChildren: 3, force: true });
    assert.deepEqual(forced.stats.unpaidNumbers, [3]);
});

test('insertExpense: dodaje na początek, nie przeformatowuje reszty pliku', async () => {
    const raw = await readFile(new URL('../../data/expenses.json', import.meta.url), 'utf8');
    const result = insertExpense(raw, { date: '2026-10-14', what: 'Kwiaty „dla Pań”', amount: 72 });
    const parsed = JSON.parse(result);
    assert.deepEqual(parsed.expenses[0], { date: '2026-10-14', what: 'Kwiaty „dla Pań”', amount: 72, receipt: '' });
    assert.deepEqual(parsed.expenses.slice(1), JSON.parse(raw).expenses);
    assert.ok(result.endsWith(raw.slice(raw.indexOf('"expenses": [') + 13)), 'reszta pliku bez zmian');
    assert.match(result, /"amount": 72\.00,/);
    assert.deepEqual(JSON.parse(insertExpense('{"expenses": []}', { date: '2026-01-01', what: 'x', amount: 1 })).expenses.length, 1);
});

test('openCollectionsTable: tylko otwarte zbiórki z numerami', () => {
    const table = openCollectionsTable(COLLECTIONS, 25);
    assert.match(table, /\| \*\*4\*\* \| Kwiaty - Dzień Nauczyciela \|/);
    assert.doesNotMatch(table, /Kino stare/);
    assert.match(openCollectionsTable([], 25), /Brak otwartych/);
});
