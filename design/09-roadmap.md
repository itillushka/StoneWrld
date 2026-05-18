# 09 — Roadmap

> STATUS: **LOCKED (2026-05-18)** — co-captain locked as drafted; all 6 forks went with captain's lean (steady 5-10hr/wk cadence, phase-3 first-playable, arcs-5-7 stubbed, single-player playtest, MIT license, defer changelog). **This is the final design doc. Design phase is closed; implementation begins at Phase 0.**

The phased delivery sequence for StoneWrld v1. Each phase has concrete deliverables, dependencies, an effort estimate, acceptance criteria, and the "you know it's done when" gate. Plus parallel asset-track work, a risk register, the v1.x backlog of already-deferred items, and a final ship checklist.

This doc does NOT re-litigate scope — that lives in [01-vision](./01-vision.md). It sequences **how we get from zero to v1 shipped**.

---

## Cross-doc anchors

| What | Where |
|---|---|
| MVP scope (full vision in v1) | [01-vision §5](./01-vision.md) |
| Stack + architecture | [08-architecture](./08-architecture.md) |
| Sprite source strategy | [07-references §Sprite source strategy](./07-references.md) |
| Power coverage model | [05-map §Power coverage](./05-map.md) + [02-game-logic §Power model](./02-game-logic.md) |
| Catalogs (compile sources) | [03-progression](./03-progression.md), [04-buildings](./04-buildings.md) |
| Factoid library content | [06-style §Factoid storage](./06-style.md) |
| Success criteria (2-month survival) | [01-vision §80](./01-vision.md) |

---

## Cadence assumption

Realistic working pattern: **5-10 focused hours per week**, sometimes burst sprints on weekends. Co-captain is a full-time AI tech lead + freelance + side hustle — StoneWrld is the side-project that fits into pockets, not the day job.

At that cadence, captain's honest estimate for v1 ship is **~14-18 elapsed weeks** (~3.5-4.5 months) from implementation kickoff. Burst sprints can compress this to 8-10 weeks. **Captain's-eye target: first-playable in week 4-5, full v1 ship by week 16.**

Effort estimates below are in **focused hours** (not elapsed weeks). Divide by 5-10 per week to get elapsed time.

---

## Phase summary

| # | Phase | Effort (focused hours) | Blocks |
|---|---|---|---|
| 0 | Bootstrap — repo skeleton, package install, settings | 3-5 | Everything |
| 1 | State API + schema scaffolding | 8-12 | 3, 4+ |
| 2 | PostToolUse hook (the earner) | 6-10 | First-playable |
| 3 | **First-playable cut** — empty city, HUD showing resources earn from real Claude work | 6-10 | (visible milestone) |
| 4 | City scene — terrain rendering, camera, frontier overlay | 12-16 | 5 |
| 5 | Building system core — placement, single buildable (Settler Hut) | 10-14 | 6 |
| 6 | Catalog compilation + all ~67 buildings buildable | 12-16 | 7+ |
| 7 | Power coverage networks — poles, chained graph, brownout | 14-18 | (gameplay-complete milestone) |
| 8 | Research tree — ResearchScene, prereq gating, tech-tree.json compile | 14-18 | 6, 11 |
| 9 | Mecha Senku — speech bubble, voice formatter, emotion sprites integration | 10-14 | 12 |
| 10 | Silos / storage caps | 6-8 | (small feature) |
| 11 | Demolish + 50% refund | 4-6 | (small feature) |
| 12 | Factoid delivery integration (engine + content authoring start) | 12-20 + content | (ongoing parallel asset work) |
| 13 | Overlays — power / per-resource / storage / hide-paths | 8-12 | |
| 14 | Animations — universal-event tweens + per-building idle | 16-24 | |
| 15 | Polish — balance, edge cases, Captain's Log scrollback, save/load resilience | 16-24 | Ship |
| **TOTAL CODE** | | **~155-220 focused hours** | |
| **TOTAL ASSET TRACK (parallel)** | | **~80-140 hours** | |

Realistic worst-case ship-effort: **~360 hours**. Best-case (heavily parallelized asset+code, burst sprint, fewer revisions): **~235 hours**. At 5-10 hrs/wk: **3.5-9 months elapsed.**

