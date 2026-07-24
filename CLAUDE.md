# FAKE-ALAGA

8-bit Galaga-style shooter. Phaser 3 + Vite + TypeScript. No asset files — all
sprites are code-drawn pixel maps (`src/sprites.ts`) and all audio is WebAudio
chiptune (`src/audio.ts`).

## Commands

- `npm run dev` — Vite dev server (usually :5174)
- `npm test` — vitest unit tests (pure logic: codes, difficulty, level data)
- `npm run test:e2e` — Playwright browser tests (`tests/e2e/*.pw.ts`, chromium only)
- `npm run build` — typecheck + production build

## Testing delegation

Browser/E2E testing is **delegated to Codex** via the global `codex-testing` skill.
Unit tests stay with Claude in vitest. After Codex delivers a test, always rerun it
locally (`npm run test:e2e`, 2–3×) before accepting — Codex's sandbox verifies
against a static build, and local-vs-sandbox differences have surfaced real bugs
(see the 2026-07-24 key multi-delivery fix).

## Conventions

- Test hooks for automation: `window.__game` (Phaser.Game), `window.__audio`
  (ChipAudio). Keep new hooks minimal and in `src/main.ts`.
- `?touch=1` query param forces mobile touch controls on desktop.
- One-shot keys (mute, pause, menu/letter input) use plain `window` keydown
  listeners with scene-lifecycle cleanup — NOT Phaser's generic `keydown` emit,
  which can deliver one physical press multiple times. Keep it that way.
- Held keys (WASD/Space movement+fire) poll `key.isDown` — that's safe.
- Deploys: push to `main` auto-deploys to Vercel (https://fake-alaga.vercel.app).
