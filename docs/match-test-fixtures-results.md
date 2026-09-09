# Test fixture match results

- Fixtures: `public/fixtures/team-preview-test-1/2/3.png`
- Templates: `public/templates/*.png` (ROI Doc v1.2 crops, `source: roi-crop`; 50 files / 50 ids)
- Matcher: NCC×0.55 + SSD×0.25 + aHash×0.20 (same weights as `recognize.ts`)
- Threshold: 0.55
- ROI Doc: v1.2 (panel/thumb constants **locked**)
- **Overall accuracy: 4/18**

## Notes on templates

- Primary templates: `sprite_poke_3` cell cuts (RGBA) under `public/templates/`.
- Yellow ROI is a **square** with side = red card height (`THUMB_CROP.left = 0.18`).
- Capture + template load use contain/letterbox into 64 (never stretch); match is grayscale with alpha mask.
- Raw official sheet is **not** committed.

## team-preview-test-1

**Accuracy: 1/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | charizard | charizard | 0.5888 | Y |
| 1 | aerodactyl | aerodactyl | 0.4687 | N |
| 2 | meowscarada | talonflame | 0.5301 | N |
| 3 | garchomp | arcaninehisui | 0.5509 | N |
| 4 | rotomwash | sableye | 0.6011 | N |
| 5 | aegislash | sableye | 0.5928 | N |

## team-preview-test-2

**Accuracy: 1/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | whimsicott | gengar | 0.6032 | N |
| 1 | charizard | charizard | 0.6659 | Y |
| 2 | basculegion | arcaninehisui | 0.5716 | N |
| 3 | kingambit | aegislash | 0.5409 | N |
| 4 | sneasler | talonflame | 0.5767 | N |
| 5 | garchomp | corviknight | 0.4839 | N |

## team-preview-test-3

**Accuracy: 2/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | ninetalesalola | ninetalesalola | 0.6232 | Y |
| 1 | empoleon | talonflame | 0.5810 | N |
| 2 | garchomp | arcaninehisui | 0.5403 | N |
| 3 | staraptor | gengar | 0.5023 | N |
| 4 | whimsicott | torkoal | 0.5951 | N |
| 5 | charizard | charizard | 0.6152 | Y |

## Notes

- Prefer **ROI-crop** seeds in `public/templates/` for Team Preview recognition.
- CBD menu sprites under `assets/templates/preview-thumbs/` (`source: cbd`) fill gaps only;
  recognition default stays ROI crops.
- `recognize.ts` loads all `manifest.json` entries (not only the original 6 圖二 seeds).
- ROI constants must stay locked (`src/lib/roi.ts` ↔ crop/match scripts).
