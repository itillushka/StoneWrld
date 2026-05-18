# StoneWrld

> A **Dr. Stone-themed pixel-art civilization game** that grows passively from your Claude Code work.
> Each prompt and tool use earns one of five resources. Resources build a Kingdom-of-Science city.
> The city is yours, growing over weeks of real coding.

## Status

**Phase 0 — bootstrap.** Design phase locked at tag [`design-locked-v1`](https://github.com/itillushka/StoneWrld/releases/tag/design-locked-v1) (all 9 design docs, ~85 decisions). Code scaffold landing now.

See [`design/09-roadmap.md`](./design/09-roadmap.md) for the 15-phase delivery plan.

## Stack (locked)

- **Phaser 3** (≥ 3.80) — pixel-art-first HTML5 game engine
- **TypeScript** (≥ 5.4) — strict
- **Vite** (≥ 5) — dev server + bundler
- **Vitest** (≥ 2) — unit tests
- **Aseprite** — pixel-art editor (sprite-pipeline post-process; see [`design/07-references.md`](./design/07-references.md))
- **Node 20+** runtime
- (Optional later) **Tauri** for desktop packaging; v1 runs in a browser tab at `localhost:5100`

## How it works (at a glance)

```
┌──────────────────────────┐       state.json        ┌─────────────────────────┐
│  Claude Code session     │ ─────write resources──▶ │  StoneWrld game app     │
│  (your real work)        │                         │  (Phaser canvas window) │
│                          │ ◀─────read state─────── │  build / upgrade / view │
│  PostToolUse hook        │                         │                         │
└──────────────────────────┘                         └─────────────────────────┘
```

Claude Code is the **earner** (your work generates resources). StoneWrld is the **viewer/spender** (browser game window at `localhost:5100`). They sync via a single `state.json` at the project root (gitignored).

## Quick start

```bash
git clone git@github.com-itillushka:itillushka/StoneWrld.git
cd StoneWrld
npm install
npm run dev
```

Open http://localhost:5100 — Phase 0 renders the boot placeholder.

The PostToolUse hook + state API + full city game land in subsequent phases — see [`design/09-roadmap.md`](./design/09-roadmap.md).

## npm scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on port 5100 |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build on port 5101 |
| `npm run test` | Run Vitest unit tests once |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:ui` | Vitest UI on port 5102 |
| `npm run typecheck` | `tsc --noEmit` |

More scripts (`compile`, `pack`, `hook:install`, `bootstrap`) land as the underlying tooling lands in later phases.

## Where things are

- [`design/`](./design/) — the 9 locked design docs. **Single source of truth.** Start at [`design/README.md`](./design/README.md).
- [`src/`](./src/) — TypeScript source (Phaser scenes, state, economy, catalog, HUD, Mecha Senku, api).
- [`public/`](./public/) — static assets shipped with the game build (atlases, content/factoids.json, maps/, fonts/).
- [`hooks/`](./hooks/) — Claude Code PostToolUse hook (the earner side).
- [`scripts/`](./scripts/) — build helpers (atlas packing, catalog/tech-tree compilation from Markdown).
- [`tests/`](./tests/) — Vitest unit tests.
- [`assets/`](./assets/) — pre-atlas source assets (Aseprite projects + raw PNGs).
- `state.json` — runtime game state (gitignored, created on first game open).
- `moodboard/` — vibe-pack references + canon screenshots (gitignored — see [`design/07-references.md`](./design/07-references.md) §License discipline).

## Who this is for

Single-player, single-machine. Illia is the player. No multiplayer, no leaderboard, no server, no monetization.

## Captain & co-captain

- **Captain** (the executor) — Claude Code in Ryusui Nanami voice.
- **Co-captain** (the design lead + player) — Illia.

See `~/.claude/CLAUDE.md` for the persona context that frames every interaction with this project.

## License

MIT — see [`LICENSE`](./LICENSE).
