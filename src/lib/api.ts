import type { Field } from '../types';

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
  return res.json() as Promise<T>;
}

export function fetchFields(): Promise<Field[]> {
  return request<Field[]>('/fields');
}

export function addCrop(payload: { cropName: string; plotName: string; date?: string; photoAdded?: boolean }): Promise<Field> {
  return request<Field>('/fields/crop', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateField(id: string, payload: { name?: string; acres?: number | string }): Promise<Field> {
  return request<Field>(`/fields/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function setFieldCrop(id: string, cropName: string): Promise<Field> {
  return request<Field>(`/fields/${id}/crop`, { method: 'PATCH', body: JSON.stringify({ cropName }) });
}

export function clearFieldCrop(id: string): Promise<Field> {
  return request<Field>(`/fields/${id}/crop`, { method: 'DELETE' });
}
