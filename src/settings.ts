const STORAGE_KEY = "strava-wind-overlay";

export interface Settings {
  enabled: boolean;
  collapsed: boolean;
  hourOffset: number;
}

const DEFAULTS: Settings = { enabled: true, collapsed: false, hourOffset: 0 };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}
