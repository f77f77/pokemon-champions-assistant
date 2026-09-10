# Test fixture match results

- Fixtures: `public/fixtures/team-preview-test-1/2/3.png`
- Templates: `public/templates/*.png` (sprite_poke_3 alpha-trimmed cells; 50 files / 50 ids)
- Matcher: BG suppress + content-aware recenter + multi-scale/shift; NCC×0.55 + SSD×0.25 + aHash×0.20
- Mask: template alpha ∩ query non-black
- Scales: `[0.8, 0.95, 1.1, 1.25, 1.4]`; shifts: `[-8, -4, 0, 4, 8]`
- Threshold: 0.55
- ROI Doc: v1.3-square-thumb (panel/thumb constants **locked**)
- **Overall accuracy: 15/18**

## team-preview-test-1

**Accuracy: 5/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | charizard | charizard | 0.6862 | Y |
| 1 | aerodactyl | aerodactyl | 0.7233 | Y |
| 2 | meowscarada | talonflame | 0.6086 | N |
| 3 | garchomp | garchomp | 0.6541 | Y |
| 4 | rotomwash | rotomwash | 0.5964 | Y |
| 5 | aegislash | aegislash | 0.7261 | Y |

## team-preview-test-2

**Accuracy: 5/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | whimsicott | whimsicott | 0.7451 | Y |
| 1 | charizard | charizard | 0.7307 | Y |
| 2 | basculegion | basculegion | 0.7338 | Y |
| 3 | kingambit | kingambit | 0.6363 | Y |
| 4 | sneasler | empoleon | 0.6340 | N |
| 5 | garchomp | garchomp | 0.6823 | Y |

## team-preview-test-3

**Accuracy: 5/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | ninetalesalola | ninetalesalola | 0.7680 | Y |
| 1 | empoleon | empoleon | 0.7920 | Y |
| 2 | garchomp | garchomp | 0.6320 | Y |
| 3 | staraptor | staraptor | 0.7871 | Y |
| 4 | whimsicott | whimsicott | 0.6954 | Y |
| 5 | charizard | incineroar | 0.5985 | N |

## Misses

- `team-preview-test-1` slot 2: expected **meowscarada**, matched **talonflame** (0.609)
- `team-preview-test-2` slot 4: expected **sneasler**, matched **empoleon** (0.634)
- `team-preview-test-3` slot 5: expected **charizard**, matched **incineroar** (0.599)

## Notes

- Overlay yellow is a **square** with side = red card **body** height (pitch×(1-CARD_GAP_FRAC), CARD_GAP_FRAC=0.08) via `thumbCssPercent`/`cardRect`.
- Recognition/match crop uses **full pitch** square (side=pitch; `card_body=False`) — card-body shrink regresses fixtures; `THUMB_CROP.left = 0.18`.
- Templates trimmed of transparent padding from sprite_poke_3 cells, then contain/letterbox to 64.
- Capture path suppresses maroon card BG and recenters on the sprite blob before multi-scale match.
- `recognize.ts` mirrors this pipeline.
