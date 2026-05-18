# StoneWrld — design

> Single source of truth for the StoneWrld game design. Implementation
> only begins once these docs are locked.

## Doc map + status

| # | Doc | Captures | Status |
|---|---|---|---|
| 0 | [README.md](./README.md) | This file — navigation + status | draft |
| 1 | [01-vision.md](./01-vision.md) | The idea, the why, target experience, what we are NOT building | **LOCKED (2026-05-18)** |
| 2 | [02-game-logic.md](./02-game-logic.md) | Mechanics: resources, tool→resource mapping, accrual, passive trickle, power, storage, upgrades, animation philosophy, Mecha Senku role | **LOCKED (2026-05-18)** |
| 3 | [03-progression.md](./03-progression.md) | Milestones (7 Dr. Stone arcs) + research tree (10 branches, cross-branch DAG) + building unlock dependencies + research UI spec | **LOCKED (2026-05-18)** |
| 4 | [04-buildings.md](./04-buildings.md) | Full catalog: every building × every tier × costs × passive trickle × power × research prereqs × idle animation | **LOCKED (2026-05-18)** |
| 5 | [05-map.md](./05-map.md) | Grid size, footprints, sprite resolution, camera, terrain, expansion, power coverage networks + poles, overlays, view switching, demolish | **LOCKED (2026-05-18)** |
| 6 | [06-style.md](./06-style.md) | Pixel-art style guide: palette, sprite size, art direction, UI components, Mecha Senku design + voice, **factoid delivery (in-game teacher mechanic)** | **LOCKED (2026-05-18)** |
| 7 | [07-references.md](./07-references.md) | Sprite source strategy (AI-gen primary, inverts earlier assumption), 5 vibe-pack references, Dr. Stone canon refs, pixel-art game refs, AI-gen tooling, fonts, factoid sources, license discipline | **LOCKED (2026-05-18)** |
| 8 | [08-architecture.md](./08-architecture.md) | Technical blueprint — Phaser scene tree, asset pipeline, full state.json schema, Claude hook design, save/load, packaging, port allocation, test setup | **LOCKED (2026-05-18)** |
| 9 | [09-roadmap.md](./09-roadmap.md) | 15 phases scaffold → state API → hook → first-playable → city → buildings → power → research → Mecha Senku → silos → demolish → factoids → overlays → animations → polish + parallel asset track + risk register + v1.x backlog + ship checklist | **LOCKED (2026-05-18)** |

## Workflow (one doc at a time, in order)

1. Captain drafts a v1 of the doc based on prior decisions + Dr. Stone canon.
2. Co-captain (Illia) reviews, redirects, adds the things only he knows.
3. Captain iterates until co-captain is happy.
4. Doc is marked `STATUS: locked` at the top.
5. Move to next doc.

We do NOT draft all eight docs up-front — each one builds on the one before it.

## How a doc gets locked

A doc is **locked** when:
- Every decision the doc covers has a concrete choice (no `TBD` left).
- A second reader (Illia rereading after a break) can build from the doc without further questions.
- The doc references decisions from earlier docs by file:section so changes propagate cleanly.

A doc is **reopened** when:
- A later doc's decision contradicts an earlier doc's choice. The earlier doc is updated first; affected sections downstream are re-read.

## Decisions already locked

These came out of plan-mode + the post-plan pivot. They constrain everything downstream.

| # | Decision | Choice |
|---|---|---|
| 1 | Form factor | **Real desktop game** (Phaser canvas, separate window) — NOT a terminal game |
| 2 | Stack | **Phaser 3 + TypeScript + Vite**. Web during dev; Electron/Tauri optional later |
| 3 | Art style | **Pixel art** — not ASCII / Unicode half-blocks |
| 4 | Claude Code role | **Earner only** — a `PostToolUse` hook writes resource deltas to `state.json`. The game app reads + spends. Loose coupling. |
| 5 | MVP scope | **Full vision in v1** — multi-resource economy + buildings + upgrades + power constraint, all in the first delivery |
| 6 | Economy type | **Multi-resource Dr. Stone** — 5 currencies: 📚 Knowledge, 🔭 Discovery, ⛓ Iron, ⚡ Innovation, 🏁 Completion |
| 7 | Building theme | **Dr. Stone canon + industrial progression**. Each building has 3 tiers (upgradeable) |
| 8 | Production model | **Slow-trickle passive production** (~10% of active work earnings). Buildings are mostly monuments; passive trickle is the long-tail reward |
| 9 | Power constraint | **Mid-game gating**: buildings need power to operate at full output. Forces real industrial-progression strategy |

## Additional decisions from 01-vision

| # | Decision | Choice |
|---|---|---|
| 10 | Wallpaper export | **v2** (not in initial release) — game window is the view in v1 |
| 11 | Sprite source | **Mix** — public CC0 sources (Kenney etc.) for generic civ buildings, AI-generated for Dr. Stone signature pieces |
| 12 | Save data location | **`~/StoneWrld/state.json`** (in-project, easy to find/wipe/debug) |
| 13 | Pixel-art aesthetic | **Pure retro** — sharp pixels, no antialiasing, integer scaling. HUD + menus also in pixel-art style |
| 14 | Game time | **Instant** — click → build immediately. No construction timers |

