import type { ResourceKey } from '../state/schema';

/**
 * Shared display formatters for resource amounts.
 *
 * compactN(n) prints large numbers as compact suffixes so they fit inside
 * node / row layouts without overflowing:
 *   200000 → "200k"
 *   1500   → "1.5k"
 *   1200000 → "1.2M"
 *   42     → "42"
 *
 * formatResourceList stamps each resource onto its single-letter label
 * (K / D / I / N / C) using compactN, joined with " + ".
 */

const RESOURCE_LABEL: Record<ResourceKey, string> = {
  knowledge: 'K',
  discovery: 'D',
  iron: 'I',
  innovation: 'N',
  completion: 'C',
};

export function compactN(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10}M`;
  }
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${Math.round(k * 10) / 10}k`;
  }
  return String(Math.floor(n));
}

export function formatResourceList(
  cost: Partial<Record<ResourceKey, number>>,
  separator = ' + ',
): string {
  return Object.entries(cost)
    .map(([k, v]) => `${compactN(v)}${RESOURCE_LABEL[k as ResourceKey]}`)
    .join(separator);
}
