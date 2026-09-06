# Test fixture match results

- Fixtures: `public/fixtures/team-preview-test-1.png`, `team-preview-test-2.png`
- Templates: `public/templates/*.png` (ROI Doc v1.2 crops, `source: roi-crop`; 18 files / 17 ids)
- Matcher: NCC×0.55 + SSD×0.25 + aHash×0.20 (same weights as `recognize.ts`)
- Threshold: 0.55
- ROI Doc: v1.2 (panel/thumb constants **locked**)
- **Overall accuracy: 12/12**

## Slot 6 identity (test-1)

- Crop shows tea-bowl / whisk silhouette → **sinistcha** (來悲粗茶), not Poltchageist (斯魔茶) or Brambleghast (怖納噬草).
- Test-1 slot 3 labeled **zoroark** (Unovan base; crop is dark gray + red mane, not Hisuian white).

## team-preview-test-1

**Accuracy: 6/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | gengar | gengar | 1.0000 | Y |
| 1 | sableye | sableye | 1.0000 | Y |
| 2 | zoroark | zoroark | 1.0000 | Y |
| 3 | basculegion | basculegion | 1.0000 | Y |
| 4 | annihilape | annihilape | 1.0000 | Y |
| 5 | sinistcha | sinistcha | 1.0000 | Y |

## team-preview-test-2

**Accuracy: 6/6**

| slot | expected | matched | confidence | ok |
|------|----------|---------|------------|----|
| 0 | charizard | charizard | 1.0000 | Y |
| 1 | bellibolt | bellibolt | 1.0000 | Y |
| 2 | scovillain | scovillain | 1.0000 | Y |
| 3 | archaludon | archaludon | 1.0000 | Y |
| 4 | blastoise | blastoise | 1.0000 | Y |
| 5 | sableye | sableye | 1.0000 | Y |

## Notes

- Prefer **ROI-crop** seeds in `public/templates/` for Team Preview recognition.
- CBD menu sprites under `assets/templates/preview-thumbs/` (`source: cbd`) fill gaps only;
  recognition default stays ROI crops.
- `recognize.ts` loads all `manifest.json` entries (not only the original 6 圖二 seeds).
- ROI constants must stay locked (`src/lib/roi.ts` ↔ crop/match scripts).