Captain's honest read: **lock the target at 4 months elapsed.** If we ship at week 14, profit. If we slip to week 18, we still ship.

---

## Phase 0 — Bootstrap (3-5 hours)

### Deliverables
- `~/StoneWrld/` git repo initialized (already done — see existing `.git/`)
- `package.json` with the npm scripts from [08-architecture §Build / dev scripts](./08-architecture.md)
- `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`
- Folder skeleton per [08-architecture §Folder structure](./08-architecture.md): `src/`, `public/`, `hooks/`, `scripts/`, `tests/`, `assets/`
- `.gitignore` covering `state.json`, `moodboard/`, `node_modules/`, `dist/`, `assets/source-raw/`
- `npm install` of: `phaser@^3.80`, `typescript`, `vite`, `vitest`, `tsx` (for compile scripts), `marked` (for catalog compilation), `proper-lockfile` (deferred to v1.x — not installed)
- `README.md` at project root (already exists; light update)
- Empty placeholder scene that draws "StoneWrld — boot" on a canvas in Ryusui-navy `#0A1228`

### Acceptance gate
- `npm run dev` opens a browser tab at `localhost:5100` showing a navy canvas with a "StoneWrld" text label in cream. **Phaser renders.**

### Risks
- None. Pure plumbing.

---

## Phase 1 — State API + schema scaffolding (8-12 hours)

### Deliverables
- `src/state/schema.ts` — the full TypeScript types from [08-architecture §State.json schema](./08-architecture.md)
- `src/state/load.ts`, `src/state/save.ts` — `AppState` singleton, browser-side
- `src/api/state-client.ts` — `fetch()` wrapper for `/api/state`
- `src/api/dev-middleware.ts` — Vite plugin that exposes `GET/POST /api/state` with atomic write per [08 §Atomic write pattern](./08-architecture.md)
- `src/state/migrations.ts` — empty v1 chain (no migrations yet)
- A bootstrap helper: if `~/StoneWrld/state.json` doesn't exist on first GET, create a default empty state

### Acceptance gate
- Open game → it creates `~/StoneWrld/state.json` automatically.
- Manually edit `state.json` while game is open → reload page → state reflects the edit.
- `cat state.json` while game writes → never sees a half-written file.

### Risks
- Vite plugin gotchas with body parsing for POST. **Mitigation**: use the `connect`-style middleware pattern (Vite documents this).

---

## Phase 2 — PostToolUse hook (6-10 hours)

### Deliverables
- `hooks/stoneworld.js` — Node script per [08-architecture §PostToolUse hook](./08-architecture.md)
- `hooks/tool-yields.json` — initial yields per [02-game-logic §Resource yields](./02-game-logic.md)
- `hooks/install.js` — idempotent installer that adds the hook entry to `~/.claude/settings.json`
- `npm run hook:install` script wires it up
- Hook self-guard: silently exits 0 if `~/StoneWrld/state.json` missing
- Stdin parsing for PostToolUse event shape

### Acceptance gate
- Install hook via `npm run hook:install`.
- Open a Claude Code session in any directory; run a few tool calls.
- Reload StoneWrld game; resources increased.
- Hook timing: log a timestamp before+after each invocation; **must average < 50ms per call.**

### Risks
- **PostToolUse event payload shape changes** between Claude Code versions. **Mitigation**: hook is defensively parsed; unknown event shapes default to a small "+1 innovation" reward (silent fallback, not crash).
- **Hook accidentally breaks Claude Code itself** if it crashes loud. **Mitigation**: wrap entire script in try/catch; always exit 0 even on error; log errors to `~/StoneWrld/hook-errors.log` for post-hoc inspection.

---

## Phase 3 — First-playable cut (6-10 hours) — **VISIBLE MILESTONE**

### Deliverables
- `src/scenes/BootScene.ts` and `PreloadScene.ts` with loading-bar skeleton
- `src/scenes/CityScene.ts` — empty (just a navy field with frontier overlay), no buildings yet
- `src/scenes/UIScene.ts` — HUD sidebar with **only** the resources panel (5 counters in their canonical colors per [06-style §Resource colors](./06-style.md))
- Periodic re-fetch of `/api/state` (every 5s) so the HUD updates when the hook writes
- A static placeholder Mecha Senku sprite (one frame, idle) anchored bottom-left

