import type { CropEntryForm, Subplot } from '../types';

/** Build the POST /predict body from a subplot's local farm data.
 *  ``cropEntries`` order is oldest → newest; last named crop = next_crop.
 */
export function subplotToPredictPayload(subplot: Subplot): {
  subplot_id: string;
  soil_type?: string;
  crop_history: string[];
  next_crop?: string;
  acres: number;
  soil_ph?: number;
} {
  const entries = subplot.data.cropEntries.filter((e) => e.crop.trim());
  const crops = entries.map((e) => e.crop.trim().toLowerCase());
  const next_crop = crops.length > 0 ? crops[crops.length - 1] : undefined;
  const crop_history = crops.length > 1 ? crops.slice(0, -1) : [];

  const soilPhRaw = subplot.data.soilPh;
  const soil_ph =
    soilPhRaw != null && String(soilPhRaw).trim() !== ''
      ? Number(soilPhRaw)
      : undefined;

  const soilType = (subplot.data.soilType || '').trim().toLowerCase();

  return {
    subplot_id: subplot.id,
    ...(soilType ? { soil_type: soilType === 'slit' ? 'silt' : soilType } : {}),
    crop_history,
    ...(next_crop ? { next_crop } : {}),
    acres: subplot.areaAcres || 1,
    ...(soil_ph != null && !Number.isNaN(soil_ph) ? { soil_ph } : {}),
  };
}

export function entriesToPredictPayload(
  cropEntries: CropEntryForm[],
  opts: { soilType?: string; acres?: number; soilPh?: number | string | null; subplotId?: string },
) {
  const fakeSubplot = {
    id: opts.subplotId || 'local',
    areaAcres: opts.acres ?? 1,
    data: {
      name: '',
      soilType: opts.soilType || '',
      soilPh: opts.soilPh ?? '',
      cropEntries,
    },
  } as Subplot;
  return subplotToPredictPayload(fakeSubplot);
}

export function isUnknownRecommendation(
  value: number | string | null | undefined,
): value is 'Unknown' {
  return value === 'Unknown';
}
