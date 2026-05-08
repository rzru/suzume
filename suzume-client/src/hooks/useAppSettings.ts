import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "suzume:settings:v1";

export type AppSettings = {
  model: string | null;
  targetLanguage: string | null;
};

const DEFAULT_SETTINGS: AppSettings = {
  model: null,
  targetLanguage: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: AppSettings = readFromStorage();

function readFromStorage(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      model: typeof parsed.model === "string" && parsed.model.trim() !== "" ? parsed.model : null,
      targetLanguage:
        typeof parsed.targetLanguage === "string" && parsed.targetLanguage.trim() !== ""
          ? parsed.targetLanguage
          : null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeToStorage(value: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors (quota, private mode, etc.)
  }
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = readFromStorage();
      notify();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshot(): AppSettings {
  return cache;
}

function getServerSnapshot(): AppSettings {
  return DEFAULT_SETTINGS;
}

function update(patch: Partial<AppSettings>) {
  cache = { ...cache, ...patch };
  writeToStorage(cache);
  notify();
}

export function useAppSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setModel = useCallback((model: string | null) => {
    update({ model: model && model.trim() !== "" ? model : null });
  }, []);

  const setTargetLanguage = useCallback((language: string | null) => {
    update({ targetLanguage: language && language.trim() !== "" ? language : null });
  }, []);

  return {
    model: settings.model,
    targetLanguage: settings.targetLanguage,
    setModel,
    setTargetLanguage,
  };
}
