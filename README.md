# StoneWrld

> A **Dr. Stone-themed pixel-art civilization game** that grows passively from your Claude Code work.
> Each prompt and tool use earns resources. Resources build a Kingdom-of-Science city.
> The city is yours, growing over weeks of real coding.

## Status

**Design phase.** No runtime code yet.

## Stack (locked)

- **Phaser 3** — pixel-art-friendly HTML5 game framework
- **TypeScript**
- **Vite** — dev server + bundler
- (Optional later) **Electron / Tauri** for desktop packaging; v1 runs in a browser tab at `localhost:<port>`

## How it works (at a glance)

```
┌──────────────────────────┐       state.json        ┌─────────────────────────┐
│  Claude Code session     │ ─────write resources──▶ │  StoneWrld game app     │
│  (your real work)        │                         │  (Phaser canvas window) │
│                          │ ◀─────read state─────── │  build / upgrade / view │
│  PostToolUse hook        │                         │                         │
└──────────────────────────┘                         └─────────────────────────┘
```

Claude Code is the **earner** (your work generates resources). StoneWrld is the **viewer/spender** (real game window where you spend those resources on a growing city). They sync via a single `state.json`.

## Where things are

- [`design/`](./design/) — design documents (single source of truth until implementation begins)
  - Start at [`design/README.md`](./design/README.md) for navigation.
- `src/` — *(will appear later — Phaser TS code)*
- `public/` — *(will appear later — static assets, sprites)*
- `tests/` — *(will appear later)*
- `package.json` — *(will appear later — npm scripts, deps)*

## Who this is for

Single-player, single-machine. Illia is the player. No multiplayer, no leaderboard, no server, no monetization.

## Captain & co-captain

- **Captain** (the executor) — Claude Code in Ryusui Nanami voice.
- **Co-captain** (the design lead) — Illia.

See `~/.claude/CLAUDE.md` for the persona context that frames every interaction with this project.
