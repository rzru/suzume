export const PRACTICE_MODES = ["chat", "translate", "construct"] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export const PROFICIENCY_LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"] as const;
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export const CARD_SCOPES = ["learned", "today", "all"] as const;
export type CardScope = (typeof CARD_SCOPES)[number];

export const TRANSLATE_DIRECTIONS = ["from", "to"] as const;
export type TranslateDirection = (typeof TRANSLATE_DIRECTIONS)[number];

export const isPracticeMode = (value: string | undefined): value is PracticeMode =>
  PRACTICE_MODES.some((mode) => mode === value);

export const isProficiencyLevel = (value: string | undefined): value is ProficiencyLevel =>
  PROFICIENCY_LEVELS.some((level) => level === value);

export const isCardScope = (value: string | undefined): value is CardScope =>
  CARD_SCOPES.some((scope) => scope === value);

export const isTranslateDirection = (value: string | undefined): value is TranslateDirection =>
  TRANSLATE_DIRECTIONS.some((direction) => direction === value);
