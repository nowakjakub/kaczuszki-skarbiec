import { normalizeCollection } from '../js/collections.js';
import { PLN } from '../js/utils.js';

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
const label = (c) => `#${c.id} ${c.name}`;
const list = (cols) => cols.map((c) => `• ${label(c)}`).join('\n');

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

// Zapytanie to numer zbiórki (np. „16” lub „#16”) albo — awaryjnie — fragment nazwy.
export function findOpenCollection(collections, query) {
    const q = fold(query);
    if (!q) throw new Error('Podaj numer zbiórki.');
    const open = collections.filter(isOpen);

    const idMatch = q.match(/^#?(\d+)$/);
    if (idMatch) {
        const found = collections.find((c) => c.id === Number(idMatch[1]));
        if (!found) throw new Error(`Nie ma zbiórki nr ${idMatch[1]}. Otwarte zbiórki:\n${list(open)}`);
        if (!isOpen(found)) throw new Error(`Zbiórka ${label(found)} jest już zamknięta. Otwarte zbiórki:\n${list(open)}`);
        return found;
    }

    const exact = open.filter((c) => fold(c.name) === q);
    if (exact.length === 1) return exact[0];
    const matches = open.filter((c) => fold(c.name).includes(q));
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
        throw new Error(`„${query}” pasuje do kilku otwartych zbiórek — podaj numer:\n${list(matches)}`);
    }
    if (collections.some((c) => !isOpen(c) && fold(c.name).includes(q))) {
        throw new Error(`Zbiórka pasująca do „${query}” jest zamknięta. Otwarte zbiórki:\n${list(open)}`);
    }
    throw new Error(`Nie znaleziono otwartej zbiórki „${query}”. Otwarte zbiórki:\n${list(open)}`);
}

// Kilka zbiórek naraz, po przecinku/średniku, np. „17, 18” albo „#17;#18”.
export function findOpenCollections(collections, query) {
    const parts = String(query ?? '').split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) throw new Error('Podaj numer zbiórki (lub kilka numerów po przecinku).');
    const found = parts.map((p) => findOpenCollection(collections, p));
    const seen = new Set();
    return found.filter((c) => (seen.has(c.id) ? false : seen.add(c.id)));
}

// Wiele zbiórek × wiele dzieci = iloczyn kartezjański wpłat — łatwo o pomyłkę,
// więc taki przypadek wymaga świadomego potwierdzenia w formularzu workflow.
export const needsConfirmation = (collectionsCount, numbersCount) => collectionsCount > 1 && numbersCount > 1;

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

export function parseAmount(input) {
    const text = String(input ?? '').trim().replace(/\s*zł$/i, '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(text) || Number(text) <= 0) {
        throw new Error(`„${input}” nie jest poprawną kwotą (np. 12 albo 12,50).`);
    }
    return Number(text);
}

// „DD.MM.RRRR” → { iso: 'RRRR-MM-DD', display: 'DD.MM.RRRR' }
export function parseDate(input) {
    const m = String(input ?? '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    const iso = m && `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (!iso || Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) || new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) {
        throw new Error(`„${input}” nie jest poprawną datą (format DD.MM.RRRR, np. 13.10.2026).`);
    }
    return { iso, display: `${iso.slice(8)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` };
}

export const todayIso = (now = new Date()) =>
    new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(now);

export function nextId(collections) {
    return Math.max(0, ...collections.map((c) => c.id || 0)) + 1;
}

export function createCollection(collections, { name, amount, deadline, halfPrice = [] }) {
    const base = String(name ?? '').trim();
    if (!base) throw new Error('Podaj nazwę zbiórki.');
    const fullName = deadline ? `${base} - do ${parseDate(deadline).display}` : base;
    if (collections.some((c) => fold(c.name) === fold(fullName))) {
        throw new Error(`Zbiórka „${fullName}” już istnieje.`);
    }
    const collection = { id: nextId(collections), name: fullName, amountPerChild: parseAmount(amount), status: 'open', paid: [] };
    if (halfPrice.length) collection.halfPrice = halfPrice;
    return collection;
}

export function closeCollection(collection, { totalChildren, force = false }) {
    const stats = normalizeCollection(collection, totalChildren);
    if (stats.unpaidNumbers.length && !force) {
        throw new Error(`Zbiórka ${label(collection)} ma zaległości (nr ${stats.unpaidNumbers.join(', ')}). `
            + 'Dopisz wpłaty lub nieobecności albo zaznacz „zamknij mimo zaległości”.');
    }
    return {
        collection: { ...collection, status: 'closed', totalChildren: collection.totalChildren ?? totalChildren },
        stats,
    };
}

// Wstawia wydatek na początek listy bez przeformatowania reszty pliku (kwoty zostają jako 294.00).
export function insertExpense(rawJson, { date, what, amount, receipt = '' }) {
    const marker = /"expenses"\s*:\s*\[/;
    const match = rawJson.match(marker);
    if (!match) throw new Error('Nie znaleziono listy "expenses" w expenses.json.');
    const at = match.index + match[0].length;
    const isEmpty = /^\s*\]/.test(rawJson.slice(at));
    const entry = [
        '\n        {',
        `            "date": ${JSON.stringify(date)},`,
        `            "what": ${JSON.stringify(what)},`,
        `            "amount": ${Number(amount).toFixed(2)},`,
        `            "receipt": ${JSON.stringify(receipt)}`,
        `        }${isEmpty ? '\n    ' : ','}`,
    ].join('\n');
    return rawJson.slice(0, at) + entry + rawJson.slice(at);
}

export function openCollectionsTable(collections, totalChildren) {
    const open = collections.filter(isOpen).map((c) => normalizeCollection(c, totalChildren));
    if (!open.length) return '_Brak otwartych zbiórek._';
    return [
        '| Nr | Zbiórka | Składka | Opłacone | Zebrano |',
        '|---:|---|---:|---:|---:|',
        ...open.map((c) => `| **${c.id}** | ${c.name} | ${PLN(c.amount)} | ${c.paidCount}/${c.totalChildren} | ${PLN(c.collected)} |`),
    ].join('\n');
}

// JSON z 4 spacjami, ale tablice liczb w jednej linii — jak w ręcznie edytowanym pliku.
export function formatCollectionsJson(data) {
    const json = JSON.stringify(data, null, 4)
        .replace(/\[\s*(-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)*)\s*\]/g,
            (_, inner) => `[${inner.split(/\s*,\s*/).join(', ')}]`);
    return `${json}\n`;
}