### Acceptance gate
- **The thing works end-to-end.** Open the game → see HUD showing zero resources. Run Claude Code work for ~5 minutes → reload the game (or wait for poll) → see HUD numbers ticking up. **This is the moment the architecture proves out.**

### Risks
- **Polling vs push for HUD updates**. Drafted polling every 5s (cheap, simple). If feels laggy: switch to filesystem-watch (`chokidar`) in dev middleware → SSE push to browser. Defer to polish.

### Why this is its own milestone

Phase 3 is the first time the **end-to-end loop** is provable. Hook earns → file changes → API serves → game renders. After phase 3, every subsequent feature is additive — the spine is alive. **Captain's pitch**: ship phase 3 to a private playable build and **start earning real resources for the next 2 weeks** while you work on phases 4+. By the time the city scene is ready, you'll already have weeks of resources stockpiled. Free playtesting data.

---

## Phase 4 — City scene rendering (12-16 hours)

### Deliverables
- Static terrain map authored in Tiled → exported to `public/maps/stoneworld.json` per [05-map §Static map file](./05-map.md)
- Phaser tilemap layer renders the 32×24 grid with all 6 terrain types
- Frontier overlay (desaturated stone tint) on locked tiles, with the per-milestone expansion math from [05-map §Expansion](./05-map.md)
- Camera: pan (WASD / arrow / middle-drag) + integer zoom 0.25×/0.5×/1×/2×
- Mecha Senku speech bubble overlay (renders static, no messages yet)

### Acceptance gate
- Open game → see the full canonical map with terrain (grass / stone / sand / water / concrete / dirt-path placeholders).
- Pan around, zoom in/out — pixel-sharp at every zoom level.
- Frontier overlay visible on the ~720 locked tiles surrounding the starting 64-tile plaza.

### Risks
- **Terrain art not ready**. **Mitigation**: ship phase 4 with placeholder solid-color tiles (cream for grass, grey for stone, etc.); art swaps in later as the asset track delivers.

---

## Phase 5 — Building system core (10-14 hours)

### Deliverables
- `src/city/placement.ts` — placement-mode UX per [05-map §Build UX](./05-map.md): green/red footprint preview, terrain-gate checks, resource-cost check, click-to-place
- `src/city/grid.ts` — occupancy tracking, footprint validation, overdraw rendering rules per [05-map §Overdraw](./05-map.md)
- Build button in HUD opens a stub modal listing **just the Settler Hut** (hardcoded for now)
- Click Settler Hut in modal → enter placement mode → click on a valid tile → building appears, resources deducted, state persisted
- Universal-event animation: construction drop with elastic ease (per [06-style §Universal events](./06-style.md))

### Acceptance gate
- Click Build → see modal listing "Settler Hut".
- Select it → cursor enters placement mode with green/red tile preview.
- Click on a valid tile → Settler Hut sprite appears (placeholder is fine — solid gold square), resources deducted, state saved.
- Close + reopen game → Settler Hut is still there.
- Try to place on a frontier tile → red preview, click rejected.
- Try to place when you can't afford → red preview with tooltip "Not enough Iron".

### Risks
- **Placement-mode interaction feels janky**. Defer polish (smooth tweens on cursor, hover delay tooltip) to phase 15.

---

## Phase 6 — Catalog compilation + all buildings (12-16 hours)

### Deliverables
- `scripts/compile-catalog.ts` — Markdown table parser → `public/content/catalog.json` (all ~67 building entries × 3 tiers, with cost / power / coverage / research-prereqs / sprite-key)
- `src/catalog/buildings.ts` — loads + indexes catalog.json
- Build modal populated from catalog, grouped by category per [04-buildings §Categories](./04-buildings.md)
- Tier 2/3 upgrade flow: click existing building → inspect modal → Upgrade button → resources deducted, sprite swaps to next-tier placeholder
- Upgrade animation: scale-pulse + flash (per [06-style §Universal events](./06-style.md))

### Acceptance gate
- Build modal lists all unlocked buildings (post-research-gating in phase 8, but for phase 6 ALL are buildable for testing).
- Each of the ~67 buildings can be placed; placeholder sprites render distinctly enough to identify (color-coded by category per [06-style §Per-category badge](./06-style.md)).
- Tier 2 + Tier 3 upgrades work for any building.

