# 06 — Style

> STATUS: **LOCKED (2026-05-18)** — co-captain confirmed all 7 forks (iron-grey not bronze, robot Mecha Senku canon, Pixellari+m6x11, sound→v1.x, 5 emotions, bottom-left bubble, English buttons) + added the **factoid-delivery learning mechanic**.

The visual identity guide for StoneWrld. Defines the palette, pixel-art rules, Mecha Senku character design, HUD typography, UI components, animation principles, and Mecha Senku's voice — at the **128 px / tile** source resolution locked in [05-map §Tile dimensions](./05-map.md).

The **spatial** rules (grid, footprints, camera, view switching) are in [05-map](./05-map.md). The **art-asset sourcing plan** (which CC0 packs, which AI tools, license discipline) lives in [07-references.md](./07-references.md). This doc commits to **how it should look and feel**.

---

## Cross-doc anchors

| What | Where |
|---|---|
| Pixel-art aesthetic ("pure retro") | [01-vision §13](./01-vision.md) |
| 128 px/tile, integer zoom | [05-map §Tile dimensions](./05-map.md) |
| Building idle animations (per-building) | [04-buildings](./04-buildings.md) entries |
| Universal event animations (tween-based) | [02-game-logic §Animation philosophy](./02-game-logic.md) |
| Mecha Senku role (mascot/narrator) | [02-game-logic §Mecha Senku](./02-game-logic.md) |
| Resource icons (📚🔭⛓⚡🏁) | [02-game-logic §Resources](./02-game-logic.md) |
| Overlay views | [05-map §Overlay views](./05-map.md) |
| Power coverage halos | [05-map §Power coverage](./05-map.md) |

---

## The aesthetic in one sentence

> **A Ryusui-gold-on-deep-navy Kingdom-of-Science village rendered in pure-retro 128px pixel art, with Mecha Senku narrating every event in captain-grade prose.**

Every visual choice in this doc descends from that statement. If a UI flourish would not be uttered in the Captain's Log, it does not ship.

---

## Master palette

Derived from `~/.claude/themes/ryusui.json` so the in-game palette stays family with the captain's existing terminal theme. The player sees the same gold-on-navy world in the terminal (where work happens) and in the game window (where work pays off).

### Core surfaces

| Role | Hex | Sample | Use |
|---|---|---|---|
| **Sky / Deep navy** | `#0A1228` | ▓ | Game-canvas background, window chrome, modal scrim |
| **Surface navy** | `#1B2D5C` | ▓ | HUD sidebar background, modal panels |
| **Surface navy (raised)** | `#0F1F4D` | ▓ | Speech bubble background, tooltip background |
| **Subtle line** | `#3A4868` | ▓ | Border separators, grid lines (in overlay mode) |

### Accents (the "captain" colors)

| Role | Hex | Use |
|---|---|---|
| **Captain gold** | `#FFC940` | Power lines, gold-resource numbers, button highlight, generator coverage halo |
| **Gold shimmer** | `#FFE680` | Hover state, just-completed glow, milestone-unlock burst |
| **Sea cyan** | `#3DCBE3` | Pole coverage halo, info-state indicators, Mecha Senku eye-glow |
| **Cyan shimmer** | `#7AE2F2` | Active overlay tint, hover-info, traveling power-spark |
| **Cream (text)** | `#F0EBD7` | All on-surface text default |
| **Inverse text** | `#0A1228` | Text on gold backgrounds (e.g., gold buttons) |
| **Inactive** | `#5C6E8E` | Disabled buttons, locked tech nodes, frontier tile overlay |

### State colors

| State | Hex | Use |
|---|---|---|
| **Success / KoS green** | `#7CD16A` | Build complete, research complete, ok-network indicator |
| **Warning orange** | `#F0A030` | Tight network, near-cap storage |
| **Error / brownout red** | `#E84B4B` | Brownout, off-grid demander cue, can't-afford warning |
| **Endgame violet** | `#A47CE0` | Endgame Moon Mission tinting, T3 boss-building accent |
| **Fast-mode orange** | `#FF7B4B` | Reserved — emergency-broadcast Mecha Senku alerts (rarely used) |

### Resource colors

Each resource has a canonical hex; resource counters in HUD render numbers in that color. Icons stay flat-color (no gradients).

| Icon | Resource | Hex | Mnemonic |
|---|---|---|---|
| 📚 | Knowledge | `#FFC940` (gold) | The captain's primary currency |
| 🔭 | Discovery | `#3DCBE3` (cyan) | Sea, exploration |
| ⛓ | Iron | `#A8ADB4` (iron grey — one new hex) | Cool smelted metal |
| ⚡ | Innovation | `#FFE680` (gold shimmer) | Electric spark |
| 🏁 | Completion | `#7CD16A` (KoS green) | Ship-it green, success |

