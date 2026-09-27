# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kaczuszki Skarbiec** (Duck Treasury) — a transparent financial management static website for a preschool parent group. It displays collections, expenses, events, and payment status. Hosted on GitHub Pages, deploys automatically on push to `master`.

## Development

No build tools; the site itself has no dependencies. Serve locally with:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

**Tests** (always run before committing data or code changes):

```bash
npm test                                   # unit + data validation (node:test, no install needed)
npm ci && npx playwright test              # browser tests of the real page (desktop + phone)
```

`tests/unit/data.test.mjs` validates every file in `data/` (child numbers in range, no duplicates, no child in both `paid` and `absent`, closed collections must have `totalChildren`, receipt files exist, balance ≥ 0). `tests/e2e/` checks the rendered page against the data and against fixed fixtures.

**CI** (`.github/workflows/`):
- `tests.yml` — runs on every PR and push to `master`; README badge shows its status.
- `static.yml` — deploys to GitHub Pages on push to `master`, only after `tests.yml` passes (called as a reusable workflow).
- `dodaj-wplate.yml` — manual `workflow_dispatch` (owner only) that records a payment / absence / undo in an open collection via `scripts/dodaj-wplate.mjs`, runs tests, pushes to `master`, then calls `static.yml` to deploy (GITHUB_TOKEN pushes don't trigger other workflows). It rewrites `collections.json` with `formatCollectionsJson` (4-space indent, number arrays on one line) — keep that format when editing by hand.

## Architecture

Single-page app with vanilla JS ES6 modules and plain CSS. Data lives in JSON files under `data/`; no backend.

**Data flow:** `main.js` fetches all 6 JSON files in parallel (`Promise.all`), then passes data to feature modules for rendering.

**Key constant:** `TOTAL_CHILDREN` in `js/config.js` — current group size (25), used as the default for new/open collections and for the lookup dropdown (1–N). When the group size changes, update only this constant. Do **not** touch closed collections — they each carry their own `"totalChildren"` field in `collections.json` that freezes their historical count, so `normalizeCollection` uses that value instead of the global default.

**Feature modules** (`js/`):
- `config.js` — `TOTAL_CHILDREN` (importable by tests and scripts)
- `main.js` — initialization, parallel data fetch, error handling
- `balance.js` — computes treasury balance (incomes + collections − expenses)
- `collections.js` — renders fundraiser cards with paid/unpaid child tracking
- `expenses.js` — expense table with receipt links
- `events.js` — event calendar; shows a banner for events within 5 days
- `lookup.js` — child payment status checker (dropdown by child number)
- `banking.js` — bank details with copy-to-clipboard
- `theme.js` — dark/light mode toggle via OS preference + localStorage
- `offline.js` — registers the service worker; shows the offline banner when data came from cache
- `utils.js` — shared helpers: DOM query shortcuts, `fetchJSON` (returns `{ data, cachedAt }`, uses `cache: 'no-cache'`), `escapeHtml`, `escapeAttr`, PLN/date formatting

**Data files** (`data/`):
- `collections.json` — array of fundraisers with `paid[]` arrays (child numbers) and optional fields `"totalChildren"`, `"halfPrice"` and `"absent"`. Closed collections carry an explicit `"totalChildren"` to freeze their historical group size; open/new ones inherit `TOTAL_CHILDREN` from `js/config.js`. The optional `"halfPrice"` array lists child numbers who pay 50% of `amountPerChild` (e.g. siblings). The optional `"absent"` array lists children with a reported absence — they are excluded from unpaid counts and the lookup shows „Nieobecność zgłoszona” instead of an amount due.
- `expenses.json` — expense records with optional `receipt` path under `receipts/`
- `incomes.json` — non-collection income sources
- `events.json` — upcoming events (used for banner logic)
- `banking.json` — account number, BLIK, Revolut, transfer template
- `supplies.json` — school supplies list (categories + note)

**PWA / offline:** `manifest.webmanifest` + `sw.js` (network-first; responses stored in the cache get an `x-cached-at` header, which `fetchJSON` exposes so the page can show „Tryb offline — dane zapisane …”). Every file in `js/` and `data/` must be listed in `PRECACHE` in `sw.js` — `tests/unit/pwa.test.mjs` fails otherwise. Bump `CACHE` in `sw.js` only to force-clear old caches. Playwright's `setOffline`/`route` don't reach service workers, so `tests/e2e/offline.spec.mjs` simulates offline by stopping its own HTTP server; other e2e tests run with `serviceWorkers: 'block'`.

## Rodzeństwo — rabat 50%

Jeśli w grupie jest rodzeństwo, za jedno z dzieci płacona jest połowa składki. Dodaj pole `"halfPrice"` z numerkami dzieci, które płacą 50%:

```json
{
    "name": "Rada rodziców - do 30.09.2026",
    "amountPerChild": 180.0,
    "status": "open",
    "paid": [1, 2, 3, ...],
    "halfPrice": [18]
}
```

`normalizeCollection` uwzględnia to przy liczeniu `collected`. `lookup.js` pokazuje właściwą kwotę „do zapłaty" dla danego dziecka. Na karcie zbiórki pojawia się informacja o rabacie.

## Zamykanie zbiórki — procedura

Przy zmianie statusu zbiórki z `"open"` na `"closed"` **zawsze** dopisz pole `"totalChildren"` z aktualną liczbą dzieci w grupie (dziś: 25). Bez tego pola przyszła zmiana `TOTAL_CHILDREN` w `js/config.js` zmieni wstecz statystyki tej zbiórki.

```json
{
    "name": "Nazwa zbiórki",
    "amountPerChild": 50.0,
    "status": "closed",
    "paid": [1, 2, 3, ...],
    "totalChildren": 25
}
```

## Pomysł na przyszłość — aplikacja webowa z panelem admina

Obecna architektura (statyczny site, dane w JSON-ach, GitHub Pages) jest prosta i bezkosztowa, ale nie pozwala na edycję danych przez przeglądarkę bez dostępu do repozytorium.

Gdyby w przyszłości powstała wersja z panelem admina, wymagałaby:

**Backend / baza danych**
- Np. **Supabase** (Postgres w chmurze + REST API + Auth) — darmowy plan wystarczy na ten rozmiar danych. Alternatywnie Firebase.
- JSON-y z `data/` zastąpiłaby baza; strona publiczna czytałaby dane przez API.

**Autentykacja**
- Supabase Auth lub Firebase Auth — login email + hasło lub przez Google.
- Panel admina (`/admin`) dostępny tylko po zalogowaniu.

**Panel admina (frontend)**
- Formularze: dodawanie/edytowanie zbiórek, oznaczanie wpłat, dodawanie wydatków z uploadem paragonu, dodawanie wydarzeń.
- Storage na paragony: Supabase Storage zamiast plików w repozytorium.

**Hosting**
- GitHub Pages odpada (tylko statyka). Vercel lub Netlify — darmowe plany.

**Alternatywa bez przepisywania**
- **Decap CMS** (dawniej Netlify CMS) — panel admina edytujący te same JSON-y przez GitHub API. Zero backendu, logowanie przez GitHub, zmiany lądują jako commity. Wolniejszy deploy (GitHub Pages), ale minimalna zmiana architektury.

## Conventions

- All user-visible text is in Polish; dates use `pl-PL` locale; currency uses `Intl.NumberFormat` for PLN.
- Always use `escapeHtml()` / `escapeAttr()` from `utils.js` when injecting data into HTML strings.
- CSS theming via custom properties defined on `:root` and `:root.dark` in `styles.css`. Responsive breakpoints: >900px two-column grid, <900px single column. Grid columns use `minmax(0, 1fr)` so wide content (expenses table, account number) can't push the page wider than a phone screen — an e2e test checks for horizontal overflow.
