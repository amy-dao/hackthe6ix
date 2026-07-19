import type { CropEntryForm } from '../types';

export type DemandLevel = 'low' | 'medium' | 'high';
export type NutrientStatus = 'LOW' | 'MEDIUM' | 'HIGH';
export type NutrientKey = 'nitrogen' | 'phosphorus' | 'potassium';
export type SoilType = 'clay' | 'loam' | 'sandy' | 'silt';

export interface CropReferenceMeta {
  family: string;
  nitrogen_demand: DemandLevel;
  phosphorus_demand: DemandLevel;
  potassium_demand: DemandLevel;
  ideal_ph: [number, number];
  preferred_soils: SoilType[];
}

/** Always-available soil types (matches backend SOIL_TYPES; "silt" not "slit"). */
export const SOIL_TYPES: SoilType[] = ['silt', 'loam', 'sandy', 'clay'];

export const CROP_REFERENCE: Record<string, CropReferenceMeta> = {
  corn: {
    family: 'grain',
    nitrogen_demand: 'high',
    phosphorus_demand: 'medium',
    potassium_demand: 'medium',
    ideal_ph: [5.8, 7.0],
    preferred_soils: ['loam', 'silt'],
  },
  wheat: {
    family: 'grain',
    nitrogen_demand: 'medium',
    phosphorus_demand: 'medium',
    potassium_demand: 'low',
    ideal_ph: [6.0, 7.0],
    preferred_soils: ['loam', 'clay'],
  },
  rice: {
    family: 'grain',
    nitrogen_demand: 'high',
    phosphorus_demand: 'medium',
    potassium_demand: 'medium',
    ideal_ph: [5.5, 6.5],
    preferred_soils: ['clay', 'silt'],
  },
  soybean: {
    family: 'legume',
    nitrogen_demand: 'low',
    phosphorus_demand: 'medium',
    potassium_demand: 'medium',
    ideal_ph: [6.0, 7.0],
    preferred_soils: ['loam', 'silt'],
  },
  beans: {
    family: 'legume',
    nitrogen_demand: 'low',
    phosphorus_demand: 'medium',
    potassium_demand: 'medium',
    ideal_ph: [6.0, 7.0],
    preferred_soils: ['loam', 'sandy'],
  },
  peas: {
    family: 'legume',
    nitrogen_demand: 'low',
    phosphorus_demand: 'low',
    potassium_demand: 'low',
    ideal_ph: [6.0, 7.5],
    preferred_soils: ['loam', 'silt'],
  },
  tomato: {
    family: 'nightshade',
    nitrogen_demand: 'high',
    phosphorus_demand: 'high',
    potassium_demand: 'high',
    ideal_ph: [6.0, 6.8],
    preferred_soils: ['loam'],
  },
  potato: {
    family: 'nightshade',
    nitrogen_demand: 'medium',
    phosphorus_demand: 'high',
    potassium_demand: 'high',
    ideal_ph: [4.8, 6.5],
    preferred_soils: ['sandy', 'loam'],
  },
  pepper: {
    family: 'nightshade',
    nitrogen_demand: 'medium',
    phosphorus_demand: 'high',
    potassium_demand: 'medium',
    ideal_ph: [5.5, 6.8],
    preferred_soils: ['loam', 'sandy'],
  },
  cabbage: {
    family: 'brassica',
    nitrogen_demand: 'high',
    phosphorus_demand: 'medium',
    potassium_demand: 'medium',
    ideal_ph: [6.0, 7.5],
    preferred_soils: ['loam', 'clay'],
  },
  broccoli: {
    family: 'brassica',
    nitrogen_demand: 'high',
    phosphorus_demand: 'medium',
    potassium_demand: 'medium',
    ideal_ph: [6.0, 7.0],
    preferred_soils: ['loam', 'clay'],
  },
  carrot: {
    family: 'umbellifer',
    nitrogen_demand: 'low',
    phosphorus_demand: 'medium',
    potassium_demand: 'medium',
    ideal_ph: [6.0, 6.8],
    preferred_soils: ['sandy', 'loam'],
  },
  onion: {
    family: 'allium',
    nitrogen_demand: 'medium',
    phosphorus_demand: 'medium',
    potassium_demand: 'medium',
    ideal_ph: [6.0, 7.0],
    preferred_soils: ['loam', 'sandy'],
  },
  lettuce: {
    family: 'aster',
    nitrogen_demand: 'medium',
    phosphorus_demand: 'low',
    potassium_demand: 'low',
    ideal_ph: [6.0, 7.0],
    preferred_soils: ['loam', 'silt'],
  },
  clover: {
    family: 'legume',
    nitrogen_demand: 'low',
    phosphorus_demand: 'low',
    potassium_demand: 'low',
    ideal_ph: [6.0, 7.0],
    preferred_soils: ['loam', 'clay', 'silt'],
  },
};

