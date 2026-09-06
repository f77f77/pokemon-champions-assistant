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

## PokéAPI species / move data

- API: https://pokeapi.co/ (https://pokeapi.co/api/v2)
- Used by `scripts/build-pokemon-data.mjs` for:
  - Localized names: English (`en`), Traditional Chinese (`zh-hant` → `zh-Hant`), Japanese (`ja`)
  - Classic base stats, types, abilities per form (`/pokemon/{id}`)
  - Move type / category / power / accuracy / pp (`/move/{id}`)
- Generated outputs (committed for offline use): `data/pokemon.json`, `data/moves.json`, `data/meta.json` (mirrored under `public/data/` for the Vite app)
- Rate-limited politely; do not hammer the public API
- PokéAPI data © respective Pokémon trademark holders; PokéAPI itself is fan-made

## Champions Battle Data (roster allowlist)

- API: https://championsbattledata.com/api/pokemon/{showdownId}
- Used only to confirm Champions roster presence (`championsLegal`) and collect learnable move *names* for the allowlisted showdownIds in `data/allowlist.json`
- **Do not** use CBD `summary.primary` / screen-scaled stats as classic base stats — those stay PokéAPI
- No bulk image scrape in the data build path (sprites remain the separate optional `fetch-cbd-templates.mjs` allowlist tool)
