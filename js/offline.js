import { qs } from './utils.js';

const CACHED_AT_FORMAT = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeStyle: 'short' });

export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker:', err));
    });
}

// cachedDates: nagłówki x-cached-at odpowiedzi z danymi; puste = dane prosto z sieci.
export function renderOfflineBanner(cachedDates) {
    const oldest = cachedDates.filter(Boolean).sort()[0];
    if (!oldest) return;
    const banner = qs('#offline-banner');
    banner.textContent = `📴 Tryb offline — pokazujemy dane zapisane ${CACHED_AT_FORMAT.format(new Date(oldest))}. Saldo i wpłaty mogą być nieaktualne.`;
    banner.hidden = false;
    window.addEventListener('online', () => window.location.reload(), { once: true });
}
