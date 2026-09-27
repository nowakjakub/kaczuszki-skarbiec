# 🦆 Kaczuszki Skarbiec

[![Testy](https://github.com/nowakjakub/kaczuszki-skarbiec/actions/workflows/tests.yml/badge.svg?branch=master)](https://github.com/nowakjakub/kaczuszki-skarbiec/actions/workflows/tests.yml)
[![Wdrożenie](https://github.com/nowakjakub/kaczuszki-skarbiec/actions/workflows/static.yml/badge.svg?branch=master)](https://github.com/nowakjakub/kaczuszki-skarbiec/actions/workflows/static.yml)

Transparentne zarządzanie finansami grupy przedszkolnej Kaczuszki dla rodziców.

## 🌐 Strona

https://nowakjakub.github.io/kaczuszki-skarbiec/

## ✨ Funkcjonalności

- **💰 Stan skarbca** — saldo: wpłaty ze zbiórek + inne wpływy − wydatki
- **🎁 Nasze zbiórki** — otwarte i zamknięte zbiórki ze statusem wpłat, rabatem dla rodzeństwa i zgłoszonymi nieobecnościami
- **👶 Czy zapłaciliśmy?** — zaległości dziecka po numerze z dziennika
- **🏦 Jak przelać pieniążki?** — dane bankowe, BLIK, Revolut z kopiowaniem
- **🎒 Wyprawka** — lista rzeczy do przygotowania
- **🎉 Co nas czeka?** — wydarzenia z bannerem dla najbliższych 5 dni
- **📊 Gdzie idą pieniążki?** — wydatki z paragonami
- **🌙 Przełącznik motywu** — jasny/ciemny, zgodnie z ustawieniem systemu

## 🎨 Cechy

- ✅ **100% statyczne** — hosting na GitHub Pages, brak backendu
- ✅ **Bez frameworków** — vanilla JavaScript (moduły ES) i czysty CSS
- ✅ **Responsywne** — komputer, tablet, telefon
- ✅ **Bez śledzenia** — żadnych cookies ani analityki
- ✅ **Aplikacja na telefon (PWA)** — instalacja z przeglądarki, działa też offline
- ✅ **Testowane** — każda zmiana sprawdzana automatycznie przed wdrożeniem

## 📲 Aplikacja na telefonie (także offline)

Stronę można zainstalować jak aplikację — ikona kaczuszki na ekranie głównym, pełny ekran bez paska przeglądarki:

- **Android (Chrome):** menu ⋮ → „Zainstaluj aplikację” (lub „Dodaj do ekranu głównego”),
- **iPhone (Safari):** przycisk Udostępnij → „Do ekranu początkowego”.

Jak działa:

- **z internetem** — zawsze pobiera najświeższe dane (nowe wpłaty widać od razu po wdrożeniu),
- **bez internetu** — pokazuje ostatnio pobrane dane z banerem „📴 Tryb offline — dane zapisane …”, żeby nikt nie wziął starego salda za aktualne; po powrocie sieci odświeża się sama,
- aplikacja jest tylko do przeglądania; paragony są dostępne offline tylko te, które były wcześniej otwarte.

Technicznie: `manifest.webmanifest` (nazwa, ikony z `icons/`) i service worker `sw.js` (network-first, lista plików offline w `PRECACHE` — testy pilnują, żeby była kompletna).

## ➕ Zbiórki bez edycji plików (GitHub Actions)

Każda zbiórka ma stały **numer** (pole `id`, niewidoczne na stronie). Wszystkie workflowy wybiera się w zakładce **Actions → nazwa workflowu → Run workflow**.

| Workflow | Co robi | Pola |
|---|---|---|
| [**Lista zbiórek**](https://github.com/nowakjakub/kaczuszki-skarbiec/actions/workflows/lista-zbiorek.yml) | pokazuje otwarte zbiórki z numerami (niczego nie zmienia) | — |
| [**Otwórz zbiórkę**](https://github.com/nowakjakub/kaczuszki-skarbiec/actions/workflows/otworz-zbiorke.yml) | dodaje zbiórkę z kolejnym wolnym numerem | nazwa, kwota od dziecka (np. `14` lub `12,50`), termin `DD.MM.RRRR` *(opcj., dopisze „- do …” do nazwy)*, numery rodzeństwa płacącego 50% *(opcj.)* |
| [**Dodaj wpłatę**](https://github.com/nowakjakub/kaczuszki-skarbiec/actions/workflows/dodaj-wplate.yml) | wpłata, nieobecność albo cofnięcie omyłki | numer zbiórki, numery dzieci (np. `3, 7, 12`), rodzaj: `wplata` / `nieobecnosc` / `cofnij` |
| [**Zamknij zbiórkę**](https://github.com/nowakjakub/kaczuszki-skarbiec/actions/workflows/zamknij-zbiorke.yml) | zamyka zbiórkę (sam dopisze `totalChildren`) i opcjonalnie dodaje wydatek | numer zbiórki, kwota wydatku *(opcj.)*, opis *(opcj., domyślnie nazwa zbiórki)*, data `DD.MM.RRRR` *(opcj., domyślnie dziś)*, „zamknij mimo zaległości” |

Każde uruchomienie kończy się podsumowaniem (co zmieniono, kto jeszcze nie zapłacił) i aktualną tabelą otwartych zbiórek z numerami. Zmiana trafia na stronę po ok. 2 minutach.

Zabezpieczenia: workflowy zmieniające dane może uruchomić tylko właściciel repozytorium; nic nie jest zapisywane, jeśli numer zbiórki nie istnieje lub zbiórka jest zamknięta, numer dziecka jest spoza zakresu, zamykana zbiórka ma zaległości (chyba że zaznaczysz „zamknij mimo zaległości”) albo testy danych nie przejdą. Wydarzenia i paragony nadal edytuje się w plikach `data/` i `receipts/`.

## 🧪 Testy

| Rodzaj | Co sprawdza | Uruchomienie |
|---|---|---|
| Jednostkowe i danych (`tests/unit/`) | liczenie zbiórek (rabat, nieobecni, `totalChildren`), formatowanie, skrypty workflowów (otwieranie, wpłaty, zamykanie, wydatki) oraz poprawność wszystkich plików `data/` — unikalne numery zbiórek, zakresy numerów dzieci, brak duplikatów, `totalChildren` w zamkniętych zbiórkach, istnienie paragonów, nieujemne saldo | `npm test` (sam Node 22, bez instalacji) |
| Strony w przeglądarce (`tests/e2e/`) | prawdziwa strona w Chromium (komputer i telefon): saldo, karty zbiórek, „Czy zapłaciliśmy?” dla każdego dziecka, wydatki, motyw, brak przewijania w bok, brak błędów JS, działanie offline po wyłączeniu serwera | `npm ci && npx playwright install chromium && npm run test:e2e` |

Kiedy działają automatycznie:

- **każdy Pull Request** — wynik (✅/❌) widać w PR przed mergem,
- **każdy push na `master`** — strona wdraża się **tylko jeśli testy przejdą**, więc zepsute dane nie trafią na stronę,
- **workflow „Dodaj wpłatę”** — testy przed zapisem i przed wdrożeniem.

## 📁 Struktura projektu

```
.
├── index.html
├── styles.css
├── manifest.webmanifest  # aplikacja na telefon (PWA)
├── sw.js                # service worker — tryb offline
├── icons/               # ikony aplikacji
├── js/
│   ├── config.js          # TOTAL_CHILDREN — liczba dzieci w grupie
│   ├── main.js            # start aplikacji, pobranie danych
│   ├── collections.js     # liczenie i karty zbiórek
│   ├── lookup.js          # „Czy zapłaciliśmy?”
│   ├── offline.js         # rejestracja service workera, baner offline
│   └── ...                # balance, expenses, events, banking, supplies, theme, utils
├── data/                  # collections, expenses, incomes, events, banking, supplies (.json)
├── receipts/              # paragony (PDF/JPG)
├── scripts/               # skrypty workflowów (otwórz / wpłata / zamknij / lista)
├── tests/                 # unit/ (node:test) i e2e/ (Playwright)
└── .github/workflows/     # tests.yml, static.yml (wdrożenie) + workflowy zbiórek
```

## 📊 Format danych

### collections.json

```json
{
    "id": 16,
    "name": "Rada rodziców - do 30.09.2026",
    "amountPerChild": 180,
    "status": "open",
    "paid": [1, 2, 3],
    "halfPrice": [18],
    "absent": [21]
}
```

- `id` — stały numer zbiórki używany przez workflowy (nowa zbiórka: największy numer + 1),
- `paid` — numery dzieci, które zapłaciły,
- `halfPrice` *(opcjonalne)* — rodzeństwo płacące 50% składki,
- `absent` *(opcjonalne)* — zgłoszona nieobecność: dziecko nie ma zaległości i nie jest liczone jako niezapłacone,
- `totalChildren` — **wymagane w zamkniętych zbiórkach**: liczba dzieci w chwili zamknięcia (chroni historię przed zmianą `TOTAL_CHILDREN`).

### expenses.json

```json
{ "date": "2026-09-23", "what": "Kino", "amount": 294.00, "receipt": "receipts/plik.jpg" }
```

`receipt` może być puste; jeśli podane — plik musi istnieć w `receipts/` (sprawdzają to testy).

### events.json

```json
{ "date": "2026-10-14", "title": "Dzień Nauczyciela", "description": "..." }
```

## 🚀 Uruchomienie lokalnie

```bash
git clone https://github.com/nowakjakub/kaczuszki-skarbiec.git
cd kaczuszki-skarbiec
python3 -m http.server 8000
```

Otwórz: http://localhost:8000

## 🔧 Konfiguracja

- **Liczba dzieci w grupie** — `TOTAL_CHILDREN` w `js/config.js`. Zamknięte zbiórki mają własne `totalChildren` i nie należy ich przeliczać.
- **Zamykanie zbiórki** — zmień `"status"` na `"closed"` i dopisz `"totalChildren"` z aktualną liczbą dzieci.
- **Dane bankowe** — `data/banking.json`; **wydarzenia** — `data/events.json`; **wyprawka** — `data/supplies.json`.

## 🚢 Wdrażanie

Push (lub merge PR) na `master` → workflow **Testy** → workflow **Deploy** publikuje stronę na GitHub Pages.

---

*Grupa Kaczuszki — transparentne zarządzanie składkami, wydatkami i wydarzeniami* 🦆