### Risks
- **Compile script fragility on Markdown variations**. **Mitigation**: write strict Markdown grammar; throw on parse failure with line+column.
- **No sprites for most buildings yet**. **Mitigation**: render colored squares with the building name as overlay text. Real sprites swap in as asset track delivers.

---

## Phase 7 — Power coverage networks (14-18 hours) — **GAMEPLAY-COMPLETE MILESTONE**

### Deliverables
- `src/economy/network.ts` — coverage-graph builder per [02-game-logic §Power model](./02-game-logic.md) + [05-map §Power coverage](./05-map.md)
- Each placed gen/pole contributes coverage tiles; demanders check membership
- Per-network capacity-vs-demand → ok / tight / brownout state
- HUD Networks panel renders per-network status
- Off-grid demanders flagged in red on hover
- Brownout animation: shake + desaturate (per [06-style §Universal events](./06-style.md))
- Wooden / Iron / Steel Pole entries exist in catalog (need [04-buildings reopen](./04-buildings.md) if not already done in design-phase patches; check)

### Acceptance gate
- Place a Windmill → see its 3-tile coverage halo.
- Place a Workshop within the halo → it powers up.
- Place a Workshop outside the halo → it shows "Off the grid" indicator and produces 0%.
- Place a Wooden Pole inside the Windmill's coverage → pole connects, extends coverage by 4 tiles.
- Place 3 demanders within the network, each demanding 5 power, when windmill capacity is 3 → brownout triggers, all 3 demanders go to 0%, HUD shows red Networks panel entry.

**At this gate, the core gameplay loop is complete.** Build, upgrade, manage power, see consequences.

### Risks
- **Network graph re-computation perf**. O(N²) on building count ≤ ~100 → sub-millisecond. Fine.
- **Coverage halo rendering perf at full city**. ~30 halos overlaying tiles → cheap. Fine.

---

## Phase 8 — Research tree (14-18 hours)

### Deliverables
- `scripts/compile-techtree.ts` — Markdown → `public/content/tech-tree.json` per [03-progression](./03-progression.md)
- `src/scenes/ResearchScene.ts` — graph layout (nodes left-to-right by milestone, 10 vertical lanes per branch per [03-progression §Research UI](./03-progression.md))
- Prereq arrows drawn between nodes (cross-branch arrows visible)
- Node states (locked / available / researched) per [03-progression §Node states](./03-progression.md)
- Click available node → pay cost → researched; downstream nodes update state
- Tab switches CityScene ↔ ResearchScene with camera state preserved per [05-map §View switching](./05-map.md)
- Building catalog modal now filters to only researched / unlocked buildings

### Acceptance gate
- Tab into Research scene; see the tech tree spread out.
- Initial state: only starter techs (Stone Tools, Fire, Herbal Remedies) are "available."
- Click Stone Tools → research immediately; downstream techs (Wood Cutting, Fire, etc.) become available.
- Build modal in City scene now only lists buildings whose research prereqs are met.
- Tab back and forth — camera state preserved in each scene.

### Risks
- **Graph layout looks chaotic** with 85 nodes and many cross-branch arrows. **Mitigation**: arrange nodes in vertical lanes per branch (10 lanes); use translucent + curved arrows for cross-branch; provide the filter / focus modes per [03 §Filter / view modes](./03-progression.md).

---

## Phase 9 — Mecha Senku integration (10-14 hours)

### Deliverables
- Mecha Senku sprite sheet loaded (~26 frames; placeholder OK if asset track late)
- `src/mecha-senku/voice.ts` — message formatter for all 11 templates per [06-style §Canonical message templates](./06-style.md)
- `src/mecha-senku/speech-bubble.ts` — bubble rendering with 6s / 10s persistence per [06-style §Speech bubble](./06-style.md)
- Per-emotion sprite-frame cycling tied to event type (build → excited, brownout → worried, milestone → captain, etc.)
- Captain's Log scrollback button + modal showing last 100 messages from `state.captain_log`

### Acceptance gate
- Place a building → Mecha Senku swaps to excited emotion + bubble pops up with operational message.
- Brownout triggers → Mecha Senku worried + red bubble.
- Click bubble → moves to Captain's Log.
- Open Captain's Log → see scrollback.

