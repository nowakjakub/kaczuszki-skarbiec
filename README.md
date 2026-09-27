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
- ✅ **Testowane** — każda zmiana sprawdzana automatycznie przed wdrożeniem

## ➕ Dodawanie wpłat bez edycji plików

Workflow **„Dodaj wpłatę”** dopisuje wpłatę (lub nieobecność) do otwartej zbiórki, uruchamia testy, zapisuje commit na `master` i wdraża stronę.

1. Wejdź w [Actions → Dodaj wpłatę](https://github.com/nowakjakub/kaczuszki-skarbiec/actions/workflows/dodaj-wplate.yml).
2. Kliknij **Run workflow** i wypełnij:
   - **Zbiórka** — nazwa lub jej fragment, np. `rada`, `kwiaty`, `składka` (wielkość liter i polskie znaki bez znaczenia),
   - **Numery dzieci** — np. `3, 7, 12`,
   - **Co zapisać** — `wplata`, `nieobecnosc` albo `cofnij` (usuwa omyłkową wpłatę lub nieobecność).
3. Po ok. 2 minutach zmiana jest na stronie. Podsumowanie (ile opłaconych, kto jeszcze nie zapłacił) widać na stronie uruchomienia.

Workflow może uruchomić tylko właściciel repozytorium. Nie zapisze nic, jeśli nazwa pasuje do kilku zbiórek, zbiórka jest zamknięta, numer jest spoza zakresu albo testy danych nie przejdą. Zamykanie zbiórek, wydatki i nowe zbiórki nadal edytuje się w plikach `data/`.

## 🧪 Testy

| Rodzaj | Co sprawdza | Uruchomienie |
|---|---|---|
| Jednostkowe i danych (`tests/unit/`) | liczenie zbiórek (rabat, nieobecni, `totalChildren`), formatowanie, skrypt wpłat oraz poprawność wszystkich plików `data/` — zakresy numerów, brak duplikatów, `totalChildren` w zamkniętych zbiórkach, istnienie paragonów, nieujemne saldo | `npm test` (sam Node 22, bez instalacji) |
| Strony w przeglądarce (`tests/e2e/`) | prawdziwa strona w Chromium (komputer i telefon): saldo, karty zbiórek, „Czy zapłaciliśmy?” dla każdego dziecka, wydatki, motyw, brak błędów JS | `npm ci && npx playwright install chromium && npm run test:e2e` |

Kiedy działają automatycznie:

- **każdy Pull Request** — wynik (✅/❌) widać w PR przed mergem,
- **każdy push na `master`** — strona wdraża się **tylko jeśli testy przejdą**, więc zepsute dane nie trafią na stronę,
- **workflow „Dodaj wpłatę”** — testy przed zapisem i przed wdrożeniem.

## 📁 Struktura projektu

```
.
├── index.html
├── styles.css
├── js/
│   ├── config.js          # TOTAL_CHILDREN — liczba dzieci w grupie
│   ├── main.js            # start aplikacji, pobranie danych
│   ├── collections.js     # liczenie i karty zbiórek
│   ├── lookup.js          # „Czy zapłaciliśmy?”
│   └── ...                # balance, expenses, events, banking, supplies, theme, utils
├── data/                  # collections, expenses, incomes, events, banking, supplies (.json)
├── receipts/              # paragony (PDF/JPG)
├── scripts/               # skrypt workflow „Dodaj wpłatę”
├── tests/                 # unit/ (node:test) i e2e/ (Playwright)
└── .github/workflows/     # tests.yml, static.yml (wdrożenie), dodaj-wplate.yml
```

## 📊 Format danych

### collections.json

```json
{
    "name": "Rada rodziców - do 30.09.2026",
    "amountPerChild": 180,
    "status": "open",
    "paid": [1, 2, 3],
    "halfPrice": [18],
    "absent": [21]
}
```

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
