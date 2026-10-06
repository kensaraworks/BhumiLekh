import { useCallback, useSyncExternalStore } from 'react';
import type { ParamValues, Scope } from '../types';

/**
 * Saved screen configurations, kept in this browser only (no backend in v1 for this).
 * Each holds only the parameters that differ from the screen's defaults.
 */
export interface SavedConfig {
  id: string;
  screenId: string;
  name: string;
  scope: Scope;
  params: ParamValues;
  savedAt: string;
}

const KEY = 'bhumilekh.screenRunner.savedConfigs.v1';
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: SavedConfig[] } = { raw: null, value: [] };

function read(): SavedConfig[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return cache.value;
  }
  if (raw === cache.raw) return cache.value;
  let value: SavedConfig[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.id === 'string' && typeof c.screenId === 'string') : [];
  } catch {
    value = [];
  }
  cache = { raw, value };
  return value;
}

function write(value: SavedConfig[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    return false;
  }
  listeners.forEach((l) => l());
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useSavedConfigs() {
  const configs = useSyncExternalStore(subscribe, read, () => []);
  const save = useCallback((config: Omit<SavedConfig, 'id' | 'savedAt'>) => {
    const entry: SavedConfig = { ...config, id: Date.now().toString(36), savedAt: new Date().toISOString() };
    return write([entry, ...read()].slice(0, 50)) ? entry : null;
  }, []);
  const remove = useCallback((id: string) => write(read().filter((c) => c.id !== id)), []);
  return { configs, save, remove };
}
