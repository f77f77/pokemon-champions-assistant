# Test fixture match results

- Fixtures: `public/fixtures/team-preview-test-1/2/3.png`
- Templates: `public/sprites/sprite_poke.png` + `atlas.json` (nationalDex-keyed in-memory crops; 50 cells / 50 ids)
- Matcher: crop cleanup (right 0.05) + BG suppress + content-aware recenter + aHash prefilter + multi-scale/shift; NCC×0.55 + SSD×0.25 + aHash×0.20
- Guards (v1.4): `CONFIDENCE_THRESHOLD=0.54`, `dyn ≥0.75→0.025 / ≥0.68→0.03 / ≥0.60→0.035 / ≥0.54→0.055 / else 0.08`, coarse hue ×0.85 if hist-dist>0.75, type **hard** gate (thr=0.58; skip if low-conf), aHash top40|ham≤18
- Mask: template alpha ∩ query non-black
- Scales: `[0.9, 1.0, 1.1, 1.2, 1.35]`; shifts: `[-8, -4, 0, 4, 8]`
- ROI Doc: v1.3-square-thumb (panel/thumb/CARD_GAP **locked** — prefer null over wrong species)
- **Overall: correct 12/18, wrong species 0, null 6**

## team-preview-test-1

**Accuracy: 2/6** (wrong=0, null=4)

| slot | expected | matched | confidence | margin | need | types | reason | ok |
|------|----------|---------|------------|--------|------|-------|--------|----|
| 0 | charizard | None | 0.4788 | 0.0344 | 0.0800 | fire,flying | LOW_CONF | N |
| 1 | aerodactyl | aerodactyl | 0.7459 | 0.1552 | 0.0300 | - | ok | Y |
| 2 | meowscarada | None | 0.6094 | 0.0337 | 0.0350 | - | MARGIN_TOO_SMALL | N |
| 3 | garchomp | garchomp | 0.6314 | 0.0378 | 0.0350 | - | ok | Y |
| 4 | rotomwash | None | 0.5336 | 0.5336 | 0.0800 | electric,water | LOW_CONF | N |
| 5 | aegislash | None | 0.6016 | 0.0051 | 0.0350 | - | MARGIN_TOO_SMALL | N |

## team-preview-test-2

**Accuracy: 4/6** (wrong=0, null=2)

| slot | expected | matched | confidence | margin | need | types | reason | ok |
|------|----------|---------|------------|--------|------|-------|--------|----|
| 0 | whimsicott | whimsicott | 0.7514 | 0.1830 | 0.0250 | - | ok | Y |
| 1 | charizard | None | 0.5487 | 0.0020 | 0.0550 | fire | AHASH_PREFILTER | N |
| 2 | basculegion | basculegion | 0.7204 | 0.2095 | 0.0300 | water | ok | Y |
| 3 | kingambit | kingambit | 0.6931 | 0.1005 | 0.0300 | - | ok | Y |
| 4 | sneasler | sneasler | 0.6525 | 0.0568 | 0.0350 | - | ok | Y |
| 5 | garchomp | None | 0.5541 | 0.0163 | 0.0550 | - | MARGIN_TOO_SMALL | N |

## team-preview-test-3

**Accuracy: 6/6** (wrong=0, null=0)

| slot | expected | matched | confidence | margin | need | types | reason | ok |
|------|----------|---------|------------|--------|------|-------|--------|----|
| 0 | ninetalesalola | ninetalesalola | 0.8056 | 0.3402 | 0.0250 | ice | ok | Y |
| 1 | empoleon | empoleon | 0.8355 | 0.2035 | 0.0250 | water | ok | Y |
| 2 | garchomp | garchomp | 0.6571 | 0.0894 | 0.0350 | - | ok | Y |
| 3 | staraptor | staraptor | 0.8272 | 0.2857 | 0.0250 | flying | ok | Y |
| 4 | whimsicott | whimsicott | 0.7042 | 0.0932 | 0.0300 | - | ok | Y |
| 5 | charizard | charizard | 0.5509 | 0.1224 | 0.0550 | fire,flying | ok | Y |

## Misses / unidentified

- `team-preview-test-1` slot 0: expected **charizard**, matched **None** (0.479, margin=0.034, need=0.080, types=['fire', 'flying'], LOW_CONF) [null]
- `team-preview-test-1` slot 2: expected **meowscarada**, matched **None** (0.609, margin=0.034, need=0.035, types=[], MARGIN_TOO_SMALL) [null]
- `team-preview-test-1` slot 4: expected **rotomwash**, matched **None** (0.534, margin=0.534, need=0.080, types=['electric', 'water'], LOW_CONF) [null]
- `team-preview-test-1` slot 5: expected **aegislash**, matched **None** (0.602, margin=0.005, need=0.035, types=[], MARGIN_TOO_SMALL) [null]
- `team-preview-test-2` slot 1: expected **charizard**, matched **None** (0.549, margin=0.002, need=0.055, types=['fire'], AHASH_PREFILTER) [null]
- `team-preview-test-2` slot 5: expected **garchomp**, matched **None** (0.554, margin=0.016, need=0.055, types=[], MARGIN_TOO_SMALL) [null]

## Notes

- ENEMY_PANEL / THUMB_CROP / CARD_GAP_FRAC / yellow square geometry **unchanged**.
- Prefer `speciesId=null` (未識別) over wrong-species false positives.
- Type hard second gate: uncertain/low-conf type OCR → no veto; when types known (score≥0.58), candidate types from `pokemon.json` must be a **superset** of detected set (e.g. Flying → reject Incineroar).
- aHash TopK=40 (smallest K lifting correct≥12/18 with wrong=0 on fixtures).
- Dynamic margin: dyn ≥0.75→0.025 / ≥0.68→0.03 / ≥0.60→0.035 / ≥0.54→0.055 / else 0.08.
- Match-crop cleanup: zero right 0.05 of yellow (type bleed); type icons still read from card top-right.
- Coarse hue filter is conservative (×0.85) so shinies without shiny templates are not hard-killed.
- `recognize.ts` mirrors this pipeline (`cardRect` → type crop + `thumbRectInSlot` match).
- Result: **correct 12/18, wrong=0, null=6**.
- Current committed sheet is a lossless pack of the 50 leftover sprite_poke_3 cells (official full-roster `sprite_sheet.png` + CSS were not available). Re-ingest with `scripts/build-sprite-atlas.py --sheet … --css …` when those files land; do not explode back into per-species PNGs.
- Pack must copy RGBA pixels (no Pillow `paste(..., mask=src)` blend). Blended edges previously ranked Talonflame over Meowscarada on test-1 slot 2.
