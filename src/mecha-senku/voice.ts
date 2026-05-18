import type { LogEntry, ResourceKey } from '../state/schema';

/**
 * Mecha Senku voice templates — the captain-grade prose that turns
 * every event into a one-line announcement.
 *
 * Per design/06-style §Canonical message templates: 11 trigger types
 * × Ryusui-flavored copy. The formatters here turn structured event
 * data into the operational LINE. Factoids attach on top in Phase 12.
 *
 * Voice rules (design/06-style §Voice rules):
 *   - Two-channel blend: Ryusui captain energy + Senku 10-billion-percent.
 *   - 1-2 sentences for the operational line.
 *   - Always name the prize: resource, network, building, milestone.
 *   - Anchor with one canon tag — Profit / Hoshii / Storm / 10 billion %.
 *   - Surface failures plainly first.
 *   - No begging-for-engagement.
 *
 * Each formatter returns a LogEntry shape; CityScene + ResearchScene
 * append these to state.captain_log via FIFO eviction at CAPTAIN_LOG_MAX.
 */

export type Emotion = 'idle' | 'excited' | 'proud' | 'worried' | 'captain';

export interface VoicedEntry extends LogEntry {
  /** Suggested emotion sprite frame for this event. */
  emotion: Emotion;
  /** Bubble accent color (border / heading) — picked by event severity. */
  accentColor: string;
}

const PALETTE = {
  gold: '#FFC940',          // default success / build
  goldShimmer: '#FFE680',   // upgrade / shine
  green: '#7CD16A',         // research / milestone
  amber: '#F0A030',         // warning
  red: '#E84B4B',           // brownout / failure
  cyan: '#3DCBE3',          // discovery / session-open deposit
};

function nowIso(): string {
  return new Date().toISOString();
}

function formatResourceList(r: Partial<Record<ResourceKey, number>>): string {
  const labels: Record<ResourceKey, string> = {
    knowledge: '📚',
    discovery: '🔭',
    iron: '⛓',
    innovation: '⚡',
    completion: '🏁',
  };
  const parts: string[] = [];
  // Order: K D I N C (matches HUD)
  const order: ResourceKey[] = ['knowledge', 'discovery', 'iron', 'innovation', 'completion'];
  for (const k of order) {
    const v = r[k];
    if (v == null || v === 0) continue;
    parts.push(`+${Math.floor(v)}${labels[k]}`);
  }
  return parts.join(', ');
}

// ----- Template 1: Session-open deposit -----

export function voiceDeposit(
  delta: Partial<Record<ResourceKey, number>>,
): VoicedEntry {
  const list = formatResourceList(delta);
  return {
    ts: nowIso(),
    operational: `Plunder from the last watch: ${list || 'no haul'}.`,
    trigger: 'session_open',
    emotion: 'excited',
    accentColor: PALETTE.cyan,
  };
}

// ----- Template 2: Build complete -----

export function voiceBuild(
  buildingName: string,
  tier: number,
  effectSummary: string,
  triggerKey: string,
): VoicedEntry {
  return {
    ts: nowIso(),
    operational: `Profit. ${buildingName} T${tier} on the deck — ${effectSummary}.`,
    trigger: triggerKey,
    emotion: 'excited',
    accentColor: PALETTE.gold,
  };
}

// ----- Template 3: Upgrade complete -----

export function voiceUpgrade(
  buildingName: string,
  newTier: number,
  triggerKey: string,
): VoicedEntry {
  return {
    ts: nowIso(),
    operational: `${buildingName} T${newTier} redrawn — production scales.`,
    trigger: triggerKey,
    emotion: 'excited',
    accentColor: PALETTE.goldShimmer,
  };
}

// ----- Template 4: Demolish -----

export function voiceDemolish(
  buildingName: string,
  refund: Partial<Record<ResourceKey, number>>,
  triggerKey: string,
): VoicedEntry {
  const refundStr = formatResourceList(refund) || 'no refund';
  return {
    ts: nowIso(),
    operational: `${buildingName} struck. Refund: ${refundStr}.`,
    trigger: triggerKey,
    emotion: 'worried',
    accentColor: PALETTE.amber,
  };
}

