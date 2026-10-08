// Użycie: ZBIORKA="16, 17" NUMERY="3, 7" RODZAJ=wplata POTWIERDZAM=true node scripts/dodaj-wplate.mjs
import { TOTAL_CHILDREN } from '../js/config.js';
import { normalizeCollection } from '../js/collections.js';
import { PLN } from '../js/utils.js';
import { KINDS, parseNumbers, findOpenCollections, needsConfirmation, applyChange } from './zbiorki.mjs';
import { run, report, readCollections, writeCollections, setCommitMessage } from './cli.mjs';

const { ZBIORKA, NUMERY, RODZAJ = 'wplata', POTWIERDZAM } = process.env;
const capitalize = (s) => s[0].toUpperCase() + s.slice(1);
const label = (c) => `#${c.id} ${c.name}`;

await run(async () => {
    const data = await readCollections();
    const targets = findOpenCollections(data.collections, ZBIORKA);
    const maxChild = Math.min(...targets.map((c) => (Number.isInteger(c.totalChildren) ? c.totalChildren : TOTAL_CHILDREN)));
    const numbers = parseNumbers(NUMERY, maxChild);

    if (needsConfirmation(targets.length, numbers.length) && POTWIERDZAM !== 'true') {
        throw new Error(
            `Podałeś ${targets.length} zbiórki (${targets.map(label).join(', ')}) i ${numbers.length} numerów `
            + `(${numbers.join(', ')}) — to ${targets.length * numbers.length} wpłat naraz. Zaznacz „Potwierdzam” `
            + 'w formularzu tylko jeśli KAŻDE z tych dzieci naprawdę wpłaciło do KAŻDEJ z tych zbiórek. '
            + 'W przeciwnym razie uruchom osobno dla każdej zbiórki albo dla każdego dziecka.'
        );
    }

    const what = capitalize(KINDS[RODZAJ]);
    const results = targets.map((target) => {
        const { collection, changed, skipped } = applyChange(target, numbers, RODZAJ);
        data.collections[data.collections.indexOf(target)] = collection;
        return { collection, changed, skipped };
    });

    const totalChanged = results.reduce((sum, r) => sum + r.changed.length, 0);
    if (!totalChanged) {
        const allSkipped = results.flatMap(({ collection, skipped }) =>
            skipped.map(({ n, reason }) => `${label(collection)} nr ${n}: ${reason}`));
        throw new Error(`Nic nie zmieniono. ${allSkipped.join('; ')}`);
    }

    await writeCollections(data);

    const lines = [
        `### ✅ ${what}: ${results.map((r) => label(r.collection)).join(', ')}`,
        `- Numery (żądane): **${numbers.join(', ')}**`,
        '',
    ];
    for (const { collection, changed, skipped } of results) {
        const stats = normalizeCollection(collection, TOTAL_CHILDREN);
        lines.push(`**${label(collection)}**`);
        if (changed.length) lines.push(`- Zmienione: ${changed.join(', ')}`);
        if (skipped.length) lines.push(`- Pominięte: ${skipped.map(({ n, reason }) => `nr ${n}: ${reason}`).join('; ')}`);
        lines.push(`- Opłacone: **${stats.paidCount}/${stats.totalChildren}**, zebrano **${PLN(stats.collected)}**`);
        lines.push(stats.unpaidNumbers.length
            ? `- Jeszcze nie zapłacili: ${stats.unpaidNumbers.join(', ')}`
            : '- 🎉 Wszyscy rozliczeni — można zamknąć zbiórkę (workflow „Zamknij zbiórkę”).');
        lines.push('');
    }
    await report(lines.join('\n'));
    await setCommitMessage(`${what}: ${results.map((r) => label(r.collection)).join(', ')} – nr ${numbers.join(', ')}`);
});
