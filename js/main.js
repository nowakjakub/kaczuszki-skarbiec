import { qs, qsa, fetchJSON, DATE_FORMATTER, escapeHtml } from './utils.js';
import { initTheme } from './theme.js';
import { normalizeCollection, renderCollections } from './collections.js';
import { renderBalance } from './balance.js';
import { renderExpenses } from './expenses.js';
import { renderEvents } from './events.js';
import { renderBanking } from './banking.js';
import { setupLookupForm } from './lookup.js';
import { TOTAL_CHILDREN } from './config.js';
import { registerServiceWorker, renderOfflineBanner } from './offline.js';

function renderError(err) {
    qs('#balance-summary').textContent = 'Błąd ładowania danych.';
    const message = navigator.onLine
        ? String(err.message || err)
        : 'Brak internetu, a dane nie zostały jeszcze zapisane na tym urządzeniu. Otwórz stronę raz z internetem.';
    qsa('.card').forEach((card) =>
        card.insertAdjacentHTML('beforeend', `<p class="hint">${escapeHtml(message)}</p>`)
    );
}

async function init() {
    try {
        const files = ['collections.json', 'incomes.json', 'expenses.json', 'banking.json', 'events.json'];
        const responses = await Promise.all(files.map(fetchJSON));
        const [collectionsWrap, incomesWrap, expensesWrap, banking, eventsWrap] = responses.map((r) => r.data);
        renderOfflineBanner(responses.map((r) => r.cachedAt));

        qs('#site-title').textContent = '🦆 KACZUSZKI 🦆';
        qs('#current-date').textContent = DATE_FORMATTER.format(new Date());

        const collections = (collectionsWrap?.collections || [])
            .map((col) => normalizeCollection(col, TOTAL_CHILDREN));
        const openCols = collections.filter((c) => (c.status || 'open') === 'open');
        const closedCols = collections.filter((c) => (c.status || 'open') !== 'open');

        const fromCollections = collections.reduce((sum, c) => sum + c.collected, 0);
        const otherIncome = (incomesWrap?.incomes || []).reduce((sum, i) => sum + Number(i.amount || 0), 0);
        const expenses = (expensesWrap?.expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

        renderBalance(fromCollections, otherIncome, expenses);
        renderCollections(openCols, closedCols);
        renderExpenses(expensesWrap);
        renderEvents(eventsWrap, new Date());
        renderBanking(banking);
        setupLookupForm(openCols, TOTAL_CHILDREN);
    } catch (err) {
        console.error(err);
        renderError(err);
    }
}

initTheme();
registerServiceWorker();
document.addEventListener('DOMContentLoaded', init);
