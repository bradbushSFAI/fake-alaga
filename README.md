# FAKE-ALAGA — Galactic Remix

A modern 8-bit take on Galaga: free-movement top-down space shooter with
power-ups, capture/rescue dual ships, wingman drones, supply-ship docking,
5 worlds × 5 levels, bosses, bonus stages, cutscenes, checkpoint codes, and
code-generated chiptune audio (no asset files — all sprites and music are
drawn/synthesized in code).

## Play

```bash
npm install
npm run dev     # open the printed localhost URL
```

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move (all directions) |
| Space | Fire (always up — power-ups change the shot) |
| P / Esc | Pause |
| M | Mute |

## Features

- **25 levels, 5 worlds** — boss every 5th level, bonus stages at 4/14/24
- **Checkpoint codes** — finish a world, get a 3-letter code; enter it at the
  title screen to jump straight back to that world
- **Difficulty sliders** — enemy speed & toughness (1–10 each); harder settings
  raise the score multiplier (×0.52 – ×1.60)
- **Power-ups** — Multi-shot, Targeting missiles, Front+Back, Rapid fire,
  Shield, Wingman drone, Extra ship
- **Ship interactions** — Warden enemies tractor-beam your ship; kill the
  captor to rescue it and fly a dual fighter. Dock with the supply ship for
  shield + a weapon upgrade.
- **Local high scores** — top 10 with 3-initial entry, difficulty multiplier
  recorded per score

## Dev

```bash
npm test        # vitest logic tests
npm run build   # typecheck + production build to dist/
```
