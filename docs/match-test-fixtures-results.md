# Test fixture match results

- Fixtures: `public/fixtures/team-preview-test-1/2/3.png`
- Templates: `public/templates/*.png` (sprite_poke_3 alpha-trimmed cells; 50 files / 50 ids)
- Matcher: BG suppress + content-aware recenter + aHash prefilter + multi-scale/shift; NCC×0.55 + SSD×0.25 + aHash×0.20
- Guards (v1.3): `CONFIDENCE_THRESHOLD=0.54`, `MIN_MARGIN=0.08`, coarse hue ×0.85 if hist-dist>0.75, soft type-icon veto (thr=0.58), aHash top10|ham≤18
- Mask: template alpha ∩ query non-black
- Scales: `[0.9, 1.0, 1.1, 1.2, 1.35]`; shifts: `[-8, -4, 0, 4, 8]`
- ROI Doc: v1.3-square-thumb (panel/thumb/CARD_GAP **locked** — prefer null over wrong species)
- **Overall: correct 9/18, wrong species 0, null 9**

## team-preview-test-1

**Accuracy: 1/6** (wrong=0, null=5)

| slot | expected | matched | confidence | margin | types | ok |
|------|----------|---------|------------|--------|-------|----|
| 0 | charizard | None | 0.4444 | 0.4444 | fire,flying | N |
| 1 | aerodactyl | aerodactyl | 0.7435 | 0.1527 | - | Y |
| 2 | meowscarada | None | 0.6094 | 0.0337 | - | N |
| 3 | garchomp | None | 0.6314 | 0.0378 | - | N |
| 4 | rotomwash | None | 0.5336 | 0.5336 | electric,water | N |
| 5 | aegislash | None | 0.6016 | 0.0159 | - | N |

## team-preview-test-2

**Accuracy: 2/6** (wrong=0, null=4)

| slot | expected | matched | confidence | margin | types | ok |
|------|----------|---------|------------|--------|-------|----|
| 0 | whimsicott | whimsicott | 0.7514 | 0.1830 | - | Y |
| 1 | charizard | None | 0.5467 | 0.0703 | fire | N |
| 2 | basculegion | basculegion | 0.7204 | 0.2037 | water | Y |
| 3 | kingambit | None | 0.5926 | 0.0052 | - | N |
| 4 | sneasler | None | 0.5594 | 0.0552 | - | N |
| 5 | garchomp | None | 0.5289 | 0.0631 | - | N |

## team-preview-test-3

**Accuracy: 6/6** (wrong=0, null=0)

| slot | expected | matched | confidence | margin | types | ok |
|------|----------|---------|------------|--------|-------|----|
| 0 | ninetalesalola | ninetalesalola | 0.8056 | 0.3402 | ice | Y |
| 1 | empoleon | empoleon | 0.8355 | 0.2035 | water | Y |
| 2 | garchomp | garchomp | 0.6571 | 0.0895 | - | Y |
| 3 | staraptor | staraptor | 0.8272 | 0.2857 | flying | Y |
| 4 | whimsicott | whimsicott | 0.7020 | 0.0915 | - | Y |
| 5 | charizard | charizard | 0.5508 | 0.5508 | fire,flying | Y |

## Misses / unidentified

- `team-preview-test-1` slot 0: expected **charizard**, matched **None** (0.444, margin=0.444, types=['fire', 'flying'], margin_fail) [null]
- `team-preview-test-1` slot 2: expected **meowscarada**, matched **None** (0.609, margin=0.034, types=[], margin_fail) [null]
- `team-preview-test-1` slot 3: expected **garchomp**, matched **None** (0.631, margin=0.038, types=[], margin_fail) [null]
- `team-preview-test-1` slot 4: expected **rotomwash**, matched **None** (0.534, margin=0.534, types=['electric', 'water'], margin_fail) [null]
- `team-preview-test-1` slot 5: expected **aegislash**, matched **None** (0.602, margin=0.016, types=[], margin_fail) [null]
- `team-preview-test-2` slot 1: expected **charizard**, matched **None** (0.547, margin=0.070, types=['fire'], margin_fail) [null]
- `team-preview-test-2` slot 3: expected **kingambit**, matched **None** (0.593, margin=0.005, types=[], margin_fail) [null]
- `team-preview-test-2` slot 4: expected **sneasler**, matched **None** (0.559, margin=0.055, types=[], margin_fail) [null]
- `team-preview-test-2` slot 5: expected **garchomp**, matched **None** (0.529, margin=0.063, types=[], margin_fail) [null]

## Notes

- ENEMY_PANEL / THUMB_CROP / CARD_GAP_FRAC / yellow square geometry **unchanged**.
- Prefer `speciesId=null` (未識別) over wrong-species false positives.
- Type veto is soft: uncertain type OCR → no veto; when types known, candidate types from `pokemon.json` must be a **superset** of detected set (e.g. Flying → reject Incineroar).
- Coarse hue filter is conservative (×0.85) so shinies without shiny templates are not hard-killed.
- `recognize.ts` mirrors this pipeline (`cardRect` → type crop + `thumbRectInSlot` match).
- Result: **correct 9/18, wrong=0, null=9**.
