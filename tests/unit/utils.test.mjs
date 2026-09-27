import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, PLN } from '../../js/utils.js';

test('escapeHtml: zamienia znaki specjalne HTML', () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
});

test('escapeHtml: obsługuje wartości nietekstowe', () => {
    assert.equal(escapeHtml(12), '12');
    assert.equal(escapeHtml(), '');
});

test('PLN: formatuje kwotę po polsku', () => {
    assert.equal(PLN(4448.27).replace(/\s/g, ' '), '4448,27 zł');
    assert.equal(PLN(12).replace(/\s/g, ' '), '12,00 zł');
});
