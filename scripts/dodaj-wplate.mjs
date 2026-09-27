// Użycie: ZBIORKA=16 NUMERY="3, 7" RODZAJ=wplata node scripts/dodaj-wplate.mjs
import { TOTAL_CHILDREN } from '../js/config.js';
import { normalizeCollection } from '../js/collections.js';
import { PLN } from '../js/utils.js';
import { KINDS, parseNumbers, findOpenCollection, applyChange } from './zbiorki.mjs';
import { run, report, readCollections, writeCollections, setCommitMessage } from './cli.mjs';

const { ZBIORKA, NUMERY, RODZAJ = 'wplata' } = process.env;
const capitalize = (s) => s[0].toUpperCase() + s.slice(1);

await run(async () => {
    const data = await readCollections();
    const target = findOpenCollection(data.collections, ZBIORKA);
    const totalChildren = Number.isInteger(target.totalChildren) ? target.totalChildren : TOTAL_CHILDREN;
    const numbers = parseNumbers(NUMERY, totalChildren);
    const { collection, changed, skipped } = applyChange(target, numbers, RODZAJ);

    const skippedText = skipped.map(({ n, reason }) => `nr ${n}: ${reason}`).join('; ');
    if (!changed.length) throw new Error(`Nic nie zmieniono. ${skippedText}`);

    data.collections[data.collections.indexOf(target)] = collection;
    await writeCollections(data);

    const stats = normalizeCollection(collection, TOTAL_CHILDREN);
    const what = capitalize(KINDS[RODZAJ]);
    await report([
        `### ✅ ${what}: #${collection.id} ${collection.name}`,
        `- Numery: **${changed.join(', ')}**`,
        skipped.length ? `- Pominięte: ${skippedText}` : '',
        `- Opłacone: **${stats.paidCount}/${stats.totalChildren}**, zebrano **${PLN(stats.collected)}**`,
        stats.unpaidNumbers.length
            ? `- Jeszcze nie zapłacili: ${stats.unpaidNumbers.join(', ')}`
            : '- 🎉 Wszyscy rozliczeni — można zamknąć zbiórkę (workflow „Zamknij zbiórkę”).',
    ].filter(Boolean).join('\n'));
    await setCommitMessage(`${what}: #${collection.id} ${collection.name} – nr ${changed.join(', ')}`);
});
