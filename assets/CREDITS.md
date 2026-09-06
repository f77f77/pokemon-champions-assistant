# Asset credits

## Champions Battle Data (CBD) sprites

- Site / API: https://championsbattledata.com/
- API guide: https://championsbattledata.com/api_guide
- Downloaded via `scripts/fetch-cbd-templates.mjs` into `assets/templates/preview-thumbs/`
- Paths: `pokemon_champions_assets/pokemon/{SavedName}.png`
- These are **menu-style** sprites. Prefer `public/templates/` ROI crops for Team Preview recognition.
- PNG binaries under `assets/templates/preview-thumbs/` are **gitignored** (re-fetch with the script). Keep `manifest.jsonl` + this CREDITS file in git.
- Do **not** pull Pokémon HOME art or PokéAPI `official-artwork`.

## ROI-crop Team Preview thumbs

- Source screenshot: 圖二 / `public/fixtures/team-preview.png`
- Cropped with locked ROI Doc v1.2 (`scripts/crop-preview-templates.py` ↔ `src/lib/roi.ts`)
- Stored in `public/templates/{showdownId}.png` with `source: roi-crop` in `manifest.json`
