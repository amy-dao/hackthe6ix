/** 'unknown' = a crop is currently planted but the field has no earlier
 * planting on record, so there isn't enough history for a recommendation. */
export type FieldStatus = 'rotate' | 'marginal' | 'safe' | 'empty' | 'unknown';

export interface PlantingRecord {
  crop: string;
  period: string;
  note?: string;
}

export interface Field {
  id: string;
  name: string;
  crop: string;
  acres: number | string;
  status: FieldStatus;
  risk: number;
  reason: string;
  confidence: string;
  lastScan: string;
  suggestedCrops: string[];
  durationLabel: string;
  durationRange: string;
  history: PlantingRecord[];
  soilPh: number | null;
  soilType: string | null;
}

export type Screen =
  | 'dashboard'
  | 'detail'
  | 'camera'
  | 'recommendation'
  | 'profile'
  | 'addField'
  | 'farmMap'
  | 'intro';

export type DashboardView = 'cards' | 'map';

export type InputMode = 'photo' | 'text';

export type ColorMode = 'traffic-light' | 'earth-tone';

export type StatusFilter = 'all' | FieldStatus;

export type DrawMode = 'idle' | 'farm' | 'subplot' | 'edit';

/** GeoJSON-style [longitude, latitude] */
export type LngLat = [number, number];

export interface SubplotData {
  soilPh: number | '';
  /** One of the backend's SOIL_TYPES (clay/loam/sandy/silt) — fetched via /reference. */
  soilType: string;
  cropEntries: CropEntryForm[];
  name: string;
  /** Set once this subplot has been saved as a real Field (matched or created by name). */
  linkedFieldId?: string;
}

export interface Subplot {
  id: string;
  coordinates: LngLat[];
  areaAcres: number;
  color: string;
  data: SubplotData;
}

export interface FarmState {
  farmPolygon: LngLat[] | null;
  farmAreaAcres: number;
  subplots: Subplot[];
}

export interface PersistedSession {
  userName: string;
  introSeen: boolean;
  farm: FarmState;
}

export interface Profile {
  name: string;
  farmName: string;
  location: string;
  acres: string;
  crops: string;
  equipment: 'handheld' | 'drone' | 'tractor';
  units: 'acres' | 'hectares';
}

export interface CropEntryForm {
  crop: string;
  month: string; // "YYYY-MM"
  isCurrent: boolean;
}

export interface AddFieldForm {
  plotName: string;
  acres: string;
  soilPh: string;
  soilPhUnknown: boolean;
  soilType: string;
  cropEntries: CropEntryForm[];
}

export interface LoginForm {
  name: string;
  password: string;
}

export interface CropRotationRecommendation {
  recommendedCrop: string;
  rotationDate: string;
}

export interface HistoryTrackingForm {
  cropName: string;
  datePlanted: string;
  harvestDate: string;
  yieldAmount: string;
  fertilizerUsed: string;
  pesticidesApplied: string;
}
