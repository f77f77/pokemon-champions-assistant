# Pokemon Champions battle assistant (v0.1 / recognize v1.3)

Electron + Vite + React (TypeScript). Defaults: AverMedia GC551, local Team Preview thumbs, Spe hand-fill, championsbattledata VGC Doubles (2v2 / 6-pick-4) usage.

UI strings remain Traditional Chinese.

## Quick start

```bash
npm install
npm run dev
npm run electron:dev
npm run typecheck
```

## Capture device / static Team Preview

Without GC551:

- Use static select-screen load button (or drag-drop onto the 16:9 preview)
- Use test-fixture button to cycle `public/fixtures/team-preview-test-{1,2,3}.png`

Same contentRect → ROI → thumb → recognize pipeline + green/yellow debug overlay. Still image overrides the preview until you re-open the camera.

## Capture device

1. Plug in AverMedia GC551 (normal videoinput)

2. Open camera; picker prefers GC551/AVerMedia, then OBS Virtual Camera

3. Persist deviceId in localStorage key pkmn-champions-video-device

4. No stream shows Traditional Chinese no-signal message

5. Recognize button grabs ONE frame via canvas then ROI crop (not per-frame)

Busy label uses Traditional Chinese recognizing-state text.

## ROI (VGC spec — Doc v1.3-square-thumb, LOCKED)

Coordinates relative to letterboxed 16:9 contentRect (`computeContentRect`).
**Do not change** `ENEMY_PANEL` / yellow square / `CARD_GAP_FRAC` / panel geometry.

| Constant | Value | Notes |
|----------|-------|-------|
| ENEMY_PANEL_DEFAULT | (0.811,0.137)-(0.965,0.836) | Enemy panel (fixture-calibrated) |
| CARD_GAP_FRAC | 0.08 | Inter-card gap; red card body = pitch×(1−gap) |
| THUMB_CROP.left | 0.18 | Yellow **square** left edge (side = card body height) |
| PANEL_OUTER_MARGIN_FRAC | 0.02 | Green visual pad only (does not shift yellow/recognition) |
| TEMPLATE_SIZE | 64 | Contain/letterbox before match (never stretch) |
| ROI_FINE_TUNE_MAX | ±2% | Settings sliders |

Files: `src/lib/roi.ts`, `src/lib/recognize.ts`.

Settings: ROI fine-tune + green/yellow debug overlay.

## Recognize / template matching (v1.3 guards)

Per slot: `{ slot, confidence, speciesId?, speciesNameZh?, thumbnailDataUrl?, altSpeciesId?, margin?, detectedTypes? }`.

Pipeline (local only, no cloud) — **prefer `null`/未識別 over wrong species**:

1. Crop yellow square thumb with locked ROI (`cardRect` → `thumbRectInSlot`)
2. Suppress maroon card BG → content-aware recenter → 64×64
3. aHash Hamming prefilter → top 10 (or all ham≤18)
4. Multi-scale / micro-shift grayscale match vs `public/templates/{showdownId}.png`
5. Score = NCC×0.55 + SSD×0.25 + aHash×0.20; coarse hue hist soft ×0.85 if far from template
6. **Second gate (type veto, soft):** crop card top-right type icons → match `public/types/{id}.png`; when types known, candidate types from `pokemon.json` must be a **superset** of detected set (else try next / unidentified). Low type conf → no hard veto.
7. Accept only if `top1.conf ≥ CONFIDENCE_THRESHOLD (0.54)` **and** `(top1−top2) ≥ MIN_MARGIN (0.08)`; else `speciesId=null` (still return top1 confidence for UI)

Do not guess held items. Templates must be Team Preview / sprite_poke_3 small thumbs, NOT large art / HOME art.

### Seed library (figure 2 crops via locked ROI)

| File | showdownId | Notes |
|------|------------|-------|
| noivern.png | noivern | 圖二 |
| lycanroc.png | lycanroc | Midday / day · 圖二 |
| politoed.png | politoed | 圖二 |
| rotom.png | rotom | base form (not appliances) · 圖二 |
| kangaskhan.png | kangaskhan | 圖二 |
| hippowdon.png | hippowdon | 圖二 |
| gengar.png … sinistcha.png | test-1 enemy | ROI crops from `team-preview-test-1` |
| charizard.png … blastoise.png + `sableye-test2.png` | test-2 enemy | ROI crops from `team-preview-test-2` (sableye has 2 variants) |

manifest: `public/templates/manifest.json` (entries may share a showdownId across multiple files).

Forms / Mega / shiny, Rotom appliances, Lycanroc day/night, Hippowdon gender colors need separate template files when expanded. Do not scrape/download from the web without an authorized VGC source.

### How to add more templates

When VGC provides an authorized Team Preview source screenshot:

1. Save the 16:9 shot (enemy column on the right).
2. Run: `python scripts/crop-preview-templates.py path/to/shot.png public/templates --slots=id1,id2,id3,id4,id5,id6 --merge`
   (same panel/thumb constants as `src/lib/roi.ts` — **do not change ROI**).
