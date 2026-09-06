#!/usr/bin/env node
/**
 * Build offline Pokémon / move JSON for the Champions assistant.
 *
 * Sources:
 *   - Allowlist: data/allowlist.json (showdownIds; Champions roster subset)
 *   - CBD API:   https://championsbattledata.com/api/pokemon/{showdownId}
 *                (roster presence + learnable move names — NOT screen-scaled stats)
 *   - PokéAPI:   classic base stats, types, abilities, localized names
 *                (en / zh-hant→zh-Hant / ja)
 *
 * Outputs (canonical under data/, mirrored to public/data/ for Vite):
 *   data/pokemon.json  — array, one record per form
 *   data/moves.json    — array of move records referenced by allowlisted Pokémon
 *   data/meta.json     — schemaVersion, generatedAt, sources, counts
 *
 * Usage:
 *   node scripts/build-pokemon-data.mjs
 *   node scripts/build-pokemon-data.mjs --allowlist=data/allowlist.json
 *   node scripts/build-pokemon-data.mjs --dry-run
 *
 * See assets/CREDITS.md. Rate-limits PokéAPI / CBD politely.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCHEMA_VERSION = 1;
const POKEAPI = 'https://pokeapi.co/api/v2';
const CBD_ORIGIN = 'https://championsbattledata.com';
const RATE_LIMIT_MS = 350;
const UA = 'pokemon-champions-assistant-data-build/0.1 (+https://github.com/f77f77/pokemon-champions-assistant)';

/** Best-effort showdownId → PokéAPI species + default form pokemon endpoint. */
const SHOWDOWN_OVERRIDES = {
  lycanroc: { species: 'lycanroc', pokemon: 'lycanroc-midday' },
  // rotom base, kangaskhan, etc. use identity mapping
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  let allowlistPath = path.join(ROOT, 'data/allowlist.json');
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--allowlist' || a.startsWith('--allowlist=')) {
      const raw = a.startsWith('--allowlist=') ? a.slice('--allowlist='.length) : argv[++i];
      allowlistPath = path.resolve(ROOT, raw);
    } else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/build-pokemon-data.mjs [--allowlist=data/allowlist.json] [--dry-run]`);
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return { allowlistPath, dryRun };
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
  return { species: showdownId, pokemon: showdownId };
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

async function buildPokemonRecord(showdownId) {
  const { species: speciesSlug, pokemon: pokemonSlug } = resolvePokeapiTargets(showdownId);
  console.log(`  PokéAPI species=${speciesSlug} pokemon=${pokemonSlug}`);

  const species = await rateLimitedJson(`${POKEAPI}/pokemon-species/${encodeURIComponent(speciesSlug)}`);
  const pokemonData = await rateLimitedJson(`${POKEAPI}/pokemon/${encodeURIComponent(pokemonSlug)}`);
  const cbdData = await fetchCbdPokemon(showdownId);

  let formNames = { en: null, 'zh-Hant': null, ja: null };
  const formUrl = pokemonData.forms?.[0]?.url;
  if (formUrl) {
    try {
      const form = await rateLimitedJson(formUrl);
      formNames = pickNames(form.form_names);
      // Default / single form often has empty form_names — leave nulls
      if (!formNames.en && !formNames['zh-Hant'] && !formNames.ja) {
        formNames = { en: null, 'zh-Hant': null, ja: null };
      }
    } catch (err) {
      console.warn(`  form names skip: ${err.message || err}`);
    }
  }

  const names = pickNames(species.names);
  const formKey = pokemonData.name; // e.g. lycanroc-midday, rotom, noivern
  const speciesKey = species.name;

  const record = {
    showdownId,
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
    ? cbdData.learnableMoveNames
    : (pokemonData.moves || []).map((m) => m.move.name);

  return { record, moveNames, fromCbdMoves: Boolean(cbdData?.learnableMoveNames) };
}

async function buildMoveRecord(displayOrSlug, cache) {
  const slug = displayOrSlug.includes('-') && !displayOrSlug.includes(' ')
    ? displayOrSlug
    : toPokeapiMoveSlug(displayOrSlug);
  const id = toShowdownMoveId(displayOrSlug.includes(' ') || /[A-Z]/.test(displayOrSlug)
    ? displayOrSlug
    : displayOrSlug.replace(/-/g, ''));
  // Prefer stable id from slug without hyphens when input is already a slug
  const moveId = displayOrSlug.includes(' ') || /[A-Z]/.test(displayOrSlug)
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
  const targets = [
    path.join(ROOT, 'data'),
    path.join(ROOT, 'public/data'),
  ];
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
  const { allowlistPath, dryRun } = parseArgs(process.argv.slice(2));
  const showdownIds = readAllowlist(allowlistPath);
  console.log(`Allowlist (${showdownIds.length}): ${showdownIds.join(', ')}`);
  console.log(`Rate limit ${RATE_LIMIT_MS}ms; dryRun=${dryRun}`);

  const pokemon = [];
  const moveNameSet = new Map(); // showdown-ish key → original label for fetch

  for (const id of showdownIds) {
    console.log(`[pokemon] ${id}`);
    const { record, moveNames, fromCbdMoves } = await buildPokemonRecord(id);
    pokemon.push(record);
    console.log(
      `  → ${record.names['zh-Hant'] || record.names.en} types=${record.types.join('/')} BST=${Object.values(record.baseStats).reduce((a, b) => a + b, 0)} movesSrc=${fromCbdMoves ? 'cbd' : 'pokeapi'} (${moveNames.length})`,
    );
    for (const mn of moveNames) {
      const key = toShowdownMoveId(mn);
      if (!moveNameSet.has(key)) moveNameSet.set(key, mn);
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
      allowlist: path.relative(ROOT, allowlistPath).replace(/\\/g, '/'),
      notes:
        'Classic PokéAPI base stats (not CBD screen-scaled). Locale keys: en / zh-Hant / ja. See assets/CREDITS.md.',
    },
    pokemonCount: pokemon.length,
    movesCount: moves.length,
  };

  writeOutputs({ pokemon, moves, meta }, dryRun);
  console.log(`Done. pokemon=${pokemon.length} moves=${moves.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
