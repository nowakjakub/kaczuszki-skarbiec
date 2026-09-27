// Użycie: ZBIORKA="rada" NUMERY="3, 7" RODZAJ=wplata node scripts/dodaj-wplate.mjs
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { TOTAL_CHILDREN } from '../js/config.js';
import { normalizeCollection } from '../js/collections.js';
import { PLN } from '../js/utils.js';
import { KINDS, parseNumbers, findOpenCollection, applyChange, formatCollectionsJson } from './zbiorki.mjs';

const FILE = new URL('../data/collections.json', import.meta.url);
const { ZBIORKA, NUMERY, RODZAJ = 'wplata', GITHUB_STEP_SUMMARY, GITHUB_OUTPUT } = process.env;

const summary = (text) => (GITHUB_STEP_SUMMARY ? appendFile(GITHUB_STEP_SUMMARY, `${text}\n`) : undefined);

try {
    const data = JSON.parse(await readFile(FILE, 'utf8'));
    const target = findOpenCollection(data.collections, ZBIORKA);
    const totalChildren = Number.isInteger(target.totalChildren) ? target.totalChildren : TOTAL_CHILDREN;
    const numbers = parseNumbers(NUMERY, totalChildren);
    const { collection, changed, skipped } = applyChange(target, numbers, RODZAJ);

    const skippedText = skipped.map(({ n, reason }) => `nr ${n}: ${reason}`).join('; ');
    if (!changed.length) throw new Error(`Nic nie zmieniono. ${skippedText}`);

    data.collections[data.collections.indexOf(target)] = collection;
    await writeFile(FILE, formatCollectionsJson(data));

    const stats = normalizeCollection(collection, TOTAL_CHILDREN);
    const label = KINDS[RODZAJ];
    const lines = [
        `### ✅ ${label[0].toUpperCase()}${label.slice(1)}: ${collection.name}`,
        `- Numery: **${changed.join(', ')}**`,
        skipped.length ? `- Pominięte: ${skippedText}` : '',
        `- Opłacone: **${stats.paidCount}/${stats.totalChildren}**, zebrano **${PLN(stats.collected)}**`,
        stats.unpaidNumbers.length ? `- Jeszcze nie zapłacili: ${stats.unpaidNumbers.join(', ')}` : '- 🎉 Wszyscy rozliczeni — można zamknąć zbiórkę.',
    ].filter(Boolean);
    console.log(lines.join('\n'));
    await summary(lines.join('\n'));

    if (GITHUB_OUTPUT) {
        const message = `${label[0].toUpperCase()}${label.slice(1)}: ${collection.name} – nr ${changed.join(', ')}`;
        await appendFile(GITHUB_OUTPUT, `commit_message=${message.replace(/\n/g, ' ')}\n`);
    }
} catch (err) {
    console.error(`::error::${err.message.replace(/\n/g, '%0A')}`);
    await summary(`### ❌ Nie zapisano zmian\n\n${err.message.replace(/\n/g, '  \n')}`);
    process.exit(1);
}
