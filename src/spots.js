/**
 * spots.js — per-spot configuration for Turku-area shore-fishing locations.
 *
 * Each spot defines:
 *  - label: Finnish display name
 *  - windDirOnshore: the wind-direction-FROM-degree that corresponds to "best
 *    onshore" at this spot. Wind direction scoring is parameterised on this.
 *  - suitability: per-species multiplier (1.0 = neutral, &lt;1 = poor habitat,
 *    &gt;1 = good habitat). Applied as a final multiplier on the species score.
 *  - habitatNote: one-line Finnish description shown in the UI.
 *
 * Sources for the spot calibrations are documented in docs/sources.md §6.
 * The siika page is intentionally locked to Saaronniemi (its scoring is
 * calibrated for the cape's specific substrate and orientation).
 */

export const SPOTS = {
  saaronniemi: {
    label: "Saaronniemi (Ruissalo)",
    windDirOnshore: 225,
    suitability: {
      siika: 1.0,
      hauki: 0.9,
      ahven: 1.0,
      kuha:  0.6,
      sarki: 0.85,
      lahna: 0.4
    },
    habitatNote: "SW-aukeava kärki, sora–hiekkapohja. Klassinen siika- ja ahvenpaikka. Lahnaa mediocre."
  },
  ruissalon_sisalahti: {
    label: "Ruissalon sisälahti",
    windDirOnshore: 0,
    suitability: {
      siika: 0.6,
      hauki: 1.2,
      ahven: 1.0,
      kuha:  0.8,
      sarki: 1.1,
      lahna: 1.1
    },
    habitatNote: "Pohjoiseen aukeava sisälahti, kaislikkoja ja kasvustoa. Hauelle erinomainen, varsinkin keväällä."
  },
  pansio: {
    label: "Pansion lahti",
    windDirOnshore: 0,
    suitability: {
      siika: 0.3,
      hauki: 1.0,
      ahven: 0.9,
      kuha:  1.1,
      sarki: 1.15,
      lahna: 1.25
    },
    habitatNote: "Pehmeä mutapohja, rehevää, suojainen. Lahnan ja kuhan ydinaluetta. Siikaa ei käytännössä lainkaan."
  },
  aurajoen_suu: {
    label: "Aurajoen suu",
    windDirOnshore: 90,
    suitability: {
      siika: 0.2,
      hauki: 0.95,
      ahven: 0.95,
      kuha:  1.15,
      sarki: 1.2,
      lahna: 1.2
    },
    habitatNote: "Jokisuun sumea murtovesi, virtaa ja syöttikaloja. Kuha, lahna, särki — siika ja ahven harvempana."
  },
  hirvensalo_ita: {
    label: "Hirvensalon itäranta",
    windDirOnshore: 90,
    suitability: {
      siika: 0.5,
      hauki: 1.0,
      ahven: 1.0,
      kuha:  1.15,
      sarki: 0.95,
      lahna: 1.05
    },
    habitatNote: "Itäänpäin aukeava ranta, väylä lähellä — kuhan ja hauen ydinaluetta hämärässä."
  }
};

/**
 * Default spot for each page. The siika page is locked to Saaronniemi
 * because its scoring is calibrated for that geometry.
 */
export const DEFAULT_SPOT = "saaronniemi";

/**
 * Wind-direction score for a given onshore-direction (replaces siika's
 * Saaronniemi-hardcoded scoreWindDir). Same shape: rewards wind FROM the
 * onshore direction at 100, opposite at 0, linear between.
 */
export function scoreWindDirForSpot(deg, spotKey) {
  const spot = SPOTS[spotKey] || SPOTS[DEFAULT_SPOT];
  const onshore = spot.windDirOnshore;
  const dist = Math.min(Math.abs(deg - onshore), 360 - Math.abs(deg - onshore));
  return Math.round(100 * (1 - dist / 180));
}

/**
 * Habitat suitability multiplier for a species at a spot. Applied to the
 * final species score as a multiplicative factor.
 */
export function spotSuitability(spotKey, species) {
  const spot = SPOTS[spotKey] || SPOTS[DEFAULT_SPOT];
  return spot.suitability[species] ?? 1.0;
}

/**
 * Human-readable reason string when suitability is meaningfully different
 * from 1.0 — surfaced in the UI penalty/bonus list.
 */
export function spotSuitabilityReason(spotKey, species) {
  const mult = spotSuitability(spotKey, species);
  if (mult >= 0.9 && mult <= 1.1) return null;
  const spot = SPOTS[spotKey] || SPOTS[DEFAULT_SPOT];
  if (mult > 1.1)  return `${spot.label}: hyvä habitat`;
  if (mult >= 0.6) return `${spot.label}: keskinkertainen habitat`;
  return `${spot.label}: huono habitat tälle lajille`;
}
