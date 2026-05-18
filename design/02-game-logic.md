# 02 — Game logic

> STATUS: **locked** (2026-05-18)

The rules that make the [01-vision](./01-vision.md) dopamine moments actually work. Resources, yields, passive trickle, power model, storage, upgrade economics, animation philosophy, mascot role, and the full game-time loop.

Progression mechanics (milestones, research tree, building unlock dependencies) live in [03-progression](./03-progression.md).

---

## Resource model

Five currencies, each earned from a distinct tool family. The split is intentional: **different work shapes feel different.** A research day fills 📚🔭, a build day fills ⚡, a CI-grinding day fills ⛓🏁.

| Resource | Glyph | Earned from | Captures the "kind" of work |
|---|---|---|---|
| **Knowledge** | 📚 | `Read`, `Glob`, `NotebookRead` | Studying what exists. Reading code, finding files. |
| **Discovery** | 🔭 | `Grep`, `WebFetch`, `WebSearch` | Outward exploration. Searching, fetching, scouting. |
| **Iron** | ⛓ | `Bash` (default) | Raw labor. Running scripts, builds, tests, deploys. |
| **Innovation** | ⚡ | `Edit`, `Write`, `MultiEdit`, `NotebookEdit` | Building new. Code changes, new files. |
| **Completion** | 🏁 | Ship-events (commit, push, PR create), passing tests, subagent completion | Shipping the thing. The bonus resource — earned only when work concludes, not during the work. |

### Tool → resource yield table

Starting numbers — will tune over the first 2 weeks of real play.

| Tool / event | Resource | Yield |
|---|---|---|
| `Read` | 📚 Knowledge | +1 |
| `Glob` | 📚 Knowledge | +1 |
| `NotebookRead` | 📚 Knowledge | +2 |
| `Grep` | 🔭 Discovery | +2 |
| `WebFetch` | 🔭 Discovery | +3 |
| `WebSearch` | 🔭 Discovery | +3 |
| `Bash` (default) | ⛓ Iron | +1 |
| `Edit` | ⚡ Innovation | +3 |
| `Write` | ⚡ Innovation | +4 |
| `MultiEdit` | ⚡ Innovation | +5 |
| `NotebookEdit` | ⚡ Innovation | +4 |
| `Bash` matching `git commit` exit 0 | 🏁 Completion | **+20** |
| `Bash` matching `git push` exit 0 | 🏁 Completion | **+10** |
| `Bash` matching `gh pr create` exit 0 | 🏁 Completion | **+15** |
| `Bash` matching `npm test`/`pytest`/etc. exit 0 | 🏁 Completion | +5 |
| `PostToolUseFailure` | 📚 Knowledge | +1 (lesson learned) |
| `TaskCreate` / `TaskCompleted` | 🏁 Completion | +2 each |

### Subagent attribution

Each subagent completion grants resources matching its primary work shape:

| Subagent | Primary resource | Yield on completion |
|---|---|---|
| `senku-scientist` | 📚 Knowledge | +10 |
| `chrome-mechanic` | ⚡ Innovation | +10 |
| `gen-negotiator` | ⚡ Innovation | +8 |
| `suika-scout` | 🔭 Discovery | +10 |
| `kohaku-guard` | 🏁 Completion | +8 |

### No anti-abuse caps