export const DEMAND_SCORE: Record<DemandLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/** Sorted crop keys for dropdowns. */
export const CROP_OPTIONS: string[] = Object.keys(CROP_REFERENCE).sort();

const DEMAND_KEYS: Record<NutrientKey, keyof Pick<CropReferenceMeta, 'nitrogen_demand' | 'phosphorus_demand' | 'potassium_demand'>> = {
  nitrogen: 'nitrogen_demand',
  phosphorus: 'phosphorus_demand',
  potassium: 'potassium_demand',
};

/** Normalize crop names like "Soy Beans" / "soybeans" to reference keys. */
export function normalizeCropKey(crop: string): string {
  const raw = crop.trim().toLowerCase();
  if (!raw) return '';
  if (CROP_REFERENCE[raw]) return raw;
  const compact = raw.replace(/[\s_-]+/g, '');
  if (CROP_REFERENCE[compact]) return compact;
  if (compact === 'soybeans' || compact === 'soya') return 'soybean';
  if (compact === 'bean') return 'beans';
  if (compact === 'pea') return 'peas';
  if (compact === 'tomatoes') return 'tomato';
  if (compact === 'potatoes') return 'potato';
  if (compact === 'peppers') return 'pepper';
  if (compact === 'onions') return 'onion';
  if (compact === 'carrots') return 'carrot';
  return compact;
}

export function lookupCropInfo(crop: string): CropReferenceMeta | null {
  const key = normalizeCropKey(crop);
  return CROP_REFERENCE[key] ?? null;
}

/** @deprecated Prefer lookupCropInfo — kept for call sites that only need demand fields. */
export function lookupCropDemand(crop: string): CropReferenceMeta | null {
  return lookupCropInfo(crop);
}

export function cropMetaSnapshot(crop: string): CropReferenceMeta | undefined {
  return lookupCropInfo(crop) ?? undefined;
}

