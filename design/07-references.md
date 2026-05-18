# 07 — References

> STATUS: **LOCKED (2026-05-18)** — co-captain confirmed sprite-source inversion + pack categorization + AI-gen tooling. Downstream patches to 04 and 06 applied in the same session.

The mood-board + asset-sourcing reference doc. Curated links to Dr. Stone canon art, pixel-art game references, AI-gen tooling, CC0 pack catalogues, pixel fonts, and factoid sources. Plus the **sprite source strategy** that descends from the locked decisions in [05-map](./05-map.md) (128 px/tile) and [06-style](./06-style.md) (palette, Mecha Senku design).

This doc is mostly **curation** — link lists, source workflows, license notes. The artistic-direction calls live in [06-style.md](./06-style.md); this doc points at the references those calls draw from.

---

## Cross-doc anchors

| What | Where |
|---|---|
| 128 px/tile source resolution, orthogonal projection | [05-map §Tile dimensions](./05-map.md) |
| Master palette + per-resource colors + Mecha Senku design | [06-style §Master palette / §Mecha Senku](./06-style.md) |
| Per-building sprite source (per-building column) | [04-buildings](./04-buildings.md) — **needs reopen** to reflect AI-gen-primary inversion (see [§Downstream reopens](#downstream-doc-reopens-needed)) |
| Factoid delivery mechanic + content authoring queue | [06-style §Factoid delivery](./06-style.md) |
| Pixel-art discipline (≤16 colors / 2px outline / no AA) | [06-style §Pixel-art principles](./06-style.md) |

---

## Sprite source strategy — AI-gen primary (the inversion)

Earlier docs ([01-vision §11](./01-vision.md), [04-buildings §Sprite source plan](./04-buildings.md)) framed the asset strategy as **"CC0 packs primary + AI-gen for signature buildings."** Co-captain's review of the five candidate packs (below) surfaced a hard reality:

- Almost the entire CC0 / paid pixel-art ecosystem for top-down industrial sits at **32-64 px / tile**.
- Our locked spec is **128 px / tile** (2×2 building = 256×256 source, per [05-map §3](./05-map.md)).
- Upscaling 32→128 (4×) breaks pure-retro pixel rules ([06-style §6](./06-style.md)).
- Co-captain's call: **keep the 128px spec; generate the assets ourselves if needed.**

**Revised strategy** (this doc's lock, supersedes earlier docs' source assumptions):

| Asset class | Primary source | Estimate | Notes |
|---|---|---|---|
| **Dr. Stone signature buildings** (~15 buildings — Alchemy Lab, Telephone Exchange, Sulfa Factory, Perseus Dock, Depetrification Lab, Deep-space Radio, Nuclear Reactor, Rocket Launch Pad, Steel Refinery, Oil Refinery, Fuel Refinery, IC Factory, Aluminum Refinery, Silicon Foundry, Composite Workshop) | **AI-gen (Retro Diffusion or SD + pixel-art LoRA)** at 256×256 / 384×384 native | ~15 | Hand-touch in Aseprite for outline conformance + palette enforcement |
| **Generic civ buildings** (~50 buildings — huts, mines, mills, smelters, kilns, workshops, silos, generic factories, power poles, dwellings) | **AI-gen** at 128×128 / 256×256 native | ~50 | Same workflow — generate + Aseprite enforce. Co-captain's call: he's willing to generate all sprites himself if needed. CC0 packs become fallback/accent only. |
| **Mecha Senku character** (5 emotions × 4 frames + 3 one-shot reactions) | **Hand-pixel + AI-gen hybrid** at 128×192 | 26 frames | Captain leans hand-pixel for the focal character — frame-to-frame consistency is hard for AI to keep at this resolution. Reference his canonical anime mascot design ([§Dr. Stone canon](#dr-stone-canon-visual-references)). |
| **HUD chassis sprites** (modal frame 9-slice, button up/hover/down, speech bubble 9-slice, gold-border patterns) | **Hand-pixel** | ~12 | Small surface area, needs pixel-perfect alignment — not a fit for AI-gen. |
| **Terrain tiles** (grass × 4 variants, stone × 4 variants, sand × 3, water × 4 frames, concrete pad, dirt-path × 16-tile bitmask) | **AI-gen base + hand-pixel auto-tile bitmask** | ~32 tiles | AI generates the base material textures at 128×128; the auto-tile bitmask variants are derived by hand-cutting + edge work in Aseprite. |
| **Power line / spark animation** (2×2-pixel spark sprite + line drawing) | **Hand-pixel** | ~4 frames | Trivial pixel work — faster to hand-pixel than AI-gen. |
| **Universal-event animation overlays** (construction dust puff, upgrade flash, demolish smoke puff, brownout shake-tint, milestone gold-ring) | **Hand-pixel + Phaser tweens** | ~8 effects | Programmatic tweens carry most of the load — actual pixel art is minimal (smoke puff, gold ring). |

**Total AI-gen budget**: ~65 building sprites + ~32 terrain tiles = ~97 AI-gen assets at 128-384px source resolution. Tractable for one person working steadily.

**Hand-pixel budget**: ~26 Mecha Senku frames + ~12 HUD chassis sprites + ~16 auto-tile path variants + ~4 spark frames + ~8 universal-event sprites ≈ **~66 hand-pixel sprites.** Substantial but bounded — captain-co-captain can split if needed.

---

## Mood-board references — the five vibe-packs

These are the references co-captain sent on 2026-05-18 to anchor the aesthetic. **Treat as visual mood-board only — none are spec-compatible source assets** (resolution + projection mismatches; see [§Sprite source strategy](#sprite-source-strategy--ai-gen-primary-the-inversion) above).

### 1. Industrial Revolution Factory District — Top-Down Pixel Art Tileset
- **URL**: https://comshadow.itch.io/industrial-revolution-factory-district-topdown-pixel-art-tileset
- **Creator**: Cute SCKR
- **License**: Personal + commercial allowed in game projects; no resell as standalone resources; attribution appreciated
- **Price**: $3.99 USD (or in $29.99 bundle of 132 assets)
- **Projection**: Top-down (✅ matches our orthogonal)
- **Resolution**: Unspecified (likely 32-48 px, RPG Maker MV/MZ compatible)
- **Aesthetic**: 19th-century steampunk industrial — brick factories, rusted machinery, steam equipment, coal storage, railway paths, worn industrial flooring
- **Captain's-eye fit**: **STRONGEST vibe match for Phone Era (M3) + Perseus Voyage (M4)** buildings. The "grimy steampunk factory district" reads as exactly the Sulfa Factory / Steel Foundry / Telephone Exchange aesthetic we want. Reference for AI-gen prompt seeding.
- **Use**: Visual prompt seed for AI-gen of Phone-Era buildings. **Do not bundle sprites directly** (resolution mismatch).

### 2. Modern Industrial Factory Pixel Art Tileset Pack
- **URL**: https://comshadow.itch.io/modern-industrial-factory-pixel-art-tileset-pack
- **Creator**: Cute SCKR
- **License**: Personal + commercial allowed; no resell; attribution appreciated
- **Price**: $3.99 USD (or in $29.99 bundle)
- **Projection**: Top-down (✅)
- **Resolution**: Unspecified (likely 32-48 px)
- **Aesthetic**: Gritty / realistic / dystopian-industrial — rusted metal walls, conveyor belts, robotic arms, control panels, industrial pipes, ventilation fans, safety equipment
- **Notes**: Tagged "AI Assisted" graphics — useful precedent that the entire pack is itself AI-assisted output, which is what we'll do at higher resolution
- **Captain's-eye fit**: **World Tour (M5) + Whyman / Moon Signal (M6)** aesthetic — Oil Refinery, Petrol Generator, IC Factory, Aluminum Refinery. Reference for AI-gen prompt seeding.
- **Use**: Visual prompt seed.

### 3. 100 Industrial & Futuristic Machines (Rust & Steel)
- **URL**: https://ninjagame-dev.itch.io/rust-steel-machinery-pack-100x-pixel-assets
- **Creator**: NinjaGame_Dev
- **License**: Royalty-free for commercial projects; no resell of modifications; credit appreciated but not required
- **Price**: $5.00 USD or more
- **Projection**: Top-down (✅)
- **Resolution**: **64×64 source** (smaller than our 128 spec)
- **Aesthetic**: Industrial + sci-fi pixel art — terminals, reactors, generators, cooling units, lab devices, signal modules, hazard systems, data blocks. Static sprites only (no animation).
- **Captain's-eye fit**: **Moon Mission (M7)** aesthetic — Nuclear Reactor, CPU Foundry, Computer Workshop, Wireless Tower. Also useful as **inside-building detail layer** (machine props inside larger AI-gen building sprites).
- **Use**: Visual prompt seed + possible detail-overlay layer at 2× upscale (would need careful integration to avoid the upscale-chunkiness trap).

### 4. Factory Asset v.2 Teaser
- **URL**: https://blood-seller.itch.io/factory-asset-v2-teaser
- **Creator**: Blood_seller
- **License**: CC0 (Creative Commons Zero) — use however you like, just don't resell the pack itself
- **Price**: Free / name-your-own-price
- **Projection**: **Isometric** (⚠ wrong projection — would require redrawing for orthogonal)
- **Resolution**: Unspecified
- **Aesthetic**: Futuristic industrial / space factory — animated Battery, Advanced Furnace, Liquid Tank
- **Captain's-eye fit**: Pure **visual atmosphere reference**. The animated-machinery sensibility (steam, electrical sparks, mechanical motion) is exactly what we want for per-building idle animations in [06-style](./06-style.md) — even though we can't use the sprites directly.
- **Use**: Animation reference only. Study HOW the machines breathe, not the sprites themselves.

### 5. Factory Asset v.2 - Chemical Lab
- **URL**: https://blood-seller.itch.io/factory-asset-v2-chemical-lab
- **Creator**: Blood_seller
- **License**: Use freely; no resell of the pack
- **Price**: Free / name-your-own-price
- **Projection**: **Isometric** (⚠ wrong projection)
- **Resolution**: Unspecified
- **Aesthetic**: Sci-fi / chemical-lab modular components
- **Captain's-eye fit**: **Alchemy Lab + Depetrification Lab** vibe references — modular lab components, glassware, reagent vessels, bubbling apparatus. Direct inspiration for the Dr. Stone signature lab buildings.
- **Use**: Visual reference for lab-themed AI-gen prompts. Same caveat — projection mismatch, sprites not directly usable.

---

## Dr. Stone canon visual references

Anchor references from the source material. Used both as AI-gen prompt seed and as the visual North-Star for hand-pixel work (Mecha Senku especially).

### Mecha Senku (the mascot) — canon visual reference
- **Origin**: Stone Wars / Treasure Box arc (anime season 2). Senku creates a chibi robot-doll version of himself as a self-promo character.
- **Visual cues**: Spiky two-tone green hair (canonical Senku silhouette), small chibi-proportioned body, cyan/teal eye glow, smug expression. Often holds a sign or clipboard. Roughly 1/3 size of regular Senku.
- **Search queries for screenshot reference**: `Dr. Stone Mecha Senku`, `Dr. Stone Stone Wars mascot`, `石神千空 メカ千空`
- **Sources**: Crunchyroll episode stills, TMS Entertainment promotional art, Boichi (manga artist) panel scans, Dr. Stone wiki at https://dr-stone.fandom.com
- **Captain's-eye implementation note**: Our gold-plating decision ([06-style §Mecha Senku](./06-style.md) — `#FFC940` body) is a Ryusui-palette-aligned interpretation of the canon. Anime canon often shows him in more neutral / grey metallic tones; we override for Ryusui-deck consistency. Document this decision in the asset commit message when hand-pixeling.

### Signature Dr. Stone buildings (canon designs to honor)

| Building | Canon source | Visual reference |
|---|---|---|
| **Alchemy Lab** | Senku's hut in season 1 — wooden shed with hanging dried herbs, glassware, bubbling beaker, chimney | S1 Ep 4-7 stills |
| **Sulfa Factory** | Tsukasa-arc canon, season 2 — the industrial sulfa-drug production line | S2 Ep 7-10 stills |
| **Perseus** | The steamship Senku & co. build to sail to Treasure Island — multi-deck, brass fittings, steam funnel | S3 Ep 1-3 stills (or manga vol 11-14) |
| **Telephone Exchange** | Stone Wars era, the village telephony hub — wooden switchboard, copper-wire bundles | S2 Ep 5-7 stills |
| **Depetrification Lab** | Late-series — Nital Reagent production facility | Manga vol 18+ |
| **Nuclear Reactor / Deep-space Radio / Rocket Launch Pad** | Final-arc canon — Moon Mission preparation | Manga vol 24+ (anime not yet adapted) |

**Sourcing**: TMS Entertainment promotional art (use as inspiration; do not bundle); Crunchyroll screenshots (fair-use moodboard only, NEVER bundled in the game); manga panel scans (same).

**License discipline**: NONE of the canon visual references can be bundled in the game's `public/` directory. They live in a `~/StoneWrld/moodboard/` folder (gitignored or in a separate private repo). The game ships with our AI-gen + hand-pixel interpretations only.

---

## Pixel-art game references — engine + ergonomics studies

Other pixel-art games whose specific design moves we steal for v1.

| Game | What to study | What to steal |
|---|---|---|
| **Stardew Valley** | Top-down village density, building overdraw, dirt-path auto-tile, ambient idle animations | Building footprint conventions, NPC-character pixel proportions (Mecha Senku reference), path-tile bitmask approach, day-cycle restraint (we're skipping day/night v1 but the option is there) |
| **Mini Metro** | Map state evolution over time, single-color palette discipline, satisfying click-feedback, milestone-tile unlock UX | Tile fade-in-on-unlock animation, color-as-state communication, restraint in UI flourishes |
| **SimCity 2000** | Top-down city builder grid + zone unlocks, building variety, overlay views | Power overlay UI metaphor, zone-unlock-as-reward pattern |
| **Townscaper** | Procedural-feel from authored content, no menus / pure click-to-build | Construction-drop animation feel; the dopamine of seeing a sprite appear instantly |
| **Factorio** | Power-grid mechanic (the actual chained-coverage model we're loosely homaging) | Network topology UI, coverage halo rendering |
| **Dwarf Fortress / Caves of Qud** | ASCII-density per tile, ambient world-feels-alive | Restraint — we're NOT going this dense, but their "every tile means something" ethic is the spirit |
| **Frostpunk** | Heat-coverage chained-network mechanic | Power-coverage metaphor directly applicable |
| **Banished** | Slow-trickle resource economy, no time pressure | Our slow-trickle-passive-production model owes this game a lot |

---

## AI-gen tooling references

The actual production workflow for sprites. Our **primary source** per the inverted strategy.

### Primary: Retro Diffusion
- **URL**: https://www.retrodiffusion.ai/
- **What it is**: A pixel-art-specific Stable Diffusion service. Trained natively on pixel-art datasets; outputs are pixel-perfect (not pixel-art-styled rasters that need post-processing).
- **Pricing**: Subscription-based (~$15/mo for typical hobby use); free tier available
- **Output resolutions**: 16×16, 32×32, 64×64, 128×128, 256×256, 384×384 (matches our spec exactly)
- **Workflow**: Prompt → generate at exact source resolution → minimal post-touch in Aseprite for outline + palette enforcement
- **Captain's call**: **Primary tool for the ~65 AI-gen building sprites.**

### Secondary: Stable Diffusion + Pixel-Art LoRA
- **What it is**: Local-or-hosted SD pipeline with a pixel-art LoRA model (e.g., "PixelArt LoRA" by Pixel-Boy, or "PublicPrompts/All-In-One-Pixel-Model")
- **Cost**: Free (local) or pay-as-you-go (hosted — e.g., Replicate, RunPod)
- **Output**: 512×512 native, downsample to 256×256 with nearest-neighbor + palette quantization
- **Trade-off**: More setup work than Retro Diffusion; more control over prompts; weaker pixel-perfect guarantees
- **Use**: Fallback when Retro Diffusion's pixel-style doesn't fit a specific Dr. Stone reference

### Tertiary: Aseprite (post-processing)
- **URL**: https://www.aseprite.org/
- **What it is**: Industry-standard pixel-art editor. $19.99 one-time purchase.
- **Use in our pipeline**: 
  1. Import AI-gen output
  2. Quantize palette to our ≤16-colors-per-sprite rule + Ryusui palette enforcement
  3. Hand-trace the 2-pixel outline (`#0A1228`) where AI didn't conform
  4. Add the 4-pixel shadow blob
  5. Cut animation frames if AI-gen produced a sprite-sheet
- **Captain's call**: **Non-negotiable tool in the pipeline.** Every AI-gen sprite passes through Aseprite before shipping.

### Co-captain's hand-pixel workflow
- **Tool**: Aseprite (same)
- **Use**: Mecha Senku character frames (~26 frames), HUD chassis (~12 sprites), spark / smoke / event-overlay sprites (~12 frames). Total ~50 hand-pixel sprites.
- **Estimated time**: Co-captain's call on his own throughput.

---

## CC0 / paid pack catalogues — fallback / accent only

These remain in scope as **fallback sources** for the very-generic terrain or non-hero buildings if AI-gen produces problematic output. But the inverted strategy means we no longer treat these as primary.

| Source | URL | What's there | Resolution caveat |
|---|---|---|---|
| **OpenGameArt.org** | https://opengameart.org/ — filter `pixel-art` tag + `topdown` | LPC tilesets, Pixel Castle, industrial / factory tilesets, terrain auto-tiles | Most at 16-32 px; would need 4-8× upscale. **Avoid.** |
| **itch.io free pixel-art assets** | https://itch.io/game-assets/free/tag-pixel-art/tag-top-down | Tio's Tiny Town, Pixel-Boy packs, hundreds of city-builder tilesets | Most at 16-32 px. **Avoid.** Exceptions: search "128px" or "256px" tag explicitly. |
| **OpenPixelProject** | http://www.openpixelproject.com/ | CC-BY pixel art, mostly 32-48 px | Same caveat. |
| **Kenney pixel-specific packs** | https://kenney.nl/assets?q=pixel | "1-Bit Pack", "Monochrome Pixel Pack", small subset of his catalogue | Most of Kenney is vector-smooth; the pixel-specific subset is small. **Avoid as primary.** |
| **Cyangmou pixel-art tutorials** | https://twitter.com/Cyangmou — read his Twitter/blog | Not a source pack — pure education on pixel-art technique at our resolution | Reference reading for the hand-pixel work. |

**Captain's note**: if a CC0/paid pack at the right resolution turns up later (someone authors a 128px+ top-down industrial tileset), revisit. None known to captain at this date.

---

## Pixel font references

Per [06-style §Typography](./06-style.md), two bitmap fonts.

| Font | Use | Source | License | Size |
|---|---|---|---|---|
| **Pixellari** | Headings, button labels, HUD numbers | https://github.com/zedseven/Pixellari | OFL (SIL Open Font License) — free for commercial use | 16 px |
| **m6x11** | Body text, speech bubbles, tooltips | Daniel Linssen — https://managore.itch.io/m6x11 | OFL — free for commercial use | 11 px |

Both ship as `.ttf` files that can be exported to Phaser-compatible `.fnt` bitmap fonts using **BMFont** (https://www.angelcode.com/products/bmfont/) or **Hiero** (https://libgdx.com/wiki/tools/hiero). Pixel-perfect at any integer zoom — no AA.

---

## Factoid source references

Per [06-style §Factoid delivery](./06-style.md), ~330 factoid strings to author. Sources, by category:

### History of science / history of technology (~150 factoids)
- **Wikipedia** — primary source for dated discoveries, named scientists, civilizational tech-adoption timelines. Verify against citations.
- **"A Short History of Nearly Everything"** — Bill Bryson (general science history; conversational tone closest to what we want for Mecha Senku)
- **"The Disappearing Spoon"** — Sam Kean (periodic-table history, very useful for materials factoids)
- **"The Knowledge: How to Rebuild Civilization in the Aftermath of a Cataclysm"** — Lewis Dartnell (literally the Dr. Stone reference book; one of the manga's known inspirations)
- **Wikipedia "History of X" articles** — `History of iron`, `History of charcoal`, `History of glass`, `History of soap`, `History of antibiotics`, `History of telephony`, etc. — direct mining for building-specific factoids

### Dr. Stone canon (~80 factoids)
- **Dr. Stone wiki**: https://dr-stone.fandom.com — episode summaries, character bios, arc plot
- **Manga primary text** — for canonical chemistry / engineering explanations Senku gives in-panel
- **TMS Entertainment website** — production notes
- **r/Dr_Stone subreddit** — community-compiled science notes; verify before using
- Captain's-eye: Dr. Stone factoids should **anchor real history**, not invent in-universe lore. E.g., the Sulfa Factory factoid talks about the REAL 1939 Domagk Nobel, then optionally adds *"— Senku's manga arc honors this real chemistry breakthrough."*

### Engineering / process specifics (~50 factoids)
- **Encyclopædia Britannica** — for crisp single-paragraph explanations of industrial processes
- **MIT OpenCourseWare** — process diagrams for refining, smelting, electronics
- **Engineering textbooks** (free PDFs on the open web) — verify before quoting

### Resource flavor (~25 factoids)
- Free-form captain's-eye writing — Mecha Senku reflecting on what each resource means in the game's economy. These don't require external sourcing.

### Material rediscoveries (~30 factoids)
- Wikipedia history articles per material — `Sulfuric_acid`, `Charcoal`, `Steel`, `Concrete`, `Aluminum`, `Petroleum`, `Plastic`, `Silicon`, `Uranium`
- "The Knowledge" (Dartnell, above) covers many of these directly

### Voice-tone reference
- Mecha Senku's factoid voice is **Senku's nerdier register** ([06-style §Voice rules for factoids](./06-style.md)). Reference reading: any Senku-explains-chemistry panel from the manga; Bill Bryson's prose pacing; Hank Green / Crash Course YouTube transcript samples for the conversational-science register.

### Sourcing discipline
- Every factoid claims a **single verifiable fact**. No "as legend has it" / "it is said." If the source is shaky, the factoid doesn't ship — the bubble falls back to operational-only.
- Each factoid string in `factoids.json` carries an optional `source:` field for traceability (especially useful when revisiting v1.x to expand the library).

---

## License discipline notes

Critical: track what's licensed how, since v1 ships as a personal project but Illia may share it later.

| Asset class | License regime | Bundling rule |
|---|---|---|
| AI-gen sprites | Public domain (most AI tools) but check terms — Retro Diffusion grants commercial use, SD outputs are generally CC0 | Bundle freely in `public/`. Add LICENSE.md noting AI-gen origin. |
| Hand-pixel sprites (Mecha Senku, HUD chassis) | Author retains copyright; Illia (co-captain) is sole author | Bundle freely. License under the project's overall LICENSE (TBD — co-captain's call, default MIT or CC-BY-NC). |
| Bundled CC0 packs (if any used) | CC0 — public domain, no attribution required, no resell-as-pack | Bundle freely. NEVER repackage as a standalone pack. |
| Bundled CC-BY packs (if any used) | Attribution required | Bundle with CREDITS.md listing creator + URL + pack name |
| The five Cute SCKR / Blood_seller / NinjaGame_Dev packs (above) | **NOT BUNDLED** — vibe-reference only | These NEVER enter the `public/` directory. Tracked in `~/StoneWrld/moodboard/` (gitignored). |
| Pixellari / m6x11 fonts | OFL — free for any use | Bundle in `public/fonts/` + include the SIL OFL license text |
| Dr. Stone canon screenshots / manga panels | Fair-use moodboard reference; NOT redistributable | NEVER bundle. Live in `~/StoneWrld/moodboard/` |
| Factoid text (authored by captain + co-captain) | Authored by us | Bundle freely. License under project LICENSE. |

**Captain's rule of thumb**: if it's in `public/`, the legal answer to "can I redistribute this?" is YES. If the answer is anywhere short of yes, it doesn't go in `public/`.

---

## Decisions locked in this doc

| # | Decision | Choice |
|---|---|---|
| 1 | Sprite-source strategy | **AI-gen primary** (Retro Diffusion + SD/LoRA backup); hand-pixel for Mecha Senku + HUD chassis + path bitmask + event overlays. CC0 packs are **fallback / accent only**, not primary. |
| 2 | Five vibe-packs (Cute SCKR ×2, Blood_seller ×2, NinjaGame_Dev ×1) | **Mood-board only** — never bundled. Used as AI-gen prompt seeds + animation studies. |
| 3 | Primary AI-gen tool | **Retro Diffusion** (pixel-native, 256×256/384×384 native output) |
| 4 | Secondary AI-gen tool | **SD + pixel-art LoRA** (fallback for non-conforming prompts) |
| 5 | Post-processing tool | **Aseprite** ($19.99 one-time) — non-negotiable in the pipeline for outline + palette enforcement |
| 6 | Pack avoidance | OpenGameArt / Kenney / OpenPixelProject avoided as primary — resolution mismatch (most at 16-32 px) |
| 7 | Pixel fonts | **Pixellari** (headings) + **m6x11** (body), both OFL, both via BMFont/Hiero → Phaser BitmapText |
| 8 | Factoid sources | Wikipedia + "The Knowledge" (Dartnell) + Dr. Stone wiki + Bryson/Kean + Britannica; voice reference Bill Bryson / Hank Green; single-verifiable-fact discipline |
| 9 | Dr. Stone canon refs | Mood-board only (NEVER bundled). Stored in `~/StoneWrld/moodboard/` (gitignored or private). |
| 10 | License discipline | Anything in `public/` must be freely redistributable. Vibe-references stay out of the repo. |
| 11 | Pack updates if higher-res CC0 surfaces | Revisit — none known at 2026-05-18 |

---

## Downstream doc reopens needed

This iteration inverts the sprite-source strategy assumed by an earlier doc. One reopen required:

- **[04-buildings §Sprite source plan](./04-buildings.md)** — needs surgical edit:
  - The "Primary CC0 pixel-art sources" subsection is now **fallback / accent only**
  - The "AI-gen for Dr.Stone signature buildings" assumption expands — **AI-gen is now primary for ~65 of ~67 buildings**, not just the ~15 Dr. Stone signature ones
  - The per-building "Sprite source: CC0 pixel pack" notes throughout the catalog should be reframed as **"Sprite source: AI-gen"** for most non-trivial buildings
  - Captain proposes a single banner-edit to the §Sprite-source-plan subsection of 04, plus a one-line correction note at the top of each per-building entry's Sprite-source field if appropriate. **Small surgical change, ~30 min of editing.**

- **[06-style §Pixel-art principles](./06-style.md)** — informational update only: rule #2 "**Constrained palette per sprite**" gets a note that this rule is enforced in Aseprite post-process on AI-gen output, not assumed to be honored by the AI itself. Already implicit; making it explicit costs ~2 lines.

Captain will flag both in the next session's morning-sync; both are small surgical edits, not redrafts.

---

When 07-references locks, the **final design doc** is **08-architecture.md** — the technical blueprint. Phaser scene tree, asset pipeline, full state.json schema, Claude PostToolUse hook design, save/load atomic-write contract, packaging (web → optional Electron/Tauri). After 08 locks, **09-roadmap.md** sequences the phased delivery. Then implementation begins.
