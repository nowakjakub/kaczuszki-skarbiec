import { qs, escapeHtml } from './utils.js';

export function renderSupplies(supplies) {
    const container = qs('#supplies-list');
    if (!supplies || !container) return;

    const categoriesHtml = (supplies.categories || []).map(cat => `
        <div class="supply-category">
            <h4>${escapeHtml(cat.name)}</h4>
            <ul>
                ${(cat.items || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        </div>`).join('');

    container.innerHTML = categoriesHtml +
        (supplies.note ? `<p class="hint">${escapeHtml(supplies.note)}</p>` : '');
}
