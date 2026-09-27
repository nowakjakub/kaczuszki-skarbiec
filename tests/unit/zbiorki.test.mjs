import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseNumbers, findOpenCollection, applyChange, formatCollectionsJson } from '../../scripts/zbiorki.mjs';

const COLLECTIONS = [
    { name: 'Kwiaty - Dzień Nauczyciela', status: 'open', paid: [1] },
    { name: 'Rada rodziców', status: 'open', paid: [] },
    { name: 'Składka grupowa', status: 'open', paid: [] },
    { name: 'Kino stare', status: 'closed', paid: [] },
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
