# Test fixture match results

- Fixtures: `public/fixtures/team-preview-test-1/2/3.png`
- Templates: `public/templates/*.png` (sprite_poke_3 alpha-trimmed cells; 50 files / 50 ids)
- Matcher: BG suppress + content-aware recenter + multi-scale/shift; NCC×0.55 + SSD×0.25 + aHash×0.20
- Mask: template alpha ∩ query non-black
- Scales: `[0.9, 1.0, 1.1, 1.2, 1.35]`; shifts: `[-8, -4, 0, 4, 8]`
- Threshold: 0.54
- ROI Doc: v1.3-square-thumb (panel/thumb constants **locked**)
- **Overall accuracy: 15/18**

## team-preview-test-1

**Accuracy: 3/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | charizard | incineroar | 0.6282 | N |
| 1 | aerodactyl | aerodactyl | 0.7435 | Y |
| 2 | meowscarada | talonflame | 0.6094 | N |
| 3 | garchomp | garchomp | 0.6314 | Y |
| 4 | rotomwash | rotomwash | 0.6278 | Y |
| 5 | aegislash | swampert | 0.6596 | N |

## team-preview-test-2

**Accuracy: 6/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | whimsicott | whimsicott | 0.7514 | Y |
| 1 | charizard | charizard | 0.6267 | Y |
| 2 | basculegion | basculegion | 0.7204 | Y |
| 3 | kingambit | kingambit | 0.6931 | Y |
| 4 | sneasler | sneasler | 0.6525 | Y |
| 5 | garchomp | garchomp | 0.5453 | Y |

## team-preview-test-3

**Accuracy: 6/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | ninetalesalola | ninetalesalola | 0.8056 | Y |
| 1 | empoleon | empoleon | 0.8355 | Y |
| 2 | garchomp | garchomp | 0.6571 | Y |
| 3 | staraptor | staraptor | 0.8272 | Y |
| 4 | whimsicott | whimsicott | 0.7020 | Y |
| 5 | charizard | charizard | 0.5508 | Y |

## Misses

- `team-preview-test-1` slot 0: expected **charizard**, matched **incineroar** (0.628)
- `team-preview-test-1` slot 2: expected **meowscarada**, matched **talonflame** (0.609)
- `team-preview-test-1` slot 5: expected **aegislash**, matched **swampert** (0.660)

## Notes

- ENEMY_PANEL top/bottom recalibrated from fixture card centers (cy0−pitch/2 … cy5+pitch/2): top=0.137 bottom=0.836 (was 0.143/0.832).
- Overlay yellow is a **square** with side = red card **body** height (pitch×(1-CARD_GAP_FRAC), CARD_GAP_FRAC=0.08) via `thumbCssPercent`/`cardRect`→`thumbRectInSlot` (supports topInset/bottomInset).
- Recognition/match crop === yellow square; `THUMB_CROP.left = 0.18`.
- Templates trimmed of transparent padding from sprite_poke_3 cells, then contain/letterbox to 64.
- Capture path: darker card-paint BG suppress (spare bright sprite orange) + content-aware recenter + multi-scale match.
- `recognize.ts` mirrors this pipeline (`cardRect` → `thumbRectInSlot`).
- Green visual frame uses `PANEL_OUTER_MARGIN_FRAC=0.02` (outer pad only; ~22px @1080p contentH); pitch/yellow/recognition still locked to `ENEMY_PANEL`.
- Accuracy with calibrated panel + yellow crop: **15/18** (was 11/18 after yellow-align; prior full-pitch 15/18).
