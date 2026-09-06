#!/usr/bin/env node
/**
 * Build offline Pokémon / move JSON for the Champions assistant.
 *
 * Sources:
 *   - Allowlist: data/allowlist.json (showdownIds; ≥ top-50 CBD Doubles)
 *   - CBD index: https://championsbattledata.com/api/index
 *                (Doubles usage rank → --update-allowlist --top=N)
 *   - CBD API:   https://championsbattledata.com/api/pokemon/{showdownId}
 *   - CBD battle: https://championsbattledata.com/api/battle/Doubles/{showdownId}
 *   - PokéAPI:   national dex, classic base stats, types, abilities, forms, locales
 *
 * Outputs (canonical under data/, mirrored to public/data/ for Vite):
 *   data/pokemon.json  — array; nationalDex + forms[]; optional vgcDoublesMoves
 *   data/moves.json    — move records referenced by allowlisted Pokémon
 *   data/meta.json     — schemaVersion, generatedAt, sources, counts
 *
 * Usage:
 *   node scripts/build-pokemon-data.mjs
 *   node scripts/build-pokemon-data.mjs --update-allowlist --top=50
 *   node scripts/build-pokemon-data.mjs --allowlist=data/allowlist.json
 *   node scripts/build-pokemon-data.mjs --dry-run
 *
 * See assets/CREDITS.md. Rate-limits PokéAPI / CBD politely. No bulk image scrape.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCHEMA_VERSION = 2;
const POKEAPI = 'https://pokeapi.co/api/v2';
const CBD_ORIGIN = 'https://championsbattledata.com';
const RATE_LIMIT_MS = 350;
const UA = 'pokemon-champions-assistant-data-build/0.1 (+https://github.com/f77f77/pokemon-champions-assistant)';

/** Explicit showdownId → PokéAPI species + default form pokemon endpoint. */
const SHOWDOWN_OVERRIDES = {
  lycanroc: { species: 'lycanroc', pokemon: 'lycanroc-midday' },
  lycanrocmidnight: { species: 'lycanroc', pokemon: 'lycanroc-midnight' },
  lycanrocdusk: { species: 'lycanroc', pokemon: 'lycanroc-dusk' },
  rotomwash: { species: 'rotom', pokemon: 'rotom-wash' },
  rotomheat: { species: 'rotom', pokemon: 'rotom-heat' },
  rotomfrost: { species: 'rotom', pokemon: 'rotom-frost' },
  rotomfan: { species: 'rotom', pokemon: 'rotom-fan' },
  rotommow: { species: 'rotom', pokemon: 'rotom-mow' },
  basculegion: { species: 'basculegion', pokemon: 'basculegion-male' },
  basculegionf: { species: 'basculegion', pokemon: 'basculegion-female' },
  mausholdfour: { species: 'maushold', pokemon: 'maushold-family-of-four' },
  maushold: { species: 'maushold', pokemon: 'maushold' },
  ninetalesalola: { species: 'ninetales', pokemon: 'ninetales-alola' },
  arcaninehisui: { species: 'arcanine', pokemon: 'arcanine-hisui' },
  kommoo: { species: 'kommo-o', pokemon: 'kommo-o' },
  // Champions Floette is often Eternal Flower; base floette still resolves
  floette: { species: 'floette', pokemon: 'floette' },
};

