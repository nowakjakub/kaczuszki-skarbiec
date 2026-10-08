import { parseDate } from './zbiorki.mjs';

// „9:30” / „09.30” → „9:30”
export function parseTime(input) {
    const m = String(input ?? '').trim().match(/^(\d{1,2})[:.](\d{2})$/);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) {
        throw new Error(`„${input}” nie jest poprawną godziną (np. 9:30).`);
    }
    return `${Number(m[1])}:${m[2]}`;
}

export function createEvent(events, { date, title, time, description }) {
    const base = String(title ?? '').trim();
    if (!base) throw new Error('Podaj tytuł wydarzenia.');
    const { iso } = parseDate(date);
    const fullTitle = time?.trim() ? `${base}, godz. ${parseTime(time)}` : base;
    if (events.some((e) => e.date === iso && e.title.trim().toLowerCase() === fullTitle.toLowerCase())) {
        throw new Error(`Wydarzenie „${fullTitle}” z ${iso} już jest na stronie.`);
    }
    const event = { date: iso, title: fullTitle };
    if (description?.trim()) event.description = description.trim();
    return event;
}

export function upcomingEventsTable(events, todayIso) {
    const upcoming = events.filter((e) => e.date >= todayIso).sort((a, b) => a.date.localeCompare(b.date));
    if (!upcoming.length) return '_Brak nadchodzących wydarzeń._';
    return [
        '| Data | Wydarzenie |',
        '|---|---|',
        ...upcoming.map((e) => `| ${e.date} | ${e.title} |`),
    ].join('\n');
}
