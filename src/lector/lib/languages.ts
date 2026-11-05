// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only): src/lib/languages.ts
// Re-export of the language layer, minus the multi-language `enabled` module.
export * from "../languages/registry";
export * from "../languages/text";
export * from "../languages/graphemes";
export * from "../languages/tokenizer";
export * from "../languages/morphology";
