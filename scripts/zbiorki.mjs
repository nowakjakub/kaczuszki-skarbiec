export const KINDS = {
    wplata: 'wpłata',
    nieobecnosc: 'nieobecność',
    cofnij: 'cofnięcie',
};

const fold = (s) => String(s ?? '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

const isOpen = (c) => (c.status || 'open') === 'open';

export function parseNumbers(input, totalChildren) {
    const parts = String(input ?? '').split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) throw new Error('Podaj co najmniej jeden numer dziecka.');
    const numbers = parts.map((p) => {
        if (!/^\d+$/.test(p)) throw new Error(`„${p}” nie jest numerem dziecka.`);
        const n = Number(p);
        if (n < 1 || n > totalChildren) {
            throw new Error(`Numer ${n} jest spoza zakresu 1–${totalChildren}.`);
        }
        return n;
    });
    return [...new Set(numbers)].sort((a, b) => a - b);
}

export function findOpenCollection(collections, query) {
    const q = fold(query);
    if (!q) throw new Error('Podaj nazwę (lub fragment nazwy) zbiórki.');
    const open = collections.filter(isOpen);
    const list = (cols) => cols.map((c) => `• ${c.name}`).join('\n');

    const exact = open.filter((c) => fold(c.name) === q);
    if (exact.length === 1) return exact[0];

    const matches = open.filter((c) => fold(c.name).includes(q));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
        throw new Error(`„${query}” pasuje do kilku otwartych zbiórek — doprecyzuj:\n${list(matches)}`);
    }
    if (collections.some((c) => !isOpen(c) && fold(c.name).includes(q))) {
        throw new Error(`Zbiórka pasująca do „${query}” jest zamknięta — tego skryptu nie używamy do zamkniętych zbiórek.`);
    }
    throw new Error(`Nie znaleziono otwartej zbiórki pasującej do „${query}”. Otwarte zbiórki:\n${list(open)}`);
}

export function applyChange(collection, numbers, kind) {
    if (!(kind in KINDS)) throw new Error(`Nieznany rodzaj zmiany: ${kind}`);
    const paid = new Set(collection.paid || []);
    const absent = new Set(collection.absent || []);
    const changed = [];
    const skipped = [];

    for (const n of numbers) {
        if (kind === 'wplata') {
            if (paid.has(n)) { skipped.push({ n, reason: 'już opłacone' }); continue; }
            paid.add(n);
            absent.delete(n);
            changed.push(n);
        } else if (kind === 'nieobecnosc') {
            if (paid.has(n)) { skipped.push({ n, reason: 'ma wpłatę — najpierw ją cofnij' }); continue; }
            if (absent.has(n)) { skipped.push({ n, reason: 'nieobecność już zgłoszona' }); continue; }
            absent.add(n);
            changed.push(n);
        } else {
            if (!paid.has(n) && !absent.has(n)) { skipped.push({ n, reason: 'brak wpłaty i nieobecności do cofnięcia' }); continue; }
            paid.delete(n);
            absent.delete(n);
            changed.push(n);
        }
    }

    const sorted = (s) => [...s].sort((a, b) => a - b);
    const updated = { ...collection, paid: sorted(paid) };
    if (absent.size) updated.absent = sorted(absent);
    else delete updated.absent;
    return { collection: updated, changed, skipped };
}

// JSON z 4 spacjami, ale tablice liczb w jednej linii — jak w ręcznie edytowanym pliku.
export function formatCollectionsJson(data) {
    const json = JSON.stringify(data, null, 4)
        .replace(/\[\s*(-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)*)\s*\]/g,
            (_, inner) => `[${inner.split(/\s*,\s*/).join(', ')}]`);
    return `${json}\n`;
}
