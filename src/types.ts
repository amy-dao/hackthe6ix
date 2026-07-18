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
 
export type Screen = 'dashboard' | 'detail' | 'camera' | 'recommendation' | 'profile' | 'addCrop';
 
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
 
export interface CropRotationRecommendation {
  recommendedCrop: string;
  rotationDate: string;
}
