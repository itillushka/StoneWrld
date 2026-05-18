/**
 * Compile design/04-buildings.md → public/content/catalog.json
 *
 * Per design/08-architecture §Catalog compilation:
 *   "Markdown source (03 / 04) → compile-script → JSON". The design doc
 *   stays the canonical truth; this script extracts the structured data
 *   the game needs at runtime without hand-syncing a separate JSON file.
 *
 * Parser is line-based + intentionally conservative. Two heading shapes
 * are recognised:
 *
 *   A) Standard entry:
 *      #### Building Name [optional (parenthetical)] [optional *(stub)*]
 *      **Category**: X · **Footprint**: WxH · **Milestone first**: ... · **Sprite source**: ...
 *      **Idle animation**: ...
 *
 *      | Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand[ / coverage]) |
 *      | T1 | 30⛓+15⚡ | mud_brick | — | 0 / 0 |
 *      | T2 | ...
 *      | T3 | ...
 *
 *   B) Multi-building stub block:
 *      #### Building1, Building2, Building3 *(arcs 5-7 stubs)*
 *
 *      | Building | Milestone | T1 cost | T1 passive | T1 power |
 *      | Aluminum Refinery | #6 ... | 30000⛓+15000📚 | +12⛓ | 0 / 5 |
 *      | ...
 *
 * Headings that don't match either shape are treated as section intros
 * and skipped silently. Buildings whose tier table fails to parse generate
 * a warning, but compilation continues so a botched edit doesn't lock up
 * the whole build.
 *
 * Run via:  npx tsx scripts/compile-catalog.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const SOURCE = path.join(REPO_ROOT, 'design', '04-buildings.md');
const OUT = path.join(REPO_ROOT, 'public', 'content', 'catalog.json');

// --- Types (mirror src/catalog/buildings.ts) -------------------------------

type ResourceKey = 'knowledge' | 'discovery' | 'iron' | 'innovation' | 'completion';

interface BuildingTierData {
  tier: 1 | 2 | 3;
  cost: Partial<Record<ResourceKey, number>>;
  research_prereqs: string[];
  passive_per_hour: Partial<Record<ResourceKey, number>>;
  power_capacity: number;
  power_demand: number;
  coverage_radius?: number;
  idle_animation: string;
}

interface BuildingCatalogEntry {
  id: string;
  name: string;
  category: string;
  footprint: { w: number; h: number };
  tiers: BuildingTierData[];
  sprite_source: 'ai_gen' | 'cc0_placeholder' | 'hand_pixel';
  terrain_gate?: 'naval_needs_water' | 'rocket_needs_concrete';
}

// --- Helpers ----------------------------------------------------------------

const EMOJI_TO_KEY: Record<string, ResourceKey> = {
  '📚': 'knowledge',
  '🔭': 'discovery',
  '⛓': 'iron',
  '⚡': 'innovation',
  '🏁': 'completion',
};

/** Strip parentheticals + stub markers + bold markdown from a heading title. */
function cleanHeading(s: string): string {
  return s
    .replace(/\*\*/g, '')         // **bold**
    .replace(/\([^)]*\)/g, '')    // (parenthetical)
    .replace(/\*[^*]*\*/g, '')    // *italic / stub*
    .replace(/\*/g, '')            // any leftover *
    .replace(/`[^`]*`/g, '')      // `code spans`
    .trim();
}

/** Slug from cleaned heading: lower + non-alphanumeric → _ + collapse repeats. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Parse a cost string like "30⛓+15⚡" → { iron: 30, innovation: 15 }. */
function parseResources(s: string): Partial<Record<ResourceKey, number>> {
  const trimmed = s.replace(/`/g, '').trim();
  if (!trimmed || trimmed === '—' || trimmed === '-' || trimmed === '0') return {};
  const out: Partial<Record<ResourceKey, number>> = {};
  // Tokens separated by + (handle "+" inside the value too — e.g. "+3⛓")
  // Strategy: split on "+" but the FIRST token may have a leading "+" (e.g. "+3⛓") meaning sign only.
  for (const rawToken of trimmed.split('+')) {
    const token = rawToken.trim();
    if (!token) continue;
    // Find the emoji at the end of the token.
    let resource: ResourceKey | null = null;
    let valueStr = token;
    for (const [emoji, key] of Object.entries(EMOJI_TO_KEY)) {
      if (token.endsWith(emoji)) {
        resource = key;
        valueStr = token.slice(0, -emoji.length).trim();
        break;
      }
    }
    if (resource === null) continue; // unrecognized token — skip
    const n = Number(valueStr);
    if (!Number.isFinite(n)) continue;
    out[resource] = (out[resource] ?? 0) + n;
  }
  return out;
}

