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

## D9. Multi-species: separate scoring functions per species, not config-driven

**Decision:** Phase 2 introduces three new species (hauki, ahven, kuha) alongside siika. Each has its own scoring function (`scoreHauki`, `scoreAhven`, `scoreKuha`) sharing the per-factor scorers (`triangular`, `scoreCloud*`, etc.) but composed manually rather than via a generic `SPECIES_CONFIG`-driven dispatcher.

**Rationale:** A config-driven approach (factor table per species, single composed scorer that iterates) is more elegant in theory but requires extracting every factor's reason text, value formatting, and edge-case shape into a config. In practice, each species has enough quirks (kuha has reversed precipitation polarity, hauki has a falling-pressure bonus, ahven has seasonal cloud preferences) that the "shared parameterised dispatcher" balloons in complexity. Three readable parallel functions of ~120 lines each is easier to maintain and tune than one 200-line config-driven function. The duplication is acceptable because the species' Finnish reason strings are intentionally bespoke.

**Trade-off:** If a 5th species is added the duplication starts to hurt; revisit then. The `siika` scoring path is unchanged (back-compat verified by snapshot diff).

---

## D10. Drop Saaronniemi-specific wind direction for rantakalastus species

**Decision:** Hauki, ahven, and kuha use a generic onshore wind-direction scorer (180–270° = best, 0–90° = worst) rather than siika's 225°-peaked Saaronniemi-specific function.

**Rationale:** Pike concentrate in inner bays (different shore geometry from the SW-facing Saaronniemi cape). Kuha favour channel mouths and harbour areas (Pansio, Hirvensalo east shore — completely different cape orientations). Forcing the Saaronniemi cape model on these species would penalise legitimate fishing spots. The generic onshore preference is an honest middle ground that works for any open-Baltic shore in the Turku region.

**Future:** Per-spot wind calibration (with a location picker) is the natural follow-up if the user fishes named spots and wants per-spot accuracy.

---

## D11. Daily-resolution scoring with a separate hourly window indicator

**Decision:** All four species are scored at **daily resolution** in the day grid. The detail panel additionally shows a per-species **best 2-hour window** computed by blending the daily score with a time-of-day multiplier. We do not score every condition factor at hourly resolution.

**Rationale:** Open-Meteo provides hourly weather, so a fully hourly scoring is technically possible. But:
1. Most factors are inherently daily (water temp, water-temp trend, 24/48h pressure deltas, season gate). Re-deriving these at hourly resolution adds complexity without information.
2. The user's question is usually "should I go fishing today?" — answered by the daily score. The follow-up "when in the day?" — answered by the best-window indicator.
3. The "best window" already captures the time-of-day signal that matters most: kuha's night bias, hauki's dawn/dusk, siika's mid-day peaks.

**Trade-off:** The hourly window's accuracy is bounded by the daily score's accuracy. If a clear-pressure-stable day rates low daily, kuha's "fish at night" wisdom still gets dampened. Acceptable for now; if catch reports suggest the model misses kuha nights, revisit.

---

## D12. No catch log in Phase 2

**Decision:** Phase 2 ships forecast for three new species without a catch log.

**Rationale:** User explicitly excluded it. The static-site + cron-refresh architecture works for read-only forecasts; a catch log requires a write-path (backend or IndexedDB), which is a substantial scope expansion. Defer until the user's actual fishing data shows the model needs validation.

---

## D13. Hatch-budget tracker for siika

**Decision:** Phase 3 adds a `HATCH_BUDGET` constant to `data.js`, computed by `scripts/refresh.mjs` from Open-Meteo Marine SST history (`past_days=92`). The siika scorer applies a multiplier curve (0.5/0.8/1.0/0.7/0.4/0.15) based on cumulative warm-water-day count this calendar year.

**Rationale:** Real-world catch data falsified the Phase-2 model. After a week of using the live site, the user reported zero siika across many days where the model scored 70–100; other anglers in the area reported the same. The original assumption — "water 6–10 °C → siika feeds" — is biologically incomplete. Spring shore siika feeding is gated by the polychaete (harvasukamato) hatch, which is a one-shot ~3-week event each spring. After the hatch is consumed, the shore food chain decouples regardless of current temperature. The `HATCH_BUDGET` curve encodes this directly: ramp up at start, peak ~10 days, taper to zero. The user's data point ("3 weeks ago we caught siika, now nothing") maps cleanly to the 26–35 warm-day band (×0.4 multiplier).

**Why Open-Meteo Marine despite the +2 °C bias:** The bias is a constant offset on a single source, so calibration just shifts the threshold. Marine SST is also the only multi-month consistent water-temperature signal we can pull (Föglö's WFS query is capped at 168 hours of history). 6 °C marine ≈ 4 °C shore, which matches the worm-emergence threshold.

**Trade-off:** Calibrated against a single user observation. The curve is therefore opinionated and might over-correct for a different year's hatch dynamics. A catch log would let it self-tune, but that's still excluded. Reconsider if the user reports the model now over-penalising during a strong year.

---

## D14. Pohjaonki as a separate page from rantakalastus

**Decision:** Phase 3 adds a new `/pohjaonki.html` page covering särki and lahna, instead of folding those species into the existing `/rantakalastus.html` (which would have become a 5-species page covering hauki/ahven/kuha/särki/lahna).

**Rationale:** The two pages map to genuinely different angler workflows:
- **Rantakalastus** = predator fishing with lures (jerkbaits, jigs, soft plastics on weighted heads). Different rod, different reel, active casting and retrieving. Targets dawn/dusk for hauki, daylight for ahven, twilight/night for kuha.
- **Pohjaonki** = bait fishing with bottom rigs and float tackle (worms, corn, bread, maggots, often groundbait). Different rod, lighter line, passive presentation. Targets midday for särki, evening/night for lahna.

Folding all five into one page would also produce visually overwhelming day cards (one main score + four mini-scores) and conflate the two workflows in the detail panel. The page-per-workflow split keeps each multi-species view focused on 2–3 species at a time.

**Default landing routing change:** April–May → siika; **June–August → pohjaonki** (peak lahna season is the headline summer catch); otherwise → rantakalastus. This matches the seasonal centre-of-gravity for what an angler is actually fishing for.

**Out of scope:** Per-spot wind calibration (lahna in particular is bad at Saaronniemi cape — better at Pansio, Aurajoki mouth, Ruissalon sisälahti — but the forecast remains useful for "is today a good lahna day at *some* shore in the Turku area").

---

## Open decisions / TODOs

- Choice of test runner (vitest vs node --test vs ...) — not yet decided.
- Whether to add a backend or stay static — depends on whether catch log lives in the cloud.
- Multi-location support (Uutela, Lauttasaari, etc.) — would require per-location wind-direction calibration.
- Catch log persistence — IndexedDB vs small backend service.
- Per-species fully-hourly scoring (not just window) — only worth doing if catch reports show the daily-baseline + window approach misses real signals.