### Risks
- **Mecha Senku sprite sheet not ready** (hand-pixel from asset track). **Mitigation**: ship phase 9 with a static placeholder sprite (single frame); swap in real frames as art track delivers.

---

## Phase 10 — Silos / storage caps (6-8 hours)

### Deliverables
- 5 silo buildings (Library, Map Archive, Foundry Stockpile, Workshop Storage, Trophy Hall) registered in catalog
- `src/economy/resources.ts` enforces per-resource caps based on highest-tier silo placed
- HUD Resources panel shows fill bars when within 10% of cap
- Storage-near-cap and silo-full Mecha Senku messages per [06-style §Canonical templates](./06-style.md)

### Acceptance gate
- Default cap is 1000 per resource.
- Place Library T1 → 📚 cap becomes 5000.
- Knowledge resource crosses 4500 → fill bar appears, "Storage tight" message.
- Knowledge resource hits 5000 → overflow lost, "Silo full" message.
- Upgrade Library to T2 → cap becomes 20000.

---

## Phase 11 — Demolish (4-6 hours)

### Deliverables
- Demolish button in inspect modal per [05-map §Demolish](./05-map.md)
- 50% refund calculation from `building.spent` field
- Confirmation prompt with refund preview
- Demolish animation: scale-shrink + smoke puff
- Network graph re-evaluation on demolish (may trigger brownout or resolve one)
- Auto-paths re-compute on demolish

### Acceptance gate
- Click a Workshop T2 (built T1=300⛓+200⚡, upgraded +750⛓+500⚡ → total spent 1050⛓+700⚡).
- Click Demolish → confirmation shows "Refund: 525⛓ + 350⚡".
- Confirm → building disappears with smoke puff, refund credited.
- Demolish a windmill → all in-coverage demanders re-evaluate, brownout possible.

---

## Phase 12 — Factoid delivery (12-20 hours code + ongoing content authoring)

### Deliverables
- `src/catalog/factoids.ts` — loads `public/content/factoids.json`, returns random factoid for given trigger key
- `src/mecha-senku/speech-bubble.ts` extended: render factoid block with gold side-bar + ☞ glyph + proper-noun gold-highlighting per [06-style §Bubble format with factoid](./06-style.md)
- Bubble persistence: 10s when factoid attached
- **Content authoring phase begins**: ~330 factoid strings across building catalog (×3 tiers) + research nodes + milestones + resources + materials per [06-style §Factoid content scope](./06-style.md). **Captain's recommended split**: arcs 1-4 fully authored for v1 ship, arcs 5-7 stubbed `TODO v1.x`.

### Acceptance gate
- Place a Workshop T1 → bubble shows operational message + factoid about workshops/iron-working history.
- Build → upgrade → research → all carry factoids when content exists; fall back to operational-only when factoid missing.
- Factoids render with the canonical visual format (gold bar, ☞ glyph, gold proper nouns).

### Risks
- **Content authoring tedium underestimated**. ~330 strings × ~2 minutes per fact-research + writing = ~11 hours just for the arcs-1-4 subset (~150 factoids). **Mitigation**: this is a parallel asset-track task; chip away at it over the whole implementation period; arcs 1-4 fully done is the v1 gate, not all 330.

---

## Phase 13 — Overlays (8-12 hours)

### Deliverables
- Overlays panel in HUD per [05-map §Overlay views](./05-map.md)
- 4 toggleable layers + Hide-paths toggle: Power / Resource-per-resource (5 options) / Storage / Hide-paths
- Render-layer effects (tint, fade, highlights) per the spec in [05-map](./05-map.md)
- Multiple overlays can stack (Power + Hide-paths simultaneously)

### Acceptance gate
- Click Overlays panel → toggle Power overlay → coverage halos jump to 50% alpha, chain lines thicken, brownout networks turn red.
- Toggle Knowledge resource overlay → only 📚-producing buildings glow; others fade to 30%.
- Toggle Storage overlay → silo buildings highlighted with fill-bars.
- All overlay toggles instant, no scene transition.

---

## Phase 14 — Animations (16-24 hours)