Iron grey (`#A8ADB4`) is the **one new hex** this doc introduces — the Ryusui palette has no neutral metallic tone, and ⛓ Iron needs to read as cold smelted-iron, clearly distinct from the steel-blue and inactive-grey already in the palette. Captured here, will propagate into the icon sprite design.

### Per-category subtle tint (building badges)

Each building category has a 1-tile-wide vertical color stripe on the building's base sprite. Subtle (alpha ~25%) but distinguishable when you scan the city. Helps with overlays without requiring overlay mode.

| Category | Hex | Logic |
|---|---|---|
| Dwellings | `#F0EBD7` (cream) | Domestic, warm |
| Power Generation (incl. Poles) | `#FFC940` (gold) | Energy, captain |
| Materials Processing | `#A8ADB4` (iron grey) | Smelted metal (matches ⛓ resource) |
| Chemistry | `#A47CE0` (violet) | Reagents |
| Construction & Production | `#F0A030` (warm orange) | Workshop fire |
| Mechanics | `#5C6E8E` (steel blue) | Machinery cool |
| Electronics | `#3DCBE3` (cyan) | Spark / signal |
| Communication | `#7AE2F2` (cyan shimmer) | Radio waves |
| Naval | `#1B2D5C` (deep navy) | Sea |
| Medicine | `#7CD16A` (KoS green) | Healing |
| Space | `#A47CE0` (endgame violet) | Cosmic |
| Storage (silos) | `#F0EBD7` (cream) | Domestic too — silos are pantries |

---

## Pixel-art principles (the discipline)

These are the rules every sprite, tile, and UI element follows. Locking them up-front prevents palette drift when art-gen / hand-pixel / sourced-pack assets mix.

### The five rules

1. **One pixel = one pixel.** Source art is authored at 128 px/tile (or sub-multiple). Display is integer-scaled only (0.25× / 0.5× / 1× / 2× per [05-map §Camera](./05-map.md)). **No fractional scaling. No antialiasing. No bilinear filtering.** Phaser config: `pixelArt: true`, `roundPixels: true`.
2. **Constrained palette per sprite.** Each individual building sprite uses **≤ 16 colors**, drawn from the master palette + 2-3 building-specific accents max. Constraint enforces visual coherence across AI-gen + hand-pixel assets. **Enforcement is post-process in Aseprite** ([07-references §AI-gen tooling](./07-references.md)) — AI-gen output rarely conforms natively; every AI-gen sprite is palette-quantized on import before shipping.
3. **2-pixel outline rule.** Every building sprite has a **2-pixel dark outline** in `#0A1228` (deep navy) on its silhouette edge. Reads cleanly at all zoom levels; pops against any terrain. Subtle but unifying. (AI-gen sprites: post-process to enforce this outline.)
4. **Shadow as a 4-pixel pure-black blob.** Drop shadow under every building, 4 px tall, 80% alpha, no soft falloff. Stardew-style ground anchor. Tells the player "this object sits on the ground."
5. **Animation in 2-4 frames, 2-8 fps.** Idle animations don't try to be smooth — they're rhythmic, deliberate, theatrical. 4 frames at 4 fps is the default. Universal-tween events (construction drop, upgrade pulse) per [02 §Universal animations](./02-game-logic.md) are exempt.

### Pixel resolutions confirmed

| Asset type | Source resolution |
|---|---|
| Terrain tile (grass, stone, sand, water, concrete, dirt-path) | 128 × 128 |
| Power Pole sprite (1×1) | 128 × 128 |
| Default building (2×2) | 256 × 256 |
| Tall building (1×3) | 128 × 384 |
| Wide building (3×2) | 384 × 256 |
| Boss building (3×3) | 384 × 384 |
| Mecha Senku sprite | 128 × 192 (1.5 tiles tall) |
| HUD resource icon | 32 × 32 (rendered at 4× = 128 px on HUD) |
| Tooltip frame border | 9-slice from 96 × 96 source |

---

## Terrain art

Per [05-map §Terrain](./05-map.md), terrain is a static hand-authored map with 6 tile types. Each terrain tile is 128 × 128 source pixels with these design rules:

