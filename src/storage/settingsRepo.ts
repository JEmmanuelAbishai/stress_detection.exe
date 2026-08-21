import { STORAGE_KEYS } from "@shared/constants";
import { DEFAULT_SETTINGS, type UserSettings } from "@shared/types";

/**
 * Settings are small, read constantly (every content-script bootstrap), and
 * benefit from chrome.storage.local's built-in onChanged event, so they
 * live outside IndexedDB in their own namespace.
 */
export const settingsRepo = {
  async get(): Promise<UserSettings> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.settings);
    const saved = stored[STORAGE_KEYS.settings] as Partial<UserSettings> | undefined;
    return { ...DEFAULT_SETTINGS, ...saved };
  },

  async update(patch: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.get();
    const next = { ...current, ...patch };
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
    return next;
  },

  onChange(callback: (settings: UserSettings) => void): () => void {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== "local" || !changes[STORAGE_KEYS.settings]) return;
      callback({ ...DEFAULT_SETTINGS, ...changes[STORAGE_KEYS.settings].newValue });
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
};
