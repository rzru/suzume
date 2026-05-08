import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";

const STORAGE_KEY = "suzume:settings:v1";

export type AppSettings = {
  model: string | null;
  targetLanguage: string | null;
};

const DEFAULT_SETTINGS: AppSettings = { model: null, targetLanguage: null };

const normalize = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;

export function useAppSettings() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(STORAGE_KEY, DEFAULT_SETTINGS, {
    deserializer: (raw) => {
      try {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        return {
          model: normalize(parsed.model),
          targetLanguage: normalize(parsed.targetLanguage),
        };
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
  });

  const setModel = useCallback(
    (model: string | null) => setSettings((prev) => ({ ...prev, model: normalize(model) })),
    [setSettings],
  );

  const setTargetLanguage = useCallback(
    (language: string | null) =>
      setSettings((prev) => ({ ...prev, targetLanguage: normalize(language) })),
    [setSettings],
  );

  return {
    model: settings.model,
    targetLanguage: settings.targetLanguage,
    setModel,
    setTargetLanguage,
  };
}
