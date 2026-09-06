# Pokemon Champions battle assistant (v0.1)

Electron + Vite + React (TypeScript). Defaults: AverMedia GC551, local Team Preview thumbs, Spe hand-fill, championsbattledata Doubles stub.

UI strings remain Traditional Chinese.

## Quick start

```bash
npm install
npm run dev
npm run electron:dev
npm run typecheck
```

## Capture device / static Team Preview

Without GC551: use 「載入靜態選隊圖」 (or drag-drop onto the 16:9 preview) to load an official select-screen screenshot. Same contentRect → ROI → thumb → recognize pipeline + green/yellow debug overlay. Still image overrides the preview until you re-open the camera.

## Capture device

1. Plug in AverMedia GC551 (normal videoinput)

2. Open camera; picker prefers GC551/AVerMedia, then OBS Virtual Camera

3. Persist deviceId in localStorage key pkmn-champions-video-device

4. No stream shows Traditional Chinese no-signal message

5. Recognize button grabs ONE frame via canvas then ROI crop (not per-frame)

Busy label uses Traditional Chinese recognizing-state text.

## ROI (VGC spec)

Coordinates relative to letterboxed 16:9 contentRect (computeContentRect).

| Constant | Value | Notes |

|----------|-------|-------|

| ENEMY_PANEL_DEFAULT | (0.811,0.143)-(0.965,0.832) | Enemy panel |

| SLOT_COUNT | 6 equal vertical slots | |

| THUMB_CROP | horizontal 5%-38%; vertical inset 12% | Per-slot thumb |

| TEMPLATE_SIZE | 64 | Resize before match |

| ROI_FINE_TUNE_MAX | +/-2% | Settings sliders |


Files: src/lib/roi.ts, src/lib/recognize.ts.

Settings: ROI fine-tune + green/yellow debug overlay.

## Recognize result

Per slot: { slot, confidence, speciesId?, speciesNameZh?, thumbnailDataUrl? }.

Low confidence -> null species + unidentified label; manual override OK. Do not guess held items.

PREVIEW_THUMB_TEMPLATES = Team Preview small thumbs only (NOT large art / HOME art). Empty stub; still emits 6 crops.

Acceptance: recognizeEnemyTeamFromCanvas(team-preview frame) -> 6 slots once.

## Layout

1. Left my team / 2. Capture preview / 3. Speed axis / 4. Enemy panel

## Out of scope

Cloud vision / memory read / full dex / live championsbattledata scrape / release pipeline.

Pokemon trademarks belong to their owners; unaffiliated project.
