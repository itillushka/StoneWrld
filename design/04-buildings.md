# 04 — Buildings catalog

> STATUS: **locked** (2026-05-18)

The full building catalog. **~70 buildings across 12 categories × 3 tiers each ≈ 210 building-tier entries.** Each entry: cost, research prereqs, passive trickle output, power (capacity/demand), idle animation. Cross-references to [02-game-logic](./02-game-logic.md) for economy math and [03-progression](./03-progression.md) for research nodes.

Per the v1 polish split established in 03-progression: **arcs 1-4 (~40 buildings) fully detailed; arcs 5-7 (~30 buildings) structurally listed with starter numbers, idle animation + lore stubbed as `TODO v1.x`.**

---

## Economy summary (reminders)

From [02-game-logic §Upgrade economics](./02-game-logic.md):

- **Cost ramp per tier**: T1 = base `C₁`, T2 upgrade = `C₁ × 2.5`, T3 upgrade = `C₁ × 6.0`. Total to fully upgrade = `C₁ × 9.5`.
- **Passive output scaling**: same ratio (T2 = T1 × 2.5, T3 = T1 × 6.0). ROI per tier is constant.
- **Tier unlocks**: T2 needs ≥1 T1 of that building; T3 needs T2 + ≥3 distinct buildings in that category + category-specific research prereq.
- **Brownout = 0% passive output** when `city_demand > city_capacity` (per [02 §Power model](./02-game-logic.md)).
- **Storage caps** apply via silo buildings (Storage category, below).

### Passive trickle output mapping per category

Captain's-eye rule: each building's passive trickle reflects what it conceptually produces.

| Category | Passive output |
|---|---|
| Dwellings | None (decoration in v1; population mechanic deferred to v2) |
| Power Generation | None (provides power **capacity** instead — different game lever) |
| Materials Processing | ⛓ Iron (representing refined raw materials broadly) |
| Chemistry | Mixed: Alchemy Lab → 📚, Soap Workshop → 🏁, Glassworks → ⛓, Fuel Refinery → ⛓ |
| Construction & Production | ⚡ Innovation (workshops build new things) |
| Mechanics | ⚡ Innovation (engineering / design work) |
| Electronics | ⚡ Innovation |
| Communication | 🔭 Discovery (information flow) |
| Naval | 🔭 Discovery (exploration via ships) |
| Medicine | 🏁 Completion (healing = shipping) |
| Space | 🏁 Completion (orbital achievements) |
| Storage (silos) | None (provides resource **capacity** — different game lever) |

---

## Sprite source plan (corrects 01-vision §Decision #11)

[01-vision](./01-vision.md) decided on a sprite-source MIX with "public sources + AI-generated." Originally I named Kenney as the public source — **Kenney's main packs are smooth/vector, not pure-retro pixel.** Per [01 §Decision #13](./01-vision.md), the aesthetic is pure-retro pixel art (sharp pixels, integer scaling). So the sprite plan updates:

- **Primary CC0 pixel-art sources**:
  - **OpenGameArt.org** (filter `pixel-art` tag) — massive CC0/CC-BY library. LPC (Liberated Pixel Cup) tilesets, Pixel Castle assets, industrial/factory tilesets.
  - **itch.io free pixel-art assets** — Tio's Tiny Town, Pixel-Boy packs, hundreds of CC0 city-builder tilesets.
  - **OpenPixelProject** — CC-BY pixel art.
  - **Kenney pixel-specific packs** (small subset): "1-Bit Pack", "Monochrome Pixel Pack" — fallback only.
