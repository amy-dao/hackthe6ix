export type FieldStatus = 'rotate' | 'marginal' | 'safe' | 'empty';

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
}

export type Screen = 'dashboard' | 'detail' | 'camera' | 'history' | 'profile' | 'addCrop' | 'farmMap' | 'intro';

export type DashboardView = 'cards' | 'map';

export type InputMode = 'photo' | 'text';

export type ColorMode = 'traffic-light' | 'earth-tone';

export type StatusFilter = 'all' | FieldStatus;

export type DrawMode = 'idle' | 'farm' | 'subplot' | 'edit';

export type SoilTexture = 'sandy' | 'sandy-loam' | 'loam' | 'silt-loam' | 'clay-loam' | 'clay' | 'silty-clay';

/** GeoJSON-style [longitude, latitude] */
export type LngLat = [number, number];

export interface SubplotData {
  soilPh: number | '';
  soilTexture: SoilTexture | '';
  previousCrops: string;
  name: string;
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

export interface AddCropForm {
  cropName: string;
  photoAdded: boolean;
  date: string;
  plotName: string;
}

export interface LoginForm {
  name: string;
  password: string;
}

export interface HistoryTrackingForm {
  cropName: string;
  datePlanted: string;
  harvestDate: string;
  yieldAmount: string;
  fertilizerUsed: string;
  pesticidesApplied: string;
}

export interface CropRotationRecommendation {
  currentCrop: string;
  recommendedCrop: string;
}
