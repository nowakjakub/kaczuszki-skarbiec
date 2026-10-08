import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePaidList, normalizeCollection } from '../../js/collections.js';

test('normalizePaidList: sortuje, usuwa duplikaty i numery spoza zakresu', () => {
    assert.deepEqual(normalizePaidList([5, 1, 5, 0, 26, 3], 25), [1, 3, 5]);
});

test('normalizePaidList: akceptuje tekst rozdzielony przecinkami/spacjami', () => {
    assert.deepEqual(normalizePaidList('3, 1;2  4', 25), [1, 2, 3, 4]);
});

test('normalizePaidList: pusta wartość daje pustą listę', () => {
    assert.deepEqual(normalizePaidList(undefined, 25), []);
});

test('normalizeCollection: liczy zebraną kwotę i nieopłacone numery', () => {
    const c = normalizeCollection({ amountPerChild: 10, paid: [1, 2] }, 4);
    assert.equal(c.collected, 20);
    assert.equal(c.paidCount, 2);
    assert.deepEqual(c.unpaidNumbers, [3, 4]);
    assert.equal(c.unpaidCount, 2);
});

test('normalizeCollection: halfPrice liczy 50% składki', () => {
    const c = normalizeCollection({ amountPerChild: 180, paid: [1, 2], halfPrice: [2] }, 25);
    assert.equal(c.collected, 270);
});

test('normalizeCollection: nieobecni nie są zaległościami', () => {
    const c = normalizeCollection({ amountPerChild: 14, paid: [1], absent: [2] }, 3);
    assert.deepEqual(c.unpaidNumbers, [3]);
    assert.equal(c.unpaidCount, 1);
    assert.equal(c.collected, 14);
});

test('normalizeCollection: totalChildren zbiórki ma pierwszeństwo przed domyślnym', () => {
    const c = normalizeCollection({ amountPerChild: 5, paid: [1, 24, 25], totalChildren: 24 }, 25);
    assert.equal(c.totalChildren, 24);
    assert.deepEqual(c.paid, [1, 24]);
    assert.equal(c.collected, 10);
});
