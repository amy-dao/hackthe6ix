import type { CropEntryForm, Field } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Request to ${path} failed (${res.status})${body ? `: ${body}` : ''}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function fetchFields(): Promise<Field[]> {
  return request<Field[]>('/fields');
}

export interface ReferenceData {
  soilTypes: string[];
  crops: string[];
}

export function fetchReference(): Promise<ReferenceData> {
  return request<ReferenceData>('/reference');
}

export function addField(payload: {
  name: string;
  acres?: number | string;
  soilPh?: number;
  soilType?: string;
  cropEntries: CropEntryForm[];
}): Promise<Field> {
  return request<Field>('/fields', { method: 'POST', body: JSON.stringify(payload) });
}

export function syncField(payload: {
  name: string;
  acres: number;
  soilPh?: number;
  soilType?: string;
  cropEntries: CropEntryForm[];
}): Promise<Field> {
  return request<Field>('/fields/sync', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateField(
  id: string,
  payload: { name?: string; acres?: number | string; soilPh?: number; soilType?: string },
): Promise<Field> {
  return request<Field>(`/fields/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function setFieldCrop(id: string, cropName: string): Promise<Field> {
  return request<Field>(`/fields/${id}/crop`, { method: 'PATCH', body: JSON.stringify({ cropName }) });
}

export function clearFieldCrop(id: string): Promise<Field> {
  return request<Field>(`/fields/${id}/crop`, { method: 'DELETE' });
}

export function deleteField(id: string): Promise<void> {
  return request<void>(`/fields/${id}`, { method: 'DELETE' });
}

export interface IdentifyResult {
  species: string;
  isWeed: boolean;
  reason: string;
  confidence: string;
}

export function identify(payload: { imageBase64?: string; description?: string }): Promise<IdentifyResult> {
  return request<IdentifyResult>('/identify', { method: 'POST', body: JSON.stringify(payload) });
}
