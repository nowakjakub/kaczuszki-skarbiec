// Użycie: NAZWA="Kino" KWOTA=14 TERMIN=22.10.2026 RODZENSTWO="18" node scripts/otworz-zbiorke.mjs
import { TOTAL_CHILDREN } from '../js/config.js';
import { PLN } from '../js/utils.js';
import { createCollection, parseNumbers } from './zbiorki.mjs';
import { run, report, readCollections, writeCollections, setCommitMessage } from './cli.mjs';

const { NAZWA, KWOTA, TERMIN, RODZENSTWO } = process.env;

await run(async () => {
    const data = await readCollections();
    const halfPrice = RODZENSTWO?.trim() ? parseNumbers(RODZENSTWO, TOTAL_CHILDREN) : [];
    const collection = createCollection(data.collections, { name: NAZWA, amount: KWOTA, deadline: TERMIN?.trim(), halfPrice });
    data.collections.unshift(collection);
    await writeCollections(data);

    await report([
        `### ✅ Otwarto zbiórkę nr **${collection.id}**: ${collection.name}`,
        `- Składka: **${PLN(collection.amountPerChild)}** od dziecka (${TOTAL_CHILDREN} dzieci)`,
        halfPrice.length ? `- Rodzeństwo (50%): nr ${halfPrice.join(', ')}` : '',
        `- Wpłaty dopisuj workflowem „Dodaj wpłatę” z numerem zbiórki **${collection.id}**.`,
    ].filter(Boolean).join('\n'));
    await setCommitMessage(`Nowa zbiórka #${collection.id}: ${collection.name}`);
});
