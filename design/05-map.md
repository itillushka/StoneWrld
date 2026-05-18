# 05 — Map

> STATUS: **LOCKED (2026-05-18)** — co-captain confirmed all 7 redirects + 2 follow-up forks (pole research prereqs, pole category placement); downstream patches to 02 / 03 / 04 applied in the same session.

The city map: how the grid is sized, how buildings sit on it, how the camera frames it, how the player expands buildable area over the game's lifetime, how power coverage networks render, and how the player switches between the **city map** and the **research map** (the latter is structurally defined in [03-progression §Research UI](./03-progression.md); this doc covers navigation and the map-view contract).

The aesthetic specifics (palette, exact pixel-art treatment, art direction) live in [06-style.md](./06-style.md). This doc commits to **the spatial model** the art will hang off — coordinate system, grid resolution in tiles, footprints, sprite pixel resolution, layering rules — at a level the engine can implement.

---

## Cross-doc anchors

| What | Where |
|---|---|
| Building footprints (per-building) | [04-buildings §Footprint reference](./04-buildings.md) |
| Power capacity / demand / coverage networks | [02-game-logic §Power model](./02-game-logic.md) |
| Storage / silo caps | [02-game-logic §Storage](./02-game-logic.md) |
| Milestone unlocks (Stone World → Moon Mission) | [03-progression §Milestones](./03-progression.md) |
| Research tree structure | [03-progression §Research UI](./03-progression.md) |
| state.json schema (preview) | [02-game-logic §State.json shape](./02-game-logic.md) |

---

## The grid model

### Topology — orthogonal, single playfield

The city sits on a **single 2D orthogonal tile grid**. No isometric projection, no chunked open world, no procedural terrain. One rectangular field, top-down view, axis-aligned sprites. This is the simplest readable layout for a pixel-art civ game and matches the Dr. Stone village-on-a-clearing visual (the original village in season 1 is a tight cluster around a central plaza, not an isometric grand strategy map).

**Why orthogonal, not isometric**:
- Isometric pixel art requires 4× the sprite work (rotation variants) — multiplies the AI-gen workload from ~15 signature buildings to ~60 sprite variants.
- Orthogonal reads cleanly with 1×1, 2×2, 3×3 footprints from [04-buildings](./04-buildings.md) without diamond-grid quantization weirdness.
- Top-down village is the Stardew / Mini-Metro / SimCity-2000-overhead aesthetic Illia already nodded at in earlier discussion.

**Why single playfield, not zones / chunks**:
- ~64 buildings total + power poles. Even at the largest footprint mix the total occupied area is ~300 tiles. Plus walkway / breathing room (~3×), that's ~900 tiles. A 32×24 grid (768 tiles) is enough for the whole game once expansion completes. No need for districts as separate scenes.
- Single playfield = single Phaser scene for the city, simpler camera, simpler save schema, simpler everything.

### Grid resolution — 32 columns × 24 rows (768 tiles)

```
 col  0         8         16        24        31
row ┌──────────────────────────────────────────────┐
  0 │ (locked frontier)                            │
  4 │           ╔══ Stone World district ══╗       │
  8 │           ║   Settler Hut · Hearth   ║       │
 12 │           ║   Stone Mine · Workshop  ║       │
 16 │           ║   Alchemy Lab · Herbalist║       │
 20 │           ╚══════════════════════════╝       │
 23 │ (locked frontier)                            │
    └──────────────────────────────────────────────┘
```

