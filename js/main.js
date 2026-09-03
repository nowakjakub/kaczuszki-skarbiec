import { qs, qsa, fetchJSON, DATE_FORMATTER, escapeHtml } from './utils.js';
import { initTheme } from './theme.js';
import { normalizeCollection, renderCollections } from './collections.js';
import { renderBalance } from './balance.js';
import { renderExpenses } from './expenses.js';
import { renderEvents } from './events.js';
import { renderBanking } from './banking.js';
import { renderSupplies } from './supplies.js';
import { setupLookupForm } from './lookup.js';

// Liczba dzieci w grupie — zmień tu jeśli zmieni się skład grupy.
// Dotyczy nowych/aktywnych zbiórek. Zbiórki zamknięte przed zmianą składu
// mają własne pole "totalChildren" w collections.json i nie są tym ruszane.
const TOTAL_CHILDREN = 24;

function renderError(err) {
    qs('#balance-summary').textContent = 'Błąd ładowania danych.';
    qsa('.card').forEach((card) =>
        card.insertAdjacentHTML('beforeend', `<p class="hint">${escapeHtml(String(err.message || err))}</p>`)
    );
}

async function init() {
    try {
        const [collectionsWrap, incomesWrap, expensesWrap, banking, eventsWrap, supplies] = await Promise.all([
            fetchJSON('collections.json'),
            fetchJSON('incomes.json'),
            fetchJSON('expenses.json'),
            fetchJSON('banking.json'),
            fetchJSON('events.json'),
            fetchJSON('supplies.json'),
        ]);

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
        renderSupplies(supplies);
        renderEvents(eventsWrap, new Date());
        renderBanking(banking);
        setupLookupForm(openCols, TOTAL_CHILDREN);
    } catch (err) {
        console.error(err);
        renderError(err);
    }
}

initTheme();
document.addEventListener('DOMContentLoaded', init);