export function resolveCropOptions(extra: string[] = []): string[] {
  const keys = new Set<string>(CROP_OPTIONS);
  for (const c of extra) {
    const key = normalizeCropKey(c);
    if (key) keys.add(CROP_REFERENCE[key] ? key : c.trim().toLowerCase());
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export function resolveSoilTypeOptions(extra: string[] = []): string[] {
  const keys = new Set<string>(SOIL_TYPES);
  for (const t of extra) {
    const normalized = t.trim().toLowerCase();
    if (!normalized) continue;
    // Fix common typo
    keys.add(normalized === 'slit' ? 'silt' : normalized);
  }
  // Prefer canonical order first, then any extras
  const extras = [...keys].filter((t) => !(SOIL_TYPES as string[]).includes(t)).sort();
  return [...SOIL_TYPES, ...extras];
}

/**
 * Remaining nutrient level after crop drawdown.
 * High historical demand → LOW remaining nutrient (shown in red).
 */
export function nutrientStatusFromAverage(avgDemand: number): NutrientStatus {
  if (avgDemand >= 2.5) return 'LOW';
  if (avgDemand >= 1.75) return 'MEDIUM';
  return 'HIGH';
}

function demandFromEntry(entry: CropEntryForm | string, nutrient: NutrientKey): number | null {
  if (typeof entry === 'string') {
    const info = lookupCropInfo(entry);
    return info ? DEMAND_SCORE[info[DEMAND_KEYS[nutrient]]] : null;
  }
  const meta = entry.meta ?? lookupCropInfo(entry.crop);
  return meta ? DEMAND_SCORE[meta[DEMAND_KEYS[nutrient]]] : null;
}

export function computeNutrientLevels(cropNames: string[]): Record<NutrientKey, NutrientStatus> {
  return computeNutrientLevelsFromHistory(cropNames);
}

export function computeNutrientLevelsFromHistory(
  history: Array<string | CropEntryForm>,
): Record<NutrientKey, NutrientStatus> {
  const totals: Record<NutrientKey, number> = { nitrogen: 0, phosphorus: 0, potassium: 0 };
  let counted = 0;

  for (const item of history) {
    const n = demandFromEntry(item, 'nitrogen');
    const p = demandFromEntry(item, 'phosphorus');
    const k = demandFromEntry(item, 'potassium');
    if (n == null || p == null || k == null) continue;
    totals.nitrogen += n;
    totals.phosphorus += p;
    totals.potassium += k;
    counted += 1;
  }

  if (counted === 0) {
    return { nitrogen: 'MEDIUM', phosphorus: 'MEDIUM', potassium: 'MEDIUM' };
  }

  return {
    nitrogen: nutrientStatusFromAverage(totals.nitrogen / counted),
    phosphorus: nutrientStatusFromAverage(totals.phosphorus / counted),
    potassium: nutrientStatusFromAverage(totals.potassium / counted),
  };
}

/**
 * Mock soil exhaustion 0–100 from cumulative nutrient demand.
 * Higher historical demand → higher exhaustion.
 */
export function computeSoilExhaustionScore(cropNames: string[]): number {
  return computeSoilExhaustionFromHistory(cropNames);
}

export function computeSoilExhaustionFromHistory(history: Array<string | CropEntryForm>): number {
  if (history.length === 0) return 12;

  let total = 0;
  let counted = 0;
  for (const item of history) {
    const n = demandFromEntry(item, 'nitrogen');
    const p = demandFromEntry(item, 'phosphorus');
    const k = demandFromEntry(item, 'potassium');
    if (n == null || p == null || k == null) {
      total += 6; // unknown ≈ medium across NPK
      counted += 1;
      continue;
    }
    total += n + p + k;
    counted += 1;
  }

  if (counted === 0) return 12;

  const avgPerCrop = total / counted; // 3–9
  const intensity = (avgPerCrop - 3) / 6; // 0–1
  const historyFactor = Math.min(1, counted / 4);
  const score = Math.round(18 + intensity * 62 + historyFactor * 20);
  return Math.max(0, Math.min(100, score));
}

export function exhaustionColor(score: number): string {
  if (score <= 33) return '#3E7B4F';
  if (score <= 66) return '#E0A030';
  return '#C0392B';
}

export function nutrientStatusColor(status: NutrientStatus): string {
  if (status === 'HIGH') return '#3E7B4F';
  if (status === 'MEDIUM') return '#E0A030';
  return '#C0392B';
}

export const NUTRIENT_LABELS: Record<NutrientKey, string> = {
  nitrogen: 'Nitrogen',
  phosphorus: 'Phosphorus',
  potassium: 'Potassium',
};

export type ExhaustionBand = 'Low' | 'Medium' | 'High';

export function exhaustionBand(score: number): ExhaustionBand {
  if (score <= 33) return 'Low';
  if (score <= 66) return 'Medium';
  return 'High';
}

export interface RotationAdvice {
  shouldRotate: boolean;
  label: 'Rotate' | 'Do Not Rotate';
  exhaustionScore: number;
  exhaustionLabel: ExhaustionBand;
  reason: string;
}

/**
 * Frontend heuristic for crop rotation advice (placeholder until ML).
 * High exhaustion, consecutive same-family plantings, or depleted nutrients → rotate.
 */
export function getRotationAdvice(history: CropEntryForm[]): RotationAdvice {
  const entries = history.filter((e) => e.crop.trim());
  const exhaustionScore = computeSoilExhaustionFromHistory(entries);
  const exhaustionLabel = exhaustionBand(exhaustionScore);
  const nutrients = computeNutrientLevelsFromHistory(entries);

  const current = entries.find((e) => e.isCurrent) ?? entries[entries.length - 1];
  const previous = entries.filter((e) => e !== current).at(-1);
  const currentMeta = current?.meta ?? (current ? lookupCropInfo(current.crop) : null);
  const previousMeta = previous?.meta ?? (previous ? lookupCropInfo(previous.crop) : null);
  const sameFamily =
    !!currentMeta && !!previousMeta && currentMeta.family === previousMeta.family;

  const depletedCount = (Object.keys(nutrients) as NutrientKey[]).filter((k) => nutrients[k] === 'LOW').length;

  let shouldRotate = false;
  let reason = 'Soil looks stable enough to continue with careful monitoring.';

  if (entries.length === 0) {
    reason = 'Add crop history to get a rotation recommendation.';
  } else if (exhaustionScore >= 67) {
    shouldRotate = true;
    reason = 'Soil exhaustion is high after recent plantings.';
  } else if (sameFamily) {
    shouldRotate = true;
    reason = `Back-to-back ${currentMeta!.family} crops increase pest and nutrient risk.`;
  } else if (depletedCount >= 2) {
    shouldRotate = true;
    reason = 'Multiple nutrients are drawn down — rotate to a lighter feeder or legume.';
  } else if (exhaustionScore >= 45 && depletedCount >= 1) {
    shouldRotate = true;
    reason = 'Moderate exhaustion with at least one depleted nutrient.';
  }

  return {
    shouldRotate,
    label: shouldRotate ? 'Rotate' : 'Do Not Rotate',
    exhaustionScore,
    exhaustionLabel,
    reason,
  };
}

