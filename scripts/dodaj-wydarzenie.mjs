// Użycie: DATA=14.10.2026 TYTUL="Dzień Nauczyciela" GODZINA=9:30 OPIS="..." node scripts/dodaj-wydarzenie.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { todayIso } from './zbiorki.mjs';
import { createEvent, upcomingEventsTable } from './wydarzenia.mjs';
import { run, report, setCommitMessage } from './cli.mjs';

const EVENTS = new URL('../data/events.json', import.meta.url);
const { DATA, TYTUL, GODZINA, OPIS } = process.env;

await run(async () => {
    const data = JSON.parse(await readFile(EVENTS, 'utf8'));
    const event = createEvent(data.events, { date: DATA, title: TYTUL, time: GODZINA, description: OPIS });
    data.events.unshift(event);
    await writeFile(EVENTS, `${JSON.stringify(data, null, 4)}\n`);

    const today = todayIso();
    await report([
        `### ✅ Dodano wydarzenie: ${event.title}`,
        `- Data: **${event.date}**`,
        event.description ? `- Opis: ${event.description}` : '',
        event.date < today ? '- ⚠️ Data jest w przeszłości — wydarzenie trafi do „Co już nas spotkało?”.' : '',
        `\n#### Nadchodzące wydarzenia\n\n${upcomingEventsTable(data.events, today)}`,
    ].filter(Boolean).join('\n'));
    await setCommitMessage(`Wydarzenie ${event.date}: ${event.title}`);
}, { showCollections: false });