/** PokéAPI pokemon name → CBD / Showdown id (best-effort). */
const POKEAPI_TO_SHOWDOWN = {
  'lycanroc-midday': 'lycanroc',
  'lycanroc-midnight': 'lycanrocmidnight',
  'lycanroc-dusk': 'lycanrocdusk',
  'rotom-wash': 'rotomwash',
  'rotom-heat': 'rotomheat',
  'rotom-frost': 'rotomfrost',
  'rotom-fan': 'rotomfan',
  'rotom-mow': 'rotommow',
  'basculegion-male': 'basculegion',
  'basculegion-female': 'basculegionf',
  'maushold-family-of-four': 'mausholdfour',
  'maushold-family-of-three': 'maushold',
  'ninetales-alola': 'ninetalesalola',
  'arcanine-hisui': 'arcaninehisui',
  'kommo-o': 'kommoo',
  'floette-eternal': 'floette',
  'charizard-mega-x': 'charizard',
  'charizard-mega-y': 'charizard',
  'blastoise-mega': 'blastoise',
  'venusaur-mega': 'venusaur',
  'gengar-mega': 'gengar',
  'kangaskhan-mega': 'kangaskhan',
  'scizor-mega': 'scizor',
  'mawile-mega': 'mawile',
  'gardevoir-mega': 'gardevoir',
  'swampert-mega': 'swampert',
  'blaziken-mega': 'blaziken',
  'aerodactyl-mega': 'aerodactyl',
  'tyranitar-mega': 'tyranitar',
  'metagross-mega': 'metagross',
  'floette-mega': 'floette',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  let allowlistPath = path.join(ROOT, 'data/allowlist.json');
  let dryRun = false;
  let updateAllowlist = false;
  let topN = 50;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--update-allowlist') updateAllowlist = true;
    else if (a === '--top' || a.startsWith('--top=')) {
      const raw = a.startsWith('--top=') ? a.slice('--top='.length) : argv[++i];
      topN = Math.max(1, Number(raw) || 50);
    } else if (a === '--allowlist' || a.startsWith('--allowlist=')) {
      const raw = a.startsWith('--allowlist=') ? a.slice('--allowlist='.length) : argv[++i];
      allowlistPath = path.resolve(ROOT, raw);
    } else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/build-pokemon-data.mjs [--allowlist=data/allowlist.json] [--update-allowlist] [--top=50] [--dry-run]`);
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return { allowlistPath, dryRun, updateAllowlist, topN };
}

function readAllowlist(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const ids = Array.isArray(raw) ? raw : raw.showdownIds || raw.ids || [];
  const cleaned = [...new Set(ids.map((id) => String(id).trim().toLowerCase()).filter(Boolean))];
  if (cleaned.length === 0) throw new Error(`Empty allowlist: ${filePath}`);
  return cleaned;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

let lastFetch = 0;
async function rateLimitedJson(url) {
  const wait = RATE_LIMIT_MS - (Date.now() - lastFetch);
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  return fetchJson(url);
}

async function rateLimitedJsonOptional(url) {
  try {
    return await rateLimitedJson(url);
  } catch (err) {
    console.warn(`  optional miss: ${err.message || err}`);
    return null;
  }
}

/** PokéAPI language name → output locale key. */
function pickNames(nameEntries) {
  const byLang = new Map();
  for (const n of nameEntries || []) {
    byLang.set(n.language.name, n.name);
  }
  return {
    en: byLang.get('en') || null,
    'zh-Hant': byLang.get('zh-hant') || byLang.get('zh-Hant') || null,
    ja: byLang.get('ja') || byLang.get('ja-Hrkt') || byLang.get('ja-hrkt') || null,
  };
}

function mapStats(statsArr) {
  const get = (n) => statsArr.find((s) => s.stat.name === n)?.base_stat ?? 0;
  return {
    hp: get('hp'),
    atk: get('attack'),
    def: get('defense'),
    spa: get('special-attack'),
    spd: get('special-defense'),
    spe: get('speed'),
  };
}

function resolvePokeapiTargets(showdownId) {
  const o = SHOWDOWN_OVERRIDES[showdownId];
  if (o) return o;
  // Heuristic: ninetalesalola → try ninetales-alola via hyphenation of known suffixes
  return { species: showdownId, pokemon: showdownId };
}

function pokeapiNameToShowdownId(pokeName) {
  if (POKEAPI_TO_SHOWDOWN[pokeName]) return POKEAPI_TO_SHOWDOWN[pokeName];
  // mega-x/y / regional: strip hyphens for showdown-ish id
  return String(pokeName).replace(/-/g, '');
}

function isSkippedVariety(pokeName) {
  const n = String(pokeName).toLowerCase();
  return n.includes('-gmax') || n.includes('-totem') || n.includes('-battle-bond');
}

/** "Dragon Pulse" / "Double-Edge" → pokeapi slug */
function toPokeapiMoveSlug(displayName) {
  return String(displayName)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Showdown-style move id: dragonpulse */
function toShowdownMoveId(displayName) {
  return String(displayName)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

async function fetchCbdPokemon(showdownId) {
  try {
    return await rateLimitedJson(`${CBD_ORIGIN}/api/pokemon/${encodeURIComponent(showdownId)}`);
  } catch (err) {
    console.warn(`  CBD miss for ${showdownId}: ${err.message || err}`);
    return null;
  }
}

/**
 * Current VGC Doubles (2v2 / 6-pick-4) top moves + ladder usage % from CBD battle API.
 * Returns [] when the species has no Doubles meta — callers must NOT invent stubs.
 */
async function fetchCbdDoublesTopMoves(showdownId, limit = 6) {
  try {
    const data = await rateLimitedJson(
      `${CBD_ORIGIN}/api/battle/Doubles/${encodeURIComponent(showdownId)}`,
    );
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const moves = rows
      .filter((r) => r && r.category === 'move' && r.name)
      .sort((a, b) => Number(a.rank ?? 99) - Number(b.rank ?? 99))
      .slice(0, limit)
      .map((r) => {
        const usageRaw = r.percentage ?? r.percentage_value;
        let usage = null;
        if (typeof usageRaw === 'number' && Number.isFinite(usageRaw)) {
          usage = `${usageRaw}%`.replace(/\.0%$/, '%');
        } else if (usageRaw != null && String(usageRaw).trim()) {
          const s = String(usageRaw).trim();
          usage = /%$/.test(s) ? s : `${s}%`;
        }
        return {
          id: toShowdownMoveId(r.name),
          nameEn: String(r.name),
          usage,
          rank: Number(r.rank) || null,
        };
      });
    return {
      moves,
      meta: {
        source: 'championsbattledata.com',
        format: 'Doubles',
        season: data?.season ?? null,
        battleSource: data?.source ?? null,
        label: 'VGC Doubles (2v2 / 6-pick-4) · championsbattledata.com',
      },
    };
  } catch (err) {
    console.warn(`  CBD Doubles battle miss for ${showdownId}: ${err.message || err}`);
    return { moves: [], meta: null };
  }
}

/**
 * Top-N showdownIds by CBD Current Doubles usage position from /api/index.
 * No image scrape — JSON index only.
 */
async function fetchTopDoublesFromCbdIndex(topN) {
  console.log(`Fetching CBD /api/index for top ${topN} Doubles…`);
  const index = await rateLimitedJson(`${CBD_ORIGIN}/api/index`);
  const rows = [];
  for (const p of index.pokemon || []) {
    const bs = p?.summary?.battleSummary?.Current?.Doubles;
    const pos = bs?.position;
    if (pos == null) continue;
    const sid = String(p.showdownId || '').trim().toLowerCase();
    if (!sid) continue;
    rows.push({
      rank: Number(pos),
      showdownId: sid,
      name: p.name || p.showdownName || sid,
    });
  }
  rows.sort((a, b) => a.rank - b.rank);
  const seen = new Set();
  const ranked = [];
  for (const r of rows) {
    if (seen.has(r.showdownId)) continue;
    seen.add(r.showdownId);
    ranked.push(r);
    if (ranked.length >= topN) break;
  }
  return ranked;
}

function writeAllowlist(filePath, ranked, topN) {
  const payload = {
    description:
      'Champions / Showdown IDs — top N by CBD Doubles (Current) usage position. Refresh: node scripts/build-pokemon-data.mjs --update-allowlist --top=50. Usage % from CBD Doubles (2v2 / 6-pick-4).',
    source: `${CBD_ORIGIN}/api/index → summary.battleSummary.Current.Doubles.position`,
    format: 'Doubles',
    topN,
    ranked,
    showdownIds: ranked.map((r) => r.showdownId),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`wrote allowlist ${path.relative(ROOT, filePath)} (${ranked.length} ids)`);
}

async function loadFormEntry(varietyPokemonName, cbdShowdownId, doublesCache) {
  const pokemonData = await rateLimitedJson(
    `${POKEAPI}/pokemon/${encodeURIComponent(varietyPokemonName)}`,
  );
  let formNames = { en: null, 'zh-Hant': null, ja: null };
  const formUrl = pokemonData.forms?.[0]?.url;
  if (formUrl) {
    try {
      const form = await rateLimitedJson(formUrl);
      formNames = pickNames(form.form_names);
      if (!formNames.en && !formNames['zh-Hant'] && !formNames.ja) {
        // Derive a readable label from the pokemon name suffix
        const suffix = varietyPokemonName.includes('-')
          ? varietyPokemonName.split('-').slice(1).join(' ')
          : 'Base';
        formNames = {
          en: suffix.replace(/\b\w/g, (c) => c.toUpperCase()),
          'zh-Hant': null,
          ja: null,
        };
      }
    } catch (err) {
      console.warn(`  form names skip (${varietyPokemonName}): ${err.message || err}`);
    }
  }

  let vgcDoublesMoves;
  let vgcDoublesMeta;
  if (cbdShowdownId) {
    if (!doublesCache.has(cbdShowdownId)) {
      doublesCache.set(cbdShowdownId, await fetchCbdDoublesTopMoves(cbdShowdownId, 6));
    }
    const { moves, meta } = doublesCache.get(cbdShowdownId);
    if (moves?.length) {
      vgcDoublesMoves = moves;
      vgcDoublesMeta = meta;
    }
  }

  return {
    showdownId: cbdShowdownId || pokeapiNameToShowdownId(varietyPokemonName),
    pokeapiId: pokemonData.id,
    formKey: pokemonData.name,
    formNames,
    types: (pokemonData.types || [])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name),
    baseStats: mapStats(pokemonData.stats || []),
    abilities: (pokemonData.abilities || [])
      .sort((a, b) => a.slot - b.slot)
      .map((a) => a.ability.name),
    isDefault: Boolean(pokemonData.is_default),
    ...(vgcDoublesMoves ? { vgcDoublesMoves, vgcDoublesMeta } : {}),
  };
}

async function buildPokemonRecord(showdownId, doublesCache) {
  const { species: speciesSlug, pokemon: pokemonSlug } = resolvePokeapiTargets(showdownId);
  console.log(`  PokéAPI species=${speciesSlug} pokemon=${pokemonSlug}`);

  let species = await rateLimitedJsonOptional(
    `${POKEAPI}/pokemon-species/${encodeURIComponent(speciesSlug)}`,
  );
  let pokemonData = await rateLimitedJsonOptional(
    `${POKEAPI}/pokemon/${encodeURIComponent(pokemonSlug)}`,
  );

  // Fallback: try hyphenated regional / form guesses if identity mapping 404'd
  if (!pokemonData && !SHOWDOWN_OVERRIDES[showdownId]) {
    const guesses = [];
    // trailing regional tokens
    for (const [suffix, hyph] of [
      ['alola', '-alola'],
      ['galar', '-galar'],
      ['hisui', '-hisui'],
      ['paldea', '-paldea'],
    ]) {
      if (showdownId.endsWith(suffix) && showdownId.length > suffix.length) {
        guesses.push(showdownId.slice(0, -suffix.length) + hyph);
      }
    }
    for (const g of guesses) {
      pokemonData = await rateLimitedJsonOptional(`${POKEAPI}/pokemon/${encodeURIComponent(g)}`);
      if (pokemonData) {
        const spUrl = pokemonData.species?.url;
        if (spUrl) species = await rateLimitedJsonOptional(spUrl);
        break;
      }
    }
  }

  if (!pokemonData || !species) {
    throw new Error(`PokéAPI resolve failed for showdownId=${showdownId}`);
  }

  const cbdData = await fetchCbdPokemon(showdownId);

  let formNames = { en: null, 'zh-Hant': null, ja: null };
  const formUrl = pokemonData.forms?.[0]?.url;
  if (formUrl) {
    try {
      const form = await rateLimitedJson(formUrl);
      formNames = pickNames(form.form_names);
      if (!formNames.en && !formNames['zh-Hant'] && !formNames.ja) {
        formNames = { en: null, 'zh-Hant': null, ja: null };
      }
    } catch (err) {
      console.warn(`  form names skip: ${err.message || err}`);
    }
  }

  const names = pickNames(species.names);
  const formKey = pokemonData.name;
  const speciesKey = species.name;
  const nationalDex = species.id;

  const record = {
    showdownId,
    nationalDex,
    pokeapiId: pokemonData.id,
    speciesKey,
    formKey,
    names,
    formNames,
    types: (pokemonData.types || [])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name),
    baseStats: mapStats(pokemonData.stats || []),
    abilities: (pokemonData.abilities || [])
      .sort((a, b) => a.slot - b.slot)
      .map((a) => a.ability.name),
    championsLegal: Boolean(cbdData),
  };

  const moveNames = Array.isArray(cbdData?.learnableMoveNames)
    ? [...cbdData.learnableMoveNames]
    : (pokemonData.moves || []).map((m) => m.move.name);

  if (!doublesCache.has(showdownId)) {
    doublesCache.set(showdownId, await fetchCbdDoublesTopMoves(showdownId, 6));
  }
  const { moves: doublesMoves, meta: doublesMeta } = doublesCache.get(showdownId);
  if (doublesMoves.length) {
    record.vgcDoublesMoves = doublesMoves;
    record.vgcDoublesMeta = doublesMeta;
    for (const m of doublesMoves) {
      if (m.nameEn && !moveNames.includes(m.nameEn)) moveNames.push(m.nameEn);
    }
  }

  // Forms list from PokéAPI varieties (+ CBD usage when a distinct showdownId exists)
  const forms = [];
  const varieties = Array.isArray(species.varieties) ? species.varieties : [];
  for (const v of varieties) {
    const vName = v?.pokemon?.name;
    if (!vName || isSkippedVariety(vName)) continue;
    try {
      const cbdId = pokeapiNameToShowdownId(vName);
      // Prefer exact CBD id when mapped; megas often share base showdownId for usage
      const formEntry = await loadFormEntry(vName, cbdId, doublesCache);
      forms.push(formEntry);
      if (formEntry.vgcDoublesMoves) {
        for (const m of formEntry.vgcDoublesMoves) {
          if (m.nameEn && !moveNames.includes(m.nameEn)) moveNames.push(m.nameEn);
        }
      }
    } catch (err) {
      console.warn(`  variety skip ${vName}: ${err.message || err}`);
    }
  }
  if (forms.length) {
    record.forms = forms;
  }

  return {
    record,
    moveNames,
    fromCbdMoves: Boolean(cbdData?.learnableMoveNames),
    doublesCount: doublesMoves.length,
  };
}

async function buildMoveRecord(displayOrSlug, cache) {
  const slug =
    displayOrSlug.includes('-') && !displayOrSlug.includes(' ')
      ? displayOrSlug
      : toPokeapiMoveSlug(displayOrSlug);
  const moveId =
    displayOrSlug.includes(' ') || /[A-Z]/.test(displayOrSlug)
      ? toShowdownMoveId(displayOrSlug)
      : slug.replace(/-/g, '');

  if (cache.has(moveId)) return cache.get(moveId);

  try {
    const data = await rateLimitedJson(`${POKEAPI}/move/${encodeURIComponent(slug)}`);
    const rec = {
      id: data.name.replace(/-/g, ''),
      pokeapiId: data.id,
      names: pickNames(data.names),
      type: data.type?.name ?? null,
      category: data.damage_class?.name ?? null,
      power: data.power,
      accuracy: data.accuracy,
      pp: data.pp,
    };
    cache.set(rec.id, rec);
    return rec;
  } catch (err) {
    console.warn(`  move miss ${slug}: ${err.message || err}`);
    const rec = {
      id: moveId,
      pokeapiId: null,
      names: { en: displayOrSlug, 'zh-Hant': null, ja: null },
      type: null,
      category: null,
      power: null,
      accuracy: null,
      pp: null,
    };
    cache.set(rec.id, rec);
    return rec;
  }
}

function writeOutputs({ pokemon, moves, meta }, dryRun) {
  const payloads = {
    'pokemon.json': pokemon,
    'moves.json': moves,
    'meta.json': meta,
  };
  const targets = [path.join(ROOT, 'data'), path.join(ROOT, 'public/data')];
  for (const dir of targets) {
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, value] of Object.entries(payloads)) {
      const out = path.join(dir, name);
      const text = JSON.stringify(value, null, 2) + '\n';
      if (dryRun) {
        console.log(`dry-run would write ${path.relative(ROOT, out)} (${text.length} bytes)`);
      } else {
        fs.writeFileSync(out, text, 'utf8');
        console.log(`wrote ${path.relative(ROOT, out)}`);
      }
    }
  }
}

async function main() {
  const { allowlistPath, dryRun, updateAllowlist, topN } = parseArgs(process.argv.slice(2));

  if (updateAllowlist) {
    const ranked = await fetchTopDoublesFromCbdIndex(topN);
    if (ranked.length < topN) {
      console.warn(`Only found ${ranked.length} ranked Doubles species (requested ${topN})`);
    }
    if (!dryRun) writeAllowlist(allowlistPath, ranked, topN);
    else console.log(`dry-run allowlist top${topN}: ${ranked.map((r) => r.showdownId).join(', ')}`);
  }

  const showdownIds = readAllowlist(allowlistPath);
  console.log(`Allowlist (${showdownIds.length}): ${showdownIds.join(', ')}`);
  console.log(`Rate limit ${RATE_LIMIT_MS}ms; dryRun=${dryRun}; schema=${SCHEMA_VERSION}`);

  const pokemon = [];
  const moveNameSet = new Map();
  const doublesCache = new Map();

  for (const id of showdownIds) {
    console.log(`[pokemon] ${id}`);
    try {
      const { record, moveNames, fromCbdMoves, doublesCount } = await buildPokemonRecord(
        id,
        doublesCache,
      );
      pokemon.push(record);
      const formCount = record.forms?.length || 0;
      console.log(
        `  → #${record.nationalDex} ${record.names['zh-Hant'] || record.names.en} types=${record.types.join('/')} BST=${Object.values(record.baseStats).reduce((a, b) => a + b, 0)} forms=${formCount} movesSrc=${fromCbdMoves ? 'cbd' : 'pokeapi'} (${moveNames.length}) doublesTop=${doublesCount}`,
      );
      for (const mn of moveNames) {
        const key = toShowdownMoveId(mn);
        if (!moveNameSet.has(key)) moveNameSet.set(key, mn);
      }
    } catch (err) {
      console.error(`  FAILED ${id}: ${err.message || err}`);
    }
  }

  console.log(`[moves] fetching ${moveNameSet.size} unique move(s)…`);
  const moveCache = new Map();
  const moves = [];
  let i = 0;
  for (const [, label] of moveNameSet) {
    i += 1;
    if (i % 25 === 1 || i === moveNameSet.size) {
      console.log(`  [${i}/${moveNameSet.size}] ${label}`);
    }
    const rec = await buildMoveRecord(label, moveCache);
    if (!moves.find((m) => m.id === rec.id)) moves.push(rec);
  }
  moves.sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const meta = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sources: {
      pokeapi: POKEAPI,
      cbd: `${CBD_ORIGIN}/api/pokemon/{showdownId}`,
      cbdDoublesBattle: `${CBD_ORIGIN}/api/battle/Doubles/{showdownId}`,
      cbdIndex: `${CBD_ORIGIN}/api/index`,
      allowlist: path.relative(ROOT, allowlistPath).replace(/\\/g, '/'),
      notes:
        'Classic PokéAPI base stats + nationalDex + forms[] (not CBD screen-scaled). Move names/types from PokéAPI; usage % only from CBD VGC Doubles (2v2 / 6-pick-4). Locale keys: en / zh-Hant / ja. See assets/CREDITS.md.',
    },
    pokemonCount: pokemon.length,
    movesCount: moves.length,
    allowlistCount: showdownIds.length,
  };

  writeOutputs({ pokemon, moves, meta }, dryRun);
  console.log(`Done. pokemon=${pokemon.length} moves=${moves.length} allowlist=${showdownIds.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
