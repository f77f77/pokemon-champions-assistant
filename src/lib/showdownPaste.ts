import { emptySlot } from '../types';
import type { PokemonSet } from '../types';
import { findSpecies, speciesToSet } from './species';
import { calcStat } from './speedCalc';

/**
 * 極簡 Showdown paste / JSON 匯入 stub。
 * 支援：
 * - Pokémon Showdown 多行 paste（種族名開頭）
 * - JSON 陣列：[{ "species": "Incineroar", "item": "...", "speed": 123 }]
 */
export function parseTeamImport(raw: string): PokemonSet[] {
  const trimmed = raw.trim();
  if (!trimmed) return Array.from({ length: 6 }, (_, i) => emptySlot(i, 'my'));

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return parseJsonTeam(trimmed);
  }
  return parseShowdownPaste(trimmed);
}

function parseJsonTeam(raw: string): PokemonSet[] {
  try {
    const data = JSON.parse(raw);
    const arr = Array.isArray(data) ? data : data.team ?? data.pokemon ?? [];
    return padSix(
      arr.slice(0, 6).map((row: Record<string, unknown>, i: number) => {
        const name = String(row.species ?? row.name ?? '');
        const sp = findSpecies(name);
        const base = sp
          ? speciesToSet(sp, `my-${i}`, {
              item: row.item ? String(row.item) : undefined,
              ability: row.ability ? String(row.ability) : undefined,
            })
          : {
              ...emptySlot(i, 'my'),
              species: name || `空位 ${i + 1}`,
              identified: Boolean(name),
            };
        const speed =
          typeof row.speed === 'number'
            ? row.speed
            : sp
              ? calcStat(sp.baseStats.spe, 31, 0, 50, 1)
              : 0;
        return { ...base, speed };
      }),
    );
  } catch {
    return Array.from({ length: 6 }, (_, i) => emptySlot(i, 'my'));
  }
}

function parseShowdownPaste(raw: string): PokemonSet[] {
  const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const sets: PokemonSet[] = [];
  for (let i = 0; i < Math.min(blocks.length, 6); i++) {
    const lines = blocks[i].split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const header = lines[0];
    const speciesPart = header.split('@')[0].trim().replace(/\s*\(.*\)$/, '');
    const item = header.includes('@') ? header.split('@')[1].trim() : undefined;
    let ability: string | undefined;
    const moves: string[] = [];
    for (const line of lines.slice(1)) {
      if (line.startsWith('Ability:')) ability = line.replace('Ability:', '').trim();
      else if (line.startsWith('- ')) moves.push(line.slice(2).trim());
    }
    const sp = findSpecies(speciesPart);
    if (sp) {
      const set = speciesToSet(sp, `my-${i}`, {
        item,
        ability,
        speed: calcStat(sp.baseStats.spe, 31, 0, 50, 1),
        moves: [0, 1, 2, 3].map((mi) => ({
          name: moves[mi] ?? '—',
          type: sp.types[mi % sp.types.length] ?? '一般',
        })),
      });
      sets.push(set);
    } else {
      sets.push({
        ...emptySlot(i, 'my'),
        species: speciesPart,
        item,
        ability,
        identified: true,
        moves: [0, 1, 2, 3].map((mi) => ({ name: moves[mi] ?? '—', type: '一般' })),
      });
    }
  }
  return padSix(sets);
}

function padSix(sets: PokemonSet[]): PokemonSet[] {
  const out = [...sets];
  while (out.length < 6) out.push(emptySlot(out.length, 'my'));
  return out.slice(0, 6);
}

export const DEMO_SHOWDOWN_PASTE = `Incineroar @ Safety Goggles
Ability: Intimidate
- Fake Out
- Flare Blitz
- Knock Off
- Parting Shot

Rillaboom @ Assault Vest
Ability: Grassy Surge
- Fake Out
- Grassy Glide
- Wood Hammer
- U-turn

Urshifu-Rapid-Strike @ Focus Sash
Ability: Unseen Fist
- Surging Strikes
- Close Combat
- Aqua Jet
- Protect

Flutter Mane @ Choice Specs
Ability: Protosynthesis
- Moonblast
- Shadow Ball
- Dazzling Gleam
- Thunderbolt

Landorus-Therian @ Life Orb
Ability: Intimidate
- Earthquake
- Rock Slide
- U-turn
- Protect

Amoonguss @ Rocky Helmet
Ability: Regenerator
- Spore
- Rage Powder
- Pollen Puff
- Protect
`;
