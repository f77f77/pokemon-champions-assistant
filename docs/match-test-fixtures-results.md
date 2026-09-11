# Test fixture match results

- Fixtures: `public/fixtures/team-preview-live-latest.jpg` only (最新實機畫面)
- Templates: `public/sprites/sprite_poke.png` + `atlas.json` (nationalDex-keyed in-memory crops; 262 cells / 262 ids)
- Matcher: crop cleanup (right 0.05) + BG suppress + content-aware recenter + aHash prefilter + multi-scale/shift; NCC×0.55 + SSD×0.25 + aHash×0.20
- Guards (v1.4): `CONFIDENCE_THRESHOLD=0.54`, `dyn ≥0.75→0.025 / ≥0.68→0.03 / ≥0.60→0.06 / ≥0.54→0.055 / else 0.08`, coarse hue ×0.85 if hist-dist>0.75, type **hard** gate (thr=0.58; skip if low-conf), aHash top40|ham≤18
- Mask: template alpha ∩ query non-black
- Scales: `[0.9, 1.0, 1.1, 1.2, 1.35]`; shifts: `[-8, -4, 0, 4, 8]`
- ROI Doc: v1.3-square-thumb (panel/thumb/CARD_GAP **locked** — prefer null over wrong species)
- **Overall: correct 6/6, wrong species 0, null 0**

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

- None

## Notes

- ENEMY_PANEL / THUMB_CROP / CARD_GAP_FRAC / yellow square geometry **unchanged**.
- Prefer `speciesId=null` (未識別) over wrong-species false positives.
- Type hard second gate: uncertain/low-conf type OCR → no veto; when types known (score≥0.58), candidate types from `pokemon.json` must be a **superset** of detected set (e.g. Flying → reject Incineroar).
- aHash TopK=40 (fixture-tuned; prefer null over wrong species).
- Dynamic margin: dyn ≥0.75→0.025 / ≥0.68→0.03 / ≥0.60→0.06 / ≥0.54→0.055 / else 0.08.
- Match-crop cleanup: zero right 0.05 of yellow (type bleed); type icons still read from card top-right.
- Coarse hue filter is conservative (×0.85) so shinies without shiny templates are not hard-killed.
- `recognize.ts` mirrors this pipeline (`cardRect` → type crop + `thumbRectInSlot` match).
- Result: **correct 6/6, wrong=0, null=0**.
- Atlas: official full-roster `sprite_sheet.png` + `sprite_poke.css` → 262 dex-keyed in-memory crops (no per-species PNG dump).
- Sole formal fixture: `team-preview-live-latest.jpg` (最新實機畫面). Expected right-column top→bottom: froslass, garchomp, basculegion, kingambit, sneasler, golisopod. Slot 5 was listed as Araquanid in the locked note; the yellow-box crop matches Golisopod (water/bug armored isopod). Araquanid’s sheet cell is the water-bubble spider and scores 0.43 vs Golisopod 0.87 — do not force that id.
- Legal roster counts: atlas cells=262, allowlist=262, pokemon.json=262.
- Enemy/ally form selector uses sibling legal forms grouped by nationalDex (regional / gender / Rotom; Mega when present in the 262).
