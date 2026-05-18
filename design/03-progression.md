# 03 — Progression: milestones and research tree

> STATUS: **draft** — first working version. Co-captain reviews, redirects, locks.

The long-arc structure of the game. **7 milestones** matching Dr. Stone canon arcs. **10 tech branches** with **cross-branch dependencies** (it's a DAG, not 10 parallel chains). **~80 named research nodes** total — each with cost, prerequisites, and what it unlocks.

Per [01-vision §Decisions](./01-vision.md) and [02-game-logic §Storage and §Animation](./02-game-logic.md), research is **Minecraft-achievement-style**: you pay resources to unlock a tech node; researched techs unlock buildings and/or enable further research. The research UI is a separate map view from the city.

---

## Milestone structure

The 7 milestones mirror Dr. Stone's canon arc progression. Each milestone unlocks a tier of researches in multiple branches; researching the milestone's **boss tech** + building its **boss building** advances you to the next milestone.

| # | Milestone | Boss research | Boss building | Canon arc reference |
|---|---|---|---|---|
| 1 | **Stone World** | Sulfuric Acid | Alchemy Lab T1 | Senku awakens, primitive village, fire/charcoal/glass |
| 2 | **Kingdom of Science** | Steel Production | Steel Foundry T1 | Iron-age village established, foundry, soap |
| 3 | **Phone Era / Stone Wars** | Telephony | Telephone Exchange T1 | Famous phone-building map arc, sulfa drug, Tsukasa resolution |
| 4 | **Perseus Voyage** | Perseus Hull | Perseus Dock T1 | Naval sailing arc — Japan to South America. *Mid-game.* |
| 5 | **World Tour / Petrification Reversal** | Nital Reagent | Depetrification Lab T1 | Reviving allies worldwide, world-map travel, oil refining |
| 6 | **Whyman / Moon Signal** | Long-wave Communication | Deep-space Radio T1 | Learning petrification came from the moon, silicon/electronics maturity |
| 7 | **Moon Mission** *(endgame)* | Cryogenic Rocketry | Rocket Launch Pad T1 | Current 2026 manga frontier — rocket to the moon |

**Milestone gating**: when you complete the boss research AND construct the boss building, the next milestone activates. The tech-tree map reveals the next tier of researches (previously locked nodes become "available").

---

## Branch definitions (10)

Each tech belongs to one branch. Branches are organizational categories; **dependencies cross branches freely** (a Power tech can require a Materials tech can require a Chemistry tech, etc.).

| # | Branch | Scope |
|---|---|---|
| 1 | **Materials & Processing** | Mining + refining raw materials. Iron, copper, steel, aluminum, silicon, oil refining, plastic production. |
| 2 | **Power Generation** | Producing mechanical work or electricity. Manual / fire / windmill / hydro / steam / coal / petrol / solar / wind / nuclear. |
| 3 | **Chemistry** | Substances and compounds (not power, not raw refining). Sulfuric acid, soap, polymers, nital reagent. |
| 4 | **Construction** | Building techniques. Mud brick → stone masonry → concrete → steel frame. |
| 5 | **Mechanics & Engineering** | Machines and moving parts. Wheel, gear, steam engine, combustion engine, automation. |
| 6 | **Electronics** | Electricity *usage* (NOT generation). Battery, lightbulb, transistor, IC, CPU, computer. |
| 7 | **Communication** | Sending information at distance. Telegraph → radio → telephone → wireless → long-wave. |
| 8 | **Naval** | Vessels and ships. Raft → sailboat → steamship → Perseus. |
| 9 | **Medicine** | Health, biology, petrification reversal. Sulfa drug → antibiotics → nital reagent → cryogenics. |
| 10 | **Space** | Rocketry and moon arc. Rocketry → orbital mechanics → cryogenic fuel → moon mission. |

---

## Tech catalog (by milestone)

Format per tech:

> **Tech Name** *(Branch — cost: resources)*
> Prereqs: list — Unlocks: buildings / enabled techs

Cost scaling per milestone: ~3-5× per arc. Stone World ~5-100 of relevant resources; Moon Mission ~25,000-500,000.

---

### Milestone 1 — Stone World

**Goal**: research **Sulfuric Acid** + build **Alchemy Lab T1** → advances to Kingdom of Science.

- **Stone Tools** *(Materials — free starter)*
  Prereqs: none — Unlocks: Stone Mine; enables Wood Cutting, Wheel, Mud Brick
- **Fire** *(Power — 5⛓)*
  Prereqs: Stone Tools — Unlocks: Hearth; enables Charcoal Making, Pottery
- **Wood Cutting** *(Materials — 10⛓)*
  Prereqs: Stone Tools — Unlocks: Lumber Pile; enables Wheel, Mud Brick, Wood Frame
- **Mud Brick** *(Construction — 15⛓+10⚡)*
  Prereqs: Wood Cutting, Fire — Unlocks: Settler Hut; enables Stone Masonry
- **Wheel** *(Mechanics — 20⚡+10⛓)*
  Prereqs: Wood Cutting — Unlocks: Cart; enables Watermill, Windmill, Lever, Gear
- **Lever** *(Mechanics — 15⚡+10⛓)*
  Prereqs: Wheel — Unlocks: enables Pulley System
- **Charcoal Making** *(Materials — 30⛓+15📚)*
  Prereqs: Fire, Wood Cutting — Unlocks: Charcoal Kiln; enables Iron Smelting, Glass Making
- **Pottery** *(Materials — 25⛓+15⚡)*
  Prereqs: Mud Brick, Fire — Unlocks: Pottery Kiln; enables Glass Making
- **Herbal Remedies** *(Medicine — 30📚)*
  Prereqs: none — Unlocks: Herbalist Hut (+1🏁 / hr at T1)
- **Sulfur Extraction** *(Chemistry — 40⛓+30📚)*
  Prereqs: Stone Tools, Mud Brick — Unlocks: Sulfur Mine; enables Soap, Sulfuric Acid
- **Soap** *(Chemistry — 50📚+40⛓)*
  Prereqs: Sulfur Extraction, Fire — Unlocks: Soap Workshop (+1🏁 / hr)
- **Sulfuric Acid** *(Chemistry — 80📚+60⛓)* **← MILESTONE 1 BOSS**
  Prereqs: Sulfur Extraction, Charcoal Making — Unlocks: Alchemy Lab T1; enables Battery, Glass Making (high-purity), Antiseptic, Concrete

---

### Milestone 2 — Kingdom of Science

**Goal**: research **Steel Production** + build **Steel Foundry T1** → advances to Phone Era.

- **Iron Ore Extraction** *(Materials — 100⛓+50📚)*
  Prereqs: Stone Tools, Mud Brick — Unlocks: Iron Mine; enables Iron Smelting, Tin Mining, Copper Ore Mining
- **Iron Smelting** *(Materials — 200⛓+80📚)*
  Prereqs: Iron Ore Extraction, Charcoal Making — Unlocks: Iron Smelter (passive ⛓); enables Gear, Steel Production, Stone Masonry
- **Wood Frame Construction** *(Construction — 100⛓+50⚡)*
  Prereqs: Wood Cutting, Stone Tools — Unlocks: Wood Frame buildings
- **Stone Masonry** *(Construction — 150⛓+80⚡)*
  Prereqs: Mud Brick, Iron Smelting — Unlocks: Stone Workshop; enables Watermill, Concrete, Naval Engineering
- **Glass Making** *(Chemistry — 120📚+80⛓)*
  Prereqs: Pottery, Sulfuric Acid — Unlocks: Glassworks; enables Lightbulb, Compass, Silicon
- **Copper Ore Mining** *(Materials — 150⛓+50📚)*
  Prereqs: Iron Ore Extraction — Unlocks: Copper Mine
- **Copper Smelting** *(Materials — 200⛓+80📚)*
  Prereqs: Copper Ore Mining, Charcoal Making — Unlocks: Copper Smelter; enables Bronze, Battery, Telegraph
- **Tin Mining** *(Materials — 120⛓+50📚)*
  Prereqs: Iron Ore Extraction — Unlocks: Tin Mine
- **Bronze Alloy** *(Materials — 250⛓+150📚)*
  Prereqs: Copper Smelting, Tin Mining — Unlocks: Bronze Foundry
- **Gear** *(Mechanics — 200⚡+100📚)*
  Prereqs: Iron Smelting, Wheel — Unlocks: enables Watermill, Pulley System, Steam Engine
- **Pulley System** *(Mechanics — 250⚡+150⛓)*
  Prereqs: Gear, Lever — Unlocks: Lifting Frame (construction speed bonus)
- **Watermill** *(Power — 300⛓+200⚡)*
  Prereqs: Wheel, Stone Masonry, Gear — Unlocks: Watermill building (+5 capacity)
- **Windmill** *(Power — 300⛓+200⚡)*
  Prereqs: Wheel, Wood Frame Construction — Unlocks: Windmill building (+3 capacity)
- **Steel Production** *(Materials — 500⛓+300📚)* **← MILESTONE 2 BOSS**
  Prereqs: Iron Smelting, Bronze Alloy, Charcoal Making — Unlocks: Steel Foundry T1; enables Lightbulb, Steam Engine, Naval Engineering, Cobalt Smelting, Reinforced Concrete (future)

---

### Milestone 3 — Phone Era / Stone Wars

**Goal**: research **Telephony** + build **Telephone Exchange T1** → advances to Perseus Voyage.

- **Battery** *(Electronics — 400📚+200⛓+150⚡)*
  Prereqs: Copper Smelting, Sulfuric Acid, Stone Masonry — Unlocks: Battery Cell; enables Lightbulb, Telegraph
- **Lightbulb** *(Electronics — 500⚡+300📚)*
  Prereqs: Battery, Glass Making, Steel Production — Unlocks: Lamp Workshop; enables Radial Lamp
- **Radial Lamp** *(Electronics — 800⚡+500📚)*
  Prereqs: Lightbulb, Glass Making — Unlocks: Radio Lab; enables Radio Telephone, Telephony, Transistor (future)
- **Coal Mining** *(Materials — 1500⛓+800📚)*
  Prereqs: Iron Ore Extraction, Steel Production — Unlocks: Coal Mine; enables Coke Production, Steam Plant
- **Hydroelectric Dam** *(Power — 800⛓+500⚡)*
  Prereqs: Watermill, Stone Masonry, Battery — Unlocks: Hydroelectric Dam (+15 capacity)
- **Steam Engine** *(Mechanics — 1000⛓+600⚡)*
  Prereqs: Iron Smelting, Watermill, Gear — Unlocks: Steam Engine workshop; enables Steam Plant, Steamship, Combustion Engine
- **Steam Plant** *(Power — 1500⛓+800⚡)*
  Prereqs: Steam Engine, Steel Production, Coal Mining — Unlocks: Steam Plant (+20 capacity)
- **Cobalt Smelting** *(Materials — 800⛓+500📚)*
  Prereqs: Iron Smelting, Steel Production — Unlocks: Cobalt Foundry; enables Compass, magnets
- **Telegraph** *(Communication — 600⚡+400📚)*
  Prereqs: Battery, Copper Smelting — Unlocks: Telegraph Office
- **Radio Telephone** *(Communication — 1200⚡+800📚)*
  Prereqs: Telegraph, Radial Lamp — Unlocks: Radio Hut
- **Telephony** *(Communication — 2500⚡+1500📚)* **← MILESTONE 3 BOSS**
  Prereqs: Radio Telephone, Radial Lamp, Battery — Unlocks: Telephone Exchange T1
- **Antiseptic** *(Medicine — 500📚+300⛓)*
  Prereqs: Soap, Sulfuric Acid, Herbal Remedies — Unlocks: Field Clinic; enables Sulfa Drug
- **Sulfa Drug** *(Medicine — 2000📚+1500⛓+800🔭)*
  Prereqs: Antiseptic, Sulfuric Acid, Glass Making — Unlocks: Sulfa Factory T1 *(canonical Tsukasa-arc payoff)*

---

### Milestone 4 — Perseus Voyage

**Goal**: research **Perseus Hull** + build **Perseus Dock T1** → advances to World Tour.

- **Concrete** *(Construction — 5000⛓+3000⚡)*
  Prereqs: Stone Masonry, Sulfuric Acid — Unlocks: Concrete Workshop; enables Reinforced Concrete (future)
- **Steel Refining** *(Materials — 4000⛓+2500📚)*
  Prereqs: Steel Production, Hydroelectric Dam — Unlocks: Steel Refinery; enables Aluminum, Composites (future), Steel Frame
- **Naval Engineering** *(Naval — 6000⛓+4000⚡)*
  Prereqs: Steam Engine, Steel Production, Stone Masonry — Unlocks: Shipyard; enables Sailboat, Steamship
- **Sailboat** *(Naval — 3000⛓+1500⚡)*
  Prereqs: Naval Engineering — Unlocks: Sailboat dock (small ship)
- **Compass** *(Mechanics — 2000📚+1500🔭)*
  Prereqs: Cobalt Smelting, Glass Making, Battery — Unlocks: enables Navigation, Perseus Hull
- **Steam Boiler / Marine Engine** *(Mechanics — 5000⛓+3000⚡)*
  Prereqs: Steam Engine, Steel Refining — Unlocks: enables Steamship, Refrigeration
- **Refrigeration** *(Mechanics — 3000⚡+2000📚)*
  Prereqs: Steam Engine, Sulfuric Acid (ammonia path) — Unlocks: Cold Storage; enables Cryogenics (future)
- **Steamship** *(Naval — 5000⛓+3500⚡)*
  Prereqs: Sailboat, Steam Boiler — Unlocks: Steamship dock
- **Perseus Hull** *(Naval — 10000⛓+6000⚡+3000📚)* **← MILESTONE 4 BOSS (mid-game flagship)**
  Prereqs: Steamship, Steel Refining, Telephony (ship-to-shore radio), Compass — Unlocks: Perseus Dock T1

---

### Milestone 5 — World Tour / Petrification Reversal

**Goal**: research **Nital Reagent** + build **Depetrification Lab T1** → advances to Whyman / Moon Signal.

- **Oil Extraction** *(Materials — 15000⛓+10000📚)*
  Prereqs: Iron Smelting, Stone Masonry — Unlocks: Oil Well; enables Oil Refinery
- **Oil Refinery** *(Materials/Chemistry — 25000⛓+15000📚+5000🔭)*
  Prereqs: Oil Extraction, Sulfuric Acid, Steel Refining — Unlocks: Oil Refinery building (produces petrol/diesel/lubricant as intermediate goods); enables Combustion Engine, Polymers
- **Combustion Engine** *(Mechanics — 20000⛓+15000⚡)*
  Prereqs: Steam Engine, Oil Refinery, Steel Refining — Unlocks: enables Petrol Generator, Modern Vessel, Rocketry (future)
- **Petrol Generator** *(Power — 25000⛓+15000⚡)*
  Prereqs: Combustion Engine, Oil Refinery — Unlocks: Petrol Generator (+50 capacity)
- **World Map / Cartography** *(Materials [knowledge axis] — 8000📚+5000🔭)*
  Prereqs: Perseus Hull, Telephony — Unlocks: World Map UI feature; enables Nital Reagent
- **Polymers** *(Chemistry — 15000📚+10000⛓+5000🔭)*
  Prereqs: Oil Refinery, Sulfuric Acid — Unlocks: enables Plastic Production, Cryogenic Fuel (future)
- **Plastic Production** *(Materials — 20000📚+15000⛓+5000🔭)*
  Prereqs: Polymers, Oil Refinery — Unlocks: Plastic Factory; enables Integrated Circuit, Composites
- **Antibiotics** *(Medicine — 12000📚+8000⛓+5000🔭)*
  Prereqs: Sulfa Drug, Polymers — Unlocks: Pharmacy
- **Nital Reagent** *(Medicine/Chemistry — 25000📚+18000🔭+12000⛓+8000⚡)* **← MILESTONE 5 BOSS**
  Prereqs: Sulfuric Acid, Polymers, Antibiotics, World Map — Unlocks: Depetrification Lab T1

---

### Milestone 6 — Whyman / Moon Signal

**Goal**: research **Long-wave Communication** + build **Deep-space Radio T1** → advances to Moon Mission.

- **Coke Production** *(Materials — 25000⛓+15000📚)*
  Prereqs: Coal Mining, Steel Refining, Oil Refinery — Unlocks: Coke Oven; enables Coal Plant
- **Coal Plant** *(Power — 35000⛓+20000⚡)*
  Prereqs: Steam Plant, Coke Production, Steel Refining — Unlocks: Coal Plant (+120 capacity)
- **Aluminum Smelting** *(Materials — 30000⛓+15000📚)*
  Prereqs: Steel Refining, Hydroelectric Dam, Sulfuric Acid — Unlocks: Aluminum Refinery; enables Composites, Solar Panel, Wind Turbine
- **Silicon Refining** *(Materials — 30000⛓+20000📚+10000🔭)*
  Prereqs: Glass Making, Oil Refinery, Coal Plant — Unlocks: Silicon Foundry; enables Transistor
- **Transistor** *(Electronics — 40000⚡+25000📚)*
  Prereqs: Silicon Refining, Battery, Aluminum Smelting — Unlocks: enables Integrated Circuit, Wireless
- **Integrated Circuit** *(Electronics — 60000⚡+40000📚)*
  Prereqs: Transistor, Plastic Production — Unlocks: IC Factory; enables CPU
- **CPU** *(Electronics — 100000⚡+60000📚)*
  Prereqs: Integrated Circuit, Silicon Refining, Aluminum Smelting — Unlocks: CPU Foundry; enables Computer, Automation
- **Computer** *(Electronics — 150000⚡+80000📚+30000🔭)*
  Prereqs: CPU, Plastic Production, Telephony — Unlocks: Computer Workshop; enables Orbital Mechanics, Modern Industrial
- **Wireless** *(Communication — 80000⚡+50000📚)*
  Prereqs: Telephony, Transistor, Steel Refining — Unlocks: Wireless Tower; enables Long-wave Communication
- **Long-wave Communication** *(Communication — 120000⚡+80000📚+40000🔭)* **← MILESTONE 6 BOSS**
  Prereqs: Wireless, Computer, Aluminum Smelting, Hydroelectric Dam (massive power) — Unlocks: Deep-space Radio T1

---

### Milestone 7 — Moon Mission *(endgame)*

**Goal**: research **Cryogenic Rocketry / Moon Mission** + build **Rocket Launch Pad T1** → endgame achievement: launch rocket to moon.

- **Reinforced Concrete** *(Construction — 60000⛓+40000⚡)*
  Prereqs: Concrete, Steel Refining, Coal Plant — Unlocks: enables Modern Industrial, Launch Pad
- **Steel Frame Construction** *(Construction — 80000⛓+50000⚡)*
  Prereqs: Steel Refining, Reinforced Concrete, Aluminum Smelting — Unlocks: enables high-rise civic buildings (decorative late-game)
- **Modern Industrial** *(Construction — 120000⛓+80000⚡)*
  Prereqs: Steel Frame, Computer, Solar Panel — Unlocks: enables Modern Industrial buildings (auto-factories)
- **Composites** *(Materials — 100000⛓+60000📚+30000🔭)*
  Prereqs: Plastic Production, Aluminum Smelting, Polymers — Unlocks: Composite Workshop; enables Rocketry, Solar Panel, Wind Turbine
- **Solar Panel** *(Power — 80000⛓+50000⚡)*
  Prereqs: Silicon Refining, Integrated Circuit, Aluminum Smelting, Glass Making — Unlocks: Solar Panel Array (+80 capacity)
- **Wind Turbine** *(Power — 80000⛓+50000⚡)*
  Prereqs: Steel Refining, Aluminum Smelting, Integrated Circuit — Unlocks: Wind Turbine (+60 capacity)
- **Uranium Extraction** *(Materials — 120000⛓+80000📚)*
  Prereqs: Oil Extraction, Steel Refining, Long-wave Communication (Geiger) — Unlocks: Uranium Mine; enables Nuclear Reactor
- **Nuclear Reactor** *(Power — 200000⛓+120000⚡+60000📚)*
  Prereqs: Uranium Extraction, Reinforced Concrete, CPU, Aluminum Smelting, Composites — Unlocks: Nuclear Reactor (+500 capacity)
- **Automation** *(Mechanics — 100000⚡+60000📚)*
  Prereqs: CPU, Combustion Engine, Steel Refining — Unlocks: Automated Factory upgrade tier
- **Cryogenics** *(Medicine/Chemistry — 150000📚+100000⚡+50000🔭)*
  Prereqs: Refrigeration, Composites, CPU, Polymers — Unlocks: Cryogenic Lab
- **Cryogenic Fuel** *(Chemistry — 200000⛓+120000⚡+60000🔭)*
  Prereqs: Cryogenics, Oil Refinery, Composites — Unlocks: Fuel Refinery
- **Rocketry** *(Space — 150000⛓+100000⚡+50000📚)*
  Prereqs: Combustion Engine, Composites, Computer, Aluminum Smelting — Unlocks: Rocket Workshop
- **Orbital Mechanics** *(Space — 200000📚+120000🔭+60000⚡)*
  Prereqs: Rocketry, CPU, Computer, Long-wave Communication — Unlocks: enables Launch Pad
- **Launch Pad** *(Space — 300000⛓+200000⚡+100000📚)*
  Prereqs: Orbital Mechanics, Reinforced Concrete, Cryogenic Fuel, Nuclear Reactor (power) — Unlocks: Rocket Launch Pad T1
- **Cryogenic Rocketry / Moon Mission** *(Space — 500000⛓+300000⚡+200000📚+100000🔭+50000🏁)* **← MILESTONE 7 BOSS / ENDGAME**
  Prereqs: Launch Pad, Cryogenic Fuel, Composites, Solar Panel — Unlocks: **endgame achievement** — Mecha Senku delivers the moon-launch animation. Game continues post-endgame (city can be expanded forever; new milestones may be added in v2).

---

## Total tech count: ~82 nodes across 10 branches

Branch distribution (rough):

| Branch | Node count |
|---|---|
| Materials & Processing | 18 |
| Power Generation | 11 |
| Chemistry | 7 |
| Construction | 7 |
| Mechanics & Engineering | 9 |
| Electronics | 6 |
| Communication | 5 |
| Naval | 5 |
| Medicine | 6 |
| Space | 5 |

---

## Cross-branch dependency examples (validating the DAG)

Five chains to prove the structure holds up:

**Petrol Generator** (Power, milestone 5):
> Oil Extraction (Mat) → Oil Refinery (Mat) → Combustion Engine (Mech) → **Petrol Generator** (Power)
> Pulls from 2 branches before activating.

**Telephone Exchange** (Communication, milestone 3 boss):
> Copper Smelting (Mat) + Battery (Elec) + Radial Lamp (Elec) + Hydroelectric Dam (Power) → **Telephony** → **Telephone Exchange**
> Pulls from 4 branches.

**Perseus Hull** (Naval, milestone 4 boss):
> Steel Refining (Mat) + Steam Boiler (Mech) + Steamship (Naval) + Telephony (Comm) + Compass (Mech) → **Perseus Hull**
> Pulls from 4 branches.

**Nuclear Reactor** (Power, milestone 7):
> Uranium Extraction (Mat) + Reinforced Concrete (Const) + CPU (Elec) + Aluminum Smelting (Mat) + Composites (Mat) → **Nuclear Reactor**
> Pulls from 3 branches; massive prereq tree.

**Moon Mission** (Space, endgame):
> Cryogenic Fuel (Chem) + Launch Pad (Space) + Composites (Mat) + Solar Panel (Power) → **Cryogenic Rocketry / Moon Mission**
> Pulls from 4 branches; itself depends on a deep chain.

The tree is a real DAG. Multiple branches converge on most late-game nodes.

---

## Research UI spec

A separate view from the city map. Open via a button on the HUD ("Tech Tree" or similar — keyword in `06-style.md`).

### Layout

- **Topology**: nodes arranged left-to-right by milestone (Stone World on the far left, Moon Mission on the far right).
- **Vertical lanes**: 10 horizontal bands, one per branch. Each tech sits in its branch's band.
- **Edges**: prerequisite arrows drawn between nodes. Cross-branch arrows cross vertical bands, which is fine — the visual chaos IS the depth of the tech tree (and matches the Dr. Stone phone-building map vibe).
- **Camera**: pannable, zoomable. Initial zoom shows the player's current milestone fully + a peek at the next.

### Node states

1. **Locked** — milestone gate not yet active. Rendered grey/dim, no interaction.
2. **Available** — all prereqs researched + milestone active. Bright, glowing, clickable.
3. **Researched** — glowing green outline, completed icon (✓), tooltip shows "Researched" + the buildings it unlocked.

### Interactions

- **Hover** a node: tooltip shows name, branch, cost, prereqs (with check/✗ for each), unlocks.
- **Click** an *available* node: opens "Research X for ${cost}?" dialog. Confirm → resources deducted (check silo cap, brownout, etc.), node becomes researched. Mecha Senku delivers a captain's-log unlock message: *"10 billion percent — Sulfa Synthesis on the books. The drug arc just opened up."*
- **Click** a *locked* node: tooltip explains why (missing prereqs / milestone not active), no dialog.
- **Click** a *researched* node: tooltip shows what it unlocked.

### Filter / view modes

- **Filter by branch**: toggle each branch on/off to declutter.
- **Filter by milestone**: show only nodes from a specific milestone.
- **Path mode**: click target → shows shortest prereq path to that node (highlighted).

---

## Building unlock dependencies (preview)

Buildings are gated by research. Per-building gating lives in [04-buildings.md](./04-buildings.md), but the shape is:

```yaml
# Example from 04-buildings.md (preview)
building: workshop
tier_1:
  cost: { iron: 100, innovation: 80 }
  requires_research: [iron_smelting]
tier_2:
  cost: { iron: 250, innovation: 200 }
  requires_research: [iron_smelting, gear, pulley_system]
tier_3:
  cost: { iron: 600, innovation: 480 }
  requires_research: [steel_production, automation]
```

Multi-research gates on later tiers are the *progression engine* — to upgrade your workshop fully, you need to advance through 3 milestones' worth of researches.

---

## Pacing for v1

Per the original captain's pacing proposal: **full tree shape defined now, deep stat polish for arcs 1-4, late-game stubbed.**

- **Arcs 1-4 (Stone World → Perseus Voyage)**: ~50 techs, polished costs / prereqs / Senku-blurbs / sprite assets sourced first. Playable v1 reaches the mid-game flagship.
- **Arcs 5-7 (World Tour → Moon Mission)**: ~30 techs, structural shape defined (this doc), costs are starter numbers, blurbs are placeholders. Sprites for late-game buildings are stubs in v1; polished as Illia *actually reaches* the milestone in real play (weeks/months in).

This way v1 ships with the full tree visible (player sees the locked late-game nodes glowing on the research map, knows what's coming) but doesn't gate the v1 release on polishing endgame content nobody will see for weeks.

---

## Decisions locked in this doc

| # | Decision | Choice |
|---|---|---|
| 1 | Milestone structure | **7 milestones**, Dr. Stone arc-aligned (Stone World → Kingdom of Science → Phone Era → Perseus Voyage → World Tour → Whyman/Moon Signal → Moon Mission) |
| 2 | Milestone gating | Each milestone has a **boss research + boss building**; completing both advances to the next milestone |
| 3 | Tech-tree branches | **10 branches** (Materials, Power, Chemistry, Construction, Mechanics, Electronics, Communication, Naval, Medicine, Space) |
| 4 | Branch dependency model | **DAG** — techs cross-depend across branches freely |
| 5 | Total tech count | **~82 named nodes** in v1; can be expanded post-launch |
| 6 | Research UI | Separate map view from city, **nodes arranged left-to-right by milestone**, 10 vertical lanes for branches, prereq arrows drawn |
| 7 | Node states | Locked / Available / Researched (3 states) |
| 8 | Research interaction | Click available node → cost dialog → pay → researched. Mecha Senku narrates each unlock. |
| 9 | Building gating | Buildings require N researches (defined per-building in 04-buildings.md) |
| 10 | v1 pacing | Full tree shape defined; deep polish for arcs 1-4; arcs 5-7 stubbed for v1, polished as player reaches them |

---

When 03-progression locks, we move to **04-buildings.md** — the long catalog. Every building × every tier × cost × passive trickle × power × research prereqs × idle animation. Estimated ~40-50 buildings × 3 tiers = ~120-150 building-tier entries.
