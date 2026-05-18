# 08 — Architecture

> STATUS: **LOCKED (2026-05-18)** — co-captain locked as drafted; all 7 forks went with captain's lean (Vite middleware, 5100-5150 ports, balance tuned in playtest, Markdown→JSON compile, free-texture-packer, Tiled for terrain, global hook).

The technical blueprint. Codifies the Phaser scene tree, asset pipeline, full `state.json` schema, the Claude Code PostToolUse hook, save/load contract, packaging strategy, port allocation, test setup, and folder layout — everything implementation needs to start without further design churn.

This is the last design doc before the roadmap. [09-roadmap.md](./09-roadmap.md) phases the actual delivery; everything in this doc is the **what we will build**, [09](./09-roadmap.md) is the **in what order**.

---

## Cross-doc anchors

| What | Where |
|---|---|
| Stack (Phaser 3 + TS + Vite) | [01-vision §Decision #2](./01-vision.md) |
| Game-time loop (window open/closed, hook firing) | [02-game-logic §Game-time loop](./02-game-logic.md) |
| Resource yields (tool→resource mapping) | [02-game-logic §Resource yields](./02-game-logic.md) |
| Power coverage network model | [02-game-logic §Power model](./02-game-logic.md) + [05-map §Power coverage](./05-map.md) |
| Map state schema (preview) | [05-map §Map state in state.json](./05-map.md) |
| Buildings + research catalogs (content authoring) | [03-progression](./03-progression.md), [04-buildings](./04-buildings.md) |
| Asset sources (AI-gen primary, hand-pixel hero) | [07-references §Sprite source strategy](./07-references.md) |
| Factoid content authoring | [06-style §Factoid storage](./06-style.md) |

---

## Stack confirmation

| Layer | Choice | Why |
|---|---|---|
| Game engine | **Phaser 3** (≥ 3.80) | Pixel-art-first, mature, BitmapText for pixel fonts, scenes/tweens/spritesheets all first-class |
| Language | **TypeScript** (≥ 5.4) | Strong typing across catalogs, state schema, economy logic — domain has lots of structured data |
| Build / dev | **Vite** (≥ 5.x) | Fast HMR, simple config, native ESM, plays well with Phaser + TS |
| Package manager | **npm** | Per [global CLAUDE.md](file:///home/aristarx/.claude/CLAUDE.md) — npm for Node projects, no pnpm/yarn |
| Pixel-art editor | **Aseprite** | Per [07-references §AI-gen tooling](./07-references.md) — non-negotiable in the sprite pipeline |
| Test runner | **Vitest** | Vite-native, fast, TS-first; same tooling family as the build |
| Type check | **`tsc --noEmit`** + future PostToolUse hook (per [global CLAUDE.md pending env work #3](file:///home/aristarx/.claude/CLAUDE.md)) | Catch type errors immediately after edit |
| Hook runtime | **Node 20+** | The Claude PostToolUse hook is a plain Node script (no bundling) |
| Future packaging | **Electron** or **Tauri** (v2 optional) | Wrap the Vite-built bundle for desktop; v1 ships as browser tab |

---

## Folder structure

```
~/StoneWrld/
├── design/                       # Design docs (this directory) — the canonical spec
├── moodboard/                    # Canon refs, vibe packs (gitignored — see [07-references])
├── assets/                       # Source assets BEFORE atlas-packing
│   ├── buildings/                # AI-gen + hand-touched per-building sprites
│   │   ├── stone-world/          # Arc 1 buildings
│   │   ├── kingdom-of-science/   # Arc 2 buildings
│   │   ├── phone-era/            # Arc 3 buildings (incl. Power Poles tier 1-2)
│   │   ├── perseus-voyage/       # Arc 4
│   │   └── ...                   # arcs 5-7
│   ├── terrain/                  # Grass / stone / sand / water / concrete / dirt-path
│   ├── mecha-senku/              # ~26 character frames
│   │   └── stoneworld.aseprite   # Master Aseprite project
│   ├── hud/                      # Modal frames, buttons, speech bubbles
│   └── overlays/                 # Construction puff, smoke, gold ring, sparks
├── public/                       # Static assets shipped with the game build
│   ├── atlases/                  # Generated sprite atlases (.png + .json)
│   │   ├── buildings.png         # Packed building sprites
│   │   ├── buildings.json        # Atlas frame metadata
│   │   ├── terrain.png
│   │   ├── terrain.json
│   │   ├── mecha-senku.png
│   │   ├── mecha-senku.json
│   │   └── hud.png / hud.json
│   ├── content/
│   │   ├── factoids.json         # ~330 factoid strings per [06-style §Factoid storage]
│   │   ├── catalog.json          # Building catalog (compiled from 04-buildings)
│   │   └── tech-tree.json        # Research tree (compiled from 03-progression)
│   ├── maps/
│   │   └── stoneworld.json       # The canonical static terrain map (per [05-map §Terrain])
│   └── fonts/
│       ├── pixellari.fnt + pixellari.png   # Headings (16px)
│       └── m6x11.fnt + m6x11.png           # Body (11px)
├── src/                          # TypeScript source
│   ├── main.ts                   # Vite entry — bootstraps Phaser
│   ├── config.ts                 # Phaser config (resolution, scale mode, scene list)
│   ├── scenes/
│   │   ├── BootScene.ts          # Minimal preloader, shows loading bar
│   │   ├── PreloadScene.ts       # Loads atlases / fonts / catalogs / state.json
│   │   ├── CityScene.ts          # The city map (per [05-map])
│   │   ├── ResearchScene.ts      # The tech tree (per [03-progression §Research UI])
│   │   ├── UIScene.ts            # Persistent HUD overlay (resources, power, action buttons)
│   │   └── ModalScene.ts         # Build / inspect / silo / demolish modals
│   ├── state/
│   │   ├── schema.ts             # TypeScript types for state.json
│   │   ├── load.ts               # Read state from API + apply migrations
│   │   ├── save.ts               # Atomic write to API
│   │   └── migrations.ts         # version-to-version upgrade chain
│   ├── economy/
│   │   ├── resources.ts          # Resource accrual + cap checks
│   │   ├── network.ts            # Power coverage graph + per-network demand/capacity
│   │   ├── trickle.ts            # Offline passive trickle calculation (with 72h cap)
│   │   └── upgrades.ts           # Tier upgrade cost/output math
│   ├── catalog/
│   │   ├── buildings.ts          # Loads + indexes catalog.json
│   │   ├── techtree.ts           # Loads + indexes tech-tree.json
│   │   └── factoids.ts           # Loads factoids.json, returns random for given key
│   ├── city/
│   │   ├── grid.ts               # 32×24 grid + buildable area + frontier overlay
│   │   ├── placement.ts          # Validation + placement-mode interaction
│   │   ├── autopaths.ts          # Procedural dirt-path drawing
│   │   ├── overlays.ts           # Power / Resource / Storage / Hide-paths overlays
│   │   └── demolish.ts           # Demolish + 50% refund calculation
│   ├── hud/
│   │   ├── resources-panel.ts
│   │   ├── networks-panel.ts
│   │   ├── action-buttons.ts
│   │   ├── captains-log.ts       # Scrollback of Mecha Senku messages
│   │   └── overlays-panel.ts
│   ├── mecha-senku/
│   │   ├── sprite.ts             # 5 looping emotions + 3 one-shots
│   │   ├── speech-bubble.ts      # Operational + factoid bubble rendering
│   │   ├── voice.ts              # Message template formatting (per [06-style §Voice rules])
│   │   └── log.ts                # In-memory + persisted log of bubble messages
│   ├── api/
│   │   ├── state-client.ts       # fetch() wrapper for /api/state read/write
│   │   └── dev-middleware.ts     # Vite plugin exposing /api/state in dev
│   └── types/                    # Shared TS types (resource names, building IDs, etc.)
├── hooks/                        # Claude Code PostToolUse hook
│   ├── stoneworld.js             # The hook script (Node, runs on every tool call)
│   ├── tool-yields.json          # Tool-name → resource-delta lookup table
│   └── README.md                 # How to install the hook into ~/.claude/settings.json
├── scripts/                      # Build / dev helper scripts
│   ├── pack-atlases.ts           # Aseprite export → TexturePacker → public/atlases
│   ├── compile-catalog.ts        # Parse 04-buildings.md → public/content/catalog.json
│   └── compile-techtree.ts       # Parse 03-progression.md → public/content/tech-tree.json
├── tests/
│   ├── economy/                  # Vitest unit tests for resource / network / trickle math
│   └── state/                    # Schema migration tests
├── state.json                    # RUNTIME GAME STATE (gitignored — per [01 §Decision #12])
├── package.json
├── tsconfig.json
├── vite.config.ts                # Includes dev-middleware for /api/state
├── vitest.config.ts
├── README.md
├── .gitignore                    # ignores state.json, moodboard/, assets/source/, etc.
└── .planning/                    # in-repo planning artifacts (handoffs, ADRs as needed)
```

---

## Phaser scene tree

Five Phaser scenes — three game scenes + persistent UI + modal overlay.

```
                  ┌──────────────────┐
                  │   BootScene      │  ← minimal loading bar, ~50ms
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │   PreloadScene   │  ← atlases / fonts / catalogs / state.json
                  └────────┬─────────┘
                           ▼
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌──────────────┐                       ┌──────────────────┐
│  CityScene   │ ←────── Tab ──────→   │  ResearchScene   │
│  (default)   │                       │                  │
└──────┬───────┘                       └─────────┬────────┘
       │                                          │
       └──────────────────┬───────────────────────┘
                          ▼
                  ┌──────────────────┐
                  │    UIScene       │  ← persistent across both, top layer
                  │  (HUD overlay)   │
                  └────────┬─────────┘
                           ▼
                  ┌──────────────────┐
                  │   ModalScene     │  ← topmost; pauses input on below scenes
                  │  (build/inspect/ │
                  │   silos/demolish)│
                  └──────────────────┘
```

### Per-scene responsibility

| Scene | Active when | Renders | Listens for |
|---|---|---|---|
| **BootScene** | First 50ms | Loading-bar skeleton in Ryusui colors | (just kicks off PreloadScene) |
| **PreloadScene** | While assets load | Loading-bar + Mecha Senku idle frame | Asset-load events; transitions to CityScene when complete |
| **CityScene** | When viewing city | Terrain tilemap, building sprites, power-line overlays, auto-paths, frontier overlay, idle animations | Click on tiles / buildings, pan/zoom keys, Tab → ResearchScene |
| **ResearchScene** | When viewing tech tree | Tech-tree graph (nodes + prereq arrows), filter buttons | Click on tech nodes, Tab → CityScene |
| **UIScene** | Always (after Preload) | HUD sidebar (resources, networks, action buttons), Mecha Senku speech bubble + portrait | Click on HUD buttons → open modals, click on bubble → dismiss + log |
| **ModalScene** | When any modal open | Modal scrim + frame + content | Click on close/cancel/confirm, Esc → close |

### Scene communication

- Scenes communicate via the **Phaser event bus** (`this.scene.events`) and a **shared application state** singleton (`AppState`) that holds the loaded `state.json` + derived data.
- `AppState` change → emits typed events (`resources:changed`, `buildings:placed`, `network:brownout`, etc.) → all interested scenes subscribe.
- This avoids cross-scene direct references and keeps each scene independently testable.

### Persistent vs ephemeral state

- **Persistent** (`state.json`): resources, buildings, research, milestone, captain's log (last N messages), settings.
- **Ephemeral** (in-memory only): network graph (recomputed from buildings + their positions on every change), placement-mode cursor state, modal stack, tween timers, current Mecha Senku emotion.

---

## State.json — the full schema (v1)

Consolidates the partial schemas from [02-game-logic §State.json shape](./02-game-logic.md) and [05-map §Map state](./05-map.md), plus what [06-style §Captain's Log](./06-style.md) needs.

```ts
// src/state/schema.ts

export type ResourceKey = "knowledge" | "discovery" | "iron" | "innovation" | "completion";

export type MilestoneKey =
  | "stone_world"
  | "kingdom_of_science"
  | "phone_era"
  | "perseus_voyage"
  | "world_tour"
  | "whyman_moon_signal"
  | "moon_mission";

export type OverlayKey = "power" | "knowledge" | "discovery" | "iron" | "innovation" | "completion" | "storage";

export interface BuildingInstance {
  id: string;            // catalog entry key, e.g. "iron_smelter", "wooden_pole"
  tier: 1 | 2 | 3;
  x: number;             // top-left tile coordinate
  y: number;
  spent: Partial<Record<ResourceKey, number>>;  // total resources sunk for 50% refund calc
  placed_at: string;     // ISO 8601 timestamp
}

export interface LogEntry {
  ts: string;            // ISO 8601 timestamp
  operational: string;   // the "Profit. Workshop T1 on the deck..." line
  factoid?: string;      // optional attached factoid (per 06-style)
  trigger: string;       // e.g. "build:workshop:1", "brownout:Main", "research:sulfa_drug"
}

export interface StoneWorldState {
  version: 1;             // schema version — bumped on breaking changes; migrations.ts handles upgrades

  last_session_open_at: string;      // ISO 8601
  last_session_close_at: string;     // ISO 8601

  resources: Record<ResourceKey, number>;

  buildings: BuildingInstance[];

  research: {
    researched: string[];            // tech keys
    in_progress: null;               // reserved — research is instant in v1
  };

  milestone: MilestoneKey;           // current arc

  map: {
    grid: { width: 32; height: 24 };  // fixed in v1
    buildable_area_unlocks: MilestoneKey[];  // which expansion rings have been applied
  };

  captain_log: LogEntry[];          // last 100 entries (FIFO eviction)

  settings: {
    sound_enabled: boolean;          // false in v1 (no sound), reserved for v1.x
    paths_visible: boolean;          // default true
    active_overlay: OverlayKey | null;
    music_volume: number;            // 0-1, reserved for v1.x
  };

  stats: {
    total_active_earned: Record<ResourceKey, number>;
    total_passive_earned: Record<ResourceKey, number>;
    session_count: number;
    total_buildings_placed: number;
    total_demolished: number;
  };
}
```

### What is NOT in state.json (derived at load)

- **Network graph** (which buildings are in which power network) — recomputed from `buildings` positions + catalog coverage radii.
- **Storage caps per resource** — derived from the highest-tier silo of each resource currently placed.
- **Per-building current passive output** — derived from catalog × tier × brownout-state.
- **Auto-path tiles** — recomputed from `buildings` positions.
- **Buildable-area polygon** — derived from `map.buildable_area_unlocks` against a hardcoded expansion table.

### Migration discipline

- `version` field gates loading. If `version > 1`, refuse to load (forward-incompatible). If `version < 1`, run `migrations.ts` upgrade chain (`0→1`, `1→2`, etc.).
- Migrations are **pure functions**: `(oldState) => newState`. Tested per-version in `tests/state/`.
- v1 ships with no migrations (version 1 is the initial release). v1.x adds migrations as schema evolves.

---

## State persistence and the API

### The problem

State.json lives at `~/StoneWrld/state.json` (per [01 §Decision #12](./01-vision.md)). The game runs in a browser tab via Vite dev (`localhost:5100`). **The browser can't directly read filesystem paths.** Also: the Claude Code PostToolUse hook (a Node process) writes the same file. So we need:

1. A way for the **browser game** to read/write `state.json`.
2. A way for the **Node hook** to read/write the same file.
3. **Atomic writes** so neither side ever sees a half-written file.
4. **Last-writer-wins** is acceptable concurrency (per [02 §Concurrency note](./02-game-logic.md)).

### The solution: tiny Vite-middleware API

The Vite dev server runs a **custom middleware** (a Vite plugin) that exposes:

| Method | Path | Behavior |
|---|---|---|
| `GET /api/state` | Read `~/StoneWrld/state.json`, return JSON |
| `POST /api/state` | Receive new JSON body, write atomically (`state.tmp` + rename) |

The browser game calls `fetch('/api/state')` to load and `fetch('/api/state', { method: 'POST', body: JSON.stringify(newState) })` to save. No browser-side filesystem access needed.

### Atomic write pattern (both hook and middleware use this)

```js
import fs from 'node:fs/promises';
import path from 'node:path';

async function atomicWriteState(state) {
  const targetPath = path.join(process.env.HOME, 'StoneWrld', 'state.json');
  const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;

  await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  // fsync to push the write past the kernel page cache before rename
  const fh = await fs.open(tmpPath, 'r+');
  await fh.sync();
  await fh.close();
  // rename is atomic on POSIX filesystems
  await fs.rename(tmpPath, targetPath);
}
```

- `rename` is atomic on POSIX (Linux included). On Windows it's "best-effort" — not a concern for v1 since Illia's on Linux.
- `fsync` before rename guarantees the new content is durable; otherwise a power-loss could leave you with an empty file that "renamed successfully."
- Tmp filename includes PID + timestamp to avoid collision when hook and game write simultaneously.

### Concurrency: last-writer-wins (with mitigation)

The risk window is ~milliseconds (write + rename takes < 5ms). Both writers do **read-modify-write**, so a concurrent write can lose updates. For v1 captain accepts this; mitigations if it surfaces:

- **File-locking via `proper-lockfile`** (npm) — both writers acquire an exclusive lock before read-modify-write. Adds ~10ms per write but eliminates the race.
- **Optimistic concurrency**: include a `revision: N` field in state; writers compare-and-swap.

Captain's call: **ship v1 without locking, monitor for actual collisions** (instrument the captain's log). If you ever see "two writes within 50ms" in the log, add `proper-lockfile`.

### Production (v2 — Electron / Tauri)

In a packaged desktop app:
- Electron: main process reads/writes via Node's `fs`; renderer process IPC's the state read/write to main.
- Tauri: Rust backend exposes `read_state` / `write_state` commands; frontend invokes them.

Either way the API contract from the game's perspective stays the same — only the implementation of `/api/state` (or its equivalent) changes. **The game's `state-client.ts` is the one place to swap.**

---

## The Claude Code PostToolUse hook

The earner side of the architecture: every Claude Code tool call generates a resource delta.

### Hook lifecycle

1. **Claude Code fires PostToolUse** event after every tool call (Edit, Read, Bash, Agent, Skill, etc.).
2. **Hook script runs** as a Node child process; receives event payload via stdin JSON.
3. Hook reads `~/StoneWrld/state.json`.
4. Hook looks up tool name + arguments in `tool-yields.json` to compute resource delta.
5. Hook adds delta to `state.resources` (respecting silo caps).
6. Hook atomically writes new state.
7. Hook exits 0 (always — never block Claude Code on this).

### Tool→resource yield mapping (loaded from `hooks/tool-yields.json`)

```json
{
  "tools": {
    "Edit":          { "innovation": 2 },
    "Write":         { "innovation": 3 },
    "Read":          { "knowledge": 1 },
    "Bash":          { "innovation": 1, "iron": 1 },
    "Agent":         { "discovery": 10 },
    "Agent.gen-negotiator":   { "discovery": 8 },
    "Agent.kohaku-guard":     { "discovery": 8 },
    "Skill":         { "knowledge": 3 },
    "WebFetch":      { "discovery": 2 },
    "WebSearch":     { "discovery": 2 },
    "Grep":          { "knowledge": 1 },
    "Glob":          { "knowledge": 1 }
  },
  "bash_patterns": {
    "^git commit":               { "completion": 20 },
    "^git push":                 { "completion": 10 },
    "^gh pr create":             { "completion": 15 },
    "^(npm test|npm run test)":  { "completion": 5 },
    "^(uv run pytest|pytest)":   { "completion": 5 }
  }
}
```

Exact numbers honor [02-game-logic §Resource yields](./02-game-logic.md) and §Subagent yields (+10 primary / +8 for gen / kohaku) and §Ship-event detection (commit +20, push +10, PR create +15, test-pass +5).

### Why a single shared lookup file?

- Hook + game both read it. Game can show *"This tool yields X"* in tooltips. Single source of truth.
- Editing yields = edit one file. No code change needed for tuning.
- During balancing playtesting, captain can edit `tool-yields.json` and observe behavior change in the next session.

### Hook installation

The hook lives at `~/StoneWrld/hooks/stoneworld.js` (project-local). To activate it globally for all Claude Code sessions:

1. Add a PostToolUse hook entry to `~/.claude/settings.json` pointing at `~/StoneWrld/hooks/stoneworld.js`.
2. The hook **self-guards**: if `~/StoneWrld/state.json` doesn't exist, the hook exits 0 immediately (silently). Player has to bootstrap state.json once before earning starts.

This means the hook fires on **all Claude Code work**, not just StoneWrld-directory work — consistent with [01-vision](./01-vision.md)'s premise ("every Claude Code prompt and tool use earns resources").

Reference for hook shape: `~/.claude/hooks/tsc-noemit.js` (existing global hook in Illia's environment — same pattern: Node script reading stdin JSON, exit 0 always).

### Hook performance budget

- Hook fires on EVERY tool call → must be **< 50ms** per invocation to avoid slowing Claude Code.
- File read + JSON parse + delta apply + atomic write ≈ 5-15ms on SSD. Comfortable.
- Hook does **not** call any external service. No network. No subprocess. Pure file I/O.

---

## Asset pipeline

### Source → atlas flow

```
~/StoneWrld/assets/buildings/stone-world/alchemy-lab.aseprite
                                    │
                                    │  (Aseprite export)
                                    ▼
~/StoneWrld/assets/buildings/stone-world/alchemy-lab/
                                    │  (frame PNGs + spritesheet JSON if animated)
                                    ▼
                  scripts/pack-atlases.ts
                                    │  (uses free-texture-packer or Phaser-Pack)
                                    ▼
~/StoneWrld/public/atlases/buildings.png + buildings.json
                                    │  (loaded by PreloadScene)
                                    ▼
                            Phaser scene
```

### Texture packing

- **TexturePacker** ($65 one-time, has a free CLI version) OR **free-texture-packer** (npm, free, JS-native).
- Captain's pick: **free-texture-packer** to start (avoids tooling cost). Switch to TexturePacker if pack quality becomes an issue.
- Pack format: **PhaserJSONHash** (native Phaser 3 atlas format).
- One atlas per category: buildings, terrain, mecha-senku, hud, overlays.
- Atlas dimensions: power-of-2 (2048×2048 or 4096×4096 — pixel-art atlases stay small).

### Catalog compilation

Building catalog ([04-buildings](./04-buildings.md)) and tech tree ([03-progression](./03-progression.md)) live as Markdown for human authoring + design review. **At build time**, `scripts/compile-catalog.ts` and `scripts/compile-techtree.ts` parse the Markdown → emit `public/content/catalog.json` + `public/content/tech-tree.json` that the game loads.

- Compilation script uses a Markdown parser (`marked` or `remark`) to extract tables + headings into typed JSON.
- Compilation runs as a **pre-build step** (`npm run compile` → executed by `npm run build` before `vite build`).
- Vite plugin: file-watcher reruns compilation on Markdown changes in dev mode.

### Factoid library

Hand-authored in `public/content/factoids.json` (no compile step — direct JSON edit). Schema per [06-style §Factoid storage](./06-style.md).

### Static terrain map

Hand-authored in `public/maps/stoneworld.json` (per [05-map §Static map file](./05-map.md)). Editor: hand-write JSON, OR use **Tiled** (free) for a visual approach — Tiled `.tmx` → JSON export is built-in.

---

## Port allocation (per global port convention)

Per [global CLAUDE.md §Port convention](file:///home/aristarx/.claude/CLAUDE.md): each project reserves a `*100`-`*150` range.

**StoneWrld claims `5100`-`5150`:**

| Port | Use |
|---|---|
| 5100 | Vite dev server (browser game) |
| 5101 | Vite preview (production-build preview) |
| 5102 | Vitest UI (when running interactive tests) |
| 5103-5150 | Reserved for future use (Electron renderer, IPC, etc.) |

Captured in `vite.config.ts` (`server.port: 5100`) and `vitest.config.ts` (`ui.port: 5102`).

---

## Test setup

Per [global CLAUDE.md §Code defaults](file:///home/aristarx/.claude/CLAUDE.md): tests come **after** the feature works. Happy path + 1-2 edge cases.

### What to test in v1

| Area | Test type | What to cover |
|---|---|---|
| `economy/resources.ts` | Vitest unit | Resource accrual respects silo caps, brownout zeros trickle, off-grid demanders return 0 |
| `economy/network.ts` | Vitest unit | Network graph construction (gen + chained poles forms one network; disconnected pole forms its own; demander coverage detection); per-network cap-vs-demand brownout state |
| `economy/trickle.ts` | Vitest unit | Offline accrual capped at 72h, scales linearly with tier, halts at silo cap |
| `economy/upgrades.ts` | Vitest unit | Tier upgrade cost = T1 × 2.5 (T2) / × 6.0 (T3); output scales identically; tier-3 unlock requires the documented prereqs |
| `state/migrations.ts` | Vitest unit | Each migration's input/output snapshot is preserved |
| `city/placement.ts` | Vitest unit | Naval-needs-water validation, rocket-needs-concrete, frontier-rejection, overlap-rejection |
| `mecha-senku/voice.ts` | Vitest unit | Template formatting for each of the 11 canonical templates (per [06-style §Voice rules](./06-style.md)) |
| Hook (`hooks/stoneworld.js`) | Vitest integration | Given mock stdin event for each tool, asserts resource delta + atomic file write |

### What we are NOT testing in v1

- **Phaser scene rendering** — manual click-test via the running game window. Browser-driven testing (Playwright MCP) is a v1.x candidate per [global CLAUDE.md UI tests](file:///home/aristarx/.claude/CLAUDE.md).
- **Multi-process concurrency** between hook + game — captain accepts last-writer-wins risk for v1 per [§Concurrency](#concurrency-last-writer-wins-with-mitigation).

---

## Build / dev scripts (`package.json`)

```json
{
  "scripts": {
    "dev":         "vite",
    "build":       "npm run compile && tsc --noEmit && vite build",
    "preview":     "vite preview --port 5101",
    "compile":     "tsx scripts/compile-catalog.ts && tsx scripts/compile-techtree.ts",
    "pack":        "tsx scripts/pack-atlases.ts",
    "test":        "vitest run",
    "test:ui":     "vitest --ui --port 5102",
    "test:watch":  "vitest",
    "typecheck":   "tsc --noEmit",
    "hook:install": "node hooks/install.js"
  }
}
```

- `npm run dev` → starts Vite on `localhost:5100`, opens the game.
- `npm run build` → compiles catalogs, type-checks, builds the optimized bundle.
- `npm run pack` → re-packs sprite atlases from `assets/` source (run after Aseprite changes).
- `npm run hook:install` → adds the StoneWrld PostToolUse hook to `~/.claude/settings.json` (idempotent — checks if already installed).

---

## Packaging strategy

### v1 — browser tab

- `npm run dev` serves the game at `localhost:5100`.
- Player keeps the tab pinned in a browser; Mecha Senku idles in the corner.
- API middleware exposes filesystem state at `/api/state`.

**Trade-offs**:
- Pro: zero packaging work, fast iteration, easy to share with anyone who can `git clone + npm install`.
- Con: requires `npm run dev` to be running. If the dev server stops, the game stops.

**Captain's mitigation**: a `systemd --user` unit (Linux, Illia's env) that runs `npm run dev` on login. One-time setup, then permanent.

### v2 — Electron or Tauri (optional)

If the dev-server-must-be-running friction becomes annoying:

| Wrapper | Pros | Cons |
|---|---|---|
| **Electron** | Mature, mountains of docs, big community | Heavy (~100MB bundle), slow startup |
| **Tauri** | Tiny (~5MB), fast startup, Rust backend | Newer (less docs), Rust toolchain required |

Captain's lean: **Tauri** when the time comes. Smaller, faster, plays well with Vite, the Rust backend is a clean place for the state-API filesystem code.

**v1 does NOT block on packaging.** Browser-tab is fine for the player who is also the dev.

---

## Bootstrap flow (first-time player)

1. `git clone <repo>` → `cd ~/StoneWrld` → `npm install`
2. `npm run pack` → packs atlases (only after assets exist)
3. `npm run compile` → compiles catalog + tech tree JSON
4. `npm run hook:install` → wires PostToolUse hook into `~/.claude/settings.json`
5. `npm run dev` → starts Vite at `localhost:5100`
6. Game opens, sees no `state.json`, creates a fresh one (zero resources, Stone World milestone, empty buildings, default settings).
7. Mecha Senku idles in his corner; first earning starts on next Claude Code tool call.

Bootstrap is captured as `scripts/bootstrap.ts` to make this a one-command experience (`npm run bootstrap`).

---

## Decisions locked in this doc

| # | Decision | Choice |
|---|---|---|
| 1 | Stack confirmation | **Phaser 3 + TypeScript + Vite + npm + Vitest + Aseprite + Node 20+** |
| 2 | Folder structure | `~/StoneWrld/{design,moodboard,assets,public,src,hooks,scripts,tests}` + runtime `state.json` at root (gitignored) |
| 3 | Scene tree | **5 scenes**: Boot, Preload, City (default), Research, UI (persistent), Modal (topmost) |
| 4 | Scene communication | **Shared `AppState` singleton + typed event bus** (Phaser scene events) — no direct cross-scene refs |
| 5 | State.json schema | **v1 schema** (this doc §State.json) — buildings as instances (no `instances` field), `spent` per building, `captain_log` last-100, `settings` block, `stats` block. **Network graph derived at load, not persisted.** |
| 6 | Migration discipline | `version` gates loading; migrations are pure functions tested per-version; v1 ships with no migrations |
| 7 | Persistence API | **Vite middleware** exposes `GET /api/state` + `POST /api/state` for the browser game; same file accessed directly by the hook |
| 8 | Atomic write pattern | **Write tmp + fsync + rename** (POSIX-atomic on Linux); tmp filename includes PID+timestamp |
| 9 | Concurrency | **Last-writer-wins** for v1; `proper-lockfile` available as v1.x mitigation if collisions surface |
| 10 | PostToolUse hook location | `~/StoneWrld/hooks/stoneworld.js` (project-local); wired into `~/.claude/settings.json` via `npm run hook:install` |
| 11 | Hook self-guard | Hook exits 0 silently if `~/StoneWrld/state.json` missing (player hasn't bootstrapped) |
| 12 | Hook globality | Hook fires on ALL Claude Code sessions (not just StoneWrld-directory work) — consistent with [01-vision](./01-vision.md) earning premise |
| 13 | Tool yields lookup | `~/StoneWrld/hooks/tool-yields.json` — single source of truth for tool→resource mapping; loaded by both hook and game |
| 14 | Asset pipeline | **Aseprite source → free-texture-packer → PhaserJSONHash atlas → `public/atlases/`** |
| 15 | Catalog compilation | **Markdown source → compile-script → JSON** (`public/content/catalog.json`, `tech-tree.json`); pre-build step + dev file-watcher |
| 16 | Factoid library | Hand-authored `public/content/factoids.json`; no compile step |
| 17 | Static terrain map | `public/maps/stoneworld.json` — hand-authored or via Tiled `.tmx` export |
| 18 | Port allocation | **5100-5150**: 5100 dev, 5101 preview, 5102 Vitest UI, 5103-5150 reserved |
| 19 | Test scope (v1) | Vitest unit tests for economy / network / trickle / upgrades / placement / voice + hook integration. **No browser UI tests** (manual click-test); deferred to v1.x via Playwright MCP. |
| 20 | Packaging (v1) | **Browser tab via Vite dev server**, optional `systemd --user` for persistence |
| 21 | Packaging (v2) | **Tauri** preferred over Electron (smaller, faster) when the time comes |
| 22 | Bootstrap | **`npm run bootstrap`** — single command runs install + compile + pack + hook-install + dev |

---

When 08-architecture locks, the **final design doc** is **[09-roadmap.md](./09-roadmap.md)** — phased delivery sequencing: scaffold → state-API → hook → first playable → economy → buildings → balance/polish. After 09 locks, **implementation begins**. We sail.