- **AI-generated for Dr.Stone signature buildings**: Sulfa Factory, Perseus Dock, Telephone Exchange, Depetrification Lab, Alchemy Lab, Observatory, Deep-space Radio, Rocket Launch Pad. Tooling: **Retro Diffusion** (pixel-art-specific SD model) or Stable Diffusion + pixel-art LoRA. Hand-touch as needed.
- **Mecha Senku mascot**: Hand-drawn or AI-gen + heavy hand-touch (he's the focal character, multi-frame, ~6-10 sprites needed). Design specifics in [06-style.md](./06-style.md).

Full per-building sprite-source decisions live in [07-references.md](./07-references.md). This doc just flags which buildings need AI-gen vs CC0-pack.

---

## Categories (12)

### 1. Dwellings (4 buildings)

Decorative in v1. Population mechanic deferred to v2. Players build them because the village needs villagers — visual storytelling.

#### Settler Hut
**Category**: Dwellings · **Footprint**: 1×1 · **Milestone first**: Stone World (#1) · **Sprite source**: CC0 pixel pack
**Idle animation**: Faint smoke rising from chimney; window-light flicker at "night" (in-game day/night cycle TBD)

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 30⛓+15⚡ | mud_brick | — | 0 / 0 |
| T2 | 75⛓+38⚡ | + stone_masonry | — | 0 / 0 |
| T3 | 180⛓+90⚡ | + steel_production | — | 0 / 0 |

#### Cottage
**Category**: Dwellings · **Footprint**: 1×1 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Curtains gently sway in window; smoke from chimney

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 200⛓+100⚡ | wood_frame_construction, stone_masonry | — | 0 / 0 |
| T2 | 500⛓+250⚡ | + glass_making | — | 0 / 0 |
| T3 | 1200⛓+600⚡ | + concrete | — | 0 / 1 |

#### Apartment Block
**Category**: Dwellings · **Footprint**: 2×2 · **Milestone first**: Whyman / Moon Signal (#6) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x` — multiple window-lights blinking

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 25000⛓+15000⚡ | reinforced_concrete, steel_frame | — | 0 / 3 |
| T2 | 62500⛓+37500⚡ | + computer | — | 0 / 5 |
| T3 | 150000⛓+90000⚡ | + modern_industrial | — | 0 / 10 |

#### Modern Tower
**Category**: Dwellings · **Footprint**: 2×2 · **Milestone first**: Moon Mission (#7) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x` — skyscraper window lights, periodic elevator-lights moving up/down façade

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 80000⛓+50000⚡ | steel_frame, computer | — | 0 / 8 |
| T2 | 200000⛓+125000⚡ | + automation | — | 0 / 12 |
| T3 | 480000⛓+300000⚡ | + modern_industrial, solar_panel | — | 0 / 15 |

---

### 2. Power Generation (10 buildings)

Provides power capacity. Brownout when total demand exceeds total capacity → 0% passive across all non-power buildings. No passive output from power buildings themselves (their role is enabling everyone else).

#### Hearth (heat-only, conceptual power)
**Category**: Power · **Footprint**: 1×1 · **Milestone first**: Stone World (#1) · **Sprite source**: CC0 pixel pack
**Idle animation**: Flames flicker, occasional spark drifts upward

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 5⛓ | fire | — | 0 / 0 |
| T2 | 12⛓ | + charcoal_making | — | 0 / 0 |
| T3 | 30⛓ | + iron_smelting | — | 0 / 0 |

*Note: Hearth provides no power capacity — it's pre-electricity heat. Enables Charcoal Making + Pottery + Glass Making + Iron Smelting visually but the buildings that use heat are unlocked by their research, not by Hearth presence. Hearth is "you have access to fire" cosmetically. Could be omitted from city map in v1.x; keeping for canon flavor.*

#### Windmill
**Category**: Power · **Footprint**: 1×1 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Blades rotating clockwise; speed varies subtly to feel "alive"

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 300⛓+200⚡ | windmill | — | +3 / 0 |
| T2 | 750⛓+500⚡ | + iron_smelting | — | +8 / 0 |
| T3 | 1800⛓+1200⚡ | + steel_production | — | +18 / 0 |

#### Watermill
**Category**: Power · **Footprint**: 2×1 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Water wheel rotating; water droplets falling at bottom

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 300⛓+200⚡ | watermill | — | +5 / 0 |
| T2 | 750⛓+500⚡ | + gear | — | +12 / 0 |
| T3 | 1800⛓+1200⚡ | + steel_production | — | +30 / 0 |

#### Hydroelectric Dam
**Category**: Power · **Footprint**: 3×2 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack + AI-gen
**Idle animation**: Water flowing over spillway; subtle generator-glow at base

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 800⛓+500⚡ | hydroelectric_dam | — | +15 / 0 |
| T2 | 2000⛓+1250⚡ | + steel_production | — | +38 / 0 |
| T3 | 4800⛓+3000⚡ | + steel_refining | — | +90 / 0 |

#### Steam Plant
**Category**: Power · **Footprint**: 2×2 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack + AI-gen
**Idle animation**: Steam rising from chimney stacks; firebox glow at base; piston-shadow occasionally visible

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 1500⛓+800⚡ | steam_plant | — | +20 / 0 |
| T2 | 3750⛓+2000⚡ | + coal_mining | — | +50 / 0 |
| T3 | 9000⛓+4800⚡ | + steel_refining | — | +120 / 0 |

#### Petrol Generator
**Category**: Power · **Footprint**: 2×2 · **Milestone first**: World Tour (#5) · **Sprite source**: AI-gen (Dr.Stone-style industrial)
**Idle animation**: Engine vibrating slightly; exhaust puffs rising from outlet

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 25000⛓+15000⚡ | petrol_generator | — | +50 / 0 |
| T2 | 62500⛓+37500⚡ | + steel_refining | — | +125 / 0 |
| T3 | 150000⛓+90000⚡ | + combustion_engine | — | +300 / 0 |

#### Coal Plant
**Category**: Power · **Footprint**: 3×2 · **Milestone first**: Whyman / Moon Signal (#6) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x` — heavy black smoke rising from twin chimneys; conveyor belt visible

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 35000⛓+20000⚡ | coal_plant | — | +120 / 0 |
| T2 | 87500⛓+50000⚡ | + steel_refining | — | +300 / 0 |
| T3 | 210000⛓+120000⚡ | + automation | — | +720 / 0 |

#### Solar Panel Array
**Category**: Power · **Footprint**: 2×2 · **Milestone first**: Moon Mission (#7) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x` — subtle panel-shimmer (sun-glint sweep across panels)

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 80000⛓+50000⚡ | solar_panel | — | +80 / 0 |
| T2 | 200000⛓+125000⚡ | + integrated_circuit | — | +200 / 0 |
| T3 | 480000⛓+300000⚡ | + composites | — | +480 / 0 |

#### Wind Turbine
**Category**: Power · **Footprint**: 1×3 (tall) · **Milestone first**: Moon Mission (#7) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x` — modern turbine blades rotating, slow steady cycle

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 80000⛓+50000⚡ | wind_turbine | — | +60 / 0 |
| T2 | 200000⛓+125000⚡ | + steel_refining | — | +150 / 0 |
| T3 | 480000⛓+300000⚡ | + composites | — | +360 / 0 |

#### Nuclear Reactor
**Category**: Power · **Footprint**: 3×3 · **Milestone first**: Moon Mission (#7) · **Sprite source**: AI-gen (Dr.Stone signature endgame)
**Idle animation**: `TODO v1.x` — cooling tower steam plumes; subtle blue Cherenkov-glow at core; warning lights pulse

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 200000⛓+120000⚡+60000📚 | nuclear_reactor | — | +500 / 0 |
| T2 | 500000⛓+300000⚡+150000📚 | + composites | — | +1250 / 0 |
| T3 | 1200000⛓+720000⚡+360000📚 | + automation | — | +3000 / 0 |

---

### 3. Materials Processing (18 buildings)

The economy backbone. Every Materials building produces ⛓ Iron passive trickle (Iron represents "refined raw materials broadly"). Mines → primary extraction; Smelters/Foundries/Refineries → refining steps.

#### Stone Mine
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: Stone World (#1) · **Sprite source**: CC0 pixel pack
**Idle animation**: Pickaxe-strike sparks; rock-chip particles drift down

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 20⛓+10⚡ | stone_tools | +1⛓ | 0 / 0 |
| T2 | 50⛓+25⚡ | + iron_smelting | +2.5⛓ | 0 / 0 |
| T3 | 120⛓+60⚡ | + steam_engine | +6⛓ | 0 / 2 |

#### Lumber Camp
**Category**: Materials · **Footprint**: 1×2 · **Milestone first**: Stone World (#1) · **Sprite source**: CC0 pixel pack
**Idle animation**: Saw-cuts visible at the log pile; sawdust particle drift

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 15⛓+10⚡ | wood_cutting | +1⛓ | 0 / 0 |
| T2 | 38⛓+25⚡ | + iron_smelting | +2.5⛓ | 0 / 0 |
| T3 | 90⛓+60⚡ | + steel_production | +6⛓ | 0 / 1 |

#### Charcoal Kiln
**Category**: Materials · **Footprint**: 1×1 · **Milestone first**: Stone World (#1) · **Sprite source**: CC0 pixel pack
**Idle animation**: Smoke rising from kiln top; orange glow from base

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 30⛓+15⚡ | charcoal_making | +1⛓ | 0 / 0 |
| T2 | 75⛓+38⚡ | + iron_smelting | +2.5⛓ | 0 / 0 |
| T3 | 180⛓+90⚡ | + steel_production | +6⛓ | 0 / 1 |

#### Pottery Kiln
**Category**: Materials · **Footprint**: 1×1 · **Milestone first**: Stone World (#1) · **Sprite source**: CC0 pixel pack
**Idle animation**: Wheel spinning visible on side; subtle warm glow from kiln door

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 25⛓+15⚡ | pottery | +1⛓ | 0 / 0 |
| T2 | 63⛓+38⚡ | + glass_making | +2.5⛓ | 0 / 0 |
| T3 | 150⛓+90⚡ | + steel_production | +6⛓ | 0 / 1 |

#### Sulfur Mine
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: Stone World (#1) · **Sprite source**: CC0 pixel pack
**Idle animation**: Yellow sulfur particles drift up from mine entrance; carts moving in/out

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 40⛓+20⚡ | sulfur_extraction | +1⛓ | 0 / 0 |
| T2 | 100⛓+50⚡ | + iron_smelting | +2.5⛓ | 0 / 0 |
| T3 | 240⛓+120⚡ | + steel_production | +6⛓ | 0 / 2 |

#### Iron Mine
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Mine cart emerges periodically, dumps ore at side pile, returns

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 100⛓+50⚡ | iron_ore_extraction | +2⛓ | 0 / 0 |
| T2 | 250⛓+125⚡ | + steel_production | +5⛓ | 0 / 1 |
| T3 | 600⛓+300⚡ | + steam_engine | +12⛓ | 0 / 3 |

#### Iron Smelter
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Bellows pumping; orange glow pulses from furnace; hammer-strike sparks fly

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 200⛓+80⚡ | iron_smelting | +2⛓ | 0 / 0 |
| T2 | 500⛓+200⚡ | + bronze_alloy | +5⛓ | 0 / 1 |
| T3 | 1200⛓+480⚡ | + steel_refining | +12⛓ | 0 / 3 |

#### Copper Mine
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Mine cart cycle; greenish copper-ore tint visible at ore pile

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 150⛓+50⚡ | copper_ore_mining | +2⛓ | 0 / 0 |
| T2 | 375⛓+125⚡ | + steel_production | +5⛓ | 0 / 1 |
| T3 | 900⛓+300⚡ | + steam_engine | +12⛓ | 0 / 3 |

#### Copper Smelter
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Like Iron Smelter but with reddish-orange furnace glow

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 200⛓+80⚡ | copper_smelting | +2⛓ | 0 / 0 |
| T2 | 500⛓+200⚡ | + bronze_alloy | +5⛓ | 0 / 1 |
| T3 | 1200⛓+480⚡ | + steel_refining | +12⛓ | 0 / 3 |

#### Tin Mine
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Mine cart cycle; whitish tin-ore tint at pile

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 120⛓+50⚡ | tin_mining | +2⛓ | 0 / 0 |
| T2 | 300⛓+125⚡ | + steel_production | +5⛓ | 0 / 1 |
| T3 | 720⛓+300⚡ | + steam_engine | +12⛓ | 0 / 3 |

#### Bronze Foundry
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Bronze ingots being cast; molten metal stream visible; sparks

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 250⛓+150📚 | bronze_alloy | +3⛓ | 0 / 1 |
| T2 | 625⛓+375📚 | + steel_production | +7.5⛓ | 0 / 2 |
| T3 | 1500⛓+900📚 | + steel_refining | +18⛓ | 0 / 4 |

#### Steel Foundry (Milestone 2 boss building)
**Category**: Materials · **Footprint**: 3×3 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack + AI-gen accents
**Idle animation**: Large bellows pumping; bright white-hot glow from main furnace; hammer-strike-sparks shower at the corner

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 500⛓+300📚 | steel_production | +4⛓ | 0 / 1 |
| T2 | 1250⛓+750📚 | + hydroelectric_dam | +10⛓ | 0 / 3 |
| T3 | 3000⛓+1800📚 | + steel_refining, automation | +24⛓ | 0 / 6 |

#### Coal Mine
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack
**Idle animation**: Dark cart cycle, black coal pile, occasional dust-puff

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 1500⛓+800📚 | coal_mining | +5⛓ | 0 / 1 |
| T2 | 3750⛓+2000📚 | + steel_refining | +12⛓ | 0 / 3 |
| T3 | 9000⛓+4800📚 | + steam_engine | +30⛓ | 0 / 6 |

#### Cobalt Foundry
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack
**Idle animation**: Bluish glow from cobalt smelter; magnetic-spark animation occasional

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 800⛓+500📚 | cobalt_smelting | +3⛓ | 0 / 2 |
| T2 | 2000⛓+1250📚 | + steel_refining | +7.5⛓ | 0 / 4 |
| T3 | 4800⛓+3000📚 | + transistor | +18⛓ | 0 / 8 |

#### Steel Refinery
**Category**: Materials · **Footprint**: 3×3 · **Milestone first**: Perseus Voyage (#4) · **Sprite source**: AI-gen (Dr.Stone industrial-arc style)
**Idle animation**: Tall converter vessel pours molten steel; bright orange sparks; smoke rises

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 4000⛓+2500📚 | steel_refining | +6⛓ | 0 / 3 |
| T2 | 10000⛓+6250📚 | + steam_plant | +15⛓ | 0 / 6 |
| T3 | 24000⛓+15000📚 | + automation | +36⛓ | 0 / 12 |

#### Oil Well *(arcs 5-7 stub)*
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: World Tour (#5) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x` — pump-jack arm cycling up-and-down

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 15000⛓+10000📚 | oil_extraction | +10⛓ | 0 / 4 |
| T2 | 37500⛓+25000📚 | + steel_refining | +25⛓ | 0 / 8 |
| T3 | 90000⛓+60000📚 | + automation | +60⛓ | 0 / 15 |

#### Oil Refinery *(arcs 5-7 stub)*
**Category**: Materials · **Footprint**: 3×3 · **Milestone first**: World Tour (#5) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x` — sulfur-yellow flames at refinery tops, smoke plumes, pipes glow occasionally

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 25000⛓+15000📚 | oil_refinery | +15⛓ | 0 / 6 |
| T2 | 62500⛓+37500📚 | + polymers | +37.5⛓ | 0 / 12 |
| T3 | 150000⛓+90000📚 | + automation | +90⛓ | 0 / 20 |

#### Plastic Factory *(arcs 5-7 stub)*
**Category**: Materials · **Footprint**: 2×2 · **Milestone first**: World Tour (#5) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x`

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 20000⛓+15000📚 | plastic_production | +10⛓ | 0 / 5 |
| T2 | 50000⛓+37500📚 | + automation | +25⛓ | 0 / 10 |
| T3 | 120000⛓+90000📚 | + composites | +60⛓ | 0 / 18 |

#### Aluminum Refinery, Silicon Foundry, Uranium Mine, Composite Workshop, Coke Oven *(arcs 5-7 stubs)*

All `TODO v1.x` polish. Structural entries:

| Building | Milestone | T1 cost | T1 passive | T1 power |
|---|---|---|---|---|
| Aluminum Refinery | #6 Whyman | 30000⛓+15000📚 | +12⛓ | 0 / 5 |
| Coke Oven | #6 Whyman | 25000⛓+15000📚 | +10⛓ | 0 / 4 |
| Silicon Foundry | #6 Whyman | 30000⛓+20000📚+10000🔭 | +12⛓ | 0 / 6 |
| Uranium Mine | #7 Moon | 120000⛓+80000📚 | +20⛓ | 0 / 10 |
| Composite Workshop | #7 Moon | 100000⛓+60000📚+30000🔭 | +20⛓ | 0 / 8 |

---

### 4. Chemistry (4 buildings)

#### Soap Workshop
**Category**: Chemistry · **Footprint**: 1×1 · **Milestone first**: Stone World (#1) · **Sprite source**: CC0 pixel pack
**Idle animation**: Steam rising from bubbling pot; occasional soap-bar slide out chute

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 50📚+40⛓ | soap | +1🏁 | 0 / 0 |
| T2 | 125📚+100⛓ | + glass_making | +2.5🏁 | 0 / 1 |
| T3 | 300📚+240⛓ | + antiseptic | +6🏁 | 0 / 2 |

#### Alchemy Lab (Milestone 1 boss)
**Category**: Chemistry · **Footprint**: 2×2 · **Milestone first**: Stone World (#1) · **Sprite source**: AI-gen (Dr.Stone signature)
**Idle animation**: Bubbling beakers visible through door; door flashes purple-green occasionally with a small smoke puff

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 80📚+60⛓ | sulfuric_acid | +2📚 | 0 / 0 |
| T2 | 200📚+150⛓ | + glass_making | +5📚 | 0 / 1 |
| T3 | 480📚+360⛓ | + polymers | +12📚 | 0 / 3 |

#### Glassworks
**Category**: Chemistry · **Footprint**: 1×1 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Glass-blower silhouette visible through opening; orange glow

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 120📚+80⛓ | glass_making | +1⛓ | 0 / 0 |
| T2 | 300📚+200⛓ | + steel_production | +2.5⛓ | 0 / 1 |
| T3 | 720📚+480⛓ | + silicon_refining | +6⛓ | 0 / 3 |

#### Fuel Refinery *(arc 7 stub)*
**Category**: Chemistry · **Footprint**: 2×2 · **Milestone first**: Moon Mission (#7) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x` — cryogenic frost on pipes, occasional vent of cold vapor

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 200000⛓+120000⚡+60000🔭 | cryogenic_fuel | +20⛓ | 0 / 12 |
| T2 | 500000⛓+300000⚡+150000🔭 | + composites | +50⛓ | 0 / 25 |
| T3 | 1200000⛓+720000⚡+360000🔭 | + nuclear_reactor | +120⛓ | 0 / 50 |

---

### 5. Construction & Production (4 buildings)

Crafting / workshop buildings. Passive output is ⚡ Innovation.

#### Builder's Hut
**Category**: Construction · **Footprint**: 1×1 · **Milestone first**: Stone World (#1) · **Sprite source**: CC0 pixel pack
**Idle animation**: Builder figure occasionally visible at door; wood-shavings scatter near entry

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 30⛓+20⚡ | mud_brick | +1⚡ | 0 / 0 |
| T2 | 75⛓+50⚡ | + wood_frame_construction | +2.5⚡ | 0 / 0 |
| T3 | 180⛓+120⚡ | + stone_masonry | +6⚡ | 0 / 1 |

#### Workshop
**Category**: Construction · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Hammer strikes anvil; sparks fly at corner; occasional pulley moves overhead

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 100⛓+80⚡ | iron_smelting | +1⚡ | 0 / 0 |
| T2 | 250⛓+200⚡ | + gear, pulley_system | +2.5⚡ | 0 / 2 |
| T3 | 600⛓+480⚡ | + steel_production, automation | +6⚡ | 0 / 5 |

#### Stone Workshop
**Category**: Construction · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Mason chisels stone block; chips fly; dust haze

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 150⛓+80⚡ | stone_masonry | +1⚡ | 0 / 0 |
| T2 | 375⛓+200⚡ | + steel_production | +2.5⚡ | 0 / 1 |
| T3 | 900⛓+480⚡ | + concrete | +6⚡ | 0 / 3 |

#### Concrete Workshop *(arc 4 polished)*
**Category**: Construction · **Footprint**: 2×2 · **Milestone first**: Perseus Voyage (#4) · **Sprite source**: CC0 pixel pack
**Idle animation**: Concrete mixer drum rotating; wet-concrete-pour animation at base

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 5000⛓+3000⚡ | concrete | +3⚡ | 0 / 2 |
| T2 | 12500⛓+7500⚡ | + steel_refining | +7.5⚡ | 0 / 5 |
| T3 | 30000⛓+18000⚡ | + reinforced_concrete | +18⚡ | 0 / 10 |

---

### 6. Mechanics (2 buildings)

#### Steam Engine Workshop *(arc 3 polished)*
**Category**: Mechanics · **Footprint**: 2×2 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack
**Idle animation**: Piston-shaft visible through window, moving up-down; steam puff at vent

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 1000⛓+600⚡ | steam_engine | +2⚡ | 0 / 1 |
| T2 | 2500⛓+1500⚡ | + steel_production | +5⚡ | 0 / 3 |
| T3 | 6000⛓+3600⚡ | + automation | +12⚡ | 0 / 6 |

#### Combustion Engine Workshop *(arc 5 stub)*
**Category**: Mechanics · **Footprint**: 2×2 · **Milestone first**: World Tour (#5) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x`

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 20000⛓+15000⚡ | combustion_engine | +8⚡ | 0 / 4 |
| T2 | 50000⛓+37500⚡ | + steel_refining | +20⚡ | 0 / 8 |
| T3 | 120000⛓+90000⚡ | + automation | +48⚡ | 0 / 16 |

---

### 7. Electronics (6 buildings — all arcs 3-6, mix of polished and stubbed)

#### Battery Cell *(arc 3 polished)*
**Category**: Electronics · **Footprint**: 1×1 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack
**Idle animation**: Small blue spark arcs between terminals occasionally

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 400📚+200⛓+150⚡ | battery | +2⚡ | 0 / 0 |
| T2 | 1000📚+500⛓+375⚡ | + copper_smelting | +5⚡ | 0 / 1 |
| T3 | 2400📚+1200⛓+900⚡ | + transistor | +12⚡ | 0 / 2 |

#### Lamp Workshop *(arc 3 polished)*
**Category**: Electronics · **Footprint**: 1×1 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack
**Idle animation**: Lightbulb glows on/off in window

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 500⚡+300📚 | lightbulb | +2⚡ | 0 / 1 |
| T2 | 1250⚡+750📚 | + radial_lamp | +5⚡ | 0 / 2 |
| T3 | 3000⚡+1800📚 | + transistor | +12⚡ | 0 / 4 |

#### Radio Lab *(arc 3 polished)*
**Category**: Electronics · **Footprint**: 2×1 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack
**Idle animation**: Vacuum tubes glow; small antenna-flicker at roof

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 800⚡+500📚 | radial_lamp | +3⚡ | 0 / 1 |
| T2 | 2000⚡+1250📚 | + telephony | +7.5⚡ | 0 / 3 |
| T3 | 4800⚡+3000📚 | + wireless | +18⚡ | 0 / 6 |

#### IC Factory *(arc 6 stub)*
**Category**: Electronics · **Footprint**: 2×2 · **Milestone first**: Whyman / Moon Signal (#6) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x`

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 60000⚡+40000📚 | integrated_circuit | +20⚡ | 0 / 8 |
| T2 | 150000⚡+100000📚 | + cpu | +50⚡ | 0 / 16 |
| T3 | 360000⚡+240000📚 | + automation | +120⚡ | 0 / 32 |

#### CPU Foundry, Computer Workshop *(arc 6 stubs)*

| Building | T1 cost | T1 passive | T1 power |
|---|---|---|---|
| CPU Foundry | 100000⚡+60000📚 | +25⚡ | 0 / 15 |
| Computer Workshop | 150000⚡+80000📚+30000🔭 | +30⚡ | 0 / 20 |

---

### 8. Communication (5 buildings)

#### Telegraph Office *(arc 3 polished)*
**Category**: Communication · **Footprint**: 1×1 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack
**Idle animation**: Tiny morse-code light blinks intermittently

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 600⚡+400📚 | telegraph | +2🔭 | 0 / 1 |
| T2 | 1500⚡+1000📚 | + radio_telephone | +5🔭 | 0 / 2 |
| T3 | 3600⚡+2400📚 | + telephony | +12🔭 | 0 / 4 |

#### Radio Hut *(arc 3 polished)*
**Category**: Communication · **Footprint**: 1×2 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack
**Idle animation**: Roof antenna sways gently; small light on side panel blinks

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 1200⚡+800📚 | radio_telephone | +3🔭 | 0 / 1 |
| T2 | 3000⚡+2000📚 | + telephony | +7.5🔭 | 0 / 2 |
| T3 | 7200⚡+4800📚 | + wireless | +18🔭 | 0 / 5 |

#### Telephone Exchange (Milestone 3 boss) *(arc 3 polished)*
**Category**: Communication · **Footprint**: 2×2 · **Milestone first**: Phone Era (#3) · **Sprite source**: AI-gen (Dr.Stone signature — the famous phone-arc payoff)
**Idle animation**: Operator-board lights blink in rolling sequence; signal-wave occasionally pulses outward from antenna

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 2500⚡+1500📚 | telephony | +5🔭 | 0 / 3 |
| T2 | 6250⚡+3750📚 | + wireless | +12.5🔭 | 0 / 6 |
| T3 | 15000⚡+9000📚 | + long_wave_communication | +30🔭 | 0 / 12 |

#### Wireless Tower *(arc 6 stub)*
**Category**: Communication · **Footprint**: 1×3 (tall) · **Milestone first**: Whyman / Moon Signal (#6) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x`

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 80000⚡+50000📚 | wireless | +15🔭 | 0 / 10 |
| T2 | 200000⚡+125000📚 | + computer | +37.5🔭 | 0 / 20 |
| T3 | 480000⚡+300000📚 | + long_wave_communication | +90🔭 | 0 / 40 |

#### Deep-space Radio (Milestone 6 boss) *(arc 6 stub)*
**Category**: Communication · **Footprint**: 3×3 · **Milestone first**: Whyman / Moon Signal (#6) · **Sprite source**: AI-gen (Dr.Stone signature — Whyman signal arc)
**Idle animation**: `TODO v1.x` — massive dish slowly rotates; signal-wave-pulse outward

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 120000⚡+80000📚+40000🔭 | long_wave_communication | +25🔭 | 0 / 25 |
| T2 | 300000⚡+200000📚+100000🔭 | + computer | +60🔭 | 0 / 50 |
| T3 | 720000⚡+480000📚+240000🔭 | + nuclear_reactor | +150🔭 | 0 / 100 |

---

### 9. Naval (4 buildings)

#### Shipyard, Sailboat Dock, Steamship Dock, Perseus Dock *(arc 4 — Perseus boss is mid-game flagship)*

#### Shipyard *(arc 4 polished)*
**Category**: Naval · **Footprint**: 3×2 · **Milestone first**: Perseus Voyage (#4) · **Sprite source**: CC0 pixel pack + AI-gen
**Idle animation**: Wooden hull-skeleton visible on slip; workers occasionally hammer; sparks fly from welding station

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 6000⛓+4000⚡ | naval_engineering | +5🔭 | 0 / 2 |
| T2 | 15000⛓+10000⚡ | + steamship | +12.5🔭 | 0 / 5 |
| T3 | 36000⛓+24000⚡ | + perseus_hull | +30🔭 | 0 / 10 |

#### Sailboat Dock *(arc 4 polished)*
**Category**: Naval · **Footprint**: 2×2 · **Milestone first**: Perseus Voyage (#4) · **Sprite source**: CC0 pixel pack
**Idle animation**: Sailboat gently rocks on water; sail flutters in occasional breeze

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 3000⛓+1500⚡ | sailboat | +3🔭 | 0 / 0 |
| T2 | 7500⛓+3750⚡ | + steamship | +7.5🔭 | 0 / 1 |
| T3 | 18000⛓+9000⚡ | + perseus_hull | +18🔭 | 0 / 3 |

#### Steamship Dock *(arc 4 polished)*
**Category**: Naval · **Footprint**: 2×2 · **Milestone first**: Perseus Voyage (#4) · **Sprite source**: CC0 pixel pack + AI-gen
**Idle animation**: Steam from funnel; ship rocks; paddle-wheel visible

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 5000⛓+3500⚡ | steamship | +4🔭 | 0 / 2 |
| T2 | 12500⛓+8750⚡ | + steel_refining | +10🔭 | 0 / 4 |
| T3 | 30000⛓+21000⚡ | + combustion_engine | +24🔭 | 0 / 8 |

#### Perseus Dock (Milestone 4 boss, mid-game flagship) *(arc 4 polished — signature Dr.Stone build)*
**Category**: Naval · **Footprint**: 3×3 · **Milestone first**: Perseus Voyage (#4) · **Sprite source**: AI-gen (Dr.Stone signature)
**Idle animation**: The Perseus ship docked; flag flutters; sail furled; occasional crew-figure walks on deck; ocean waves lap at hull

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 10000⛓+6000⚡+3000📚 | perseus_hull | +8🔭 | 0 / 4 |
| T2 | 25000⛓+15000⚡+7500📚 | + steel_refining | +20🔭 | 0 / 8 |
| T3 | 60000⛓+36000⚡+18000📚 | + combustion_engine, long_wave_communication | +48🔭 | 0 / 16 |

---

### 10. Medicine (6 buildings)

#### Herbalist Hut *(arc 1 polished)*
**Category**: Medicine · **Footprint**: 1×1 · **Milestone first**: Stone World (#1) · **Sprite source**: CC0 pixel pack
**Idle animation**: Hanging herbs sway at door; mortar-and-pestle visible inside

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 30📚 | herbal_remedies | +1🏁 | 0 / 0 |
| T2 | 75📚 | + soap | +2.5🏁 | 0 / 0 |
| T3 | 180📚 | + antiseptic | +6🏁 | 0 / 1 |

#### Field Clinic *(arc 3 polished)*
**Category**: Medicine · **Footprint**: 2×2 · **Milestone first**: Phone Era (#3) · **Sprite source**: CC0 pixel pack
**Idle animation**: Lantern-light at window; occasional patient-bed visible through opening

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 500📚+300⛓ | antiseptic | +2🏁 | 0 / 1 |
| T2 | 1250📚+750⛓ | + sulfa_drug | +5🏁 | 0 / 2 |
| T3 | 3000📚+1800⛓ | + antibiotics | +12🏁 | 0 / 4 |

#### Sulfa Factory *(arc 3 polished — Dr.Stone Tsukasa-arc payoff)*
**Category**: Medicine · **Footprint**: 2×2 · **Milestone first**: Phone Era (#3) · **Sprite source**: AI-gen (Dr.Stone signature)
**Idle animation**: Sulfur (yellow particles) flows through visible pipes; vapor rises from top vent; occasional pill-drop sound-cue

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 2000📚+1500⛓+800🔭 | sulfa_drug | +3🏁 | 0 / 2 |
| T2 | 5000📚+3750⛓+2000🔭 | + antibiotics | +7.5🏁 | 0 / 4 |
| T3 | 12000📚+9000⛓+4800🔭 | + polymers | +18🏁 | 0 / 8 |

#### Pharmacy *(arc 5 stub)*
**Category**: Medicine · **Footprint**: 1×1 · **Milestone first**: World Tour (#5) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x`

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 12000📚+8000⛓+5000🔭 | antibiotics | +8🏁 | 0 / 3 |
| T2 | 30000📚+20000⛓+12500🔭 | + nital_reagent | +20🏁 | 0 / 6 |
| T3 | 72000📚+48000⛓+30000🔭 | + cryogenics | +48🏁 | 0 / 12 |

#### Depetrification Lab (Milestone 5 boss) *(arc 5 stub — Dr.Stone signature)*
**Category**: Medicine · **Footprint**: 2×2 · **Milestone first**: World Tour (#5) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x` — green liquid drips visible in central vessel; stone-figure occasionally cracks/reveals color

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 25000📚+18000🔭+12000⛓+8000⚡ | nital_reagent | +5🏁 | 0 / 5 |
| T2 | 62500📚+45000🔭+30000⛓+20000⚡ | + cryogenics | +12.5🏁 | 0 / 10 |
| T3 | 150000📚+108000🔭+72000⛓+48000⚡ | + cryogenic_fuel | +30🏁 | 0 / 20 |

#### Cryogenic Lab *(arc 7 stub)*
**Category**: Medicine · **Footprint**: 2×2 · **Milestone first**: Moon Mission (#7) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x`

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 150000📚+100000⚡+50000🔭 | cryogenics | +20🏁 | 0 / 10 |
| T2 | 375000📚+250000⚡+125000🔭 | + cryogenic_fuel | +50🏁 | 0 / 20 |
| T3 | 900000📚+600000⚡+300000🔭 | + composites | +120🏁 | 0 / 40 |

---

### 11. Space (2 buildings)

#### Rocket Workshop *(arc 7 stub)*
**Category**: Space · **Footprint**: 2×2 · **Milestone first**: Moon Mission (#7) · **Sprite source**: AI-gen
**Idle animation**: `TODO v1.x` — rocket-nose visible through high opening, slowly rotates on assembly cradle

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 150000⛓+100000⚡+50000📚 | rocketry | +15🏁 | 0 / 10 |
| T2 | 375000⛓+250000⚡+125000📚 | + orbital_mechanics | +37.5🏁 | 0 / 20 |
| T3 | 900000⛓+600000⚡+300000📚 | + cryogenic_fuel | +90🏁 | 0 / 40 |

#### Rocket Launch Pad (Milestone 7 boss, ENDGAME) *(arc 7 stub — Dr.Stone signature flagship)*
**Category**: Space · **Footprint**: 3×3 · **Milestone first**: Moon Mission (#7) · **Sprite source**: AI-gen (Dr.Stone signature, the endgame visual)
**Idle animation**: `TODO v1.x` — rocket stands on pad; vapor vents from base; gantry-lights blink; countdown-light cycle. On Cryogenic Rocketry research complete: LAUNCH animation (rocket lifts off, exits frame, Mecha Senku narrates moon-arrival)

| Tier | Cost | Research prereqs | Passive / hour | Power (cap / demand) |
|------|------|------------------|----------------|----------------------|
| T1 | 300000⛓+200000⚡+100000📚 | launch_pad | +20🏁 | 0 / 30 |
| T2 | 750000⛓+500000⚡+250000📚 | + cryogenic_fuel | +50🏁 | 0 / 60 |
| T3 | 1800000⛓+1200000⚡+600000📚 | + nuclear_reactor | +120🏁 | 0 / 120 |

---

### 12. Storage / Silos (5 buildings)

No passive output. Defines max capacity per resource. Without any silo for a resource, baseline cap is **1000**.

Capacity scaling: T1 = 5,000 · T2 = 20,000 · T3 = 100,000 (per [02-game-logic §Storage](./02-game-logic.md)).

#### Library (📚 Knowledge silo)
**Category**: Storage · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Candle-flicker through window; occasional page-flip silhouette

| Tier | Cost | Research prereqs | Capacity (📚) | Power (cap / demand) |
|------|------|------------------|---------------|----------------------|
| T1 | 200⛓+150⚡ | mud_brick, stone_masonry | 5,000 | 0 / 0 |
| T2 | 500⛓+375⚡ | + glass_making | 20,000 | 0 / 1 |
| T3 | 1200⛓+900⚡ | + concrete | 100,000 | 0 / 2 |

#### Map Archive (🔭 Discovery silo)
**Category**: Storage · **Footprint**: 2×2 · **Milestone first**: Perseus Voyage (#4) · **Sprite source**: CC0 pixel pack
**Idle animation**: Compass needle visible through window, spins occasionally; map-scrolls hang at side

| Tier | Cost | Research prereqs | Capacity (🔭) | Power (cap / demand) |
|------|------|------------------|---------------|----------------------|
| T1 | 2000⛓+1500⚡ | compass, telephony | 5,000 | 0 / 0 |
| T2 | 5000⛓+3750⚡ | + perseus_hull | 20,000 | 0 / 1 |
| T3 | 12000⛓+9000⚡ | + world_map_cartography | 100,000 | 0 / 2 |

#### Foundry Stockpile (⛓ Iron silo)
**Category**: Storage · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Cargo carts roll up to door, dump load, roll back

| Tier | Cost | Research prereqs | Capacity (⛓) | Power (cap / demand) |
|------|------|------------------|---------------|----------------------|
| T1 | 300⛓+150⚡ | iron_smelting | 5,000 | 0 / 0 |
| T2 | 750⛓+375⚡ | + steel_production | 20,000 | 0 / 1 |
| T3 | 1800⛓+900⚡ | + steel_refining | 100,000 | 0 / 2 |

#### Workshop Storage (⚡ Innovation silo)
**Category**: Storage · **Footprint**: 2×2 · **Milestone first**: Kingdom of Science (#2) · **Sprite source**: CC0 pixel pack
**Idle animation**: Tools visible hanging on outside wall; window-glow at night

| Tier | Cost | Research prereqs | Capacity (⚡) | Power (cap / demand) |
|------|------|------------------|---------------|----------------------|
| T1 | 200⛓+200⚡ | iron_smelting, mud_brick | 5,000 | 0 / 0 |
| T2 | 500⛓+500⚡ | + stone_masonry | 20,000 | 0 / 1 |
| T3 | 1200⛓+1200⚡ | + steel_production | 100,000 | 0 / 2 |

#### Trophy Hall (🏁 Completion silo)
**Category**: Storage · **Footprint**: 2×2 · **Milestone first**: Perseus Voyage (#4) · **Sprite source**: CC0 pixel pack + AI-gen accents
**Idle animation**: Trophies / framed-flags hang on outside wall; subtle "polishing" sparkle at the center one

| Tier | Cost | Research prereqs | Capacity (🏁) | Power (cap / demand) |
|------|------|------------------|---------------|----------------------|
| T1 | 1500⛓+1000⚡+500🏁 | stone_masonry, naval_engineering | 5,000 | 0 / 0 |
| T2 | 3750⛓+2500⚡+1250🏁 | + perseus_hull | 20,000 | 0 / 1 |
| T3 | 9000⛓+6000⚡+3000🏁 | + nital_reagent | 100,000 | 0 / 2 |

---

## Footprint reference (preview — full spec in 05-map.md)

| Footprint | Used for | Count |
|---|---|---|
| 1×1 | Small workshops, lamps, hearths, herbalists | ~12 |
| 1×2 / 2×1 | Lumber camps, radio huts, narrow workshops | ~3 |
| 1×3 (tall) | Towers (wind turbine, wireless tower) | 2 |
| 2×2 | Most production / processing / medicine buildings (default) | ~30 |
| 2×2 (large dwellings, late-game) | Apartment Block, Modern Tower | 2 |
| 3×2 | Hydroelectric Dam, Coal Plant, Shipyard | 3 |
| 3×3 | Steel Foundry, Steel Refinery, Oil Refinery, Perseus Dock, Deep-space Radio, Nuclear Reactor, Rocket Launch Pad | ~8 |

City grid sizing, expansion mechanics, road/power-line drawing — all in [05-map.md](./05-map.md).

---

## Sprite source plan (per-building, master list)

Captured per-building inline above. Summary:

- **CC0 pixel pack** (OpenGameArt / itch.io): ~45 buildings (generic huts, mines, smelters, kilns, mills, basic workshops, basic storage)
- **CC0 pixel pack + AI-gen accents**: ~10 buildings (Steel Foundry, Hydroelectric Dam, Steam Plant, Shipyard, Steamship Dock, Trophy Hall — buildings needing distinctive shape but mostly using off-the-shelf assets)
- **AI-gen (Dr.Stone signature)**: ~15 buildings (Alchemy Lab, Telephone Exchange, Sulfa Factory, Perseus Dock, Depetrification Lab, Deep-space Radio, Nuclear Reactor, Rocket Launch Pad, Steel Refinery, Oil Refinery, Fuel Refinery, IC Factory, Aluminum Refinery, Silicon Foundry, Composite Workshop)

Full source workflow + license discipline in [07-references.md](./07-references.md).

---

## v1 polish status per arc

| Arc | Buildings count | Polish status in this doc |
|---|---|---|
| 1. Stone World | ~10 (Settler Hut, Hearth, Stone Mine, Lumber Camp, Charcoal Kiln, Pottery Kiln, Sulfur Mine, Builder's Hut, Soap Workshop, Alchemy Lab, Herbalist Hut) | **Full detail** — all tiers, idle animations, costs |
| 2. Kingdom of Science | ~13 (Cottage, Windmill, Watermill, Iron Mine, Iron Smelter, Copper Mine, Copper Smelter, Tin Mine, Bronze Foundry, Stone Workshop, Workshop, Glassworks, Steel Foundry, Library, Foundry Stockpile, Workshop Storage) | **Full detail** |
| 3. Phone Era | ~12 (Coal Mine, Hydroelectric Dam, Steam Plant, Steam Engine Workshop, Cobalt Foundry, Battery Cell, Lamp Workshop, Radio Lab, Telegraph Office, Radio Hut, Telephone Exchange, Field Clinic, Sulfa Factory) | **Full detail** |
| 4. Perseus Voyage | ~6 (Concrete Workshop, Steel Refinery, Shipyard, Sailboat Dock, Steamship Dock, Perseus Dock, Map Archive, Trophy Hall) | **Full detail** |
| 5. World Tour | ~6 (Oil Well, Oil Refinery, Petrol Generator, Combustion Engine Workshop, Plastic Factory, Pharmacy, Depetrification Lab) | Structural — costs + prereqs; animation + lore = `TODO v1.x` |
| 6. Whyman / Moon Signal | ~7 (Apartment Block, Coal Plant, Coke Oven, Aluminum Refinery, Silicon Foundry, IC Factory, CPU Foundry, Computer Workshop, Wireless Tower, Deep-space Radio) | Structural — same |
| 7. Moon Mission | ~10 (Modern Tower, Solar Panel Array, Wind Turbine, Nuclear Reactor, Uranium Mine, Composite Workshop, Fuel Refinery, Cryogenic Lab, Rocket Workshop, Rocket Launch Pad) | Structural — same |

Total: **~64 buildings** (slightly more than the 60 estimate — some categories ran longer once enumerated; well within scope of the original 60-building plan).

---

## Decisions locked in this doc

| # | Decision | Choice |
|---|---|---|
| 1 | Building count | **~64 buildings × 3 tiers** = ~192 building-tier entries |
| 2 | Categories | **12**: Dwellings, Power, Materials, Chemistry, Construction, Mechanics, Electronics, Communication, Naval, Medicine, Space, Storage |
| 3 | Storage as separate category | **Yes** — silos folded into their own Storage category (not merged with Space) |
| 4 | Passive output by category | Materials → ⛓; Construction/Mechanics/Electronics → ⚡; Communication/Naval → 🔭; Medicine/Space → 🏁; Chemistry → mixed; Dwellings/Power/Storage → none (have other roles) |
| 5 | Dwellings mechanic in v1 | **Pure decoration** (no population mechanic); population gameplay deferred to v2 |
| 6 | Sprite source mix | **CC0 pixel-art packs** (OpenGameArt / itch.io / OpenPixelProject) + **AI-gen** (Retro Diffusion / SD pixel-art LoRA) for Dr.Stone signature buildings. Kenney noted as fallback only (mostly smooth/vector) |
| 7 | v1 polish depth | **Arcs 1-4 fully detailed** (animations, lore, sprite source per-building); **arcs 5-7 structurally listed**, animations + lore = `TODO v1.x` |
| 8 | Entry format | **Compact table** with Tier / Cost / Research prereqs / Passive / Power per row |

---

When 04-buildings locks, we move to **05-map.md** — city grid spec, building footprints visualized, power-line drawing, expansion mechanics. Shorter doc.