## Additional decisions from 02-game-logic

| # | Decision | Choice |
|---|---|---|
| 15 | Brownout severity | **0% production** — no power means no production |
| 16 | Subagent yields | +10 primary resource on subagent completion (+8 for gen / kohaku) |
| 17 | Ship-event detection | commit +20🏁, push +10🏁, PR create +15🏁, test-pass +5🏁 |
| 18 | Trickle cap | **72 hours** offline accrual (covers weekends + skip-days) |
| 19 | Anti-abuse caps | **None** — trust-based, no rate/dedup/per-call caps |
| 20 | Storage / silos | **In v1** — 5 silo buildings (Library, Map Archive, Foundry Stockpile, Workshop Storage, Trophy Hall), 3 tiers each. Max capacity scales with tier; overflow lost |
| 21 | Animation idle | **Per-building thematic** (steam from coal plant, sulfur through pipes, wheel rotation, hammer strikes) — NOT generic alpha pulse |
| 22 | Resource-gain UI | **Mecha Senku speech bubble**, NOT floating numbers drifting over the city |
| 23 | Universal event animations | **Tween-based** (construction drop, upgrade scale-pulse, brownout shake) — shared library |
| 24 | Mascot / narrator | **Mecha Senku** — pixel-art robotic Senku, delivers all in-game messages |

## Additional decisions from 05-map

| # | Decision | Choice |
|---|---|---|
| 25 | Grid | **32 × 24 orthogonal**, single playfield, 4:3 |
| 26 | Tile source resolution | **128 px/tile** → 2×2 building = 256×256, 3×3 boss = 384×384 |
| 27 | Camera | Pan + integer zoom **0.25× / 0.5× / 1× / 2×**; default 0.5× |
| 28 | Game window | **1280 × 800** default canvas (1024 viewport + 256 HUD), resizable |
| 29 | Starting buildable area | **8 × 8 plaza** centered; expansion per-milestone (ring → rectangle, 7 unlocks) |
| 30 | Terrain | **Static, hand-authored single map** (`public/maps/stoneworld.json`) — no procedural / no seed |
| 31 | Terrain effects (v1) | Naval requires ≤2 tiles from water; Rocket Launch Pad requires entirely on concrete pad |
| 32 | Power model | **Spatial coverage networks** — gens emit radius 3; Power Poles extend chains; multiple networks possible; per-network cap-vs-demand |
| 33 | Power Pole family | 3 single-tier buildings (Wooden / Iron / Steel), 1×1, radii 4 / 6 / 8; demolish-and-replace to upgrade |
| 34 | Overlay UX | **HUD-panel toggle only**, no keyboard hotkeys |
| 35 | View switching | **Tab** toggles CityScene ↔ ResearchScene; camera state preserved per scene |
| 36 | Demolish | **Allowed**, **50% refund** of total spent (T1 + upgrades), **no cooldown** |
| 37 | State-schema convention | Each building entry = one placed instance (drop `instances`); add per-building `spent`; drop `map_seed` |

## Additional decisions from 06-style

| # | Decision | Choice |
|---|---|---|
| 38 | Aesthetic statement | **Ryusui-gold-on-deep-navy Kingdom-of-Science village in pure-retro 128px pixel art** |
| 39 | Master palette | Derived from `~/.claude/themes/ryusui.json` + one new hex `#A8ADB4` (iron grey) for ⛓ Iron + Materials |
| 40 | Mecha Senku character | **Canonical Dr. Stone anime Mecha-Senku mascot** — chibi gold-plated robot, green hair, cyan LED eyes, cream lab coat |
| 41 | Mecha Senku emotions | 5 looping (idle / excited / proud / worried / captain) × 4 frames + 3 one-shots |
| 42 | **Factoid delivery** | Mecha Senku delivers **real historical / scientific factoids** on every build / upgrade / research-unlock / milestone — turns the game into ambient learning. ~330 factoid strings authored in `content/factoids.json` |
| 43 | Speech bubble persistence | 6s operational-only / **10s with factoid** + 1s fade, click-dismiss, full scrollback in Captain's Log |
| 44 | Typography | Pixellari (headings 16px) + m6x11 (body 11px), bitmap fonts only |
| 45 | Sound | v1 silent; 4 chimes deferred to v1.x |
| 46 | Pixel-art discipline | Integer zoom only, ≤16 colors per sprite, 2px navy outline, 4px black shadow blob |
| 47 | Action button labels | English plain (`[Build]`, `[Research]`, `[Silos]`, `[Overlays]`, `[Captain's Log]`) |
| 48 | Hard exclusions | No isometric, no 3D-look, no AA, no web fonts, no CRT (default), no day/night, no weather, no floating numbers, no alpha-pulse idle, no skeuomorphism |

## Additional decisions from 07-references

