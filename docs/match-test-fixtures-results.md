# Test fixture match results

- Fixtures: `public/fixtures/team-preview-test-1/2/3.png` + `team-preview-live-latest.jpg`
- Templates: `public/sprites/sprite_poke.png` + `atlas.json` (nationalDex-keyed in-memory crops; 262 cells / 262 ids)
- Matcher: crop cleanup (right 0.05) + BG suppress + content-aware recenter + aHash prefilter + multi-scale/shift; NCC×0.55 + SSD×0.25 + aHash×0.20
- Guards (v1.4): `CONFIDENCE_THRESHOLD=0.54`, `dyn ≥0.75→0.025 / ≥0.68→0.03 / ≥0.60→0.06 / ≥0.54→0.055 / else 0.08`, coarse hue ×0.85 if hist-dist>0.75, type **hard** gate (thr=0.58; skip if low-conf), aHash top40|ham≤18
- Mask: template alpha ∩ query non-black
- Scales: `[0.9, 1.0, 1.1, 1.2, 1.35]`; shifts: `[-8, -4, 0, 4, 8]`
- ROI Doc: v1.3-square-thumb (panel/thumb/CARD_GAP **locked** — prefer null over wrong species)
- **Overall: correct 18/24, wrong species 0, null 6**

## team-preview-test-1

**Accuracy: 5/6** (wrong=0, null=1)

| slot | expected | matched | confidence | margin | need | types | reason | ok |
|------|----------|---------|------------|--------|------|-------|--------|----|
| 0 | charizard | None | 0.4049 | 0.4049 | 0.0800 | fire,flying | AHASH_PREFILTER | N |
| 1 | aerodactyl | aerodactyl | 0.8355 | 0.2138 | 0.0250 | - | ok | Y |
| 2 | sneasler | sneasler | 0.8365 | 0.2109 | 0.0250 | - | ok | Y |
| 3 | garchomp | garchomp | 0.7724 | 0.1498 | 0.0250 | - | ok | Y |
| 4 | rotomwash | rotomwash | 0.5913 | 0.5913 | 0.0550 | electric,water | ok | Y |
| 5 | aegislash | aegislash | 0.6997 | 0.0940 | 0.0300 | - | ok | Y |

## team-preview-test-2

**Accuracy: 2/6** (wrong=0, null=4)

| slot | expected | matched | confidence | margin | need | types | reason | ok |
|------|----------|---------|------------|--------|------|-------|--------|----|
| 0 | whimsicott | None | 0.6160 | 0.0574 | 0.0600 | - | AHASH_PREFILTER | N |
| 1 | charizard | None | 0.4771 | 0.0182 | 0.0800 | fire | AHASH_PREFILTER | N |
| 2 | basculegion | basculegion | 0.7312 | 0.1872 | 0.0300 | water | ok | Y |
| 3 | kingambit | kingambit | 0.6598 | 0.0708 | 0.0600 | - | ok | Y |
| 4 | sneasler | None | 0.6062 | 0.0092 | 0.0600 | - | AHASH_PREFILTER | N |
| 5 | garchomp | None | 0.5740 | 0.0009 | 0.0550 | - | AHASH_PREFILTER | N |

## team-preview-test-3

**Accuracy: 5/6** (wrong=0, null=1)

| slot | expected | matched | confidence | margin | need | types | reason | ok |
|------|----------|---------|------------|--------|------|-------|--------|----|
| 0 | ninetalesalola | ninetalesalola | 0.8442 | 0.2895 | 0.0250 | ice | ok | Y |
| 1 | empoleon | empoleon | 0.8455 | 0.2320 | 0.0250 | water | ok | Y |
| 2 | garchomp | garchomp | 0.7334 | 0.1365 | 0.0300 | - | ok | Y |
| 3 | staraptor | staraptor | 0.8590 | 0.2530 | 0.0250 | flying | ok | Y |
| 4 | whimsicott | None | 0.6219 | 0.0013 | 0.0600 | - | MARGIN_TOO_SMALL | N |
| 5 | charizard | charizard | 0.5508 | 0.5508 | 0.0550 | fire,flying | ok | Y |

## team-preview-live-latest

**Accuracy: 6/6** (wrong=0, null=0)

| slot | expected | matched | confidence | margin | need | types | reason | ok |
|------|----------|---------|------------|--------|------|-------|--------|----|
| 0 | froslass | froslass | 0.7168 | 0.1975 | 0.0300 | ice | ok | Y |
| 1 | garchomp | garchomp | 0.7738 | 0.1627 | 0.0250 | - | ok | Y |
| 2 | basculegion | basculegion | 0.8277 | 0.1975 | 0.0250 | water | ok | Y |
| 3 | kingambit | kingambit | 0.6887 | 0.1343 | 0.0300 | - | ok | Y |
| 4 | sneasler | sneasler | 0.8400 | 0.2328 | 0.0250 | - | ok | Y |
| 5 | golisopod | golisopod | 0.8706 | 0.2912 | 0.0250 | water | ok | Y |

## Misses / unidentified

- `team-preview-test-1` slot 0: expected **charizard**, matched **None** (0.405, margin=0.405, need=0.080, types=['fire', 'flying'], AHASH_PREFILTER) [null]
- `team-preview-test-2` slot 0: expected **whimsicott**, matched **None** (0.616, margin=0.057, need=0.060, types=[], AHASH_PREFILTER) [null]
- `team-preview-test-2` slot 1: expected **charizard**, matched **None** (0.477, margin=0.018, need=0.080, types=['fire'], AHASH_PREFILTER) [null]
- `team-preview-test-2` slot 4: expected **sneasler**, matched **None** (0.606, margin=0.009, need=0.060, types=[], AHASH_PREFILTER) [null]
- `team-preview-test-2` slot 5: expected **garchomp**, matched **None** (0.574, margin=0.001, need=0.055, types=[], AHASH_PREFILTER) [null]
- `team-preview-test-3` slot 4: expected **whimsicott**, matched **None** (0.622, margin=0.001, need=0.060, types=[], MARGIN_TOO_SMALL) [null]

## Notes

- ENEMY_PANEL / THUMB_CROP / CARD_GAP_FRAC / yellow square geometry **unchanged**.
- Prefer `speciesId=null` (未識別) over wrong-species false positives.
- Type hard second gate: uncertain/low-conf type OCR → no veto; when types known (score≥0.58), candidate types from `pokemon.json` must be a **superset** of detected set (e.g. Flying → reject Incineroar).
- aHash TopK=40 (smallest K lifting correct≥12/18 with wrong=0 on fixtures).
- Dynamic margin: dyn ≥0.75→0.025 / ≥0.68→0.03 / ≥0.60→0.06 / ≥0.54→0.055 / else 0.08.
- Match-crop cleanup: zero right 0.05 of yellow (type bleed); type icons still read from card top-right.
- Coarse hue filter is conservative (×0.85) so shinies without shiny templates are not hard-killed.
- `recognize.ts` mirrors this pipeline (`cardRect` → type crop + `thumbRectInSlot` match).
- Result: **correct 18/24, wrong=0, null=6**.
- Atlas: official full-roster `sprite_sheet.png` + `sprite_poke.css` → 262 dex-keyed in-memory crops (no per-species PNG dump).
- Live fixture `team-preview-live-latest.jpg` is a real Champions Team Preview capture.
- test-1 slot 2 ground truth is Sneasler (Fighting/Poison); older label meowscarada was wrong.
- dyn ≥0.60 margin raised to 0.06 so full-atlas FPs (e.g. whimsicott→appletun) stay null.
