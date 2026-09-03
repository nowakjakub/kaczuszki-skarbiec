# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kaczuszki Skarbiec** (Duck Treasury) — a transparent financial management static website for a preschool parent group. It displays collections, expenses, events, and payment status. Hosted on GitHub Pages, deploys automatically on push to `master`.

## Development

No build tools or dependencies. Serve locally with:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Deployment is handled by `.github/workflows/static.yml` on push to `master`.

## Architecture

Single-page app with vanilla JS ES6 modules and plain CSS. Data lives in JSON files under `data/`; no backend.

**Data flow:** `main.js` fetches all 5 JSON files in parallel (`Promise.all`), then passes data to feature modules for rendering.

**Key constant:** `TOTAL_CHILDREN` in `js/main.js` — current group size (24), used as the default for new/open collections and for the lookup dropdown (1–N). When the group size changes, update only this constant. Do **not** touch closed collections — they each carry their own `"totalChildren"` field in `collections.json` that freezes their historical count, so `normalizeCollection` uses that value instead of the global default.

**Feature modules** (`js/`):
- `main.js` — initialization, parallel data fetch, error handling
- `balance.js` — computes treasury balance (incomes + collections − expenses)
- `collections.js` — renders fundraiser cards with paid/unpaid child tracking
- `expenses.js` — expense table with receipt links
- `events.js` — event calendar; shows a banner for events within 5 days
- `lookup.js` — child payment status checker (dropdown by child number)
- `banking.js` — bank details with copy-to-clipboard
- `theme.js` — dark/light mode toggle via OS preference + localStorage
- `utils.js` — shared helpers: DOM query shortcuts, `fetchJSON`, `escapeHtml`, `escapeAttr`, PLN/date formatting

**Data files** (`data/`):
- `collections.json` — array of fundraisers with `paid[]` arrays (child numbers) and optional `"totalChildren"` field. Closed collections carry an explicit `"totalChildren"` to freeze their historical group size; open/new ones inherit `TOTAL_CHILDREN` from `main.js`.
- `expenses.json` — expense records with optional `receipt` path under `receipts/`
- `incomes.json` — non-collection income sources
- `events.json` — upcoming events (used for banner logic)
- `banking.json` — account number, BLIK, Revolut, transfer template

## Conventions

- All user-visible text is in Polish; dates use `pl-PL` locale; currency uses `Intl.NumberFormat` for PLN.
- Always use `escapeHtml()` / `escapeAttr()` from `utils.js` when injecting data into HTML strings.
- CSS theming via custom properties defined on `:root` and `[data-theme="dark"]` in `styles.css`. Responsive breakpoints: >900px two-column grid, <900px single column.
