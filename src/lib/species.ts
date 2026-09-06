import type { PokemonSet, PokemonType, Stats } from '../types';

export interface SpeciesData {
  key: string;
  nameZh: string;
  nameEn: string;
  types: PokemonType[];
  baseStats: Stats;
}

/** 離線示範用種族資料（足夠 demo） */
export const SPECIES_DB: SpeciesData[] = [
  { key: 'incineroar', nameZh: '熾焰咆哮虎', nameEn: 'Incineroar', types: ['火', '惡'], baseStats: { hp: 95, atk: 115, def: 90, spa: 80, spd: 90, spe: 60 } },
  { key: 'rillaboom', nameZh: '轟擂金剛猩', nameEn: 'Rillaboom', types: ['草'], baseStats: { hp: 100, atk: 125, def: 90, spa: 60, spd: 70, spe: 85 } },
  { key: 'urshifu-rapid-strike', nameZh: '武道熊師-連擊', nameEn: 'Urshifu-Rapid-Strike', types: ['格鬥', '水'], baseStats: { hp: 100, atk: 130, def: 100, spa: 63, spd: 60, spe: 97 } },
  { key: 'flutter-mane', nameZh: '飄飄肥麵', nameEn: 'Flutter Mane', types: ['幽靈', '妖精'], baseStats: { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 } },
  { key: 'roaring-moon', nameZh: '轟鳴月', nameEn: 'Roaring Moon', types: ['龍', '惡'], baseStats: { hp: 105, atk: 139, def: 71, spa: 55, spd: 101, spe: 119 } },
  { key: 'landorus-therian', nameZh: '土地雲-靈獸', nameEn: 'Landorus-Therian', types: ['地面', '飛行'], baseStats: { hp: 89, atk: 145, def: 90, spa: 105, spd: 80, spe: 91 } },
  { key: 'miraidon', nameZh: '密勒頓', nameEn: 'Miraidon', types: ['電', '龍'], baseStats: { hp: 100, atk: 85, def: 100, spa: 135, spd: 115, spe: 135 } },
  { key: 'koraidon', nameZh: '故勒頓', nameEn: 'Koraidon', types: ['格鬥', '龍'], baseStats: { hp: 100, atk: 135, def: 115, spa: 85, spd: 100, spe: 135 } },
  { key: 'garchomp', nameZh: '烈咬陸鯊', nameEn: 'Garchomp', types: ['龍', '地面'], baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 } },
  { key: 'amoonguss', nameZh: '敗露球菇', nameEn: 'Amoonguss', types: ['草', '毒'], baseStats: { hp: 114, atk: 85, def: 70, spa: 85, spd: 80, spe: 30 } },
  { key: 'indeedee-f', nameZh: '愛管侍-雌', nameEn: 'Indeedee-F', types: ['超能力', '一般'], baseStats: { hp: 70, atk: 55, def: 65, spa: 95, spd: 105, spe: 85 } },
  { key: 'tornadus', nameZh: '龍捲雲', nameEn: 'Tornadus', types: ['飛行'], baseStats: { hp: 79, atk: 115, def: 70, spa: 125, spd: 80, spe: 111 } },
  { key: 'chien-pao', nameZh: '古劍豹', nameEn: 'Chien-Pao', types: ['惡', '冰'], baseStats: { hp: 80, atk: 120, def: 80, spa: 90, spd: 65, spe: 135 } },
  { key: 'ting-lu', nameZh: '古鼎鹿', nameEn: 'Ting-Lu', types: ['惡', '地面'], baseStats: { hp: 155, atk: 110, def: 125, spa: 55, spd: 80, spe: 45 } },
  { key: 'ogerpon-wellspring', nameZh: '厄詭椪-水井', nameEn: 'Ogerpon-Wellspring', types: ['草', '水'], baseStats: { hp: 80, atk: 120, def: 84, spa: 60, spd: 96, spe: 110 } },
  { key: 'pelipper', nameZh: '大嘴鷗', nameEn: 'Pelipper', types: ['水', '飛行'], baseStats: { hp: 60, atk: 50, def: 100, spa: 95, spd: 70, spe: 65 } },
];

const byKey = new Map(SPECIES_DB.map((s) => [s.key, s]));
const byName = new Map<string, SpeciesData>();
for (const s of SPECIES_DB) {
  byName.set(s.nameZh.toLowerCase(), s);
  byName.set(s.nameEn.toLowerCase(), s);
  byName.set(s.key.toLowerCase(), s);
}

export function findSpecies(query: string): SpeciesData | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return byKey.get(q) ?? byName.get(q) ?? SPECIES_DB.find((s) => s.nameZh.includes(query) || s.nameEn.toLowerCase().includes(q));
}

export function speciesToSet(s: SpeciesData, id: string, extras?: Partial<PokemonSet>): PokemonSet {
  return {
    id,
    species: s.nameZh,
    speciesKey: s.key,
    types: [...s.types],
    baseStats: { ...s.baseStats },
    speed: 0,
    moves: [
      { name: '—', type: s.types[0] ?? '一般' },
      { name: '—', type: s.types[1] ?? '一般' },
      { name: '—', type: '一般' },
      { name: '—', type: '一般' },
    ],
    identified: true,
    confidence: 1,
    ...extras,
  };
}

export const SAMPLE_MY_TEAM_KEYS = [
  'incineroar',
  'rillaboom',
  'urshifu-rapid-strike',
  'flutter-mane',
  'landorus-therian',
  'amoonguss',
] as const;
