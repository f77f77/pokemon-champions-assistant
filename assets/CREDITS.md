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
  - National Pokédex number (`pokemon-species.id` → `nationalDex`)
  - Classic base stats, types, abilities per form (`/pokemon/{id}`)
  - Form / Mega varieties (`species.varieties` → `forms[]` on each allowlisted record)
  - Move type / category / power / accuracy / pp (`/move/{id}`)
- Generated outputs (committed for offline use): `data/pokemon.json`, `data/moves.json`, `data/meta.json` (mirrored under `public/data/` for the Vite app)
- Rate-limited politely; do not hammer the public API
- PokéAPI data © respective Pokémon trademark holders; PokéAPI itself is fan-made

## Champions Battle Data (roster allowlist + Doubles usage)

- Index API: https://championsbattledata.com/api/index
  - Refresh top-N Doubles allowlist: `node scripts/build-pokemon-data.mjs --update-allowlist --top=50`
  - Rank = `summary.battleSummary.Current.Doubles.position` (lower = higher usage)
- API: https://championsbattledata.com/api/pokemon/{showdownId}
  - Roster presence (`championsLegal`) + learnable move *names* for `data/allowlist.json`
- Battle API: https://championsbattledata.com/api/battle/Doubles/{showdownId}
  - **VGC Doubles (2v2 / 6-pick-4)** top moves + usage % → baked as `vgcDoublesMoves` on `data/pokemon.json` (and per-form when a distinct showdownId exists)
  - App resolves zh-Hant names / types via PokéAPI `data/moves.json`; never invents learnsets or fake %
- **Do not** use CBD `summary.primary` / screen-scaled stats as classic base stats — those stay PokéAPI
- No bulk image scrape in the data build path (sprites remain the separate optional `fetch-cbd-templates.mjs` allowlist tool)

## Team Preview test fixtures

- `public/fixtures/team-preview-test-1.png`, `team-preview-test-2.png` — SV Ranked Doubles team-preview screenshots (zh-Hans UI) for ROI / OCR regression
- `public/fixtures/team-preview.png` — original seed screenshot
- App「載入測試圖」cycles these three (ROI Doc remains locked; fixtures only)
