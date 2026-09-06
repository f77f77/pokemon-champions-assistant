# Pokemon Champions battle assistant (v0.1)

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
- Use test-fixture button to load built-in `public/fixtures/team-preview.png` (figure 2)

Same contentRect → ROI → thumb → recognize pipeline + green/yellow debug overlay. Still image overrides the preview until you re-open the camera.

## Capture device

1. Plug in AverMedia GC551 (normal videoinput)

2. Open camera; picker prefers GC551/AVerMedia, then OBS Virtual Camera

3. Persist deviceId in localStorage key pkmn-champions-video-device

4. No stream shows Traditional Chinese no-signal message

5. Recognize button grabs ONE frame via canvas then ROI crop (not per-frame)

Busy label uses Traditional Chinese recognizing-state text.

## ROI (VGC spec — Doc v1.2, LOCKED)

Coordinates relative to letterboxed 16:9 contentRect (computeContentRect).

| Constant | Value | Notes |

|----------|-------|-------|

| ENEMY_PANEL_DEFAULT | (0.811,0.143)-(0.965,0.832) | Enemy panel |

| SLOT_COUNT | 6 equal vertical slots | |

| THUMB_CROP | horizontal 20%-55%; top inset 25% / bottom 5% | Per-slot thumb |

| TEMPLATE_SIZE | 64 | Resize before match |

| ROI_FINE_TUNE_MAX | +/-2% | Settings sliders |


Files: src/lib/roi.ts, src/lib/recognize.ts.

Settings: ROI fine-tune + green/yellow debug overlay.

## Recognize / template matching

Per slot: { slot, confidence, speciesId?, speciesNameZh?, thumbnailDataUrl? }.

Pipeline (local only, no cloud):

1. Crop thumb with locked ROI (Doc v1.2)
2. Resize to 64x64
3. Match against `public/templates/{showdownId}.png`
4. Score = weighted NCC (0.55) + SSD similarity (0.25) + aHash (0.20)
5. confidence < 0.55 -> speciesId null -> UI unidentified label

Do not guess held items. Templates must be Team Preview small thumbs, NOT large art / HOME art.

### Seed library (figure 2 crops via locked ROI)

| File | showdownId | Notes |
|------|------------|-------|
| noivern.png | noivern | |
| lycanroc.png | lycanroc | Midday / day |
| politoed.png | politoed | |
| rotom.png | rotom | base form (not appliances) |
| kangaskhan.png | kangaskhan | |
| hippowdon.png | hippowdon | |

manifest: `public/templates/manifest.json` (showdownId -> file).

Forms / Mega / shiny, Rotom appliances, Lycanroc day/night, Hippowdon gender colors need separate template files when expanded. Do not scrape/download from the web without an authorized VGC source.

### How to add more templates

When VGC provides an authorized Team Preview source screenshot:

1. Save the 16:9 shot (enemy column on the right).
2. Run: `python scripts/crop-preview-templates.py path/to/shot.png public/templates`
   (same panel/thumb constants as `src/lib/roi.ts`).
3. Keep/rename files as `public/templates/{showdownId}.png`.
4. Add showdownId to `SEED_TEMPLATE_IDS` in `src/lib/recognize.ts` and `SPECIES_DB` in `src/lib/species.ts` if missing.
5. Update `public/templates/manifest.json`.
6. Reload; templates load once via `loadPreviewThumbTemplates()`.

Acceptance: load test fixture -> recognize enemy team -> 6 slots should hit seed templates on figure 2.

## Type / Tera icons

18 Traditional Chinese type icons live in `public/types/` with stable English filenames (`fire.png`, `water.png`, …). Mapping (繁中 ↔ id ↔ URL) is in `src/lib/typeIcons.ts` via `import.meta.env.BASE_URL + 'types/{id}.png'`. PokemonCard species badges and move buttons (TeamPanel / EnemyPanel) render these images alongside 繁中 labels. ROI / recognize are unchanged.

## Layout

1. Left my team / 2. Capture preview / 3. Speed axis / 4. Enemy panel

## Out of scope

Cloud vision / memory read / full dex / live championsbattledata scrape / release pipeline.

Pokemon trademarks belong to their owners; unaffiliated project.

## CBD templates (optional secondary)

Champions Battle Data menu sprites can be fetched **only** for a small allowlist (never whole-dex):

```bash
node scripts/fetch-cbd-templates.mjs --allowlist
node scripts/fetch-cbd-templates.mjs --ids=noivern,lycanroc
```

- Output: `assets/templates/preview-thumbs/{showdownId}.png` + `manifest.jsonl` (`source: cbd`)
- PNGs are gitignored; see `assets/CREDITS.md`
- **Recognition default** remains `public/templates/` ROI crops (`source: roi-crop`)
- CBD menu-style art often mismatches Team Preview thumbs — keep as optional secondary
- Never HOME / official-artwork

Offline seed match (expect ~6/6 on 圖二 fixture):

```bash
python scripts/match-seed-templates.py
```

Results: `docs/match-seed-results.md`

## Pokémon data JSON (PokéAPI + CBD allowlist)

Offline species / move tables live under `data/` (mirrored to `public/data/` for the web app):

| File | Contents |
|------|--------|
| `data/allowlist.json` | Champions `showdownId` allowlist (start small; expand here) |
| `data/pokemon.json` | One record per form: names `en` / `zh-Hant` / `ja`, classic base stats, types, abilities; optional `vgcDoublesMoves` (CBD VGC Doubles usage %) |
| `data/moves.json` | Moves referenced by allowlisted Pokémon (localized names + combat fields) |
| `data/meta.json` | `schemaVersion`, `generatedAt`, `sources`, `pokemonCount`, `movesCount` |

Locale keys are exactly `en` / `zh-Hant` / `ja` (PokéAPI `zh-hant` ‒ `zh-Hant`). Base stats are **classic PokéAPI** values, not CBD screen-scaled numbers. See `assets/CREDITS.md`.

### Expand the allowlist

1. Edit `data/allowlist.json` ‒ add Showdown / CBD ids (e.g. `"landorus-therian"`).
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