### Deliverables
- Per-building idle animations for **arcs 1-4 buildings** (~40 buildings × 2-4 sprite frames each, ~120 frames; mostly Phaser tween-based per [02-game-logic §Animation philosophy](./02-game-logic.md) to minimize sprite-frame count)
- Arcs 5-7 building idle animations stubbed `TODO v1.x`
- Universal-event tweens fully polished (construction / upgrade / demolish / brownout / power-on / milestone / off-grid)
- Water terrain 4-frame animation (the one terrain that animates baseline per [06-style §Terrain art](./06-style.md))
- Power-line traveling-spark animation
- Frontier-unlock per-tile fade-in sweep

### Acceptance gate
- Walk through the city → every building has a distinct idle animation that conveys what it does (steam from coal plant, wheel rotation on watermill, hammer strikes in workshop, etc.).
- Build a new building → drops in with elastic bounce + dust puff.
- Brownout triggers → coverage halos shake + tint red.
- Milestone reached → frontier tile sweep + gold-shimmer ring + Mecha Senku captain emotion.

### Risks
- **Animation polish is bottomless**. **Mitigation**: ship arcs 1-4 fully animated, arcs 5-7 with idle = "subtle alpha pulse" placeholder (the one thing we said not to do, but acceptable as v1.x TODO marker).

---

## Phase 15 — Polish + ship prep (16-24 hours)