- **32 × 24 = 768 tiles** total. Aspect ratio 4:3 — comfortable in a windowed Phaser canvas, leaves room for the HUD on the side.
- Starting buildable area is **8 × 8 = 64 tiles** (centered, the Stone World plaza). Frontier tiles render as desaturated stone — visibly locked.
- Expansion unlocks more frontier per milestone (see [§Expansion](#expansion-district-unlock-per-milestone) below).
- At endgame the buildable area covers the full 32 × 24 grid. Some tiles will still be empty by design.

### Tile dimensions in source pixels — 128×128

Each tile renders at **128 × 128 source pixels** in art assets.

- A 1×1 building sprite is **128×128**.
- A 2×2 building sprite is **256×256** (the canonical "default" — co-captain wants this level of detail per building).
- A 3×3 boss building sprite is **384×384** (e.g., Steel Foundry, Perseus Dock, Nuclear Reactor).

**Why 128 px/tile (not the more common 32 px)**:
- Co-captain's explicit call — building sprites should feel detailed enough to read as Dr. Stone canon, not as abstract pixel icons. 256×256 per default building gives enough room for visible machinery, chimneys, lattice work, character figures.
- AI-gen tooling (Retro Diffusion, SD pixel-art LoRA) generates 256×256 natively — perfect fit for the 2×2 default.
- 3×3 boss buildings at 384×384 are still feasible to generate (SD will do 512×512 then crop).
- CC0 pack impact: most CC0 pixel packs ship at 16-32 px/tile. We will need to either source higher-res packs, upscale 32→128 with a pixel-perfect upscaler (xBRZ / hqx), or hand-pixel the basic huts. **Tracked for [07-references.md](./07-references.md) and [08-architecture.md](./08-architecture.md).**

The on-screen tile size depends on camera zoom — see [§Camera](#camera-pan--zoom-integer-only) below.

---

## Coordinate system and footprint placement

### Coordinates

- Tile origin `(0, 0)` is **top-left** of the grid (Phaser default, matches screen coords).
- `+x` is right; `+y` is down.
- A building's `(x, y)` in `state.json` is the **top-left tile** of its footprint.
- A building of footprint `(w, h)` occupies the tiles `(x, y)` through `(x+w-1, y+h-1)`.

This matches the schema preview in [02-game-logic §State.json shape](./02-game-logic.md) (`{ id, tier, instances, x, y }`) — no schema change needed.

### Footprints (canonical list, supersedes preview in 04-buildings)

| Footprint | Tiles | Source-pixel size | Used for (see [04-buildings](./04-buildings.md) for specifics) |
|---|---|---|---|
| 1×1 | 1 | 128×128 | Power Poles, small workshops, hearths, lamps, herbalists |
| 1×2 | 2 (vertical) | 128×256 | Lumber camp, narrow workshops |
| 2×1 | 2 (horizontal) | 256×128 | Radio hut (with antenna mast via overdraw) |
| 1×3 | 3 (tall) | 128×384 | Wind turbine, wireless tower |
| 2×2 | 4 | **256×256** | **Default** — most processing, production, medicine, communication |
| 3×2 | 6 | 384×256 | Hydroelectric Dam, Coal Plant, Shipyard |
| 3×3 | 9 | 384×384 | Boss / flagship buildings (Steel Foundry, Perseus Dock, Nuclear Reactor, Steel Refinery, Oil Refinery, Deep-space Radio, Rocket Launch Pad) |

Total footprint area when all ~64 buildings are placed: **~250 tiles** (~32% of the 768-tile grid). Plus power poles (1×1 each, scattered through the city), another ~20-30 tiles. Plenty of breathing room.

### Placement rules (v1)

- **No overlap.** A building cannot be placed if any of its footprint tiles is occupied or locked.
- **All tiles must be in the unlocked buildable area** at placement time. You can't place over the frontier.
- **Terrain placement requirements** (locked this iteration):
  - **Naval buildings** (Shipyard, Sailboat Dock, Steamship Dock, Perseus Dock) — at least one footprint tile must be within **2 Manhattan tiles of a water tile**.
  - **Rocket Launch Pad** — must be placed with its full footprint **entirely on concrete pad tiles** (the southern launch zone unlocked at the Moon Mission milestone).
  - All other buildings ignore terrain.
- **No adjacency requirements for non-terrain-gated buildings** in v1.
- **Demolish allowed** — see [§Build / placement UX](#build--placement-ux-interaction-flow). Refund **50% of resources spent so far** on that building (including all upgrade costs paid). No cooldown.
- **Power poles and roads are separate building families** — see [§Power coverage](#power-coverage-networks-poles-and-chain-visualization) and [§Auto-paths](#auto-paths-decorative-procedural).

### Overdraw (sprites exceeding footprint)

Some buildings have visual elements (chimneys, antenna masts, sail rigging) that **extend above their footprint** but don't claim the tiles above. Implementation:

- The sprite anchor is the **bottom-left of the footprint**.
- The sprite image height may exceed `footprint_height × tile_size`.
- The tiles **above** the footprint are **not blocked** for other placements but **draw priority** of other buildings respects render-order Y (lower-Y buildings draw on top of overdraw from buildings further back).
- Concretely: place a Radio Hut (2×1) — its antenna draws 2 tiles above the footprint, but you can still place another 1×1 building directly above it; the new building's sprite will overlap visually if it has overdraw too.

This is standard pixel-art town-game behavior (Stardew, Tiny Town). Captain's note: overdraw makes the city look denser than it is, which is the goal.

---

## Camera (pan + zoom, integer only)

Source art is 128 px/tile, so the full grid at 1× display = 32 × 128 = 4096 logical pixels wide. That doesn't fit a normal screen. The camera is a **viewport**, not a fit-to-window scaler.

### Game window

- Default window canvas: **1280 × 800 logical pixels** (1024 px game viewport + 256 px HUD sidebar).
- Window is resizable; canvas scales by integer factor to physical pixels (Phaser scale mode `Phaser.Scale.FIT` with `pixelArt: true` and nearest-neighbor filtering).
- DPI-scale: rendered at logical pixels, browser/OS handles HiDPI upscale (still nearest-neighbor — no blur).

### Zoom levels (all clean integer ratios for nearest-neighbor sharpness)

| Zoom | Display px / tile | Tiles visible in 1024×800 viewport | Use case |
|---|---|---|---|
| **0.25×** | 32 | ~32 × 25 | Whole-city overview (full grid in view) |
| **0.5×** | 64 | ~16 × 12 | **Default** — neighborhood-level view, ~half the early city visible |
| **1×** | 128 | ~8 × 6 | Detailed inspection — see every sprite-pixel of detail |
| **2×** | 256 | ~4 × 3 | Extreme close-up — for admiring boss buildings |

- Cycle zoom with `+` / `-` keys or scroll wheel.
- Default view on game-open: **0.5× centered on Stone World plaza**.
- Pan with arrow keys / WASD / middle-mouse-drag.
- Camera bounds: cannot pan beyond the full 32×24 grid + ~2 tiles of margin.

### Why these specific zoom steps

- 0.25× / 0.5× / 1× / 2× are all clean power-of-2 ratios from the 128px source. Nearest-neighbor sampling stays pixel-perfect at every step. No blur, no shimmer.
- Skipping 1.5× / 3× / etc. avoids the fractional-zoom shimmer that ruins pixel art.

### HUD layout (preview — full spec in 06-style.md)

```
┌────────────────────────────────────────┬─────────────┐
│                                        │  HUD        │
│        ╔══════════════════╗            │  ──         │
│        ║                  ║            │  📚 1,284   │
│        ║   CITY GRID      ║            │  🔭 412     │
│        ║   (viewport)     ║            │  ⛓ 2,103    │
│        ║                  ║            │  ⚡ 1,502    │
│        ║                  ║            │  🏁 87      │
│        ╚══════════════════╝            │             │
│                                        │  ⚡ Network │
│  ┌─ Mecha Senku ────────────┐          │  Main:18/12 │
│  │ "Profit. T2 Workshop     │          │             │
│  │  redrawn — production    │          │  [Build]    │
│  │  +150%." 🤖              │          │  [Research] │
│  └──────────────────────────┘          │  [Silos]    │
│                                        │  [Overlays] │
└────────────────────────────────────────┴─────────────┘
```

- Left: city canvas viewport (1024 × 800).
- Right: HUD column (256 px wide): resources, per-network power status, action buttons, Mecha Senku speech bubble overlays the bottom-left of the canvas (not the HUD).
- **Overlays** is a button (not a hotkey — see [§Overlay views](#overlay-views-toggleable-via-hud)) that opens a small panel listing the available overlay layers.

Final HUD spec — fonts, exact button styling, color tokens — is in [06-style.md](./06-style.md).

---

## Expansion (district unlock per milestone)

The buildable area grows with milestone progression. Visible reward beyond just "a new tech node lit up."

| Milestone | Buildable area after completion | New tiles unlocked | Visual cue |
|---|---|---|---|
| (start) Stone World | 8×8 = 64 tiles, centered | n/a | starting plaza |
| 1. Stone World boss (Alchemy Lab + Sulfa Synthesis) | 12×12 = 144 tiles | +80 (ring outward) | Frontier tiles brighten one-time, Mecha Senku: *"Land cleared — Kingdom of Science district open."* |
| 2. Kingdom of Science (Steel Foundry + Iron Casting) | 16×16 = 256 tiles | +112 | another ring |
| 3. Phone Era (Telephone Exchange + Telephony) | 20×16 = 320 tiles (rectangle starts) | +64 | rectangle expands width |
| 4. Perseus Voyage (Perseus Dock + Hull Engineering) | 24×20 = 480 tiles | +160 | dock area unlocks the eastern "coastline" — water + sand tiles already exist in the static map but are inside the frontier until now |
| 5. World Tour (Depetrification Lab + Nital Reagent) | 28×20 = 560 tiles | +80 | |
| 6. Whyman / Moon Signal (Deep-space Radio + Long-range Comms) | 30×22 = 660 tiles | +100 | |
| 7. Moon Mission (Rocket Launch Pad + Lunar Trajectory) | 32×24 = 768 tiles | +108 | full map unlocked; the southern launch-pad concrete tiles become reachable |

**Mechanic**: unlocked tiles are marked `unlocked: true` at runtime. Frontier tiles render with a desaturated stone overlay. On unlock, a one-time fade-in animation plays (frontier overlay alpha 1 → 0 over ~1s, per-tile staggered for a sweep effect — Mini Metro vibe).

**Why ring outward, then rectangle?** Early-game the village is round (Senku's plaza). Mid-game it stretches east to the coast (Perseus, the docks). Late-game it covers the whole map. This is Dr. Stone's actual narrative geography.

---

## Terrain — static, hand-authored, single canonical map

**One map. Hand-authored. Same every game-open. No procedural generation, no seed.**

Co-captain's call: the city always sits on the same canonical terrain. Players who run the game on different machines, on different days, see the same shoreline, the same stone outcrop, the same river bend. The map becomes a recognizable landmark over the months of play.

### Terrain palette (6 types)

| Terrain | Where on the map | Gameplay effect (v1) |
|---|---|---|
| **Grass** | ~60% of tiles, the default | None |
| **Dirt path** | (auto-drawn between buildings, not part of base terrain) | None |
| **Stone** | ~15% of tiles, clustered around the starting Stone World plaza and a stone outcrop in the north | None (visual: Senku-village energy) |
| **Sand** | A 4-tile-wide strip along the eastern edge | None |
| **Water** | A river running along the eastern edge (north-to-south), 2-3 tiles wide, with a small bay near the Perseus dock area | **Naval buildings require ≥1 footprint tile within 2 Manhattan tiles of water** |
| **Concrete pad** | A 6×6 area in the southern part of the map | **Rocket Launch Pad must be placed entirely on concrete pad tiles** |

### Static map file

The canonical map is stored as a fixed asset in the game bundle: `public/maps/stoneworld.json` (or as a Tiled `.tmx` if we adopt the Tiled editor — decision deferred to [08-architecture.md](./08-architecture.md)). The file ships with the game and is not modified at runtime.

Example shape (JSON):

```json
{
  "version": 1,
  "width": 32,
  "height": 24,
  "tiles": [
    // row 0:
    ["grass", "grass", "stone", "grass", ...],
    // row 1:
    ["grass", "stone", "stone", "grass", ...],
    // ... 24 rows
  ]
}
```

The map is rendered as a tilemap layer at game-load. Frontier overlay (locked tiles) is drawn on top.

### Map layout sketch (canonical)

```
col:     0    4    8   12   16   20   24   28  31
row  0  ████ ████ ████ ████ ████ ████ ████ ████   ← stone (north outcrop)
     2  ████ ████ ▒▒▒▒ ▒▒▒▒ ▒▒▒▒ ▒▒▒▒ ████ ████
     4  ▒▒▒▒ ▒▒▒▒ ▒▒▒▒ ░░░░ ░░░░ ▒▒▒▒ ▒▒▒▒ ░░░░   ← grass + small stone
     6  ▒▒▒▒ ▒▒▒▒ ░░░░ ░░░░ ░░░░ ░░░░ ▒▒▒▒ ░░░░     plaza area (rows 8-15)
     8  ▒▒▒▒ ░░░░ ░░░░ ╔══plaza══╗ ░░░░ ▒▒▒▒ ░░░░
    10  ▒▒▒▒ ░░░░ ░░░░ ║░░ ████░░║ ░░░░ ░░░░ ████
    12  ▒▒▒▒ ░░░░ ░░░░ ║░░░░░░░░░║ ░░░░ ░░░░ ████
    14  ▒▒▒▒ ░░░░ ░░░░ ╚═════════╝ ░░░░ ░░░░ ████
    16  ░░░░ ░░░░ ░░░░ ░░░░ ░░░░ ░░░░ ░░░░ ░░░░ ▓▓▓▓  ← sand + water (east)
    18  ░░░░ ░░░░ ░░░░ ░░░░ ░░░░ ░░░░ ░░░░ ▓▓▓▓ ████  ← water (eastern river)
    20  ░░░░ ░░░░ ░░░░ ░░░░ ████ ████ ░░░░ ▓▓▓▓ ████  ← concrete pad south
    22  ░░░░ ░░░░ ░░░░ ░░░░ ████ ████ ░░░░ ▓▓▓▓ ████
    23  ░░░░ ░░░░ ░░░░ ░░░░ ░░░░ ░░░░ ░░░░ ▓▓▓▓ ████

Legend: ░░░░=grass  ████=stone  ▒▒▒▒=stone+grass mix  ▓▓▓▓=water  ████(south)=concrete pad
```

This is a sketch — the canonical `.json` will be authored cleanly (probably in Tiled) before implementation. Captured here for the spatial vibe: stone outcrop north, plaza centered, river east, launch pad south.

---

## Auto-paths (decorative, procedural)

Dirt paths auto-draw between buildings — pure decoration, no gameplay. Algorithm:

1. For every pair of buildings within 8 tiles of each other, draw a 1-tile-wide path along the Manhattan path between their centers.
2. Where paths overlap or cross, render the auto-tile (crossroad sprite).
3. Paths render **under** buildings, **over** base terrain.

Paths are a runtime decoration computed from current building placement — they update when a building is placed, upgraded (no path change), or demolished.

Implementation note: single procedural pass on placement / load / demolish event. No per-frame work. Auto-tile sprite uses a 16-tile dirt-path bitmask from a CC0 LPC tileset (will need 128px-scale version — see [07-references.md](./07-references.md)).

**Optional toggle**: HUD overlay "Hide paths" — for players who want raw grid view. Stored in user config, not `state.json`.

---

## Power coverage networks, poles, and chain visualization

This section replaces v1's "global power" model with the chained-coverage model now locked in [02-game-logic §Power model](./02-game-logic.md).

### What the player does

1. Build a generator (e.g., Windmill T1). Its **coverage radius** is 3 tiles Manhattan around its footprint. Demanders inside this radius are powered.
2. To extend coverage, build a **Power Pole** (1×1 footprint, cheap). A pole connects to the network only if its center tile is within an already-connected pole's or generator's coverage area.
3. Each connected pole adds its radius to the network's coverage area.
4. Demanders outside any network's coverage trickle at 0% (UI cue: *"Off the grid"*).
5. Within a network, total demand vs total capacity drives the ok / tight / brownout state per [02 §Three states per network](./02-game-logic.md).

### Power Pole tiers

(Full catalog entries to be added to [04-buildings §Power Generation](./04-buildings.md) when that doc is reopened.)

| Tier | Name | Cost | Coverage radius | Research prereq |
|------|------|------|-----------------|------------------|
| T1 | Wooden Pole | 15⛓+5⚡ | 4 tiles | wood_frame_construction |
| T2 | Iron Pole | 38⛓+13⚡ | 6 tiles | steel_production |
| T3 | Steel Pole | 90⛓+30⚡ | 8 tiles | steel_refinery |

### Visualization

- **Generator coverage halo**: a soft pulsing gold (#FFC940 — Ryusui accent) tint on the tiles within the generator's coverage area. Always visible. Low-alpha (~20%) so it doesn't drown the city, but you always see *what's powered by what*.
- **Pole coverage halo**: same, slightly cooler tint (cyan-ish) to distinguish poles from gens at a glance.
- **Network chain lines**: thin yellow lines drawn between connected pole/gen centers, traveling-spark animation (single 2×2-pixel sprite at random tween position, ~1 per 5 seconds per line). Cheap.
- **Brownout per network**: all coverage halos in that network turn dim red + slow pulse, chain-lines red. Mecha Senku names the network.
- **Off-grid demanders**: subtle red dot above the building, only visible when the player hovers the building or has the Power overlay active.

### Network identity

If multiple disjoint networks exist, each gets a name auto-assigned by direction from city center (Main, North, East, South, West, etc.) so the brownout banner can name the network. Implementation: simple cluster-detection on the network graph at load and after each pole/gen placement.

---

## Overlay views (toggleable via HUD)

Player clicks the HUD `[Overlays]` button to open a small panel of toggleable layers. **No keyboard hotkeys** — co-captain's call: keep input simple, click-only.

| Overlay | What it shows |
|---|---|
| **Default** (no overlay) | Normal map view — buildings, paths, terrain |
| **Power** | Coverage halos at higher opacity (~50%), chain lines at 2× thickness, brownout networks in red, off-grid demanders flagged |
| **Resource — Knowledge / Discovery / Iron / Innovation / Completion** (5 options) | Buildings producing the selected resource glow gold; others fade to 30% opacity |
| **Storage** | Silo buildings highlighted with fill-bar above sprite; non-silo buildings fade to 30% |
| **Hide paths** | Toggles auto-path visibility (orthogonal to other overlays — both can be active) |

Overlays are render-layer effects on top of the existing scene. Toggling is instant. Multiple overlays can stack (e.g., Power + Hide-paths), with sensible visual priority.

---

## View switching (city ↔ research map)

The **research tree** has its own dedicated map view, per [03-progression §Research UI](./03-progression.md). The two views share the same Phaser game but live in **separate scenes**.

| View | Scene | Entry | Exit |
|---|---|---|---|
| **City Map** | `CityScene` (this doc) | Default scene on game open | Press `Tab` or HUD button `[Research]` → switch to ResearchScene |
| **Research Map** | `ResearchScene` (spec in [03](./03-progression.md)) | From CityScene via Tab/HUD | Press `Tab` or HUD button `[City]` → switch back to CityScene |

- Tab toggles between the two — Mini Metro / Civ-VI tech-tree convention.
- HUD persists across both scenes (same resource counters, same Mecha Senku speech bubble).
- Camera state per scene is preserved (zoom back to where you left it).
- Transition is a quick fade (~200ms), not a hard cut — feels less jarring.

Silo upgrades open as a **modal** over CityScene (per [02 §Storage](./02-game-logic.md)). Build menu opens as a **modal** too. Modals don't switch scenes.

---

## Build / placement / demolish UX (interaction flow)

### Build

1. Click `[Build]` button in HUD → modal opens.
2. Modal lists all **unlocked** buildings (per [03-progression](./03-progression.md) research state) grouped by category, with cost / power / production columns. Power Poles appear in their own subsection of the Power Generation category.
3. Click a building → modal closes, cursor enters **placement mode**.
4. In placement mode:
   - Mouse hover shows the building's footprint sprite at the cursor, with footprint tiles tinted **green** (placement valid) or **red** (placement invalid — overlap, frontier, insufficient resources, or terrain requirement unmet).
   - Tooltip explains the invalidity reason (*"Tile occupied"* / *"Outside buildable area"* / *"Naval building needs water within 2 tiles"* / *"Not enough Iron"*).
   - Click on a valid tile → resources deducted, building added to `state.json`, construction-drop tween plays (per [02 §Universal animations](./02-game-logic.md)), Mecha Senku delivers placement message.
   - Right-click or `Esc` → cancel, return to inspect mode.
5. After placement, cursor stays in placement mode for one more placement (rapid-build flow), then auto-exits. `Shift+Click` to lock placement mode for chain-building (especially useful for poles).

### Inspect

- Default mode when not building.
- Hover over a building → tooltip: name, tier, current passive production, power cap/demand, network name (if powered) or *"Off the grid"*.
- Click → opens **Building modal**:
  - Upgrade button (with cost, prereq status)
  - **Demolish button** — confirmation prompt (*"Demolish T2 Workshop? Refund: 175⛓ + 140⚡ (50% of 350⛓ + 280⚡ spent)."*), executes on confirm
  - Mecha Senku flavor text for the building

### Demolish

- Player can demolish any building (including poles, silos, gens).
- Refund: **50% of total resources spent on the building** (T1 cost + all upgrade costs paid so far). Rounded down per resource.
- **No cooldown** — co-captain accepted demolish as a simple refund mechanic without anti-spam friction.
- Demolishing a generator or pole instantly re-evaluates the network graph — demanders may go off-grid, brownouts may resolve or trigger.
- Auto-paths re-compute on demolish.
- The demolished tile becomes empty grass / stone / whatever the terrain underneath was.

---

## Map state in state.json

This doc adds these fields to `state.json` (full schema lives in [08-architecture.md](./08-architecture.md), this is the preview the map needs):

```json
{
  "map": {
    "grid": { "width": 32, "height": 24 },
    "buildable_area_unlocks": ["stone_world", "kingdom_of_science"]
  },
  "buildings": [
    { "id": "settler_hut", "tier": 1, "x": 14, "y": 10, "spent": { "iron": 30, "innovation": 15 } },
    { "id": "wooden_pole", "tier": 1, "x": 16, "y": 12, "spent": { "iron": 15, "innovation": 5 } }
  ]
}
```

- `grid` is fixed for v1 (32×24). Stored anyway so v1.x can expand the grid without breaking saves.
- `buildable_area_unlocks` tracks which milestone-expansion rings have been applied — derived at load into the current frontier polygon. Mostly informational, also prevents re-triggering the fade-in animation.
- **`map_seed` is removed** — terrain is the canonical static map from `public/maps/stoneworld.json`. No random state needed.
- Per-building `spent` object tracks total resources spent on that instance (T1 + all upgrades) so demolish refund can compute 50% accurately. Added to the existing building schema.
- Per-building network membership is **derived at load** from positions + coverage radii — not persisted. The network graph is recomputed whenever a gen/pole/demander changes.

Schema is additive — existing fields from [02 §State.json shape](./02-game-logic.md) gain `spent` per building. The `instances` field from the earlier preview is dropped (each building entry represents a single placed instance with its own `x, y`).

---

## Performance budget (revised for 128px tiles)

Sanity check: can Phaser render this on a developer laptop?

- **Sprites at full city + endgame**: ~768 terrain tiles + ~64 building sprites + ~30 power-pole sprites + ~80 auto-path tiles + ~40 power-line chain objects + 1 Mecha Senku + HUD ≈ **~1000 sprites total**.
- Phaser 3 (Pixi backend) handles 5000+ sprites at 60fps trivially.
- Texture memory: ~64 buildings × avg 256×256 RGBA = ~16 MB textures. Plus poles, terrain tiles, Mecha Senku frames. Estimate **~30-50 MB texture VRAM** total. Well within budget for any modern GPU. Texture atlases can compress further if needed.
- Idle animations on ~30 building sprites simultaneously, each at 2-4 fps, 2-4 frames = ~120 sprite-frame swaps per second. Negligible.
- Pan / zoom: integer-zoom only → no fractional-pixel rendering, no scale interpolation cost.
- Power-line spark tweens: ~30 simultaneous, each is a 2×2-pixel sprite on a path tween. Cheap.
- Network graph re-computation on placement / demolish: O(N²) on building count where N ≤ ~100. Sub-millisecond. Computed only on state-change, not per-frame.

No perf concerns at v1 scale. Captured for [08-architecture.md](./08-architecture.md) to confirm during scaffolding.

---

## Decisions locked in this doc

| # | Decision | Choice |
|---|---|---|
| 1 | Grid topology | **Orthogonal top-down**, single playfield |
| 2 | Grid resolution | **32 × 24 = 768 tiles**, 4:3 aspect |
| 3 | Tile pixel size (source art) | **128 × 128 source pixels** per tile → 2×2 building = 256×256, 3×3 = 384×384 |
| 4 | Coordinate system | Origin top-left, +x right / +y down; building `(x, y)` = top-left of footprint |
| 5 | Footprint list | 1×1, 1×2, 2×1, 1×3, 2×2, 3×2, 3×3 (matches [04-buildings](./04-buildings.md)) |
| 6 | Sprite overdraw | Allowed above footprint; tiles above remain unblocked; render-order by Y |
| 7 | Camera | Pan + integer zoom **0.25× / 0.5× / 1× / 2×**; default 0.5× centered on Stone World plaza |
| 8 | Game window | **1280 × 800** default canvas (1024 viewport + 256 HUD), resizable, integer-scale to physical pixels |
| 9 | Starting buildable area | **8 × 8 = 64 tiles** centered (Stone World plaza) |
| 10 | Expansion mechanic | **Per-milestone ring → rectangle unlock**, 7 expansions total, fade-in animation per unlock |
| 11 | Terrain | **Static, hand-authored, single canonical map** stored in `public/maps/stoneworld.json` — no procedural / no seed |
| 12 | Terrain effects (v1) | **Naval** requires ≤2 tiles from water; **Rocket Launch Pad** requires entirely on concrete pad; all other terrain is decorative |
| 13 | Auto-paths | Procedural dirt paths between buildings within 8 tiles; toggleable via Overlays panel |
| 14 | Power coverage model | **Chained networks** (per [02-game-logic §Power model](./02-game-logic.md)): generators emit radius-3, Power Poles extend via chain (radius 4/6/8 by tier), demanders need to be in coverage |
| 15 | Power Pole family | **3 tiers** (Wooden / Iron / Steel), 1×1 footprint, added to Power Generation category (catalog entries deferred to [04-buildings reopen](./04-buildings.md)) |
| 16 | Overlay UX | **HUD-panel toggle only**, no keyboard hotkeys — overlays stack |
| 17 | View switching | **Tab toggle** between CityScene and ResearchScene; HUD persists; camera state preserved per scene |
| 18 | Placement rules | No overlap, must be in buildable area, terrain gates for naval + rocket, no other adjacency requirements |
| 19 | Demolish | **Allowed**, **50% refund** of total resources spent on the instance (incl. upgrades), **no cooldown** |
| 20 | Build UX | Modal → placement mode → green/red tile preview → click to place; stays in placement mode for one more (`Shift+Click` to lock) |
| 21 | Map state schema | Add `map.grid`, `map.buildable_area_unlocks`, per-building `spent`; drop `map_seed`; drop `instances` (each entry = one placed instance) |
| 22 | Network state | **Derived at load**, not persisted — recomputed on every gen/pole/demander change |

---

## Downstream docs patched in this same session

This iteration introduced concepts that rippled back into earlier locked docs. All three were patched before 05-map locked:

- **[02-game-logic §Power model](./02-game-logic.md)** — coverage networks, per-network capacity/demand, pole family preview table added. Decisions table extended with rows 1b (power model) and 1c (Power Pole family).
- **[03-progression](./03-progression.md)** — added **Wooden Pole** (M2), **Iron Pole** (M3), **Steel Pole** (M4) research nodes under Branch 2 (Power Generation). Branch node count bumped 11 → 14; total tech count 82 → 85.
- **[04-buildings §2 Power Generation](./04-buildings.md)** — added **Wooden Pole**, **Iron Pole**, **Steel Pole** catalog entries with cost / radius / idle animation / sprite source. Category count 10 → 13. v1 polish status arcs 2-4 updated. Decisions table extended with rows 9 (state-schema convention) and 10 (pole family).

All four docs (02, 03, 04, 05) are consistent.

---

When 05-map locks (after the three downstream patches above), the next prize is **06-style.md** — pixel-art palette, Mecha Senku character design, sprite-art direction at 128px-per-tile resolution, HUD font, UI tone-of-voice.
