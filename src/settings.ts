export interface Settings {
  searchUrlsAndDomains: boolean;
}

export const SETTINGS_KEY = "settings";
export const DEFAULT_SETTINGS: Readonly<Settings> = {
  searchUrlsAndDomains: false,
};

export function normalizeSettings(value: unknown): Settings {
  const candidate = value as Partial<Settings> | null;
  return { searchUrlsAndDomains: candidate?.searchUrlsAndDomains === true };
}

export async function readSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(result[SETTINGS_KEY]);
}

export async function writeSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: normalizeSettings(settings) });
}

export function subscribeToSettings(listener: (settings: Settings) => void): () => void {
  const handleChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "local" && changes[SETTINGS_KEY]) {
      listener(normalizeSettings(changes[SETTINGS_KEY].newValue));
    }
  };
  chrome.storage.onChanged.addListener(handleChange);
  return () => chrome.storage.onChanged.removeListener(handleChange);
}