3. Keep/rename files as `public/templates/{showdownId}.png` (or `{showdownId}-variant.png` for pose variants).
4. `recognize.ts` loads **all** `manifest.json` ROI-crop entries automatically; add `SPECIES_DB` fallback if the species is missing from `pokemon.json`.
5. Reload; templates load once via `loadPreviewThumbTemplates()`.

Acceptance:
- 圖二 fixture → `python scripts/match-seed-templates.py` (~6/6)
- test fixtures → `/workspace/.venv-pkmn/bin/python scripts/match-test-fixtures.py`
  - **wrong species count = 0** (null/未識別 OK; never return a wrong id)
  - test-2 / test-3: keep 6/6 or only become unidentified — no new wrong species
  - Results: `docs/match-test-fixtures-results.md`

## Type / Tera icons

18 type icons live in `public/types/` as SVG with stable English filenames (`fire.svg`, `water.svg`, …; legacy PNGs retained). Mapping (繁中 ↔ id ↔ URL) is in `src/lib/typeIcons.ts` via `import.meta.env.BASE_URL + 'types/{id}.svg'`. PokemonCard species badges, move buttons, and weakness rows use these icons. Green debug frame uses `PANEL_OUTER_MARGIN_FRAC` outside the locked pitch panel so yellow/recognition stay unshifted.

## Layout

1. Left my team / 2. Capture preview / 3. Speed axis / 4. Enemy panel

## Out of scope

Cloud vision / memory read / full dex / live championsbattledata scrape / release pipeline.

Pokemon trademarks belong to their owners; unaffiliated project.

## CBD templates (optional secondary)

Champions Battle Data menu sprites can be fetched **only** for a small allowlist (never whole-dex).
Default `--allowlist` = top-50 CBD Doubles ∪ seed ∪ test-fixture species (max 64 / run):

```bash
node scripts/fetch-cbd-templates.mjs --allowlist
node scripts/fetch-cbd-templates.mjs --ids=noivern,lycanroc
```

- Output: `assets/templates/preview-thumbs/{showdownId}.png` + `manifest.jsonl` (`source: cbd`)
- PNGs are gitignored; see `assets/CREDITS.md`
- **Recognition default** remains `public/templates/` ROI crops (`source: roi-crop`); CBD only fills gaps
- CBD menu-style art often mismatches Team Preview thumbs — keep as optional secondary
- Never HOME / official-artwork; ask before expanding beyond top50∪test set

Offline match:

```bash
python scripts/match-seed-templates.py                        # 圖二 ~6/6
/workspace/.venv-pkmn/bin/python scripts/match-test-fixtures.py  # test-1/2/3 → docs/match-test-fixtures-results.md
```

Results: `docs/match-seed-results.md`

## Pokémon data JSON (PokéAPI + CBD allowlist)

Offline species / move tables live under `data/` (mirrored to `public/data/` for the web app):

| File | Contents |
|------|--------|
| `data/allowlist.json` | Champions `showdownId` allowlist (start small; expand here) |
| `data/pokemon.json` | One record per allowlisted id: `nationalDex`, names `en` / `zh-Hant` / `ja`, classic base stats, types, abilities, `forms[]` (Mega / regional); optional `vgcDoublesMoves` (CBD VGC Doubles usage %) |
| `data/moves.json` | Moves referenced by allowlisted Pokémon (localized names + combat fields) |
| `data/meta.json` | `schemaVersion`, `generatedAt`, `sources`, `pokemonCount`, `movesCount` |

Locale keys are exactly `en` / `zh-Hant` / `ja` (PokéAPI `zh-hant` ‒ `zh-Hant`). Base stats are **classic PokéAPI** values, not CBD screen-scaled numbers. See `assets/CREDITS.md`.

### Expand the allowlist

1. Prefer refreshing from CBD Doubles rankings (top 50+):

```bash
node scripts/build-pokemon-data.mjs --update-allowlist --top=50
```

   Or edit `data/allowlist.json` manually ‒ add Showdown / CBD ids (e.g. `"landorus-therian"`).
2. Regenerate locally or via Actions (below).
3. Prefer small batches; the build script rate-limits PokéAPI / CBD.

Form mapping notes (best-effort): `lycanroc` ‒ lycanroc-midday; `rotom` ‒ base form. Override map lives in `scripts/build-pokemon-data.mjs` (`SHIWDOWN_OVERRIDES`).

### Run locally

```bash
npm run build:pokemon-data
# or
node scripts/build-pokemon-data.mjs
node scripts/build-pokemon-data.mjs --allowlist=data/allowlist.json
node scripts/build-pokemon-data.mjs --dry-run
```

Writes both `data/*` and `public/data/*`. The app loads `public/data/pokemon.json` + `moves.json` on boot (`loadGeneratedSpeciesData` / `loadMovesData`) for 繁中 names/stats and CBD Doubles move usage (missing → 未載入).

### GitHub Actions

Workflow: `.github/workflows/build-pokemon-data.yml`

- Triggers: `workflow_dispatch` + weekly cron
- Runs `node scripts/build-pokemon-data.mjs`
- Uploads a `pokemon-data` artifact
- Commits updated JSON to `main` as `github-actions[bot]` when `contents: write` is allowed

If the commit step fails (branch protection / missing permission), download the artifact and copy into `data/` + `public/data/` manually.
