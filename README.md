# Pokemon Champions battle assistant (v0.6 / recognize v1.5)

Electron + Vite + React (TypeScript). Defaults: AverMedia GC551, local Team Preview thumbs, Spe hand-fill, championsbattledata VGC Doubles (2v2 / 6-pick-4) usage.

UI strings remain Traditional Chinese.

v0.6: Showdown import applies EVs/natures and `Species-Mega` / mega-stone forms; ally team persists in `localStorage`; move tooltips stay in viewport; speed axis drops the 0-EV +10% tick, adds a max-scale tick, and draws a vertical guide on the selected ally Spe.

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
- Use test-fixture button to cycle `public/fixtures/team-preview-test-1.jpg`～`test-4.jpg`

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

## Recognize / template matching (v1.5 guards)

Per slot: `{ slot, confidence, speciesId?, speciesNameZh?, thumbnailDataUrl?, altSpeciesId?, margin?, detectedTypes? }`.

Pipeline (local only, no cloud) — **prefer `null`/未識別 over wrong species**:

1. Crop yellow square thumb with locked ROI (`cardRect` → `thumbRectInSlot`) — geometry unchanged
2. Match-crop cleanup: zero right `MATCH_CROP_RIGHT_EXCLUDE_FRAC` (0.05) to drop type/gender bleed (type icons still read from full card top-right)
3. Suppress maroon card BG → content-aware recenter → 64×64
4. aHash Hamming prefilter → top **40** (or all ham≤18) — fixture-tuned; prefer `null` over wrong species
5. Multi-scale / micro-shift grayscale match vs in-memory crops from `public/sprites/sprite_poke.png` (atlas keyed by **nationalDex**, e.g. `6` / `38-1`)
6. Score = NCC×0.55 + SSD×0.25 + aHash×0.20; coarse hue hist soft ×0.85 if far from template
7. **Second gate (type hard veto):** crop card top-right type icons → match `public/types/{id}.png`. Hard veto uses the **primary** (highest-score) type ≥ `TYPE_MATCH_THR` (0.58). A 2nd icon must reach `TYPE_MATCH_SECOND_THR` (0.66) — canvas NCC confuses **Ghost vs Poison** (both purple) and used to require `water+poison` ⊂ species types, which vetoed Water/Ghost Basculegion-M. Ghost/Poison are interchangeable for the extra slot. Low type conf → skip hard veto.
8. aHash is **8×8 block-mean** on query and templates (same as `scripts/match-test-fixtures.py`). If a type icon was read, same-type templates with ham ≤ 18+8 are rescued into the candidate set (NCC/margin still decide).
9. Accept only if `top1.conf ≥ CONFIDENCE_THRESHOLD (0.54)` **and** `(top1−top2) ≥ requiredMargin(conf)` (dynamic: ≥0.75→0.025, ≥0.68→0.03, ≥0.60→0.05, ≥0.54→0.055, else 0.08); else `speciesId=null`. Soft type (score ≥ 0.45) may break a near-tie toward the unique matching species (Fairy/Psychic and Ghost/Poison icons are interchangeable). Soft pink/purple false colors (Fairy icon read as Poison) may still hint a ≥0.60 top1. A hard type veto that would drop a dominant raw top1 (delta ≥ 0.12) is skipped. Dark sheet bodies stay visible so Greninja is not head-cropped.

Browser path (same code as GitHub Pages): `npx vite` then `node scripts/match-recognize-browser.mjs`. Python: `npm run match:fixtures`. Both must keep **wrong=0**; Basculegion-M is slot 2 on `team-preview-live-latest.jpg` (the scene from the Pages 未識別 report).

Debug fixtures: `python3 scripts/match-test-fixtures.py --debug` → `docs/match-debug.md`

Do not guess held items. Templates must be Team Preview / sprite_poke_3 small thumbs, NOT large art / HOME art.

### Sprite sheet library (nationalDex keys)

Matching loads `public/sprites/sprite_poke.png` **once** and crops cells in memory from `atlas.json` (parsed from `sprite_poke.css` percent positions). Current commit uses the **official Champions sheet** (2208×2078 → **262** allowlisted dex-keyed cells).

| Key | Meaning |
|-----|---------|
| `6` | Charizard (form 0) |
| `38-1` / `38-alola` | Alolan Ninetales |
| `479-2` / `479-wash` | Rotom-Wash |
| `6-mega-x` | alias on `dexAliases` when present |

Do **not** commit hundreds of per-species `{englishName}.png` files. `public/templates/` is deprecated.

Forms / Mega / shiny need their own CSS cell (dex + form), not a second filename. Do not scrape/download from the web without an authorized VGC source.

### How to ingest / refresh the sheet

Re-ingest / refresh from official sheet + CSS:

```bash
python3 scripts/build-sprite-atlas.py \
  --sheet sprite-sheet-handoff/sprite_sheet.png \
  --css sprite-sheet-handoff/sprite_poke.css \
  --delete-legacy-pngs
```

`recognize.ts` loads every atlas entry via `loadPreviewThumbTemplates()` (one sheet decode).

Acceptance:
- fixtures `live-latest` (= test-1) plus test-2～4 → `python3 scripts/match-test-fixtures.py` / `node scripts/match-recognize-browser.mjs`
  - **wrong species count = 0** (null/未識別 OK; never return a wrong id)
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
- **Recognition default** remains `public/sprites/` sheet crops (`nationalDex` keys); CBD only fills gaps
- CBD menu-style art often mismatches Team Preview thumbs — keep as optional secondary
- Never HOME / official-artwork; atlas is the 262 Champions legal allowlist

Offline match:

```bash
python scripts/match-seed-templates.py                        # 圖二 ~6/6
/workspace/.venv-pkmn/bin/python scripts/match-test-fixtures.py  # live-latest only → docs/match-test-fixtures-results.md
```

Results: `docs/match-seed-results.md`

## Pokémon data JSON (PokéAPI + CBD allowlist)

Offline species / move tables live under `data/` (mirrored to `public/data/` for the web app):

| File | Contents |
|------|--------|
| `data/allowlist.json` | Champions `showdownId` allowlist (start small; expand here) |
| `data/pokemon.json` | One record per allowlisted id: `nationalDex`, names `en` / `zh-Hant` / `ja`, classic base stats, types, abilities, `forms[]` (Mega / regional); optional `vgcDoublesMoves` (CBD VGC Doubles usage %) |
| `data/moves.json` | Moves referenced by allowlisted Pokémon (localized names + combat fields + flavor `en` / `zh-Hant` / `ja`) |
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
# daily usage/items/Mega refresh without a full PokéAPI species crawl:
npm run build:pokemon-data:usage
npm run build:pokemon-data:flavor
# or
node scripts/build-pokemon-data.mjs
node scripts/build-pokemon-data.mjs --usage-only
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
