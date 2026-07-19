import type { CropEntryForm } from '../types';
import {
  CROP_REFERENCE,
  computeNutrientLevelsFromHistory,
  type NutrientKey,
  type NutrientStatus,
} from './cropMetrics';
import { titleCase } from './fieldHelpers';

export type NpkDeficiency = 'N' | 'P' | 'K' | null;

export interface CropSuggestionResult {
  npk_deficiency: NpkDeficiency;
  suggested_crops: string[];
  suggestion_reason: string;
}

const NUTRIENT_NAME: Record<Exclude<NpkDeficiency, null>, string> = {
  N: 'Nitrogen',
  P: 'Phosphorus',
  K: 'Potassium',
};

const STATUS_TO_SCORE: Record<NutrientStatus, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  UNKNOWN: 1,
};

const KEY_TO_DEF: Record<NutrientKey, Exclude<NpkDeficiency, null>> = {
  nitrogen: 'N',
  phosphorus: 'P',
  potassium: 'K',
};

/** Crops that help restore a depleted nutrient (low demand / N-fixers for N). */
const RESTORATIVE: Record<Exclude<NpkDeficiency, null>, string[]> = {
  N: ['soybean', 'beans', 'peas', 'clover'],
  P: ['beans', 'peas', 'lettuce', 'wheat'],
  K: ['beans', 'peas', 'lettuce', 'clover'],
};

/**
 * Infer which nutrient is most depleted from crop history, then suggest
 * 1–3 restorative crops with a plain-language reason.
 */
/** Prefer model enrichment; fall back to client-side NPK heuristics. */
export function resolveCropSuggestion(
  cropEntries: CropEntryForm[],
  recommendations?: {
    npk_deficiency?: NpkDeficiency;
    suggested_crops?: string[];
    suggestion_reason?: string | null;
  } | null,
  opts?: { shouldRotate?: boolean },
): CropSuggestionResult {
  const fallback = buildCropSuggestions(cropEntries, opts);
  if (recommendations?.suggested_crops?.length) {
    return {
      npk_deficiency: recommendations.npk_deficiency ?? fallback.npk_deficiency,
      suggested_crops: recommendations.suggested_crops,
      suggestion_reason: recommendations.suggestion_reason || fallback.suggestion_reason,
    };
  }
  return fallback;
}

export function buildCropSuggestions(
  cropEntries: CropEntryForm[],
  opts?: { shouldRotate?: boolean },
): CropSuggestionResult {
  const named = cropEntries.filter((e) => e.crop.trim());
  if (named.length === 0) {
    return {
      npk_deficiency: null,
      suggested_crops: [],
      suggestion_reason: 'Add a current crop to estimate nutrient drawdown.',
    };
  }

  const levels = computeNutrientLevelsFromHistory(named);
  if (
    levels.nitrogen === 'UNKNOWN' &&
    levels.phosphorus === 'UNKNOWN' &&
    levels.potassium === 'UNKNOWN'
  ) {
    return {
      npk_deficiency: null,
      suggested_crops: [],
      suggestion_reason: 'Nutrient status is unknown until a current crop is set.',
    };
  }

  const ranked = (Object.keys(KEY_TO_DEF) as NutrientKey[])
    .map((key) => ({ key, score: STATUS_TO_SCORE[levels[key]] }))
    .sort((a, b) => a.score - b.score);

  const worst = ranked[0];
  // Only flag a deficiency when remaining nutrient is LOW (or weakest if rotating).
  const deficient =
    worst.score === 0 || (opts?.shouldRotate && worst.score <= 1)
      ? KEY_TO_DEF[worst.key]
      : null;

  if (!deficient) {
    return {
      npk_deficiency: null,
      suggested_crops: opts?.shouldRotate ? ['soybean', 'clover', 'peas'] : [],
      suggestion_reason: opts?.shouldRotate
        ? 'Soil nutrients look balanced enough; legumes still help maintain fertility if you rotate.'
        : 'No strong nutrient deficiency detected from recent crop history.',
    };
  }

  const current = new Set(
    named.map((e) => e.crop.trim().toLowerCase()).filter(Boolean),
  );
  const suggested = RESTORATIVE[deficient]
    .filter((c) => CROP_REFERENCE[c] && !current.has(c))
    .slice(0, 3);

  const nutrient = NUTRIENT_NAME[deficient];
  let reason: string;
  if (deficient === 'N') {
    reason = `Low ${nutrient} detected. Legumes help fix nitrogen in the soil, improving fertility for the next season.`;
  } else if (deficient === 'P') {
    reason = `Low ${nutrient} detected. Lighter-feeding crops and legumes reduce further phosphorus draw while soil recovers.`;
  } else {
    reason = `Low ${nutrient} detected. Lower-potassium-demand crops give the soil time to rebuild K reserves.`;
  }

  return {
    npk_deficiency: deficient,
    suggested_crops: suggested.map(titleCase),
    suggestion_reason: reason,
  };
}
