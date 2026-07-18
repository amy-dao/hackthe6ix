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

export type Screen = 'dashboard' | 'detail' | 'camera' | 'profile' | 'addField';

export type DashboardView = 'cards' | 'map';

export type InputMode = 'photo' | 'text';

export type ColorMode = 'traffic-light' | 'earth-tone';

export type StatusFilter = 'all' | FieldStatus;

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
  email: string;
  password: string;
}
