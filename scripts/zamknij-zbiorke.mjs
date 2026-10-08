// Użycie: ZBIORKA=15 WYDATEK_KWOTA=294 WYDATEK_OPIS="Kino" WYDATEK_DATA=23.09.2026 MIMO_ZALEGLOSCI=false node scripts/zamknij-zbiorke.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { TOTAL_CHILDREN } from '../js/config.js';
import { PLN } from '../js/utils.js';
import { findOpenCollection, closeCollection, insertExpense, parseAmount, parseDate, todayIso } from './zbiorki.mjs';
import { run, report, readCollections, writeCollections, setCommitMessage, EXPENSES } from './cli.mjs';

const { ZBIORKA, WYDATEK_KWOTA, WYDATEK_OPIS, WYDATEK_DATA, MIMO_ZALEGLOSCI } = process.env;
const withoutDeadline = (name) => name.replace(/\s*-\s*do \d{1,2}\.\d{1,2}\.\d{4}$/, '');

await run(async () => {
    const data = await readCollections();
    const target = findOpenCollection(data.collections, ZBIORKA);

    const expense = WYDATEK_KWOTA?.trim()
        ? {
            amount: parseAmount(WYDATEK_KWOTA),
            what: WYDATEK_OPIS?.trim() || withoutDeadline(target.name),
            date: WYDATEK_DATA?.trim() ? parseDate(WYDATEK_DATA).iso : todayIso(),
        }
        : null;

    const { collection, stats } = closeCollection(target, { totalChildren: TOTAL_CHILDREN, force: MIMO_ZALEGLOSCI === 'true' });
    data.collections[data.collections.indexOf(target)] = collection;
    await writeCollections(data);
    if (expense) await writeFile(EXPENSES, insertExpense(await readFile(EXPENSES, 'utf8'), expense));

    await report([
        `### ✅ Zamknięto zbiórkę #${collection.id}: ${collection.name}`,
        `- Opłacone: **${stats.paidCount}/${collection.totalChildren}**, zebrano **${PLN(stats.collected)}**`,
        stats.absent.length ? `- Nieobecni: nr ${stats.absent.join(', ')}` : '',
        stats.unpaidNumbers.length ? `- ⚠️ Zamknięta mimo zaległości: nr ${stats.unpaidNumbers.join(', ')}` : '',
        expense ? `- Wydatek: **${PLN(expense.amount)}** — ${expense.what} (${expense.date})` : '- Bez wydatku.',
        expense && Math.abs(expense.amount - stats.collected) >= 0.01
            ? `- ℹ️ Wydatek różni się od zebranej kwoty o ${PLN(expense.amount - stats.collected)}.` : '',
    ].filter(Boolean).join('\n'));
    await setCommitMessage(`Zamknięcie zbiórki #${collection.id}: ${collection.name}${expense ? ` + wydatek ${expense.amount.toFixed(2)} zł` : ''}`);
});
