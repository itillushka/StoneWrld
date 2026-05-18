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
| 5 | 05-map.md | Grid size, building footprints, sprite layout, power lines, expansion | **next to draft** |
| 6 | 06-style.md | Pixel-art style guide: palette, sprite size, art direction, UI tone-of-voice, Mecha Senku character design | not started |
| 7 | 07-references.md | Visual mood board — Dr. Stone canon, pixel-art game refs (Stardew, Mini Metro, SimCity 2000, Townscaper), Kenney tileset catalogue | not started |
| 8 | 08-architecture.md | Technical blueprint — Phaser scene tree, asset pipeline, state.json schema, Claude hook, save/load, packaging | not started |
| 9 | 09-roadmap.md | Phased delivery: scaffold → state sync → hook → first playable → economy → buildings → polish | not started |

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
