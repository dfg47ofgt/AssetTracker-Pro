import { AppData } from '../types';
import { EMPTY_APP_DATA, normalizeAppData } from '../shared/appDataDefaults';

const DATA_ENDPOINT = '/api/data';

export interface LoadAppDataResult {
  data: AppData;
  isFallback: boolean;
}

export const loadAppData = async (): Promise<LoadAppDataResult> => {
  try {
    const response = await fetch(DATA_ENDPOINT, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
    }
    const raw = await response.json();
    return { data: normalizeAppData(raw), isFallback: false };
  } catch (error) {
    console.error('Unable to load app data, falling back to defaults.', error);
    return { data: normalizeAppData(EMPTY_APP_DATA), isFallback: true };
  }
};

export const saveAppData = async (data: AppData): Promise<void> => {
  const payload = normalizeAppData(data);
  const response = await fetch(DATA_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Failed to persist data: ${response.status} ${response.statusText}`);
  }
};
