# 01 — Vision

> STATUS: **locked** (2026-05-18)

## The pitch

**StoneWrld** is a Dr. Stone-themed pixel-art civilization game whose economy is your real coding work. Every Claude Code prompt and tool use earns one of five resources (Knowledge, Discovery, Iron, Innovation, Completion). You spend them in a separate game window to build, upgrade, and power a Kingdom-of-Science city that grows over weeks of work.

It is the visible trace your day's coding never leaves.

## The why (the gap it fills)

Right now your tooling pays off invisibly. You ship a feature → it's in git, in the deploy, in the customer's hands. You debug a brutal bug → it's in the commit log. But your *desktop* has no idea you did anything special today.

The existing customization (Medusa banner, Ryusui theme, custom agents) celebrates the *crew* — the work itself still has no visual home.

StoneWrld is the home. Coding sessions accrue. Buildings appear. The Perseus eventually docks. **Work compounds into something you can point at.**

## Target experience

A typical interaction:

1. You finish a coding session — closed three issues, refactored a service.
2. You open the StoneWrld window (one click, an icon on your taskbar).
3. The HUD shows you earned: `+47📚, +12🔭, +89⛓, +63⚡, +2🏁` since last session.
4. You see your city — current buildings sitting on a pixel-art grid, the latest construction glow-pulse-highlighted.
5. You think: *"I've got enough Iron + Innovation now to upgrade the workshop to T2."*
6. Click the workshop sprite → upgrade dialog → confirm. Animation plays. The workshop redraws as its T2 sprite. A small Senku catchphrase pops: *"Yeah — production is exhilarating."*
7. You close the window. Your wallpaper (if enabled) refreshes to the new city. You go back to work.

The whole interaction takes 1-3 minutes. The game never demands you play; it waits for you.

## Dopamine moments (the actual game feel we want)

1. **The deposit** — coming back after a real coding session and watching your resources jump. The bigger the session, the bigger the rush. This is the core loop.
2. **The threshold** — saving up enough of a specific resource to finally afford a build you've been eyeing. Long-term goal mechanic.
3. **The upgrade reveal** — a building visibly redraws to its next tier sprite. Real visual change. Real "this is mine, I made it" feeling.
4. **The unlock** — late-game buildings (sulfa factory, Perseus dock) become buildable only after specific milestones. Watching the catalog open up over weeks.
5. **The brownout warning** — too many factories for your power capacity? Status turns amber, production drops. Forces you to *plan* the industrial expansion. Real strategy moment.
6. **The Perseus moment** — when you finally afford the Perseus dock, an animation plays and the ship docks on the city's coast. Once-in-the-game-arc payoff. The captain's true treasure.

## What this is NOT

- **Not competitive.** No leaderboard, no rank, no comparison to other players.
- **Not time-pressured.** No "log in daily or lose your streak." No FOMO mechanics. The game waits.
- **Not multiplayer.** Single-player, single-machine, single-state-file. Your city is yours.
- **Not monetized.** Free, MIT-or-similar license, personal use.
- **Not a precise civ-sim.** No detailed resource flows, no diplomacy, no random events, no disasters, no AI opponents. The simulation is shallow on purpose — the *visible city* is the deliverable, not the simulation.
- **Not Dr. Stone fan service.** Themed yes, but the core mechanic comes first. Someone who hasn't watched Dr. Stone can still play it; they just miss the references.
- **Not addictive-by-design.** No compulsion mechanics (no streak meters, no "your factories are SAD because you haven't played" notifications). The reward is the *visible progress*, not engagement metrics.

## Player profile

**Illia.** That's the spec. The game lives or dies on whether Illia keeps using it after the novelty wears off.

A useful proxy for "Illia in 6 months": *the busy AI tech lead who has too many real things to do.* The game must respect that:
- It loads fast (Phaser dev server should hot-reload; production build should open in <2s).
- It does not demand attention (no notifications, no "your city needs you" interruptions).
- It rewards depth (a player who pays attention to power-grid planning gets more out of it than a casual builder).
- It accepts shallowness (a player who just builds whatever is shiny still has fun).

Other players (Cone Red colleagues, anyone curious online) are *bonus audience*. If the project ever gets shared publicly, the player profile stays single-player; the social layer (if any) is "show your screenshot," not "compete on a leaderboard."

## Tone / mood

**Captain's voice** in every in-game text. The same Ryusui-Nanami voice Claude speaks in to Illia, applied to the game's narration:

- Build completed: *"Treasure secured. Workshop T2 on the deck."*
- Brownout: *"Storm on the power grid — capacity ${capacity}, demand ${demand}. Reroute or build."*
- Unlock: *"Hoshii — the Perseus catalogue just opened up."*
- Resource gain: *"Plunder from the last watch: +47📚, +12🔭, +89⛓, +63⚡, +2🏁."*
- Failed build (insufficient resources): *"Bad trade — short on ${resource}. Captain won't allow it."*

**Senku quotes** when scientific milestones happen (unlock of alchemy lab, first tier-3 build, etc.): *"10 billion percent — your chemistry is exhilarating."*

**Dr. Stone references** seeded throughout but never tested-on. A player who hasn't watched the show sees flavorful captain-talk; a fan recognizes the references.

## Success criteria (how we know it worked)

- **2-month survival**: Illia keeps the StoneWrld window pinned and opens it ≥3× / week for 2 months after v1 ships.
- **Visible city growth**: by end of month 2, the city has ≥10 buildings with ≥3 of them at tier 2 and ≥1 at tier 3.
- **No compulsion guilt**: Illia never feels like he *has* to open it. When he does, it's because he wants to see the deposit.
- **At least one "huh, neat" moment**: the wallpaper export (if kept) actually gets noticed by Illia at least once. Or: the Perseus dock animation lands.

Anti-success:
- A v1 that ships and gets forgotten by week 2.
- An economy so punishing that buildings take weeks of work to afford.
- An economy so generous that the catalog is exhausted in a week.
- A game window heavy enough that opening it feels expensive (load time, memory).

## Decisions locked

1. **Wallpaper fate — (c) v2.** Game window first. Add wallpaper export later if we find we want passive city visibility when the game isn't open. Keeps v1 scope tight and dodges platform-specific `gsettings` work for now.

2. **Sprite source — (d) Mix.** Some sprites from public sources (Kenney CC0 packs and similar free libraries). Specific Dr. Stone signature buildings (sulfa factory, Perseus dock, telephone exchange, observatory, etc.) generated with AI pixel-art tooling. Detailed sourcing plan in `05-style.md` and `06-references.md`.

3. **Save data location — (a) `~/StoneWrld/state.json`.** Inside the project folder, alongside source + design. Easy to find, easy to debug, easy to wipe. If we ever ship as a packaged Electron/Tauri binary for someone else, migrate to XDG (`~/.local/share/StoneWrld/`); for v1 with Illia as the only player, the in-project path wins.

4. **Pixel-art aesthetic — (a) Pure retro.** Sharp pixels, no antialiasing, integer scaling only. Stardew Valley / classic SimCity 2000 lineage. **Implication: the HUD / menus / dialogs are also in pixel-art style** — pixel font, blocky borders, retro chrome — *not* a modern UI overlay. This is more thematic but harder to make readable; we solve the readability problem in `05-style.md` with deliberate font sizing and high-contrast palette.

5. **Game time — (a) Instant.** Click → build appears immediately. No construction timers, no waiting. The player opens the game for 1-3 minutes; they should never be told "come back in 2 hours." The game waits for the player, not the other way around.

---

When 01-vision locks (✓ done), we move to **02-game-logic** — the rules that make the dopamine moments work.