| Terrain | Visual treatment |
|---|---|
| **Grass** | 3-4 shades of green from `#3F6E2E` to `#7CD16A`, scattered grass-blade detail (5-8 px tall pixels), occasional 1×1 pebble. 4 tile variants for visual non-repetition. |
| **Stone** | Cool greys `#3A4868` → `#7A8CA8`, fractured-rock pattern, occasional embedded crystal in `#3DCBE3` (1% of tiles). 4 variants. |
| **Sand** | Warm beige `#D4B888` → `#F0E0B8`, soft-edge tiles, occasional pebble or shell. 3 variants. |
| **Water** | Deep navy `#0A1228` → cyan `#3DCBE3`, 4-frame animation (8fps) of subtle wave drift, foam-edge auto-tile at shore. The one terrain that animates baseline. |
| **Concrete pad** | Industrial grey `#5C6E8E` → `#7A8CA8`, painted yellow `#FFC940` launch-marker striping on the central 2×2 tiles. 1 variant (it's a marked engineering surface, no randomness). |
| **Dirt path** | Warm earth-tone brown `#6E4E2E` → `#9E7448`, 16-tile auto-tile bitmask (corners, T-junctions, crossroads, dead-ends). Path-on-path uses the crossroad sprite. (Terrain tiles use natural earth-tones outside the strict Ryusui UI palette — pixel-art ground doesn't have to honor brand colors.) |

**Auto-tile authoring**: Stone, Grass, and Dirt-Path use the standard 16-tile Wang-2 (or 47-tile Wang-3 for stone) auto-tile masks. We author the master tileset once; the engine picks the right variant per neighbor configuration.

**Frontier overlay**: locked tiles render with a 60% alpha `#5C6E8E` (inactive grey) tint laid on top of whatever base terrain they are. On expansion-unlock, the overlay fades to 0% alpha over ~1s with a per-tile stagger sweep.

---

## Mecha Senku — character design

The mascot. He delivers every game-event message per [02-game-logic §Mecha Senku](./02-game-logic.md). The single most-seen sprite in the game — has to read instantly, has to express, has to feel **canonically Senku** filtered through **Mecha** aesthetics.

### Concept

**The canonical Dr. Stone Mecha-Senku mascot** — the chibi robot-doll Senku built as a self-promo character in the anime (Stone Wars era). Small, stylized, smug, the show's running visual gag turned into a serious in-game narrator. Spiky two-tone green hair (his canonical silhouette). Compact gold-plated robot body, riveted seams. Cyan LED eyes. Cream lab coat hanging over the chassis. Permanent smug grin. Holds a small clipboard or beaker depending on context.

Why gold plating: it keeps Mecha Senku visually in the Ryusui captain-gold family without forcing a new palette color. The bronze tone I originally proposed is dropped — Mecha Senku is **brass-gold**, matching the captain's deck.

### Sprite spec

| Property | Value |
|---|---|
| Source resolution | 128 × 192 (1 tile wide × 1.5 tiles tall) |
| Body palette | Captain gold `#FFC940` (plating) + gold shimmer highlight `#FFE680` + dark navy seams `#0A1228` |
| Hair | Two-tone green: dark `#3F6E2E`, light `#7CD16A` (KoS green) |
| Eyes | Cyan LEDs `#3DCBE3` with `#7AE2F2` glow halo |
| Lab coat | Cream `#F0EBD7` with `#5C6E8E` shadow folds |
| Outline | 2-pixel `#0A1228` (per global rule) |
| Animation FPS | 6 fps (one notch above building idle for liveliness) |

### Emotion set (sprite frames per emotion)

Each emotion is a 4-frame loop. Total: **5 emotions × 4 frames = 20 frames** of art. Plus a one-shot reaction-frame set for special events (~6 frames).

| Emotion | When triggered | Visual cue |
|---|---|---|
| **idle** (smug-blink) | Default | Blink every ~3s, faint chest LED pulse, slight head bob |
| **excited** | Build complete, research complete, resource gain | Arms raise slightly, eyes brighten, chest LED double-pulse |
| **proud** | Milestone reached | Adjusts lab coat, holds clipboard up, head tilts back |
| **worried** | Brownout, storage full, off-grid demander placed | Frowns, hand to chin, chest LED dims to dark red `#7A2828` |
| **captain** | Perseus unlock, Moon Mission unlock | Salutes (Ryusui crossover), gold spark halo, chest LED bright cyan |

**Reaction one-shots** (single-fire, non-looping, ~6 frames each):
- `eureka` — research-tree-node-just-clicked: small lightbulb above head, +flash
- `clipboard-write` — placement confirmed: writes on clipboard, ✓ tick
- `salute` — endgame Moon-launch trigger: full Ryusui salute, gold burst

### Where he appears

- **Speech bubble** (bottom-left of game canvas): static sprite + current emotion + text bubble (see [§Speech bubble system](#speech-bubble-system)).
- **HUD inline** (top of HUD sidebar): smaller version (64×96) for ambient presence — always visible even when no message is firing.
- **Modal callouts**: appears in upper-left of build / silo modals delivering category-specific flavor.

---

## Typography (pixel fonts)

**Two fonts, both genuine pixel fonts (not anti-aliased web fonts displayed at small sizes).**

| Use | Font | Source | Size |
|---|---|---|---|
| Headings / button labels / HUD numbers | **Pixellari** | OFL, public — github.com/zedseven/Pixellari | 16 px (renders at integer multiples) |
| Body text / Mecha Senku speech / tooltips | **m6x11** or **Press Start 2P** | OFL — Daniel Linssen / codeman38 | 11 px or 8 px |

Both fonts are bitmap fonts loaded as Phaser BitmapText assets — pixel-perfect at any integer zoom, no font rendering overhead.

**Rules**:
- All text in cream `#F0EBD7` on dark surfaces, deep navy `#0A1228` on gold surfaces.
- Numbers in resource counters render in the resource's canonical color (📚 gold, ⛓ bronze, etc.).
- No italics (pixel fonts don't italicize well). For emphasis, use **gold text** `#FFC940`.
- No mixed-case-styling tricks (no SmallCaps fakery). What you type is what renders.

---

## HUD components

The HUD lives in the 256 px sidebar from [05-map §HUD layout](./05-map.md). Components, top-to-bottom:

### 1. Resources panel (top, ~280 px tall)

```
┌──────────────────┐
│  ☜ Mecha Senku   │  ← 64×96 inline portrait, idle emotion
│  ───────────────  │
│  📚  1,284       │  ← gold numerals
│  🔭    412       │  ← cyan numerals
│  ⛓  2,103        │  ← bronze numerals
│  ⚡  1,502        │  ← gold-shimmer numerals
│  🏁     87       │  ← green numerals
│                  │
│  Silo: 📚 1284/  │
│        5000 ▓▓░░ │  ← tier-1 Library fill-bar
└──────────────────┘
```

Resource row format: icon + space + right-aligned 5-digit number. Silo fill bar below each resource shows current / cap when within 10% of cap, otherwise hidden.

### 2. Power network panel (mid, ~120 px tall)

```
┌──────────────────┐
│ ⚡ Networks      │
│ ─────────────── │
│ Main:  18 / 12  │  ← green text (ok)
│ East:   8 /  4  │  ← green text (ok)
│ ░░ Off-grid: 2  │  ← red text (count of demanders out of coverage)
└──────────────────┘
```

One line per network. State color (green/amber/red) matches network state. Off-grid count is always shown at bottom (red if > 0).

### 3. Action buttons (lower, ~200 px tall)

Five gold-bordered buttons:
- `[ Build ]` — opens Build modal (per [05-map §Build UX](./05-map.md))
- `[ Research ]` — switches to ResearchScene (per [05-map §View switching](./05-map.md))
- `[ Silos ]` — opens silo-upgrade modal
- `[ Overlays ▾ ]` — opens overlay-toggle panel
- `[ Captain's Log ▾ ]` — opens scrollback of recent Mecha Senku messages

Button styling: 4-pixel gold border `#FFC940`, deep navy fill `#0A1228`, cream label, 8-pixel gold-shimmer glow on hover. Click: brief inset-press animation (~80ms), then action.

### 4. Mecha Senku speech bubble (overlay, bottom-left of canvas)

Not in the HUD sidebar — overlays the bottom-left of the **game canvas** so messages don't fight with the HUD numbers for attention.

```
        ┌─────────────────────────────────────────┐
        │ ☜ "Profit. T2 Workshop redrawn —        │
        │     production up 150%."                │
        │                                  — Mecha │
        └──╲ ─────────────────────────────────────┘
           ╲
       ┌────────┐
       │ Mecha  │  ← 128 × 192 sprite, current emotion
       │ Senku  │
       └────────┘
```

- Bubble background: raised navy `#0F1F4D` with 2-pixel gold border.
- Text: cream body, gold for emphasis-words, resource icons inline.
- Bubble persistence: **6 seconds for operational-only**, **10 seconds when a factoid is attached** (per [§Factoid delivery](#factoid-delivery--mecha-senku-as-in-game-teacher)), then fades over 1s. New message replaces immediately (no queue — the latest message wins, the displaced one moves to Captain's Log).
- Click-to-dismiss: click anywhere on the bubble. Dismissed messages move to the Captain's Log scrollback.
- Captain's Log button in HUD opens the full scrollback of all messages (operational + factoid).

---

## Modal / panel system

Build modal, silo modal, research-node-detail modal, demolish-confirm modal — all share one visual chassis.

### Modal chassis

```
┌─────────────────────────────────────────────────┐
│ ☜  TITLE                                  [×]  │  ← gold title bar, inverse text
│ ─────────────────────────────────────────────── │
│                                                 │
│  Body content here.                             │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐               │
│  │  Cancel     │  │  Confirm    │               │
│  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────┘
```

- Background scrim: deep navy `#0A1228` at 60% alpha covering the rest of the canvas.
- Modal frame: surface navy `#1B2D5C` with 4-pixel gold border, gold title bar with inverse-text title.
- Mecha Senku appears small in title bar (32×48) delivering context-flavor.
- `[×]` close button top-right; `Esc` also dismisses.
- Two-button footer for action modals (Cancel left, Confirm right); single Close button for info modals.

### Build modal — specifics

Per [05-map §Build UX](./05-map.md). Categorized list of unlocked buildings. Each row:

```
[ icon ] Building Name           cost: 300⛓ + 200⚡    [ Build ]
         T1 · Power +5 / Cov 3                          [grey if can't afford]
```

- Click row → close modal, enter placement mode.
- Power Pole subsection visually distinct (cyan accent border) since they're infrastructure not direct production.

### Building inspect modal — specifics

Shown on click of an existing building.

```
┌─ Workshop T2 ────────────────────[×]─┐
│ ☜  "150% production. Bad steel       │
│     forges; we re-anvilled it."      │
│                                      │
│ Passive: +25⚡ / hr                    │
│ Power demand: 4                      │
│ Network: Main (ok)                   │
│ Total spent: 350⛓ + 280⚡              │
│                                      │
│ ┌─ Upgrade T3 ─┐  ┌─ Demolish ────┐ │
│ │ 600⛓ + 480⚡  │  │ Refund: 175⛓   │ │
│ │              │  │       + 140⚡   │ │
│ └──────────────┘  └────────────────┘ │
└──────────────────────────────────────┘
```

---

## Speech bubble system (Mecha Senku's voice)

Mecha Senku has a **voice**, not just a text output. Defining it here so writers (captain + co-captain) stay consistent.

### Voice rules

1. **Two-channel blend**: Ryusui captain energy (from `~/.claude/CLAUDE.md`) layered with Senku's "10 billion percent" verbal tics. Senku does the science; Ryusui frames it as a deal.
2. **Short messages.** 1-2 sentences for the operational line. The bubble disappears in 6 seconds (10s when a factoid is attached — see below).
3. **Always name the prize.** Resource gains say *what* and *how much*. Brownouts say *which network* and *cap / demand*. Builds say *which building* and *its new effect*.
4. **Anchor with one canon tag.** Use `Hoshii!`, `10 billion percent`, `Profit`, `Storm on the grid`, `All hands`, `Anchors aweigh`, `Treasure secured`, `Bad trade` — vary across messages so they don't fatigue.
5. **Surface failures plainly first.** Brownouts and off-grid placements get the bad news in the first half, the path-forward in the second. *"Storm on the Main grid — demand 18, capacity 12. Build a Steam Plant or strike a workshop."*
6. **No begging-for-engagement.** No "Don't forget to check back!" No "Your buildings miss you!" The captain doesn't beg.
7. **Teach on every meaningful build.** Co-captain's call: Mecha Senku **delivers a real historical or scientific factoid** on every building placement, every upgrade, every research-tech unlock — turning the game into ambient learning. See [§Factoid delivery](#factoid-delivery--mecha-senku-as-in-game-teacher) below.

---

## Factoid delivery — Mecha Senku as in-game teacher

Beyond the operational message ("Profit. Workshop T1 on the deck — +10⚡ / hr."), Mecha Senku **also delivers a fact** about the building, the material it processes, or the science behind it. Every build / upgrade / research-unlock event carries a factoid. This is non-negotiable game-feel — it's what turns StoneWrld from a clicker into a Dr. Stone-flavored knowledge-builder.

### Why this exists

Dr. Stone *is* a learning show — Senku constantly explains the chemistry, history, and engineering behind every primitive-tech rediscovery. The game-as-companion-to-the-show concept demands the same. Factoids let StoneWrld:

- Reward attention — players who pause to read learn something real.
- Tie game progress to actual scientific / historical lineage (Sulfa Drug → Tsukasa-arc payoff, but ALSO "the real Gerhard Domagk won the 1939 Nobel for sulfonamides" type framing).
- Justify the building order (the player learns *why* iron comes before steel, *why* charcoal precedes glass).

### Bubble format with factoid

```
┌──────────────────────────────────────────────────┐
│ ☜ "Profit. Iron Smelter T1 on the deck —          │
│     +8⛓ / hr."                                     │
│                                                   │
│ ▌ ☞ Iron smelting first appeared in human         │
│ ▌    history around 1200 BCE in Anatolia,         │
│ ▌    kickstarting the Iron Age. The Hittites      │
│ ▌    guarded the secret for centuries.            │
└──────────────────────────────────────────────────┘
```

- The **operational message** stays in the standard cream text style.
- The **factoid block** below is visually distinct:
  - 2-pixel `#FFC940` (captain gold) vertical bar on the left margin (`▌`)
  - `☞` index-finger glyph prefix
  - Slightly indented from the operational message
  - Cream text body, but **all proper nouns rendered in `#FFC940` gold** (people, places, dates, named compounds) so they pop as the eye scans
- Bubble persistence extends to **10 seconds** when a factoid is attached (vs 6s for operational-only). The factoid is the reward — give the player time to read it.
- Click-to-dismiss still works; click moves the bubble straight into the Captain's Log.

### Factoid content scope

Every entry in the following needs ≥1 factoid (1-3 each; engine picks one at random per trigger):

| Source | Count | Example trigger | Example factoid |
|---|---|---|---|
| Building catalog ([04-buildings](./04-buildings.md)) — every building × every tier | ~195 building-tier entries | Iron Smelter T1 built | "Iron smelting first appeared around 1200 BCE in Anatolia, kickstarting the Iron Age." |
| Research catalog ([03-progression](./03-progression.md)) — every tech node | ~85 tech entries | "Sulfa Drug" researched | "Gerhard Domagk won the 1939 Nobel for discovering sulfonamides — Senku's manga arc is built on this real-world chemistry breakthrough." |
| Resource gains (one fact per resource, occasional rotation) | 5 resources × ~5 facts each = ~25 | Big 📚 gain after a long session | "📚 Knowledge in Dr. Stone is the captain's coin — Senku's village ran on the principle that anyone who learned could lead." |
| Material rediscoveries (atomic facts about the materials themselves) | ~15 materials × 2-3 facts = ~30 | Triggered on first interaction with a new material | "Sulfuric acid is one of the most-produced industrial chemicals on Earth — used in fertilizers, refining, batteries, and Senku's depetrification reagent." |

**Total content authoring target: ~330 factoid strings.** Substantial but tractable — captured as a content authoring task in the [§Downstream content authoring](#downstream-content-authoring) section.

### Voice rules for factoids specifically

1. **Real, factual content** — no fabrication. If we don't have a real fact, the factoid slot is left empty (the bubble falls back to operational-only that trigger).
2. **1-3 sentences max.** A factoid is a captain's-pocket-book entry, not a textbook chapter.
3. **Tone is Senku's, not Ryusui's.** *"10 billion percent — Marie Curie's discovery of polonium and radium isolated two new elements without a single computer."* Senku is the scientist — he gets to be a touch nerdier than the operational voice.
4. **Anchor to the building's lore where possible.** If the factoid can tie back to a Dr. Stone arc, the captain takes the deal (sulfonamide → Tsukasa, depetrification → Senku's quest, etc.).
5. **No politics, no living-person controversy.** Stick to settled historical / scientific record.

### Factoid storage (content contract — not blocking design lock)

Factoids live in `~/StoneWrld/content/factoids.json` (created at implementation time). Schema preview:

```json
{
  "buildings": {
    "iron_smelter_t1": [
      "Iron smelting first appeared around 1200 BCE in Anatolia, kickstarting the Iron Age. The Hittites guarded the secret for centuries.",
      "Charcoal-fueled bloomeries — the precursor to modern blast furnaces — could only produce wrought iron, not steel."
    ],
    "iron_smelter_t2": [...]
  },
  "research": {
    "sulfa_drug": [
      "Gerhard Domagk won the 1939 Nobel for discovering sulfonamides — Senku's manga arc is built on this real-world chemistry breakthrough."
    ]
  },
  "resources": {
    "knowledge": [...],
    "iron": [...]
  },
  "materials": {
    "sulfuric_acid": [...]
  }
}
```

The catalog files ([04-buildings](./04-buildings.md), [03-progression](./03-progression.md)) do **not** require schema changes — the factoid lookup is by entry-key. Authoring the actual factoid content is a Phase-1 implementation task, captured below.

### Canonical message templates

| Trigger | Template | Example | Factoid? |
|---|---|---|---|
| Session-open deposit | "Plunder from the last watch: +A📚, +B🔭, +C⛓, +D⚡, +E🏁." | "Plunder from the last watch: +47📚, +12🔭, +89⛓, +63⚡, +2🏁." | — |
| Build complete | "Profit. {Building} T{tier} on the deck — {effect}." | "Profit. Workshop T1 on the deck — +10⚡ / hr." | **Yes** (building factoid) |
| Upgrade complete | "{Building} T{tier} redrawn — production +{pct}%." | "Workshop T2 redrawn — production +150%." | **Yes** (building factoid, tier-specific if available) |
| Demolish | "{Building} struck. Refund: {resources}." | "Workshop T2 struck. Refund: 175⛓ + 140⚡." | — |
| Research unlocked | "10 billion percent — {tech} unlocked. {Building / next-step} on the table." | "10 billion percent — Sulfa Synthesis unlocked. Alchemy Lab T1 on the table." | **Yes** (research factoid) |
| Brownout | "Storm on the {network} grid — capacity {cap}, demand {dem}. {Fix-hint}." | "Storm on the Main grid — capacity 12, demand 18. Build power or strike a workshop." | — |
| Off-grid placed | "{Building} is off the grid — no pole in reach. 0% trickle until wired." | "Iron Smelter is off the grid — no pole in reach. 0% trickle until wired." | — |
| Storage near-cap | "Storage tight — {silo} at {pct}%. {Upgrade-hint}." | "Storage tight — Library at 92%. Upgrade or this Knowledge spills off the deck." | — |
| Storage at cap | "Silo full — {silo} capped at {cap}. Overflow lost." | "Silo full — Library capped at 5000. Overflow lost." | — |
| Milestone reached | "Anchors aweigh — {milestone} achieved. {Reward}." | "Anchors aweigh — Kingdom of Science achieved. Land cleared." | **Yes** (one-shot milestone factoid — Dr. Stone arc summary) |
| Big resource gain (post-session deposit + threshold-crossings) | "Hoshii — {resource} crossed {threshold}." | "Hoshii — Knowledge crossed 5,000." | **Yes** (occasional, resource factoid) |
| Endgame moon launch | (Reserved — one-shot, scripted prose) | "Hoshii. The Perseus reached the moon. Captain's log closes here." | **Yes** (endgame factoid — real moon-landing chemistry/engineering callout) |

---

## Animation principles

### Per-building idle (the canonical 95%)

- 2-4 sprite frames at 2-4 fps (default: 4 frames at 4 fps).
- OR Phaser tween animations on the static sprite (rotation, alpha, position) — whichever is cheaper per building.
- See [04-buildings](./04-buildings.md) for per-building specs.

### Universal events (tween-based, shared library)

| Event | Animation | Duration |
|---|---|---|
| Construction (new build) | Sprite drops in from above with elastic-bounce ease + dust puff at landing | 400 ms |
| Upgrade reveal | Scale-pulse 1 → 1.3 → 1 + brief gold flash + sprite swap to next-tier | 300 ms |
| Demolish | Scale-shrink 1 → 0 with smoke puff overlay + Mecha Senku worried emotion | 300 ms |
| Brownout | All in-coverage buildings shake (x-jitter ±2 px) every ~2s + desaturate to 70%, all halos red-tint | continuous until resolved |
| Power-on (brownout resolved) | Brief warm gold tint pulse, return to normal idle | 400 ms |
| Milestone unlock | Frontier-tile sweep fade-in (per-tile stagger, ~30ms each) + Mecha Senku proud emotion + gold-shimmer ring expanding from city center | 1.2s |
| Resource gain | (NO floating numbers) — Mecha Senku excited emotion + HUD counter ticks with green flash | 300 ms |
| Off-grid placement | Building placed greyed-out with red dot above; Mecha Senku worried emotion | (continuous until in coverage) |

### What we do NOT do

- **No floating "+47📚" numbers** drifting up over the city (locked in [02 §Animation philosophy](./02-game-logic.md)).
- **No generic alpha pulse** for idle.
- **No screen shake** on construction (only brownout).
- **No particles for the sake of particles** — every animation must convey state.
- **No casino-juice** (no slot-machine flashes, no coin-drop sounds on gains). The captain doesn't run a casino.

---

## Sound (defer most of this to v1.x)

v1 ships with **no sound** by default. Not because sound is unwanted — because:
- Sound design takes a separate skill set and ~2 weeks of polish work.
- Sound chooses the room. The player has YouTube / lo-fi / music on already.
- v1.x can add it cleanly later without breaking the visual design.

**Minimum v1 sound** (one-shot effects only, deferred until visual is locked):
- 1× build-complete chime (~200ms)
- 1× upgrade chime (slightly higher pitch)
- 1× brownout warning (low alarm tone, one-shot)
- 1× milestone fanfare

All optional, with a sound-on / sound-off toggle in HUD. **Captured here only as a placeholder** — full sound spec is its own v1.x doc, not in 06.

---

## What we are NOT doing

Locked-in exclusions so we don't have to re-decide later:

- **No isometric.** Orthogonal top-down, per [05-map §Topology](./05-map.md).
- **No 3D-look pixel-art** (faux-3D / parallax / Zelda-Link's-Awakening voxel style). Pure flat top-down.
- **No anti-aliasing anywhere.** Sharp pixels at all integer zooms.
- **No web fonts at small sizes** (would render blurry). Bitmap pixel fonts only.
- **No CRT-scanline filter** as a default. Optional v1.x toggle, captured in 06.x.
- **No day/night cycle.** Time of day is always... bright pixel-art noon. v1.x candidate.
- **No weather** (rain, snow, etc.). v1.x candidate.
- **No floating numbers, no casino-juice** (above).
- **No alpha-pulse generic idle** (above).
- **No skeuomorphic UI** (no faux-leather modal frames, no wood-textured buttons). Flat pixel-art UI.

---

## Decisions locked in this doc

| # | Decision | Choice |
|---|---|---|
| 1 | Aesthetic statement | **Ryusui-gold-on-deep-navy Kingdom-of-Science village in pure-retro 128px pixel art** |
| 2 | Master palette | **Derived from `~/.claude/themes/ryusui.json`** (shared with the captain's terminal theme) |
| 3 | New palette hex (this doc) | **`#A8ADB4` (iron grey)** for ⛓ Iron resource and Materials Processing category badge — one new hex only |
| 4 | Per-resource color | 📚 gold / 🔭 cyan / ⛓ iron grey / ⚡ gold-shimmer / 🏁 KoS green |
| 5 | Per-category badge | 12 subtle 1-tile color stripes (cream / gold / iron-grey / violet / orange / steel-blue / cyan / cyan-shimmer / navy / green / endgame-violet / cream) |
| 6 | Pixel-art discipline | **5 rules**: integer zoom only, ≤16 colors per sprite, 2px navy outline, 4px black shadow blob, 2-4 frame idle at 2-8 fps |
| 7 | Terrain palette | 6 tile types × 1-4 variants each, all 128×128, auto-tile bitmask for Stone / Grass / Dirt-Path. Terrain uses natural earth-tones outside the strict Ryusui UI palette. |
| 8 | Mecha Senku design | **Canonical Dr. Stone anime Mecha-Senku mascot** — chibi robot-doll, gold plating (`#FFC940`) + green hair + cyan LED eyes + cream lab coat, 128×192 sprite |
| 9 | Mecha Senku emotions | **5 looping emotions** (idle / excited / proud / worried / captain) × 4 frames + 3 one-shot reactions (eureka / clipboard-write / salute) |
| 10 | Typography | **Pixellari** (headings, 16px) + **m6x11** (body, 11px) — bitmap fonts only |
| 11 | HUD layout | 256-px sidebar, top-to-bottom: Resources panel, Power Networks panel, Action buttons, Captain's Log accessor. Speech bubble overlays game canvas. |
| 12 | Modal chassis | Shared 4-px gold-bordered surface-navy frame with Mecha Senku title-bar inset |
| 13 | Speech bubble | Persistent **6s** (operational-only) / **10s** (with factoid) + 1s fade, latest-wins (no queue), click to dismiss, full scrollback in Captain's Log |
| 14 | Voice rules | Two-channel Ryusui + Senku blend, 1-2 sentences, name the prize, anchor with one canon tag, surface failures plainly first, no begging, **teach on every meaningful build** |
| 15 | **Factoid delivery** (new) | **Real historical / scientific factoids** on every build / upgrade / research-unlock / milestone / occasional big resource gain. Authoring target: **~330 factoid strings** in `~/StoneWrld/content/factoids.json` |
| 16 | Animation universal events | 8 templates (construction / upgrade / demolish / brownout / power-on / milestone / resource-gain / off-grid) |
| 17 | Sound | **v1 ships silent** with optional 4 one-shot chimes deferred to v1.x |
| 18 | Action button labels | **English plain** — `[Build]` / `[Research]` / `[Silos]` / `[Overlays]` / `[Captain's Log]` |
| 19 | Speech bubble location | **Bottom-left of game canvas**, Mecha Senku sprite anchoring it (comic-strip convention) |
| 20 | Hard exclusions | No isometric, no 3D-look, no antialiasing, no web fonts, no CRT filter (default), no day/night, no weather, no floating numbers, no alpha-pulse idle, no skeuomorphism |

---

## Downstream content authoring (Phase-1 implementation tasks)

This doc locks the design but creates two concrete content-authoring queues that need execution during implementation (not blocking design lock):

1. **Factoid library** — `~/StoneWrld/content/factoids.json`. **~330 strings** across building catalog (×3 tiers), research catalog, resource milestones, and material rediscoveries. Sourcing: Wikipedia + curated Dr. Stone wiki + history-of-science references. Tone-checked per [§Factoid delivery §Voice rules](#voice-rules-for-factoids-specifically). Captain's recommended split: arcs 1-4 fully authored for v1 ship, arcs 5-7 stubbed with `TODO v1.x`.

2. **Mecha Senku sprite sheet** — 5 emotions × 4 frames + 3 one-shot reactions = **~26 sprite frames at 128 × 192**. Source plan: hand-pixel (he's the focal character) or AI-gen + heavy hand-touch retouch. Specifics in [07-references.md](./07-references.md).

3. **Pixel font assets** — Pixellari (.ttf or .fnt bitmap export) + m6x11 (.ttf or .fnt bitmap export). Both OFL-licensed, drop into `~/StoneWrld/public/fonts/`. Loaded as Phaser BitmapText.

4. **HUD chassis sprites** — modal frame 9-slice, button up/hover/down states, speech bubble 9-slice, gold-border 4-pixel chassis pattern. Hand-pixel — small surface area, ~12 chassis sprites total.

---

## Downstream docs requiring re-open after this lock

This iteration is mostly additive — no breaking changes to earlier docs — but two light notes propagate downstream:

- **[04-buildings](./04-buildings.md)** — no schema change. Factoid lookup is by entry-key (e.g. `iron_smelter_t1`). Existing catalog stays as-is.
- **[03-progression](./03-progression.md)** — same; lookup by tech-key.
- **[07-references.md](./07-references.md)** — when drafted next, will absorb the factoid-sourcing reference list, Mecha Senku visual references (canon Dr. Stone Mecha-Senku screenshots), pixel-font sources, and CC0 / AI-gen tool catalogues. No reopen needed since 07 hasn't been drafted yet.

---

When 06-style locks, the next prize is **07-references.md** — the mood-board doc. Curated links to Dr. Stone canon art (including the Mecha-Senku mascot reference shots), pixel-art game references (Stardew, Mini Metro, SimCity 2000, Townscaper), CC0 pixel-pack catalogues (OpenGameArt / itch / OpenPixelProject), AI-gen tooling (Retro Diffusion / SD pixel-art LoRA workflow), license discipline notes, and factoid-source references. Shorter doc — mostly link curation.
