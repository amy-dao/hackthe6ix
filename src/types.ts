/** 'unknown' = a crop is currently planted but the field has no earlier
 * planting on record, so there isn't enough history for a recommendation. */
export type FieldStatus = 'rotate' | 'marginal' | 'safe' | 'empty' | 'unknown';
 
export interface PlantingRecord {
  crop: string;
  period: string;
  note?: string;
  datePlanted?: string;
  harvestDate?: string;
  yieldAmount?: string;
  fertilizerUsed?: string;
  pesticidesApplied?: string;
}

export interface SubplotRecommendations {
  rotation_recommendation: number | 'Unknown';
  rotation_probability?: number | null;
  rotation_label?: string | null;
  soil_exhaustion_score: number | 'Unknown';
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
  recommendations?: SubplotRecommendations | null;
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

/** Which polygon 'edit' draw mode is currently reshaping. */
export type EditTarget = { type: 'farm' } | { type: 'subplot'; id: string };

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
  /** Latest XGBoost inference result (auto-filled when features are complete). */
  recommendations?: SubplotRecommendations | null;
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
  token: string;
  introSeen: boolean;
  farm: FarmState;
}
 
export interface Profile {
  name: string;
  farmName: string;
  location: string;
}
 
export interface CropEntryForm {
  crop: string;
  /** @deprecated Prefer startDate; kept as YYYY-MM for API sync. */
  month: string;
  /** Inclusive planting start (YYYY-MM-DD). */
  startDate: string;
  /** Inclusive planting end (YYYY-MM-DD). Optional if still growing. */
  endDate: string;
  isCurrent: boolean;
  /**
   * Snapshot of CROP_REFERENCE metadata at selection time.
   * Enables offline NPK analysis even if the reference table changes later.
   */
  meta?: {
    family: string;
    nitrogen_demand: 'low' | 'medium' | 'high';
    phosphorus_demand: 'low' | 'medium' | 'high';
    potassium_demand: 'low' | 'medium' | 'high';
    ideal_ph: [number, number];
    preferred_soils: string[];
  };
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
 