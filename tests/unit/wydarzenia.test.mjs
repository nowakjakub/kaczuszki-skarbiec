import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, createEvent, upcomingEventsTable } from '../../scripts/wydarzenia.mjs';

const EVENTS = [
    { date: '2026-09-23', title: 'Kino, godz. 9:30' },
    { date: '2026-10-14', title: 'Dzień Nauczyciela' },
];

test('parseTime: „9:30”, „09.30” → „9:30”; odrzuca złe godziny', () => {
    assert.equal(parseTime('09.30'), '9:30');
    assert.equal(parseTime(' 14:05 '), '14:05');
    for (const bad of ['24:00', '9:60', '930', 'rano']) assert.throws(() => parseTime(bad), /poprawną godziną/);
});

test('createEvent: data ISO, godzina w tytule, opis opcjonalny', () => {
    assert.deepEqual(createEvent(EVENTS, { date: '5.11.2026', title: ' Teatr ', time: '10:00', description: ' Spektakl ' }),
        { date: '2026-11-05', title: 'Teatr, godz. 10:00', description: 'Spektakl' });
    assert.deepEqual(createEvent(EVENTS, { date: '05.11.2026', title: 'Basen', time: '', description: '' }),
        { date: '2026-11-05', title: 'Basen' });
});

test('createEvent: błąd dla pustego tytułu, złej daty i duplikatu', () => {
    assert.throws(() => createEvent(EVENTS, { date: '1.11.2026', title: ' ' }), /Podaj tytuł/);
    assert.throws(() => createEvent(EVENTS, { date: '2026-11-01', title: 'X' }), /poprawną datą/);
    assert.throws(() => createEvent(EVENTS, { date: '23.09.2026', title: 'kino', time: '9:30' }), /już jest na stronie/);
});

test('upcomingEventsTable: tylko nadchodzące, posortowane', () => {
    const table = upcomingEventsTable([...EVENTS].reverse(), '2026-10-01');
    assert.match(table, /Dzień Nauczyciela/);
    assert.doesNotMatch(table, /Kino/);
    assert.match(upcomingEventsTable(EVENTS, '2027-01-01'), /Brak nadchodzących/);
});
