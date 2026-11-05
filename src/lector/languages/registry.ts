// Ported from Lector (heuwels/lector, AGPL-3.0-only): languages/registry.ts,
// reduced to the single Indonesian pack this app ships.

import { id } from "./id/manifest";
import type { LanguageConfig } from "./types";

export type { LanguageConfig, ProseDefaults } from "./types";

const MANIFESTS = { id };

// Widened with `string & {}` so Lector's per-language branches (la, ar, …) still typecheck.
export type LanguageCode = keyof typeof MANIFESTS | (string & {});

export const LANGUAGES: Record<keyof typeof MANIFESTS, LanguageConfig> =
  MANIFESTS;

export const DEFAULT_LANGUAGE = "id" as const;

export function getLanguageConfig(
  code: keyof typeof MANIFESTS
): LanguageConfig {
  return LANGUAGES[code];
}
