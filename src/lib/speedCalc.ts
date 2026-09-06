import type { Stats } from '../types';

/** Lv50、IV31 的標準能力值公式 */
export function calcStat(
  base: number,
  iv = 31,
  ev = 0,
  level = 50,
  natureMult = 1,
  isHp = false,
): number {
  if (isHp) {
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  }
  const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(raw * natureMult);
}

export function calcAllStats(base: Stats, evs: Partial<Stats> = {}, nature: Partial<Record<keyof Stats, number>> = {}): Stats {
  return {
    hp: calcStat(base.hp, 31, evs.hp ?? 0, 50, 1, true),
    atk: calcStat(base.atk, 31, evs.atk ?? 0, 50, nature.atk ?? 1),
    def: calcStat(base.def, 31, evs.def ?? 0, 50, nature.def ?? 1),
    spa: calcStat(base.spa, 31, evs.spa ?? 0, 50, nature.spa ?? 1),
    spd: calcStat(base.spd, 31, evs.spd ?? 0, 50, nature.spd ?? 1),
    spe: calcStat(base.spe, 31, evs.spe ?? 0, 50, nature.spe ?? 1),
  };
}

/** 敵方速度軸四段：減速0 / 中性0 / 中性252(標為32示意)/ 加速0 — 規格：減速0/中性0/中性32/加速0 */

/** Champions investment pts -> EV: min(252, pts * 8) */
export function championsPtsToEv(pts: number): number {
  return Math.min(252, Math.max(0, Math.floor(pts) * 8));
}

export interface SpeedBand {
  id: string;
  label: string;
  /** 實際 Spe 數值 */
  value: number;
  kind: 'slow' | 'neutral0' | 'neutral32' | 'fast';
}

/**
 * 中性32：Champions pts 32 -> EV=min(252, 32*8)=252；其餘依規格。
 * 減速 = 性格 -Spe × EV0；加速 = 性格 +Spe × EV0
 */
export function enemySpeedBands(baseSpe: number): SpeedBand[] {
  const slow = calcStat(baseSpe, 31, 0, 50, 0.9);
  const n0 = calcStat(baseSpe, 31, 0, 50, 1);
  const n32 = calcStat(baseSpe, 31, championsPtsToEv(32), 50, 1);
  const fast = calcStat(baseSpe, 31, 0, 50, 1.1);
  return [
    { id: 'slow0', label: '減速0', value: slow, kind: 'slow' },
    { id: 'n0', label: '中性0', value: n0, kind: 'neutral0' },
    { id: 'n32', label: '中性32', value: n32, kind: 'neutral32' },
    { id: 'fast0', label: '加速0', value: fast, kind: 'fast' },
  ];
}

export function mySpeedPoint(baseSpe: number, enteredSpeed?: number, ev = 0, natureMult = 1): number {
  if (enteredSpeed != null && enteredSpeed > 0) return enteredSpeed;
  return calcStat(baseSpe, 31, ev, 50, natureMult);
}

export const SPEED_AXIS_MIN = 20;
export const SPEED_AXIS_MAX = 220;