No per-call cap. No per-hour soft cap. No identical-call deduplication. Every tool call awards every time. Co-captain explicitly opted out of abuse-prevention — trust-based design. If abuse becomes a real-world problem (it shouldn't, single-player single-machine), we add caps later.

---

## Passive trickle

Buildings produce resources passively over time. Slow by design — passive is the floor, active work is the ceiling.

### How it works

Every building at every tier declares a `passive_per_hour` rate in the building catalog ([04-buildings.md](./04-buildings.md)). When the game opens, compute:

```
hours_since_last_open = clamp(0, 72, (now - state.last_session_close_at) / 3600)
for each building b in city:
  for each resource r in b.tier_N.passive_per_hour:
    state.resources[r] += b.tier_N.passive_per_hour[r] * hours_since_last_open * power_multiplier(b)
```

- `power_multiplier(b)` is **1.0** when the building has power, **0.0** during brownout (see Power section).
- The 72-hour clamp = trickle cap: max accrual per session window. Covers a weekend + skip-day; longer absences don't accumulate further. *Even Senku's village can only stockpile so much before storage runs out — which links to the silo system below.*

### Sense of scale (starter numbers)

| Building | Tier | Passive per hour |
|---|---|---|
| Alchemy lab | T1 | +1 📚 |
| Alchemy lab | T3 | +5 📚 (T1 × 6 / 2.5 ≈ 5, see Upgrade math) |
| Workshop | T1 | +1 ⛓ |
| Workshop | T3 | +5 ⛓ |
| Observatory | T1 | +1 🔭 |
| Observatory | T3 | +5 🔭 |
| Sulfa factory | T3 (endgame) | +2 🏁 (rare resource, low rate) |

A modest city (5 T1 buildings) trickles ~5 resources/hour. Active work earns 5-20 in a single coding minute. **Passive is a slow background hum; active is the real engine.**

---

## Power model

[01-vision §Dopamine #5](./01-vision.md) names the brownout warning as one of the named dopamine moments. Power planning is a real strategy mechanic.

### Capacity vs demand

Every building has:
- `power_demand`: integer ≥ 0 (zero for early manual-labor buildings; rises with tier and category)
- `power_capacity`: integer ≥ 0 (non-zero only for power-generation buildings)

City has a global pool:

```
city_capacity = sum(power_capacity over all power-generation buildings)
city_demand   = sum(power_demand over all non-power buildings)
```

### Three states

1. **`ok`** — `city_capacity ≥ city_demand`. Everything runs at 100% passive trickle.
2. **`tight`** — `city_demand > city_capacity × 0.8` but still ≤ capacity. UI shows amber warning. Trickle still 100% but the player is on notice.
3. **`brownout`** — `city_demand > city_capacity`. **All non-power buildings' trickle drops to 0** until capacity is restored. UI shows red banner: *"Storm on the power grid — capacity ${capacity}, demand ${demand}."*

**Why 0% (not partial)**: co-captain's call — *"no power means no production"*. Real-world Senku-logic. Forces the player to fix the grid before resuming output.

### Early-game grace

Brownout only activates **after the first power-generation building is built**. Before that, all buildings have implicit power = 0 demand = 0 (manual / muscle / fire-based, in-canon). The Stone World milestone is unconstrained; power-grid planning unlocks only when the player chooses to build a windmill or watermill.

### Power-generation building preview

(Full power-tech progression in [03-progression.md §Branch 2](./03-progression.md). Sample for context:)

| Building | Tier | Capacity | Demand |
|---|---|---|---|
| Windmill | T1 | +3 | 0 |
| Watermill | T1 | +5 | 0 |
| Hydroelectric Dam | T1 | +15 | 0 |
| Steam Plant | T3 | +60 | 0 |
| Coal Plant | T3 | +120 | 0 |
| Nuclear Reactor | T3 | +500 | 0 |

---

## Storage / silos

A late-add per co-captain — **each resource has its own silo building, upgradeable, defines max capacity for that resource.** Pure Dr. Stone canon: you can't stockpile sulfur without a warehouse.

### How it works

| Resource | Silo building |
|---|---|
| 📚 Knowledge | **Library** (T1 → T2 → T3) |
| 🔭 Discovery | **Map Archive** (T1 → T2 → T3) |
| ⛓ Iron | **Foundry Stockpile** (T1 → T2 → T3) |
| ⚡ Innovation | **Workshop Storage** (T1 → T2 → T3) |
| 🏁 Completion | **Trophy Hall** (T1 → T2 → T3) |

Each silo defines the **max capacity** for its resource. No silo built = baseline cap of **1000**. With silo T1 = 5,000. T2 = 20,000. T3 = 100,000.

### Cap behavior

When `state.resources[r] > max_capacity(r)`:
- Active work awards stop at the cap (overflow is lost).
- Mecha Senku speech: *"Storage's full — Library upgrade or this Knowledge spills off the deck."*
- Passive trickle also clips at the cap (no overflow accumulation).

This creates a real building-incentive loop: as you advance through the tech tree, you need bigger silos to support bigger purchases. Building a Sulfa Factory T3 (multi-thousand-resource cost) requires a Foundry Stockpile T2 first to even hold the iron you need to spend.

---

## Upgrade economics

Every building has 3 tiers. Upgrade math defines costs + outputs.

### Cost formula

For building B with tier-1 base cost `C₁`:
- **T2 upgrade cost**: `C₁ × 2.5`
- **T3 upgrade cost**: `C₁ × 6.0`
- **Total spent if fully upgraded**: `C₁ × 9.5`

Example — Workshop with T1 base `100⛓ + 80⚡`:
- T1 build: pay `100⛓ + 80⚡`
- Upgrade to T2: pay another `250⛓ + 200⚡`
- Upgrade to T3: pay another `600⛓ + 480⚡`

### Output formula

Passive trickle scales with cost ratio so **ROI per tier is constant**:
- T1 rate: `R₁`
- T2 rate: `R₁ × 2.5`
- T3 rate: `R₁ × 6.0`

### Tier unlock rules

- **T2 of any building**: unlocks when you've built ≥1 T1 of that building.
- **T3 of any building**: unlocks when ALL true:
  - You have ≥1 T2 of that building
  - You have built ≥3 distinct buildings in that category (Production / Power / Materials / etc.)
  - Category-specific research prereq is met (defined in [03-progression.md](./03-progression.md))

---

## Animation philosophy

Every visible state in the city is animated, but **the technique varies by event type**.

### Per-building thematic idle animations (the rule)

Each building has its **own thematic idle animation** — not a generic alpha pulse, not a generic shake. The animation reflects what the building *does*:

| Building | Idle animation |
|---|---|
| Coal plant | Steam rising from chimneys, drifting upward, fading |
| Sulfa factory | Sulfur (yellow particles) flowing through pipes |
| Watermill | Water wheel rotating, water droplets falling |
| Wind turbine | Blades rotating |
| Workshop | Hammer striking the anvil, sparks |
| Alchemy lab | Bubbling beaker, occasional flash from the door |
| Observatory | Telescope slowly rotating, star twinkling above the dome |
| Telephone exchange | Tiny blinking light on the operator board |
| Library / silos | (subtle) Steam from a candle, parchment flapping at edge |
| Settler hut | Smoke from chimney |
| (etc) | Captured per-building in [04-buildings.md](./04-buildings.md) |

These are 2-4 sprite frames cycling at ~2-4 fps, OR Phaser tween animations on the static sprite (rotation, alpha, position) — whichever is cheaper per building.

### Universal events use tweens (the cheap shared library)

These animations apply to *any* building and don't require new sprites:

- **Construction (new build)**: building drops in from above with elastic-bounce ease (~400ms)
- **Upgrade reveal**: scale-pulse 1 → 1.3 → 1 + brief flash + sprite swap to next-tier
- **Brownout**: small x-jitter shake every ~2s, color desaturate slightly
- **Power-on (brownout resolved)**: brief warm-color tint pulse, return to normal idle

### What we are NOT doing

- **No alpha pulse for generic idle.** Every building has thematic idle or stays still.
- **No floating "+47📚" numbers** drifting up over the city. Resource gains are reported by Mecha Senku in the message bar (see below). Cleaner, less casino-juice, more deliberate.

---

## Mecha Senku — the mascot / narrator

A pixel-art character who delivers every message: gains, unlocks, brownouts, milestones reached.

### His role

- **Message delivery**: every game event (deposit of resources from the last session, completed build, completed upgrade, brownout, research unlocked, milestone reached) is voiced by Mecha Senku in a speech bubble or bottom-panel quote.
- **Captain's-log voice**: same Ryusui captain energy from `~/.claude/CLAUDE.md`, but channeled through Senku's "10 billion percent" flavor. *"Hoshii — 47 Knowledge in the hold from the last watch."* / *"10 billion percent — Sulfa Synthesis unlocked, captain."* / *"Storm on the grid — capacity 12, demand 18. Build power or strike a workshop."*
- **Reactive emotion**: idle (smug-blink), excited (gain / unlock), worried (brownout), proud (milestone), captain-ish (Perseus unlock).

### Visual + character design

Captured in [06-style.md](./06-style.md) — the pure-retro pixel Mecha Senku character with sprite frames for each emotion. Not in scope for this doc.

### Why he exists

Without a narrator the game becomes silent number-pumping. With him, every event has voice. Plus he's the in-game embodiment of the Dr. Stone persona — bridges the Ryusui captain voice from CLAUDE.md into the game itself.

---

## Game-time loop

Tying it all together.

### While the game window is OPEN

1. Each frame: render city, listen for clicks.
2. On click: build / upgrade / inspect / open research map / open silo upgrade — all **instant** (per [01-vision §Decisions #5](./01-vision.md)).
3. On state change: persist `state.json` (atomic write: write `.tmp` + rename).
4. Mecha Senku delivers messages on every event.

### While the game window is CLOSED

1. Claude Code's PostToolUse hook fires on every tool call.
2. Hook reads tool name + Bash matchers (commit / push / pr / tests), computes resource delta, atomically updates `state.json`.
3. No game loop runs — only the hook touches state.

### Game window OPENS

1. Load `state.json`.
2. Compute `hours_since_last_open = clamp(0, 72, (now - last_session_close_at) / 3600)`.
3. Apply passive trickle (capped at 72h; respect brownout = 0%; clip at silo caps).
4. Update `state.last_session_open_at = now`.
5. Mecha Senku delivers the "deposit report": *"Plunder from the last watch: +47📚, +12🔭, +89⛓, +63⚡, +2🏁."*
6. Hand off to render loop.

### Game window CLOSES

1. Persist `state.last_session_close_at = now`.
2. Atomic write `state.json`.
3. Hook continues to update `state.json` while the window is closed.

### Concurrency note

Game window and Claude Code hook may both write to `state.json`. Atomic writes (`.tmp` + rename) protect against partial-write corruption, but **last-writer-wins** for content. Risk window is milliseconds. For v1, captain accepts the risk — both sides write infrequently. If real collisions surface, file-locking via `proper-lockfile` (npm). Captured in [08-architecture.md](./08-architecture.md).

---

## State.json shape (high-level, full schema in 08-architecture.md)

```json
{
  "version": 1,
  "last_session_open_at": "2026-05-18T09:00:00Z",
  "last_session_close_at": "2026-05-18T11:30:00Z",
  "resources": { "knowledge": 1284, "discovery": 412, "iron": 2103, "innovation": 1502, "completion": 87 },
  "buildings": [
    { "id": "settler_hut", "tier": 1, "instances": 1, "x": 4, "y": 3 },
    { "id": "workshop", "tier": 2, "instances": 1, "x": 5, "y": 3 },
    { "id": "watermill", "tier": 1, "instances": 1, "x": 6, "y": 4 }
  ],
  "research": {
    "researched": ["stone_tools", "fire", "charcoal_making"],
    "in_progress": null
  },
  "milestone": "kingdom_of_science",
  "stats": {
    "total_active_earned": { "knowledge": 1500, "iron": 2300, ... },
    "total_passive_earned": { "knowledge": 184, "iron": 103, ... },
    "session_count": 42
  }
}
```

---

## Decisions locked in this doc

| # | Decision | Choice |
|---|---|---|
| 1 | Brownout severity | **0% production** during brownout |
| 2 | Subagent yields | **+10** of primary resource per subagent completion (+8 for gen / kohaku) |
| 3 | Ship-event detection | **commit +20, push +10, PR create +15**, test-pass +5 |
| 4 | Trickle cap | **72 hours** offline accrual |
| 5 | Anti-abuse caps | **None** — trust-based, no caps |
| 6 | Storage / silos | **In v1** — Library, Map Archive, Foundry Stockpile, Workshop Storage, Trophy Hall (5 silo buildings, 3 tiers each) |
| 7 | Animation idle | **Per-building thematic** (steam, sulfur flow, wheel rotation, hammer strike) — NOT generic alpha pulse |
| 8 | Resource-gain animation | **Mecha Senku speech bubble**, NOT floating numbers |
| 9 | Universal event animations | **Tween-based** (construction drop, upgrade scale-pulse, brownout shake) — shared library, no per-building sprite cost |
| 10 | Mascot / narrator | **Mecha Senku** — pixel-art robotic Senku, delivers all in-game messages, character design in 06-style |

---

When 02-game-logic locks (✓ done), we move to **03-progression.md** — milestones (7 Dr. Stone arcs) + research tree (10 branches, ~70-90 tech nodes, cross-branch DAG dependencies).
