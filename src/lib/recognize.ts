import type { RecognizeResult } from '../types';
import { grabFrame } from './videoSource';

/**
 * ROI：對齊 team-preview 右側「敵方隊伍」6 個縮圖欄。
 * 數值為相對整幀的比例（0–1），可於設定調整。
 * 參考畫面：右側紅/洋紅卡片直欄，約佔畫面右 22%。
 */
export const ROI = {
  /** 右欄左緣 */
  x: 0.72,
  /** 第一張卡上緣 */
  y: 0.12,
  /** 右欄寬度 */
  width: 0.22,
  /** 六張卡合計高度 */
  height: 0.76,
  slots: 6,
} as const;

export type RoiConfig = typeof ROI;

function averageHash(data: ImageData, size = 8): string {
  const { width, height, data: px } = data;
  const gray: number[] = [];
  for (let gy = 0; gy < size; gy++) {
    for (let gx = 0; gx < size; gx++) {
      const sx = Math.floor((gx + 0.5) * (width / size));
      const sy = Math.floor((gy + 0.5) * (height / size));
      const i = (sy * width + sx) * 4;
      gray.push(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    }
  }
  const avg = gray.reduce((a, b) => a + b, 0) / gray.length;
  return gray.map((v) => (v >= avg ? '1' : '0')).join('');
}

function cropSlot(
  ctx: CanvasRenderingContext2D,
  frameW: number,
  frameH: number,
  slot: number,
  roi: RoiConfig,
): ImageData {
  const slotH = (roi.height * frameH) / roi.slots;
  const x = Math.floor(roi.x * frameW);
  const y = Math.floor(roi.y * frameH + slot * slotH);
  const w = Math.max(1, Math.floor(roi.width * frameW));
  const h = Math.max(1, Math.floor(slotH * 0.85));
  return ctx.getImageData(x, y, w, h);
}

/**
 * 本地 template/hash 比對 stub。
 * 故意回傳低信心 → UI 顯示「未識別」。不呼叫雲端 vision；不崩潰。
 */
export async function recognizeEnemyTeam(
  video: HTMLVideoElement,
  roi: RoiConfig = ROI,
): Promise<RecognizeResult[]> {
  try {
    if (!video.videoWidth) {
      return Array.from({ length: roi.slots }, (_, slot) => ({
        slot,
        species: null,
        confidence: 0,
      }));
    }
    const canvas = grabFrame(video);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return Array.from({ length: roi.slots }, (_, slot) => ({
        slot,
        species: null,
        confidence: 0,
      }));
    }

    const results: RecognizeResult[] = [];
    for (let slot = 0; slot < roi.slots; slot++) {
      try {
        const img = cropSlot(ctx, canvas.width, canvas.height, slot, roi);
        const hash = averageHash(img);
        // stub：無模板庫 → 信心永遠低於門檻
        const confidence = 0.12 + (hash.split('1').length % 7) * 0.01;
        results.push({
          slot,
          species: null,
          confidence,
          hash,
        });
      } catch {
        results.push({ slot, species: null, confidence: 0 });
      }
    }
    return results;
  } catch {
    return Array.from({ length: roi.slots }, (_, slot) => ({
      slot,
      species: null,
      confidence: 0,
    }));
  }
}

export const CONFIDENCE_THRESHOLD = 0.55;
