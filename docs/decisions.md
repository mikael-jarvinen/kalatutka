# Design decisions and rationale

A log of significant choices made while building this. Append-only — when you change something, add a new entry referencing the old one rather than editing in place.

---

## D1. Solunar / moon phase is not in the model

**Decision:** No moon-phase, no "solunar" major/minor period, no solar position.

**Rationale:** Solunar theory is built on the assumption of a meaningful tidal range. The Baltic Sea has tidal range under 20 cm, and Saaristomeri specifically has the smallest tides in the entire Baltic (Föglö observation: 2-meter total range across decades). Without tides, the lunar gravitational influence on fish has no documented mechanism. The user explicitly flagged this constraint at the start.

---

## D2. Pressure change matters; absolute pressure does not

**Decision:** Score `|Δp_24h|` and `|Δp_48h|` separately. Don't score absolute pressure.

**Rationale:** The 1983 Stickney–Liu study (largemouth bass) found a small correlation between falling pressure and feeding. Modern fisheries science treats this as **indirect**: pressure change is a proxy for weather pattern transitions. The direct biophysical mechanism (pressure on swim bladder) is implausible — a fish moving 1 m vertically experiences ~100 hPa pressure change, far larger than any synoptic system.

The change-rate framing also matches what Finnish anglers say in practice: stagnant high or stagnant low produces vaisu syönti regardless of absolute pressure level.

---

## D3. Water temperature is the heaviest single factor (weight 20)

**Decision:** Water temperature gets weight 20; the next-heaviest is pressure-change-24h at 12.

**Rationale:** Whitefish in the Baltic are cold-tolerant (will feed at 10 °C, can be active even cooler), but their entire spring food web depends on **bottom-warming-driven polychaete activity**. Without warm enough sand/gravel, no harvasukamadot rise. Without rising worms, no parvi of feeding siika.

The original v1 model used **air temperature** as a proxy for water. After the user reported a 4 °C shore reading on a day where air had been 11 °C and the model gave 85/100 ("erinomainen") despite zero fish caught all weekend, water temperature became the heaviest factor and a critical penalty multiplier was added.

---

## D4. Wind direction is calibrated to Saaronniemi geometry, not generic

**Decision:** Best wind direction is **SW (225°)**; worst is **NE (45°)**.

**Rationale:** Saaronniemi's cape (Kolkannokka) opens to the W/SW with the open Saaristomeri there. So:

- Wind FROM SW = onshore (sea-to-land), warm air, stirs bottom from the productive direction
- Wind FROM NE = offshore (land-to-sea), cold air, drives warm shore water out, brings cold deep water up

The general angler folklore "SW wind = good" coincidentally matches Saaronniemi's specific geometry — but the reason it works at Saaronniemi is the geometry, not folklore. At a different cape (e.g. one opening NE) the optimum direction would be different.

**v1 used SE (135°) as best — that was wrong** and got corrected after re-checking the cape orientation against the satellite map.

---

## D5. Hybrid model: weighted average × penalty multipliers

**Decision:** Final score = `clamp(round(weightedAvg × Π multipliers), 0, 100)`.

**Rationale:** Pure weighted average can't represent biological vetoes. Pure rule-based can't handle the gradient of "many small things adding up". The hybrid matches expert reasoning ("weather looked good, but with the water this cold..."). See `methodology.md` for the exhaustive list of multipliers.

---

## D6. User shore measurement overrides any model

**Decision:** Three water-temp sources are presented; user override is one of them and is treated as authoritative when set.

**Rationale:** Open-Meteo Marine models open water (~7.8 °C in this case). FMI Föglö Degerby is a real measurement but ~50 km away (~5.0 °C). Saaronniemi shore at the time was 4 °C. The shore is what fish experience, and shallow embayments diverge from open water by 2–3 °C in either direction within hours of weather changes.

Trust hierarchy:

1. User shore measurement (highest)
2. FMI Föglö Degerby (real, coastal, but distant)
3. Open-Meteo Marine (modeled, open water)

---

## D7. Baked-in snapshot, not live API calls

