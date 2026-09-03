import { qs, PLN, escapeHtml } from './utils.js';

export function normalizePaidList(rawPaid, totalChildren) {
    if (!rawPaid) return [];
    const items = Array.isArray(rawPaid)
        ? rawPaid
        : String(rawPaid).split(/[,;\s]+/).filter(Boolean);
    return Array.from(new Set(items.map((v) => Number(v))))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= totalChildren)
        .sort((a, b) => a - b);
}

export function normalizeCollection(col, defaultTotalChildren) {
    const totalChildren = Number.isInteger(col.totalChildren)
        ? col.totalChildren
        : defaultTotalChildren;
    const paid = normalizePaidList(col.paid, totalChildren);
    const amount = Number(col.amountPerChild || 0);
    const paidCount = paid.length;
    const collected = paidCount * amount;
    const unpaidNumbers = Array.from({ length: totalChildren }, (_, i) => i + 1)
        .filter((n) => !paid.includes(n));
    return {
        ...col,
        paid,
        amount,
        paidCount,
        unpaidCount: totalChildren - paidCount,
        collected,
        unpaidNumbers,
        totalChildren,
    };
}

function renderCollectionCard(c) {
    const pct = c.totalChildren ? Math.round((c.paidCount / c.totalChildren) * 100) : 0;
    const statusLabel = c.status === 'open'
        ? '<span class="badge ok">otwarta</span>'
        : '<span class="badge">zamknięta</span>';
    return `
        <div class="collection">
            <h3>${escapeHtml(c.name)} ${statusLabel}</h3>
            <div class="meta">Składka: <strong>${PLN(c.amount)}</strong> • Opłacone: <strong>${c.paidCount}/${c.totalChildren}</strong> (${pct}%) • Zebrano: <strong>${PLN(c.collected)}</strong></div>
        </div>`;
}

export function renderCollections(openCols, closedCols) {
    qs('#current-list').innerHTML = openCols.length
        ? openCols.map((c) => renderCollectionCard(c)).join('')
        : '<p>Brak otwartych zbiórek.</p>';
    qs('#past-list').innerHTML = closedCols.length
        ? closedCols.map((c) => renderCollectionCard(c)).join('')
        : '<p>Brak zamkniętych zbiórek.</p>';
}
