export type FieldStatus = 'rotate' | 'marginal' | 'safe' | 'empty';

export interface Field {
  id: number;
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
}

export type Screen = 'dashboard' | 'detail' | 'camera' | 'profile' | 'addCrop';

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

export interface AddCropForm {
  cropName: string;
  photoAdded: boolean;
  date: string;
  plotName: string;
}

export interface LoginForm {
  email: string;
  password: string;
}
