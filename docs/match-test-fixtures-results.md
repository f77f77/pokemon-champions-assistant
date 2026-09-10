# Test fixture match results

- Fixtures: `public/fixtures/team-preview-test-1/2/3.png`
- Templates: `public/templates/*.png` (sprite_poke_3 alpha-trimmed cells; 50 files / 50 ids)
- Matcher: BG suppress + content-aware recenter + multi-scale/shift; NCC×0.55 + SSD×0.25 + aHash×0.20
- Mask: template alpha ∩ query non-black
- Scales: `[0.8, 0.95, 1.1, 1.25, 1.4]`; shifts: `[-8, -4, 0, 4, 8]`
- Threshold: 0.55
- ROI Doc: v1.3-square-thumb (panel/thumb constants **locked**)
- **Overall accuracy: 11/18**

## team-preview-test-1

**Accuracy: 2/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | charizard | empoleon | 0.6590 | N |
| 1 | aerodactyl | aerodactyl | 0.7786 | Y |
| 2 | meowscarada | sneasler | 0.7173 | N |
| 3 | garchomp | garchomp | 0.6079 | Y |
| 4 | rotomwash | excadrill | 0.6095 | N |
| 5 | aegislash | swampert | 0.6611 | N |

## team-preview-test-2

**Accuracy: 5/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | whimsicott | whimsicott | 0.6669 | Y |
| 1 | charizard | charizard | 0.6927 | Y |
| 2 | basculegion | basculegion | 0.7119 | Y |
| 3 | kingambit | kingambit | 0.7198 | Y |
| 4 | sneasler | sneasler | 0.7418 | Y |
| 5 | garchomp | swampert | 0.5964 | N |

## team-preview-test-3

**Accuracy: 4/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | ninetalesalola | ninetalesalola | 0.7772 | Y |
| 1 | empoleon | empoleon | 0.8080 | Y |
| 2 | garchomp | corviknight | 0.6092 | N |
| 3 | staraptor | staraptor | 0.7977 | Y |
| 4 | whimsicott | whimsicott | 0.6633 | Y |
| 5 | charizard | glimmora | 0.6179 | N |

## Misses

- `team-preview-test-1` slot 0: expected **charizard**, matched **empoleon** (0.659)
- `team-preview-test-1` slot 2: expected **meowscarada**, matched **sneasler** (0.717)
- `team-preview-test-1` slot 4: expected **rotomwash**, matched **excadrill** (0.610)
- `team-preview-test-1` slot 5: expected **aegislash**, matched **swampert** (0.661)
- `team-preview-test-2` slot 5: expected **garchomp**, matched **swampert** (0.596)
- `team-preview-test-3` slot 2: expected **garchomp**, matched **corviknight** (0.609)
- `team-preview-test-3` slot 5: expected **charizard**, matched **glimmora** (0.618)

## Notes

- Overlay yellow is a **square** with side = red card **body** height (pitch×(1-CARD_GAP_FRAC), CARD_GAP_FRAC=0.08) via `thumbCssPercent`/`cardRect`.
- Recognition/match crop === yellow square (`card_body=True`; side=pitch×(1-CARD_GAP_FRAC) via `cardRect`→`thumbRectInSlot`); `THUMB_CROP.left = 0.18`.
- Templates trimmed of transparent padding from sprite_poke_3 cells, then contain/letterbox to 64.
- Capture path suppresses maroon card BG and recenters on the sprite blob before multi-scale match.
- `recognize.ts` mirrors this pipeline (`cardRect` → `thumbRectInSlot`).
- Green visual frame uses `PANEL_OUTER_MARGIN_FRAC=0.02` (outer pad only; ~22px @1080p contentH); pitch/yellow/recognition still locked to `ENEMY_PANEL`.
- Accuracy with yellow-aligned crop: **11/18** (prior full-pitch `card_body=False` was **15/18**).