/** Parse a power column like "0 / 2" or "+18 / 0" or "0 / 0 / **4**" (with coverage). */
function parsePower(s: string): {
  capacity: number;
  demand: number;
  coverage?: number;
} {
  const trimmed = s.replace(/\*\*/g, '').replace(/`/g, '').trim();
  const parts = trimmed.split('/').map((p) => p.trim().replace(/^\+/, ''));
  const cap = Number(parts[0]) || 0;
  const dem = Number(parts[1]) || 0;
  if (parts.length >= 3) {
    const cov = Number(parts[2]);
    if (Number.isFinite(cov)) {
      return { capacity: cap, demand: dem, coverage: cov };
    }
  }
  return { capacity: cap, demand: dem };
}

/** Footprint like "1×1" / "3×2" / "1×3 (tall)" → { w, h }. */
function parseFootprint(s: string): { w: number; h: number } | null {
  const m = s.match(/(\d+)\s*[×x]\s*(\d+)/);
  if (!m) return null;
  return { w: Number(m[1]), h: Number(m[2]) };
}

/** Sprite source string → catalog enum. */
function parseSpriteSource(s: string): BuildingCatalogEntry['sprite_source'] {
  const lower = s.toLowerCase();
  if (lower.includes('ai-gen') || lower.includes('ai_gen')) return 'ai_gen';
  if (lower.includes('hand') || lower.includes('pixel')) return 'cc0_placeholder';
  return 'cc0_placeholder';
}

/** Parse a research-prereqs cell: "mud_brick, stone_masonry" or "+ glass_making". */
function parsePrereqs(s: string, previousTierPrereqs: string[]): string[] {
  const cleaned = s.replace(/`/g, '').trim();
  if (!cleaned || cleaned === '—' || cleaned === '-') return [...previousTierPrereqs];
  // "+ glass_making" means previous + this. Strip leading "+".
  const additive = cleaned.startsWith('+');
  const tokens = cleaned
    .replace(/^\+\s*/, '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return additive ? [...previousTierPrereqs, ...tokens] : tokens;
}

/**
 * Some entries (multi-stub blocks) inherit the section heading "Materials
 * Processing" while standard entries' **Category**: field says "Materials".
 * Normalize so the build modal shows a single category, not two split groups.
 */
const CATEGORY_NORMALIZE: Record<string, string> = {
  'Materials Processing': 'Materials',
};

function normalizeCategory(c: string): string {
  return CATEGORY_NORMALIZE[c] ?? c;
}

/** Decide a terrain gate based on category + id. */
function decideTerrainGate(
  category: string,
  id: string,
): BuildingCatalogEntry['terrain_gate'] {
  if (id === 'rocket_launch_pad') return 'rocket_needs_concrete';
  if (category === 'Naval') return 'naval_needs_water';
  return undefined;
}

// --- Parser -----------------------------------------------------------------

interface ParserState {
  lines: string[];
  cursor: number;
  category: string;
  entries: BuildingCatalogEntry[];
  warnings: string[];
}

function peek(s: ParserState, off = 0): string {
  return s.lines[s.cursor + off] ?? '';
}

function isTableHeader(line: string): boolean {
  return /^\|\s*Tier\s*\|/.test(line.trim());
}

function isMultiBuildingTableHeader(line: string): boolean {
  return /^\|\s*Building\s*\|/.test(line.trim());
}

function parseStandardEntry(s: ParserState, headingLine: string): void {
  const rawName = headingLine.replace(/^#+\s*/, '');
  const name = cleanHeading(rawName);
  const id = slugify(name);

  // Look for the metadata line + idle animation + tier table within the
  // next ~10 lines. If we don't find a tier table, treat as section header
  // and skip.
  let metadataLine = '';
  let idleAnimation = '';
  let tableStart = -1;
  for (let off = 1; off < 12; off++) {
    const l = peek(s, off);
    if (l.includes('**Category**:')) metadataLine = l;
    else if (l.includes('**Idle animation**:')) idleAnimation = l;
    else if (isTableHeader(l)) {
      tableStart = s.cursor + off;
      break;
    }
  }

  if (tableStart < 0) {
    // Heading without a table → section/intro heading. Silently skip.
    return;
  }
  if (!metadataLine) {
    s.warnings.push(`[${id}] missing metadata line`);
    return;
  }

  // Parse metadata: split on " · " (middle dot).
  const metaParts = metadataLine.split('·').map((p) => p.trim());
  let category = s.category; // fall back to section category
  let footprint: { w: number; h: number } | null = null;
  let spriteSource: BuildingCatalogEntry['sprite_source'] = 'cc0_placeholder';
  for (const part of metaParts) {
    const m = part.match(/\*\*([^*]+)\*\*:\s*(.+)/);
    if (!m) continue;
    const key = m[1]!.trim();
    const val = m[2]!.trim();
    if (key === 'Category') category = normalizeCategory(val);
    else if (key === 'Footprint') footprint = parseFootprint(val);
    else if (key === 'Sprite source') spriteSource = parseSpriteSource(val);
  }
  if (!footprint) {
    s.warnings.push(`[${id}] missing/unparseable footprint`);
    return;
  }

  const idleText = idleAnimation
    .replace(/.*\*\*Idle animation\*\*:\s*/, '')
    .trim();

  // Parse the tier table: header row + separator + data rows until empty line.
  const tiers: BuildingTierData[] = [];
  let prevPrereqs: string[] = [];
  // Skip the header row and the separator row.
  let row = tableStart + 2;
  while (row < s.lines.length) {
    const line = s.lines[row]!;
    if (!line.trim().startsWith('|')) break;
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1); // drop empty edges
    if (cells.length < 5) break;
    const tierLabel = cells[0]!;
    const tierMatch = tierLabel.match(/T(\d)/);
    if (!tierMatch) {
      row++;
      continue;
    }
    const tier = Number(tierMatch[1]!) as 1 | 2 | 3;
    const cost = parseResources(cells[1]!);
    const prereqs = parsePrereqs(cells[2]!, prevPrereqs);
    const passive = parseResources(cells[3]!);
    const power = parsePower(cells[4]!);
    tiers.push({
      tier,
      cost,
      research_prereqs: prereqs,
      passive_per_hour: passive,
      power_capacity: power.capacity,
      power_demand: power.demand,
      ...(power.coverage !== undefined ? { coverage_radius: power.coverage } : {}),
      idle_animation: idleText || 'TODO',
    });
    prevPrereqs = prereqs;
    row++;
  }

  if (tiers.length === 0) {
    s.warnings.push(`[${id}] no tier rows parsed`);
    return;
  }

  const entry: BuildingCatalogEntry = {
    id,
    name,
    category,
    footprint,
    tiers,
    sprite_source: spriteSource,
    ...(decideTerrainGate(category, id) ? { terrain_gate: decideTerrainGate(category, id)! } : {}),
  };
  s.entries.push(entry);
  s.cursor = row - 1; // resume just before next line
}

function parseMultiBuildingStub(s: ParserState, headingLine: string): void {
  // Heading lists the buildings: extract names by splitting cleaned heading on commas.
  const rawName = headingLine.replace(/^#+\s*/, '');
  const cleaned = cleanHeading(rawName);
  const names = cleaned.split(',').map((n) => n.trim()).filter((n) => n.length > 0);

  // Look ahead for the multi-building table.
  let tableStart = -1;
  for (let off = 1; off < 15; off++) {
    const l = peek(s, off);
    if (isMultiBuildingTableHeader(l)) {
      tableStart = s.cursor + off;
      break;
    }
  }
  if (tableStart < 0) {
    s.warnings.push(`[multi-stub] no table for: ${names.join(', ')}`);
    return;
  }

  // Skip header + separator, parse rows.
  let row = tableStart + 2;
  const stubs: BuildingCatalogEntry[] = [];
  while (row < s.lines.length) {
    const line = s.lines[row]!;
    if (!line.trim().startsWith('|')) break;
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (cells.length < 5) break;
    const buildingName = cleanHeading(cells[0]!);
    const id = slugify(buildingName);
    const cost = parseResources(cells[2]!);
    const passive = parseResources(cells[3]!);
    const power = parsePower(cells[4]!);

    stubs.push({
      id,
      name: buildingName,
      category: s.category,
      footprint: { w: 2, h: 2 }, // conservative default for stubs
      tiers: [
        {
          tier: 1,
          cost,
          research_prereqs: [],
          passive_per_hour: passive,
          power_capacity: power.capacity,
          power_demand: power.demand,
          ...(power.coverage !== undefined ? { coverage_radius: power.coverage } : {}),
          idle_animation: 'TODO',
        },
      ],
      sprite_source: 'ai_gen',
      ...(decideTerrainGate(s.category, id) ? { terrain_gate: decideTerrainGate(s.category, id)! } : {}),
    });
    row++;
  }
  s.entries.push(...stubs);
  s.cursor = row - 1;
}

async function main(): Promise<void> {
  const text = await fs.readFile(SOURCE, 'utf8');
  const lines = text.split('\n');
  const state: ParserState = {
    lines,
    cursor: 0,
    category: 'Unknown',
    entries: [],
    warnings: [],
  };

  while (state.cursor < state.lines.length) {
    const line = state.lines[state.cursor]!;

    // Category header — `### N. CategoryName (X buildings)`
    const catMatch = line.match(/^###\s+\d+\.\s+([^()]+)/);
    if (catMatch) {
      state.category = normalizeCategory(catMatch[1]!.trim());
      state.cursor++;
      continue;
    }

    // Building heading — `#### Name`
    if (line.startsWith('#### ')) {
      // Multi-building combined heading detection: comma in cleaned name + lack of metadata line.
      const cleaned = cleanHeading(line.replace(/^#+\s*/, ''));
      if (cleaned.includes(',')) {
        // Confirm by looking ahead for a multi-building table.
        let foundMulti = false;
        for (let off = 1; off < 15; off++) {
          if (isMultiBuildingTableHeader(peek(state, off))) {
            foundMulti = true;
            break;
          }
        }
        if (foundMulti) {
          parseMultiBuildingStub(state, line);
          state.cursor++;
          continue;
        }
        // Otherwise it's a section-intro heading (Shipyard/Sailboat/.../Perseus combo).
        state.cursor++;
        continue;
      }
      parseStandardEntry(state, line);
      state.cursor++;
      continue;
    }

    state.cursor++;
  }

  // De-duplicate by id, preferring the LAST occurrence (multi-building stubs
  // are intentionally listed before any individual entry with the same id).
  const byId = new Map<string, BuildingCatalogEntry>();
  for (const e of state.entries) byId.set(e.id, e);
  const finalEntries = Array.from(byId.values());

  // Sort by category then name for stable output.
  finalEntries.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const output = {
    version: 1,
    generated_at: new Date().toISOString(),
    entries: finalEntries,
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${OUT}`);
  console.log(`  ${finalEntries.length} buildings parsed`);
  const byCat: Record<string, number> = {};
  for (const e of finalEntries) byCat[e.category] = (byCat[e.category] ?? 0) + 1;
  for (const [c, n] of Object.entries(byCat).sort()) {
    console.log(`    ${c}: ${n}`);
  }
  if (state.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of state.warnings) console.log(`  ${w}`);
  }
}

main();
