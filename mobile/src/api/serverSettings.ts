import AsyncStorage from "@react-native-async-storage/async-storage";

export const DEFAULT_BASE_URL = "https://file.lamino.top/";
const STORAGE_KEY = "file-garage.api-server";
const PRESETS = [DEFAULT_BASE_URL, "http://192.168.1.19:8080/", "http://100.127.57.120:8080/"];

interface ServerSettings {
  baseURL: string;
  recentURLs: string[];
  ready: boolean;
}

let settings: ServerSettings = { baseURL: DEFAULT_BASE_URL, recentURLs: PRESETS, ready: false };
let initialization: Promise<void> | undefined;
const listeners = new Set<() => void>();

export function normalizeBaseURL(value: string): string {
  const input = value.trim();
  let url: URL;
  try {
    if (!/^https?:\/\//i.test(input) || /\s/.test(input)) throw new Error();
    url = new URL(input);
    if (!url.hostname || url.username || url.password || url.search || url.hash) throw new Error();
  } catch {
    throw new Error("Enter a valid http:// or https:// server URL without credentials, a query, or a fragment.");
  }
  url.pathname = url.pathname.replace(/\/+$/, "") + "/";
  return url.toString();
}

function recentURLs(values: unknown[]): string[] {
  const result: string[] = [];
  for (const value of [...values, ...PRESETS]) {
    if (typeof value !== "string") continue;
    try {
      const url = normalizeBaseURL(value);
      if (!result.includes(url)) result.push(url);
    } catch {
      // Ignore invalid entries from older or damaged saved settings.
    }
  }
  return result.slice(0, 6);
}

function publish(next: ServerSettings) {
  settings = next;
  listeners.forEach((listener) => listener());
}

export function getServerSettings(): ServerSettings {
  return settings;
}

export function subscribeServerSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function initializeServerSettings(): Promise<void> {
  initialization ??= (async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const baseURL = normalizeBaseURL(parsed.baseURL);
        settings = {
          baseURL,
          recentURLs: recentURLs([baseURL, ...(Array.isArray(parsed.recentURLs) ? parsed.recentURLs : [])]),
          ready: false,
        };
      }
    } catch {
      // The default server remains available if local settings cannot be read.
    }
    publish({ ...settings, ready: true });
  })();
  return initialization;
}

export async function saveServerBaseURL(value: string): Promise<void> {
  const baseURL = normalizeBaseURL(value);
  await initializeServerSettings();
  const next = { baseURL, recentURLs: recentURLs([baseURL, ...settings.recentURLs]), ready: true };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error("Could not save the server URL on this device. Please try again.");
  }
  publish(next);
}