// ----- Template 5: Research unlocked -----

export function voiceResearch(
  techName: string,
  followUp: string,
  triggerKey: string,
): VoicedEntry {
  return {
    ts: nowIso(),
    operational: `10 billion percent — ${techName} unlocked. ${followUp}`,
    trigger: triggerKey,
    emotion: 'proud',
    accentColor: PALETTE.green,
  };
}

// ----- Template 6: Brownout -----

export function voiceBrownout(
  networkId: string,
  capacity: number,
  demand: number,
  triggerKey: string,
): VoicedEntry {
  return {
    ts: nowIso(),
    operational:
      `Storm on the ${networkId} grid — capacity ${capacity}, demand ${demand}. ` +
      `Build power or strike a workshop.`,
    trigger: triggerKey,
    emotion: 'worried',
    accentColor: PALETTE.red,
  };
}

// ----- Template 7: Off-grid placement -----

export function voiceOffGrid(buildingName: string, triggerKey: string): VoicedEntry {
  return {
    ts: nowIso(),
    operational: `${buildingName} is off the grid — no pole in reach. 0% trickle until wired.`,
    trigger: triggerKey,
    emotion: 'worried',
    accentColor: PALETTE.amber,
  };
}

// ----- Template 8: Storage near-cap -----

export function voiceStorageTight(
  siloName: string,
  percent: number,
  triggerKey: string,
): VoicedEntry {
  return {
    ts: nowIso(),
    operational:
      `Storage tight — ${siloName} at ${percent}%. ` +
      `Upgrade or this resource spills off the deck.`,
    trigger: triggerKey,
    emotion: 'worried',
    accentColor: PALETTE.amber,
  };
}

// ----- Template 9: Storage at cap -----

export function voiceStorageFull(
  siloName: string,
  cap: number,
  triggerKey: string,
): VoicedEntry {
  return {
    ts: nowIso(),
    operational: `Silo full — ${siloName} capped at ${cap}. Overflow lost.`,
    trigger: triggerKey,
    emotion: 'worried',
    accentColor: PALETTE.red,
  };
}

// ----- Template 10: Milestone reached -----

export function voiceMilestone(
  milestoneName: string,
  reward: string,
  triggerKey: string,
): VoicedEntry {
  return {
    ts: nowIso(),
    operational: `Anchors aweigh — ${milestoneName} achieved. ${reward}`,
    trigger: triggerKey,
    emotion: 'captain',
    accentColor: PALETTE.goldShimmer,
  };
}

// ----- Template 11: Endgame moon-launch (reserved one-shot) -----

export function voiceEndgame(): VoicedEntry {
  return {
    ts: nowIso(),
    operational: 'Hoshii. The Perseus reached the moon. Captain\'s log closes here.',
    trigger: 'endgame_moon_launch',
    emotion: 'captain',
    accentColor: PALETTE.goldShimmer,
  };
}

// ----- Helper: classify a captain_log entry post-hoc -----

/**
 * Derive an emotion + accent color for a captain_log entry that didn't
 * come through a voice* formatter (e.g. legacy entries written before
 * Phase 9). Looks at the trigger key prefix.
 */
export function classifyLogEntry(entry: LogEntry): { emotion: Emotion; accentColor: string } {
  const trig = entry.trigger;
  if (trig.startsWith('build:')) return { emotion: 'excited', accentColor: PALETTE.gold };
  if (trig.startsWith('upgrade:')) return { emotion: 'excited', accentColor: PALETTE.goldShimmer };
  if (trig.startsWith('demolish:')) return { emotion: 'worried', accentColor: PALETTE.amber };
  if (trig.startsWith('research:')) return { emotion: 'proud', accentColor: PALETTE.green };
  if (trig.startsWith('brownout:')) return { emotion: 'worried', accentColor: PALETTE.red };
  if (trig.startsWith('milestone:')) return { emotion: 'captain', accentColor: PALETTE.goldShimmer };
  if (trig === 'session_open') return { emotion: 'excited', accentColor: PALETTE.cyan };
  return { emotion: 'idle', accentColor: PALETTE.gold };
}
