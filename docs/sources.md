# Sources — Phase 4 model additions and bait engine

Every algorithmic decision in Phase 4 traces to one or more of the sources
below. Citations are clustered by the model component they support.

This file is the **load-bearing reference** for all the multipliers and
recommendation matrices added in Phase 4. When a curve or threshold gets
tuned in the code, the tuning should be justifiable from these sources
(or from the user's catch log, when that exists).

---

## 1. Wind history / coastal upwelling (3-day onshore-component index)

**Claim:** Sustained NE-through-E winds over 2–4 days at the SW-opening Finnish
coast drive cold deep water onto the shore (Ekman transport pushes warm
surface water offshore). Documented Baltic SST drops of 2–6 °C are typical,
extreme events reach 10–14 °C. Predator catch rates collapse in the affected
zone; fish migrate to warmer adjacent water.

**Mechanism:** Coastal upwelling — Coriolis-driven offshore transport when
wind blows with the coast on its left in the Northern Hemisphere.

**Sources:**

- Skudra, M., & Lips, U. (2023). *Effect of Short-Term Upwelling Events on
  Fish Assemblages at the SE Coast of the Baltic Sea.* MDPI Water, 15(3), 452.
  https://www.mdpi.com/2073-4441/15/3/452
  — Quantifies fish-community shifts during upwelling: diversity drops,
  piscivorous-fish index drops, shift toward 1–2 cold-tolerant species.
- Lehmann, A., & Myrberg, K. (2008). *Upwelling in the Baltic Sea — A review.*
  Journal of Marine Systems, 74, S3–S12.
  https://www.sciencedirect.com/science/article/abs/pii/S0924796308002492
  — Foundational review: spatial patterns, durations, typical SST drops.
- Finnish Meteorological Institute. *Upwelling at the Finnish coast.*
  https://en.ilmatieteenlaitos.fi/upwelling
  — Public-facing FMI summary; lists Finnish-coast upwelling events,
  confirms direction sensitivities for SW-Finland coast.

**Implementation:** `windHistoryUpwellingMultiplier(windSeries72h, location)`
in `scoring.js`. Negative sustained-onshore-component over 72 h → multiplier
0.55–0.85 (large effect) for hauki, ahven, kuha; smaller (0.7–0.9) for siika
since siika already has its own hatch-budget that captures part of this.

---

## 2. Bait-fish phenology gates (silakka, kuore, salakka spawn windows)

**Claim:** When forage fish (silakka, kuore, salakka) aggregate inshore to
spawn, predators (hauki, kuha primarily) follow them onto shallow shore even
in suboptimal water temperatures. This is the predator equivalent of the
siika hatch-budget — a prey-availability gate that overrides parts of the
species' comfort window.

**Specific phenology windows (60.4°N, Saaristomeri):**

- **Kuore (smelt, *Osmerus eperlanus*)** — shore-run in late April at
  4–6 °C, ~1–2 weeks
- **Silakka (Baltic herring, *Clupea harengus membras*)** — spawning waves
  start early May at 6–7 °C, peak late May to mid-June, cohorts continue
  through July. Saaristomeri is a key spawning area.
- **Salakka (bleak, *Alburnus alburnus*)** — shore-school spawn late May to
  mid-June at 15+ °C

**Sources:**

- University of Turku Herring Project. *Spawning areas, Archipelago Sea.*
  https://sites.utu.fi/herringproject/herring-in-the-archipelago-sea/spawning-areas/
  — Maps and timing of silakka spawning grounds, including Ruissalo coastal
  band. Identifies the May–June peak window.
- ICES (2024). *Overview of possible spawning grounds of the central Baltic
  herring stock and the seasonality of spawning. Ad hoc report.*
  https://ices-library.figshare.com/articles/report/Overview_of_possible_spawning_grounds_of_the_central_Baltic_herring_stock_and_the_seasonality_of_spawning_Ad_hoc_report_/28485509
  — Stock-scale spawning timing; confirms 5–7 °C onset and prolonged-cohort
  pattern.
- Luonnonvarakeskus / Luke. Species profiles for kuore (*Osmerus eperlanus*)
  and salakka (*Alburnus alburnus*).
  https://www.luke.fi/

**Implementation:** Track growing-degree-days above 4 °C since Apr 1
(`GDD` in `data.js`). Apply `baitfishMultiplier(species, gdd, dayOfYear)`:
- Silakka window: GDD 250–450 → ×1.10–1.20 for hauki + kuha
- Kuore window: GDD 100–200 → ×1.05–1.10 for hauki (less for kuha — too
  cold for kuha-active anyway)
- Salakka window: triggered by water-temp series (≥15 °C, late May +) →
  small ×1.05 for hauki

GDD computed in `refresh.mjs` from Open-Meteo Marine SST history (we already
fetch `past_days=92`).

---

## 3. 14-day water-temperature memory + spawn-completion detection

**Claim:** The current 7-day water-temp trend captures *slope* but misses
*peaks*. Specifically:

- **Ahven (perch):** spawning is triggered when water first crosses
  8–10 °C and holds for several days. Spawning completes within 1–2 weeks.
  **Post-spawn feeding peak is 7–14 days after the temperature peak**, not
  before. The 7-day trend alone cannot detect this — the water may already
  be cooling, but the post-spawn feeding window is open.
- **Kuha (zander):** spawning at 12–15 °C in late May–mid June at 60°N.
  **Feeding crashes for 7–14 days during active spawn**, then explodes for
  2–3 weeks post-spawn. The current date-+-temp gate conflates both phases.

**Sources:**

- Heibo, E., & Magnhagen, C. (2025). *Global review of biology and ecology
  of European perch.* Reviews in Fish Biology and Fisheries.
  https://link.springer.com/article/10.1007/s11160-025-09924-z
  — Comprehensive perch life-history reference; documents spawning
  thresholds and post-spawn feeding patterns.
- Vehanen, T., Lehtonen, H. (Luke / RKTL). Coastal zander stock assessments
  for Saaristomeri.
  — Documents the 7–14 day spawn-act feeding pause and the 2–3 week
  post-spawn recovery feeding peak.
- Kucharczyk, D., et al. *Influence of temperature during four following
  spawning seasons on the spawning effectiveness of common bream, Abramis
  brama (L.).*
  — Confirms ~15 °C onset for cyprinid spawning, generalises to
  temperature-gated spawn-complete signals.

**Implementation:** `refresh.mjs` writes per-forecast-day `tMax14d` and
`daysSinceTMax14d` to `data.js`. `scoring.js` adds:
- `ahvenPostSpawnBoost(currentT, tMax14d, daysSinceTMax)` — `+15%` when T
  has been ≥10 °C in the last 14 days and 7–14 days have elapsed since
  the peak
- `kuhaSpawnPhase(currentT, tMax14d, daysSinceTMax)` — `×0.5` if T is in
  13–15 °C band and we're in first 5 days of the cross, `×1.15` for days
  6–25 after; otherwise pass-through

---

## 4. Hauki autumn photoperiod aggression

**Claim:** Pike (*Esox lucius*) autumn feeding aggression is co-driven by
shortening day length signaling pre-winter hyperphagia — not water
temperature alone. Photoperiod is the dominant entraining signal for fish
endocrine seasonality.

**Sources:**

- Cuesta, A., et al. (2017). *Endocrine functions of the photoperiod in fish
  reproduction.* Fish Physiology and Biochemistry.
  https://link.springer.com/article/10.1007/s10695-017-0435-3
  — Photoperiod's role in entraining seasonal physiological state in fish,
  pike specifically referenced.
- Falcón, J., et al. *Rhythmic secretion of melatonin in the pineal organ
  of pike.*
  https://pubmed.ncbi.nlm.nih.gov/7845544/
  — Mechanism: pike pineal organ entrains seasonal rhythms via melatonin
  driven by photoperiod.

**Implementation:** `hauki` only. Multiplier formula:
```
autumnBonus = max(0, (12 - daylightHours) × 0.04)   // 0–0.4 range
// Apply only Sep 1 – Dec 1 to stay in the biologically active window.
multiplier = 1 + autumnBonus
```

Daylight hours computed deterministically from date + latitude (no new
API). Adds 5–10 score points on October–November days where the model
would otherwise just see "water cooling, OK conditions, score ~60".

---

## 5. Algae bloom (cyanobacteria) manual override

**Claim:** Cyanobacteria (*Microcystis*, *Nodularia*) blooms during July–August
form surface scum and stained green water, reducing visibility and disrupting
sight-feeding fish. Effect varies by species:
- Sight-feeders (**ahven, siika, sarki**) — strongly negative
- Lateral-line / chemoreception feeders (**kuha, hauki, lahna**) — neutral
  to mildly positive

The bloom data is satellite-derived (Copernicus chlorophyll-a, SYKE Algaline)
on a weekly cadence and at coarse spatial resolution — inappropriate as an
automated daily input. **A manual user-toggled flag is the right fit.**

**Sources:**

- Suomen Ympäristökeskus (SYKE) / Finnish Environment Institute. *Itämeren
  tila — leväkukinnat.* https://www.syke.fi/itameri
  — Public bloom-tracking, weekly maps, satellite observations.
- Adamek, Z., et al. (2019). *Relationship between bream activity and water
  turbidity in a shallow lake under different season conditions.* Journal
  of Limnology.
  — Turbidity-positive feeding in bream (transferable to lahna).
- Effects of turbidity on feeding of YOY pikeperch — research review
  https://www.researchgate.net/publication/249434663
  — Turbidity tolerance / preference in juvenile kuha (extends to adults
  with caveats).

**Implementation:** A `"Levää näkyvissä rannassa"` checkbox in the source-card
panel. When checked, applies fixed per-species multipliers:
- ahven, siika, sarki: ×0.6
- hauki, lahna: ×1.0 (no change)
- kuha: ×1.1 (slight bonus)

State persists in localStorage per browser. Default OFF.

---

## 6. Per-spot wind direction and habitat suitability

**Claim:** The current "generic onshore" wind direction scoring is calibrated
for Saaronniemi (SW-opening cape). Other Turku-area shore-fishing spots have
different coastal orientations and habitat types:

| Spot | Coast opens | Habitat | Best for | Bad for |
|---|---|---|---|---|
| Saaronniemi (default) | W/SW | Sandy/gravel cape, exposed | Siika, ahven, hauki | Lahna |
| Pansio | N/NE | Soft mud, eutrophic, sheltered | Lahna, kuha, sarki | Siika |
| Aurajoen suu | (river-mouth, no clear angle) | Turbid, brackish/fresh, current | Lahna, kuha, sarki | Siika |
| Hirvensalo eastern shore | E | Channel-mouth, drop-offs, current | Kuha, hauki | Siika |
| Ruissalon sisälahti | N | Reedy, weedy, sheltered | Hauki, lahna, ahven | Siika |

**Sources:**

- Agent research synthesis from Finnish angling press (kalapaikka.net,
  kalastajan kanava, Vapaa-ajan Kalastaja). Aggregated in
  `docs/research-rantakalastus.md` and `docs/research-pohjaonki.md`.
- Local Turku-area angler reports (kalassa.com community discussion).
- Engstedt, O., et al. *Anadromous pike in the Baltic Sea.*
  — Pike preference for sheltered reedy bays vs. exposed shores.
- Heikinheimo, O., Lehtonen, H. (Luke). Saaristomeri coastal zander stock
  dynamics.
  — Kuha preference for channel mouths, harbors, soft-bottom turbid bays.

**Implementation:** New `SPOTS` config in `scoring.js` keyed by spot name.
Each spot defines:
```js
{
  label: "Pansio",
  windDirOnshore: 0,         // compass degree of "best onshore"
  suitability: {              // multiplier per species; 1.0 = generic
    siika: 0.3, hauki: 1.0, ahven: 0.9, kuha: 1.1, sarki: 1.1, lahna: 1.2
  }
}
```

Spot picker as a dropdown in the source-card panel. Selected spot affects
wind-direction scoring (`scoreWindDirForSpot(deg, spot)`) and applies a
final habitat-suitability multiplier per species. **Siika page stays
Saaronniemi-only** (the biology is calibrated for that specific
substrate/orientation — a spot-picker on the siika page would be
misleading).

---

## 7. Bait/lure recommendations (condition-aware engine)

**Claim:** Bait and lure choices for shore predator fishing in Saaristomeri
follow well-established Finnish angling conventions that condition on:
- Water temperature (size of presentation, speed of retrieve)
- Cloud / light / time-of-day (color choice: natural in clear sun, contrast
  in low light)
- Wind / wave / turbidity (vibration vs. visual, lure profile)
- Season phase (pre/post-spawn, autumn aggression)

The brackish Saaristomeri (5–6 PSU, Secchi 2–4 m clear / <1 m wind-stirred)
sits between inland-lake clear water and full marine. Color/profile defaults
shift one notch toward "stained" compared to inland practice.

**Primary Finnish angling sources:**

- *Keväinen hauenkalastus.* Ruthless Fishing.
  https://ruthlessfishing.fi/2025/03/27/kevainen-hauenkalastus-opas-onnistumiseen/
- *Hauenkalastajan heittokalusto.* Vapaa-ajan Kalastaja.
  https://www.vapaa-ajankalastajalehti.fi/kalastus/hauenkalastajanheittokalusto050623/
- *Viehevalinta hauen heittokalastuksessa.* Kalapedia / Kalassa.net.
  https://kalassa.net/kalapedia/index.php/Viehevalinta_hauen_heittokalastuksessa
- *Hauen heittokalastus.* Kalastajan Kanava.
  https://www.kalastajankanava.fi/hauen-heittokalastus/
- *Hauen spinnerbait kalastus.* Happy Angler.
  https://happyangler.fi/kalastusvinkit/hauen-spinnerbait-kalastus/
- *Spinnerbaitit kuuluvat kesään.* Vapaa-ajan Kalastaja.
  https://www.vapaa-ajankalastajalehti.fi/kalastus/spinnerbaitit-kuuluvat-kesaan/
- *Pintaviehekalastus Ruthless Plopper Popperilla.* Ruthless Fishing.
  https://ruthlessfishing.fi/2025/07/10/nae-isku-pinnassa-pintaviehekalastus-ruthless-plopper-popperilla/
- *Hauen kalastus keväällä.* Kalajutut.fi.
  https://kalajutut.fi/kalastus/hauen-kalastus-kevaalla-mista-hauki-loytyy-ja-milloin-se-alkaa-syoda/
- *Paras ahven uistin.* Kalassa.net.
  https://kalassa.net/paras-ahven-uistin-eri-olosuhteissa-vaaput-lipat-ja-blade-vieheet/
- *Ahvenenkalastajan vuosi.* Vapaa-ajan Kalastaja.
  https://www.vapaa-ajankalastajalehti.fi/kalastus/ahvenenkalastajan-vuosi/
- *Ahvenen kalastus.* Kalastus.fi.
  https://kalastus.fi/blog/ahvenen-kalastus/
- *Ahvenen heittojigaus.* Pro Kalastus.
  https://www.prokalastus.fi/kalastusmuodot/ahvenen-heittojigaus/
- *Milloin ja miksi käyttää dropshotia.* Kalastajan Kanava.
  https://www.kalastajankanava.fi/milloin-ja-miksi-kayttaa-dropshotia/
- *Värillä on väliä.* Vapaa-ajan Kalastaja.
  https://www.vapaa-ajankalastajalehti.fi/kalastus/varillaonvalia050824/
- *Jigin värin valinta.* Ruthless Fishing.
  https://ruthlessfishing.fi/2023/08/11/jigin-varin-valinta-mita-vareja-mihinkin-jarvelle/
- *Kuhavieheitä.* Kuhamaa.
  https://www.kuhamaa.fi/saalislajit/kuhaviehesivu
- *Kuhan jigaus.* Kalastajan Kanava.
  https://www.kalastajankanava.fi/kuhan-jigaus/
- *Kuhaa kalastamassa läpi avovesikauden.* Vapaa-ajan Kalastaja.
  https://www.vapaa-ajankalastajalehti.fi/kalastus/kuhaa-kalastamassa-lapi-avovesikauden-vinkkeja-vetouistelijalle-ja-jigikalastajalle/
- *Saaliskalana kuha.* Valaskala (Turun saaristo).
  https://valaskala.fi/en/kuhan-kalastus/
- *Parhaat kuhavaaput.* Kalast.us.
  https://kalast.us/parhaat-kuhavaaput/
- *Rapala Husky Jerk.* Rapala Suomi.
  https://www.rapala.fi/eu_fi/husky-jerk
- *Mepps Aglia.* Normark.
  https://www.normark.fi/tuotteet/mepps-aglia

**Brackish-water color theory (transferable to Saaristomeri):**

- *Color Choices For Inshore Lures.* Coastal Angler Magazine.
  https://coastalanglermag.com/color-choices-for-inshore-lures/
- *Pick a lure color for different water conditions.* Salt Water Sportsman.
  https://www.saltwatersportsman.com/blogs/short-strikes/color-your-world/

**Implementation:** `src/baits.js` — a condition-rule table per species
(currently hauki/ahven/kuha) with `match` predicates and primary/secondary
recommendations. Detail panel in rantakalastus.js + pohjaonki.js renders a
"Tänään-vinkki" block below the tackle hint. Function `recommendBait(species,
conditions)` evaluates rules in declaration order and returns the first
match.

---

## 8. Existing sources still relevant (Phase 1–3)

For the existing scoring logic (water-temp triangulars, pressure-rate,
generic cloud/precipitation factors, hatch budget), the canonical references
are in:

- `docs/research.md` — Finnish-language siika research (Phase 1)
- `docs/research-rantakalastus.md` — hauki/ahven/kuha (Phase 2)
- `docs/research-pohjaonki.md` — sarki/lahna (Phase 3)

Each species' biology, season window, and current scoring shape is derived
from those documents. Phase 4 extends — it does not replace — that
foundation.

---

## Audit checklist

Before any new factor multiplier ships:

1. ☐ Cited at least one peer-reviewed or institutional source
2. ☐ Documented in `methodology.md` with formula
3. ☐ Documented in `decisions.md` with rationale and trade-offs
4. ☐ Tested with synthesised condition inputs (covered range, edge cases)
5. ☐ Visible in the UI (penalty/bonus string visible to user)
6. ☐ Tunable from a single named constant near the top of `scoring.js`
