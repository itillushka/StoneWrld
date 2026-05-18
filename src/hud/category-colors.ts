/**
 * Per-building-category colors — locked in design/06-style §Per-category badge.
 *
 * Each category renders a 1-tile color stripe (or in our case a 4px left-
 * edge accent on each modal row) so the player can scan categories at a glance.
 * Phase 6 uses this in the build modal; Phase 13 power/storage overlays
 * may reuse it.
 *
 * Numeric (Phaser) AND hex forms exported so callers can mix Graphics fills
 * (need int) with Text colors (need string).
 */

export const CATEGORY_COLOR_HEX: Record<string, string> = {
  Dwellings: '#F0EBD7',         // cream — domestic, warm
  Power: '#FFC940',             // captain gold — energy
  Materials: '#A8ADB4',         // iron grey — smelted metal
  Chemistry: '#A47CE0',         // endgame violet — reagents
  Construction: '#F0A030',      // warm orange — workshop fire
  Mechanics: '#5C6E8E',         // steel blue — machinery cool
  Electronics: '#3DCBE3',       // cyan — spark / signal
  Communication: '#7AE2F2',     // cyan shimmer — radio waves
  Naval: '#1B2D5C',             // deep navy — sea
  Medicine: '#7CD16A',          // KoS green — healing
  Space: '#A47CE0',             // endgame violet — cosmic
  Storage: '#F0EBD7',           // cream — silos are pantries
};

export const CATEGORY_COLOR_INT: Record<string, number> = {
  Dwellings: 0xf0ebd7,
  Power: 0xffc940,
  Materials: 0xa8adb4,
  Chemistry: 0xa47ce0,
  Construction: 0xf0a030,
  Mechanics: 0x5c6e8e,
  Electronics: 0x3dcbe3,
  Communication: 0x7ae2f2,
  Naval: 0x1b2d5c,
  Medicine: 0x7cd16a,
  Space: 0xa47ce0,
  Storage: 0xf0ebd7,
};

/** Fallback color for an unrecognized category — cream (neutral). */
export const CATEGORY_DEFAULT_HEX = '#F0EBD7';
export const CATEGORY_DEFAULT_INT = 0xf0ebd7;

export function categoryColorHex(category: string): string {
  return CATEGORY_COLOR_HEX[category] ?? CATEGORY_DEFAULT_HEX;
}

export function categoryColorInt(category: string): number {
  return CATEGORY_COLOR_INT[category] ?? CATEGORY_DEFAULT_INT;
}
