import type { MoveSlot, PokemonType } from '../types';

/**
 * championsbattledata.com Doubles top-6 moves 快取 stub。
 *
 * 每日快取路徑（文件約定，本 stub 使用 memory + localStorage）：
 * - Electron 生產環境建議：`{userData}/.moves-cache/YYYY-MM-DD/{speciesKey}.json`
 * - 開發／瀏覽器：`localStorage` key `pkmn-moves-cache:v1:{date}:{speciesKey}`
 *
 * 非目標：真正爬取 championsbattledata（需 CORS／後端 proxy）；此處僅 placeholder + 示範資料。
 */

const MEMORY = new Map<string, { fetchedAt: string; moves: MoveSlot[] }>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(speciesKey: string): string {
  return `pkmn-moves-cache:v1:${todayKey()}:${speciesKey}`;
}

/** 離線 Doubles 常見招式示範 */
const PLACEHOLDER: Record<string, MoveSlot[]> = {
  incineroar: [
    { name: '擊掌奇襲', type: '一般', pp: '40/40' },
    { name: '閃焰衝鋒', type: '火', pp: '15/15' },
    { name: '拍落', type: '惡', pp: '20/20' },
    { name: '鳥嘴加農炮', type: '飛行', pp: '15/15' },
    { name: '分手揮別', type: '惡', pp: '20/20' },
    { name: '保護', type: '一般', pp: '10/10' },
  ],
  'roaring-moon': [
    { name: '龍之舞', type: '龍', pp: '20/20' },
    { name: '雙翼', type: '飛行', pp: '10/10' },
    { name: '咬碎', type: '惡', pp: '15/15' },
    { name: '地震', type: '地面', pp: '10/10' },
    { name: '保護', type: '一般', pp: '10/10' },
    { name: '鐵頭', type: '鋼', pp: '15/15' },
  ],
  default: [
    { name: '保護', type: '一般', pp: '10/10' },
    { name: '佯攻', type: '惡', pp: '20/20' },
    { name: '急速折返', type: '蟲', pp: '20/20' },
    { name: '大地神力', type: '地面', pp: '10/10' },
    { name: '幫助', type: '一般', pp: '20/20' },
    { name: '挑釁', type: '惡', pp: '20/20' },
  ],
};

export function getCachedMoves(speciesKey: string): MoveSlot[] | null {
  const mem = MEMORY.get(speciesKey);
  if (mem && mem.fetchedAt === todayKey()) return mem.moves;
  try {
    const raw = localStorage.getItem(storageKey(speciesKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { fetchedAt: string; moves: MoveSlot[] };
    if (parsed.fetchedAt !== todayKey()) return null;
    MEMORY.set(speciesKey, parsed);
    return parsed.moves;
  } catch {
    return null;
  }
}

export function setCachedMoves(speciesKey: string, moves: MoveSlot[]): void {
  const payload = { fetchedAt: todayKey(), moves };
  MEMORY.set(speciesKey, payload);
  try {
    localStorage.setItem(storageKey(speciesKey), JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

/**
 * 取得 top-6（先快取，否則 placeholder）。
 * 未來可換成 fetch('https://championsbattledata.com/...') + 後端 proxy。
 */
export async function fetchTopMoves(speciesKey: string): Promise<MoveSlot[]> {
  const cached = getCachedMoves(speciesKey);
  if (cached) return cached;
  // stub：模擬網路延遲後寫入每日快取
  await new Promise((r) => setTimeout(r, 50));
  const moves = (PLACEHOLDER[speciesKey] ?? PLACEHOLDER.default).slice(0, 6);
  setCachedMoves(speciesKey, moves);
  return moves;
}

export function top4ForCard(moves: MoveSlot[]): MoveSlot[] {
  const pad: MoveSlot[] = [...moves];
  while (pad.length < 4) pad.push({ name: '—', type: '一般' as PokemonType });
  return pad.slice(0, 4);
}

/** 文件用：建議的磁碟快取相對路徑 */
export const MOVES_CACHE_PATH_DOC = '{userData}/.moves-cache/YYYY-MM-DD/{speciesKey}.json';
