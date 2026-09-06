export type PokemonType =
  | '一般' | '火' | '水' | '電' | '草' | '冰'
  | '格鬥' | '毒' | '地面' | '飛行' | '超能力' | '蟲'
  | '岩石' | '幽靈' | '龍' | '惡' | '鋼' | '妖精';

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface MoveSlot {
  name: string;
  type: PokemonType | string;
  pp?: string;
}

export interface PokemonSet {
  id: string;
  species: string;
  speciesKey?: string;
  item?: string;
  ability?: string;
  types: PokemonType[];
  baseStats: Stats;
  /** 實際顯示用速度（可由 IV/EV/性格計算） */
  speed: number;
  moves: MoveSlot[];
  identified: boolean;
  confidence?: number;
  formLabel?: string;
}

export interface RecognizeResult {
  slot: number;
  species: string | null;
  confidence: number;
  hash?: string;
}

export const EMPTY_STATS: Stats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

export function emptySlot(index: number, side: 'my' | 'enemy'): PokemonSet {
  return {
    id: `${side}-${index}`,
    species: side === 'enemy' ? '未識別' : `空位 ${index + 1}`,
    types: [],
    baseStats: { ...EMPTY_STATS },
    speed: 0,
    moves: [
      { name: '—', type: '一般' },
      { name: '—', type: '一般' },
      { name: '—', type: '一般' },
      { name: '—', type: '一般' },
    ],
    identified: false,
  };
}