| # | Decision | Choice |
|---|---|---|
| 49 | Sprite-source strategy | **AI-gen primary** (Retro Diffusion + SD/LoRA backup) for ~65 of ~67 buildings; hand-pixel for Mecha Senku + HUD chassis + path bitmask + event overlays |
| 50 | Five candidate packs (Cute SCKR ×2, Blood_seller ×2, NinjaGame_Dev ×1) | **Mood-board only** — never bundled. Used as AI-gen prompt seeds + animation studies. Live in `~/StoneWrld/moodboard/` |
| 51 | AI-gen tooling | **Retro Diffusion** primary (~$15/mo, pixel-native 256/384) + **SD + pixel-art LoRA** fallback + **Aseprite** ($19.99 one-time) post-process — non-negotiable for outline + palette enforcement |
| 52 | Pixel fonts | Pixellari (GitHub OFL) + m6x11 (Linssen itch OFL) → BMFont/Hiero → Phaser BitmapText |
| 53 | Factoid sources | Wikipedia + Dartnell ("The Knowledge") + Dr. Stone wiki + Bryson + Kean + Britannica; single-verifiable-fact discipline |
| 54 | Canon visual refs | Dr. Stone screenshots / manga panels NEVER bundled (fair-use mood-board); live in `~/StoneWrld/moodboard/` (gitignored) |
| 55 | License rule of thumb | Anything in `public/` must be freely redistributable — vibe-references stay outside the repo |

## Additional decisions from 08-architecture

| # | Decision | Choice |
|---|---|---|
| 56 | Folder structure | `~/StoneWrld/{design,moodboard,assets,public,src,hooks,scripts,tests}` + runtime `state.json` at root (gitignored) |
| 57 | Phaser scene tree | **5 scenes**: Boot → Preload → City (default) ↔ Research, with UI (persistent) + Modal (topmost) overlays |
| 58 | Scene communication | Shared `AppState` singleton + typed event bus |
| 59 | Full state.json schema | v1 schema locked — per-instance buildings, `spent` field, captain_log (last 100), settings block, stats block; network graph derived at load |
| 60 | Persistence API | **Vite middleware** exposing `GET/POST /api/state` for the browser game; same file accessed directly by the hook |
| 61 | Atomic write | Write tmp + fsync + rename (POSIX-atomic on Linux); tmp filename includes PID+timestamp |
| 62 | Concurrency | Last-writer-wins for v1; `proper-lockfile` available v1.x if collisions surface |
| 63 | PostToolUse hook | `~/StoneWrld/hooks/stoneworld.js` (project-local script, **wired globally** into `~/.claude/settings.json`); self-guards if `state.json` missing |
| 64 | Hook globality | Fires on ALL Claude Code sessions (not just StoneWrld-directory work) — earn from everything |
| 65 | Tool yields | `hooks/tool-yields.json` — single source of truth, loaded by both hook and game; **structure locked, values tuned in playtest** |
| 66 | Asset pipeline | Aseprite source → **free-texture-packer** → PhaserJSONHash atlas |
| 67 | Catalog compilation | Markdown source (03 / 04) → compile-script → JSON (pre-build step + dev file-watcher) |
| 68 | Static terrain map | **Tiled `.tmx` export** preferred over hand-writing JSON |
| 69 | Port allocation | **5100-5150** (5100 dev / 5101 preview / 5102 Vitest UI / rest reserved) |
| 70 | Test scope v1 | Vitest unit tests for economy / network / trickle / upgrades / placement / voice + hook integration; no browser UI tests v1 |
| 71 | Packaging v1 | Browser tab via Vite dev server, optional `systemd --user` for persistence |
| 72 | Packaging v2 | **Tauri** preferred over Electron when the time comes |
| 73 | Bootstrap | `npm run bootstrap` — single command runs install + compile + pack + hook-install + dev |

## Additional decisions from 09-roadmap

| # | Decision | Choice |
|---|---|---|
| 74 | Cadence | **Steady 5-10 focused hours/week**; target ~14-18 elapsed weeks for v1 ship |
| 75 | Total effort estimate | ~235-360 total hours (155-220 code + 84-135 asset, parallelized) |
| 76 | Phase count | **15 phases** + parallel asset track |
| 77 | First-playable target | **End of Phase 3** — HUD ticks from real Claude Code work (~25-40 hours in), then keep building while real resources accumulate for playtest |
| 78 | Gameplay-complete target | **End of Phase 7** — power coverage networks working; everything after is depth/polish/content |
| 79 | v1 scope boundary | **Arcs 1-4 fully polished**; arcs 5-7 structurally complete with animations + factoids stubbed `TODO v1.x` |
| 80 | Playtest scope | **Single-player only** (co-captain plays for 1 full week pre-ship); no external playtesters in v1 |
| 81 | LICENSE | **MIT** (engine open; assets license-per-folder if needed later) |
| 82 | Changelog discipline | **Defer to v1.1** — no keepachangelog format until v1.1 demands it |
| 83 | v1.x backlog discipline | All deferred items consolidated into `docs/v1x-backlog.md` at ship time |
| 84 | Final ship gate | 16-item checklist (in [09-roadmap §Final ship checklist](./09-roadmap.md)) |