**Decision:** `src/data/data.js` contains the data; the page does no client-side API fetching. A separate process (`scripts/refresh.mjs`) regenerates the file periodically.

**Rationale (original):** The Cowork artifact environment blocked outbound network from the artifact iframe. Live calls failed silently and broke the page.

**Rationale (current):** Even outside the artifact, this approach has merits — the page works fully offline once loaded, can be served from anywhere static, has no API rate limits, and the snapshot is reviewable. In production the refresh runs as a sidecar container in the docker-compose stack on a `REFRESH_INTERVAL_HOURS` loop; the web container only serves files. This keeps the runtime surface minimal (nginx + a periodically-running Node script) and the user can still open `src/index.html` directly during development.

If user-write features (catch log) come along, the calculus changes — at that point a small backend joins the stack, but the static-snapshot model for read-only forecast data still holds.

---

## D8. Triangular factor functions, not Gaussian or sigmoid

**Decision:** Each factor uses a piecewise-linear "triangular" shape: 0 outside hard bounds, 100 in the optimum band, linear ramp between.

**Rationale:** Easy to reason about and adjust. Each parameter has a clear semantic ("hardLo", "optLo", "optHi", "hardHi") that maps to "this value is impossible-bad", "this is the start of the good zone", etc. Gaussian shapes have a single mean+sigma which is harder to communicate to the user when they want to tweak a threshold. Triangles also align well with how anglers describe ranges ("4 to 8 degrees is the sweet spot, anything below 2 forget it").

The cost is harder optimization if we ever fit weights to data, but we're nowhere near that yet.

---

## D9. Vanilla HTML/CSS/JS, no framework, no build

**Decision:** No React, no Svelte, no Vite, no bundler.

**Rationale:** The whole app is ~600 lines of code with three modules and one HTML file. A framework adds dependencies, build complexity, and learning curve for no functional gain. The user explicitly flagged "I want to use Claude Code with this", and a no-build setup is the lowest-friction starting point.

When the app grows (multi-location, persistent catch log, mobile-first UI), revisit. Likely candidates if migrating: Svelte (least overhead), Astro (if it stays mostly static), or React if the user already knows it.

---

## D10. Finnish UI strings, English code

**Decision:** All visible text is Finnish. All code, comments, function names, and project documentation are English.

**Rationale:** The user is Finnish, the app is for personal use, the domain (siika, harvasukamato, Saaronniemi) is irreducibly Finnish. But the code lives in a global ecosystem (npm, GitHub, Stack Overflow) where English is standard. Mixing leaks vocabulary into code (e.g. `pisteet` instead of `score`) and creates friction for anyone who later reads the repo.

Domain-specific Finnish nouns (`siika`, `harvasukamato`) are kept where they're more precise than English; English equivalents are inlined in code comments.

---

## D11. Pure functions in `scoring.js`

**Decision:** `scoring.js` contains only pure functions — no DOM access, no global state mutation. Inputs in, numbers/objects out.

**Rationale:** Testability. The scoring is the part that matters; if anything regresses, it'll be the math. Keeping it pure means we can write `vitest` (or `node --test`) unit tests with zero setup. It also means we can export the same logic to a backend later without reshaping anything.

---

## D12. No localStorage for preferences

**Decision:** No `localStorage`, `sessionStorage`, or browser persistence. All state is in-memory per session.

**Rationale (original):** The artifact environment forbade browser storage. Carrying that constraint forward keeps the static page deployable as a pure static asset.

**Future:** If a catch log is added, persistence becomes necessary. Use IndexedDB (better than localStorage for structured data) or add a small backend service to the docker-compose stack.

---

## Open decisions / TODOs

- Choice of test runner (vitest vs node --test vs ...) — not yet decided.
- Whether to add a backend or stay static — depends on whether catch log lives in the cloud.
- Multi-location support (Uutela, Lauttasaari, etc.) — would require per-location wind-direction calibration.
- Hourly vs daily scoring — currently daily; user might want hourly for tactical "should I go now" decisions.