### Deliverables
- Balance pass on tool yields (numbers tuned from real playtest data — by phase 15 you've been earning real resources for ~12 weeks)
- Edge cases: brownout-during-build, off-grid placement of a generator (it powers itself), demolishing the last gen in a network
- Captain's Log scrollback UX polish (search, filter by trigger type)
- Save/load resilience: corrupted state.json → load default + show recovery banner
- Error handling: hook crashes / network unreachable / atlas load fails → graceful Mecha Senku error messages, not white-screen-of-death
- README at project root: bootstrap instructions, screenshots, gif of gameplay
- LICENSE.md (captain's call — defaults to MIT or CC-BY-NC unless co-captain specifies)
- Vitest unit-test pass per [08-architecture §Test scope v1](./08-architecture.md)
- Final visual pass: every UI element conforms to [06-style §Pixel-art principles](./06-style.md)
- **v1.x backlog file** consolidating all deferred items (see [§v1.x backlog](#v1x-backlog) below)

### Acceptance gate
- Closed-room playthrough: open the game fresh, build a starter village, hit Milestone 1 (Stone World boss). No crashes, no broken visuals, no missing factoids in arcs 1-4.
- Run all Vitest tests → green.
- Reload game 10 times → state persists correctly each time.

---

## Parallel asset track (runs alongside phases 4-15)

Code and assets are parallelizable. Captain's-eye asset-effort estimates:

| Asset class | Effort (hours) | Phase it's needed by |
|---|---|---|
| Terrain tile art (6 types × ~3 variants each, 128×128 source) | 8-12 | Phase 4 |
| Mecha Senku 5 emotions × 4 frames + 3 one-shots (~26 frames) | 16-24 | Phase 9 |
| HUD chassis (modal frame 9-slice + buttons + speech-bubble 9-slice + ~6 misc) | 8-12 | Phases 3-5 |
| Building sprites — arcs 1-4 (~40 buildings, AI-gen + Aseprite touch) | 30-50 | Phases 5-7 |
| Building sprites — arcs 5-7 (~25 buildings, structural sprites OK) | 12-20 | Phase 15 (or v1.x) |
| Auto-tile dirt-path 16-tile bitmask | 4-6 | Phase 4 |
| Universal-event overlay sprites (smoke puff, dust, gold ring, spark) | 4-8 | Phase 14 |
| Power-line line drawing + traveling-spark | 2-3 | Phase 7 |
| **TOTAL ASSET** | **~84-135 hours** | |

Asset track can run **in parallel** with code phases. Captain's recommended split: dedicate one focused weekend per month to a heavy asset-sprint, fill in incrementally between code sessions.

---

## Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **AI-gen sprite visual coherence drifts** | High | Medium | Aseprite palette-quantization on every output enforces ≤16 colors per sprite + Ryusui palette; reject obvious outliers and re-gen |
| 2 | **Hook performance > 50ms** | Low | High | Profile during phase 2; cache state read across rapid successive calls; abort if a single call exceeds budget |
| 3 | **Concurrency: hook + game write race** | Medium | Low | Last-writer-wins accepted v1; instrument captain's log for "two writes < 50ms apart"; add `proper-lockfile` v1.x if observed |
| 4 | **Factoid authoring tedium underestimated** | High | Low (graceful fallback) | Bubble falls back to operational-only when factoid missing; ship arcs 1-4 only, mark arcs 5-7 TODO v1.x |
| 5 | **PostToolUse event payload shape changes between Claude Code versions** | Medium | Medium | Defensive parsing + silent fallback to "+1 innovation" reward + error log to `~/StoneWrld/hook-errors.log` |
| 6 | **Co-captain attention drifts** (2-month survival metric from [01-vision §80](./01-vision.md) at risk) | Unknown | Existential | Mitigated by the factoid mechanic — every interaction teaches something. If retention is the real risk, the learning-as-reward is the antidote. |
| 7 | **Tiled / `.tmx` learning curve** | Low | Low | Hand-write JSON for v1 if Tiled friction; ~30 minutes to author 768 cells |
| 8 | **Phaser scene-event bus complexity at scale** | Low | Low | Typed event names + central event-name constants file; refactor to RxJS or similar if it ever becomes a tangle |
| 9 | **Sprite atlas size exceeds 4096×4096** | Low | Low | Multiple atlases per category already planned; split further if needed |
| 10 | **Tool-yield balance feels off** | High | Low | Single-file `tool-yields.json` is the tuning lever; rebalance freely during v1 weeks |

---

## v1.x backlog (already-deferred items consolidated)

All decisions across the design phase that explicitly punted to v1.x. Captured here so they don't get lost.

### From [01-vision](./01-vision.md)
- **Wallpaper export** (§10) — game window only in v1; wallpaper as separate exporter v2 candidate

### From [02-game-logic](./02-game-logic.md)
- **File-locking via `proper-lockfile`** — if concurrency collisions surface

### From [04-buildings](./04-buildings.md)
- **Arcs 5-7 buildings polished** — currently structurally listed; idle animations + lore stubbed `TODO v1.x`
- **Per-building Sprite-source column rewrite** — currently legacy "CC0 pixel pack" notes; should be normalized to AI-gen primary
- **Dwelling population mechanic** (§5) — pure decoration v1; population gameplay v2

### From [05-map](./05-map.md)
- **Per-pole in-place upgrade** — currently demolish-and-replace
- **Adjacency / wiring requirements** — currently none (besides naval+water, rocket+concrete)
- **Power-pole as Factorio-style logistics puzzle** — currently flavor-only
- **Terrain mechanic expansion** — water gating for naval, concrete for rockets only in v1; mining-prefers-stone etc. as v1.x

### From [06-style](./06-style.md)
- **Sound** — v1 silent; 4 chimes (build-complete, upgrade, brownout, milestone) deferred + sound spec doc as its own v1.x artifact
- **CRT-scanline filter** — optional toggle
- **Day/night cycle** — time of day is always bright pixel-art noon in v1
- **Weather** — rain/snow etc.
- **Mecha Senku additional emotions** (thinking, disappointed) — currently 5 looping + 3 one-shots

### From [07-references](./07-references.md)
- **Higher-res CC0 packs** if a 128px+ top-down industrial pack ever surfaces

### From [08-architecture](./08-architecture.md)
- **Browser UI tests** (Playwright MCP) — manual click-test for v1
- **Electron / Tauri packaging** — browser tab + `systemd --user` for v1
- **`proper-lockfile`** for concurrency mitigation
- **Multi-process concurrency hardening**

### New from [09-roadmap](./09-roadmap.md)
- **Arcs 5-7 building idle animations** — fall back to subtle alpha pulse placeholder
- **Captain's Log search + filter UX**
- **Tooltip animations / hover polish**

---

## Final ship checklist (v1 ships when ALL true)

- [ ] All 9 design docs locked
- [ ] All 15 phases at acceptance gate
- [ ] All Vitest tests green
- [ ] `tsc --noEmit` clean
- [ ] `npm run build` succeeds → `dist/` is < 50 MB
- [ ] `npm run preview` runs the production build at `localhost:5101`
- [ ] PostToolUse hook average invocation < 50ms (measured)
- [ ] State.json corruption test: kill `npm run dev` mid-write → state.json still valid (atomic write proven)
- [ ] Hook crash test: hook script throws → Claude Code session continues normally (hook is graceful)
- [ ] Full playthrough: starter village → Stone World milestone → no crashes, no missing factoids in arcs 1-4
- [ ] All arc-1-4 buildings have idle animations
- [ ] All arc-1-4 buildings have factoids
- [ ] Mecha Senku all 5 emotions + 3 one-shots rendered
- [ ] HUD chassis pixel-perfect at every integer zoom
- [ ] LICENSE.md present
- [ ] README.md at project root has bootstrap instructions + 1-paragraph elevator + gameplay gif
- [ ] v1.x backlog file (`docs/v1x-backlog.md`) consolidates all deferred items
- [ ] Co-captain has played for 1 full week with no game-breaking bugs

---

## What ships in v1 vs what doesn't

### v1 ships
- Full 5-resource economy from Claude Code work
- ~67 buildings × 3 tiers, all buildable, all upgradeable, all demolishable (50% refund)
- 85-node research tree with cross-branch dependencies
- 7 milestones with district-expansion unlocks
- Power coverage networks with poles + per-network brownout
- 5 silos with cap enforcement
- Static canonical 32×24 map with 6 terrain types + naval/rocket terrain gates
- 5 toggleable overlays (Power / 5×Resource / Storage / Hide-paths)
- Mecha Senku speech bubble + Captain's Log scrollback
- Factoid delivery on arc-1-4 buildings + all research nodes + milestones
- Per-building idle animations for arc-1-4 buildings
- Universal-event animations (build/upgrade/demolish/brownout/milestone)
- Save/load with atomic-write integrity
- PostToolUse hook firing on all Claude Code work
- Browser-tab packaging via Vite dev server

### v1 does NOT ship (see [§v1.x backlog](#v1x-backlog))
- Wallpaper export
- Sound
- Arcs 5-7 building polish (animations + factoids stubbed)
- Demolish cooldowns
- Population mechanic for dwellings
- Day/night, weather
- CRT filter
- Multi-process file-locking
- Electron / Tauri packaging
- Playwright browser tests
- Per-pole in-place upgrade
- Adjacency / wiring puzzles

---

## Decisions locked in this doc

| # | Decision | Choice |
|---|---|---|
| 1 | Cadence assumption | **5-10 focused hours per week**; target ~14-18 elapsed weeks for v1 ship |
| 2 | Total effort estimate | ~155-220 hours code + ~84-135 hours asset track ≈ **~235-360 total hours** |
| 3 | Phase count | **15 phases** + parallel asset track |
| 4 | First-playable milestone | **Phase 3** — visible end-to-end loop after ~25-40 hours of work |
| 5 | Gameplay-complete milestone | **Phase 7** — power networks working; everything after is polish/depth |
| 6 | Asset/code parallelization | Asset track runs in parallel; recommended one focused weekend / month on asset sprint |
| 7 | v1.x boundary | **Arcs 1-4 fully polished, arcs 5-7 structurally complete + animations/factoids stubbed** |
| 8 | Risk mitigation priorities | Top 3: AI-gen consistency (Aseprite enforcement), Hook performance (profile in phase 2), Factoid tedium (graceful fallback) |
| 9 | Final ship gate | 16-item checklist (see [§Final ship checklist](#final-ship-checklist-v1-ships-when-all-true)) |
| 10 | v1.x backlog discipline | All deferred items consolidated into `docs/v1x-backlog.md` at ship time |

---

## When 09-roadmap locks

Design phase closes. All 9 docs locked. **Implementation begins at Phase 0.**

The first concrete next step after lock:
1. Commit the locked design docs (single commit, `docs: lock all 9 design docs for v1`).
2. Tag the design-lock state (`design-locked-v1`).
3. Start Phase 0.

**Captain's-eye prediction**: phase 0 + 1 + 2 + 3 (the first-playable milestone) reachable in **3-5 weeks elapsed** at the steady cadence. The first time you see your HUD tick up from real Claude work will be the most dopamine-rich moment of the entire project. Captain wants that moment for you, fast.

*Anchors stowed. Course charted. The captain stands by for the lock signal.*
