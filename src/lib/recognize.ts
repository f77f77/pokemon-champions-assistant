/**
 * Team Preview 敵方小縮圖辨認（本地 hash／模板 stub）。
 *
 * 流程：抓一幀 → contentRect（去黑邊）→ 敵方面板 ROI → 6 等分 →
 * 每格 thumb 裁切（左 5–38%、上下內縮 12%）→ 縮放 TEMPLATE_SIZE → 比對。
 *
 * 模板庫僅限 Team Preview 小縮圖（非大美術／HOME art）。
 * 低信心 → speciesId/speciesNameZh = null（UI「未識別」）。不猜道具。
 * 不做逐幀即時辨認。
 */

import type { RecognizeResult } from '../types';
import { grabFrame } from './videoSource';
import { findSpecies } from './species';
import {
  SLOT_COUNT,
  TEMPLATE_SIZE,
  type RoiFineTune,
  DEFAULT_FINE_TUNE,
  computeContentRect,
  resolveEnemyPanel,
  panelToFrameRect,
  slotRect,
  thumbRectInSlot,
} from './roi';

export {
  ENEMY_PANEL_DEFAULT,
  THUMB_CROP,
  SLOT_COUNT,
  TEMPLATE_SIZE,
  ROI_FINE_TUNE_MAX,
  computeContentRect,
  resolveEnemyPanel,
  panelToFrameRect,
  slotRect,
  thumbRectInSlot,
  panelCssPercent,
  slotCssPercent,
  thumbCssPercent,
  loadFineTune,
  saveFineTune,
  loadDebugOverlay,
  saveDebugOverlay,
  DEFAULT_FINE_TUNE,
  type RoiFineTune,
  type ContentRect,
  type PanelRectNorm,
} from './roi';

/** 信心門檻：低於此 → 未識別 */
export const CONFIDENCE_THRESHOLD = 0.55;

/** @deprecated 舊 ROI 形狀；請改用 ENEMY_PANEL_DEFAULT + resolveEnemyPanel */
export const ROI = {
  x: 0.811,
  y: 0.143,
  width: 0.965 - 0.811,
  height: 0.832 - 0.143,
  slots: SLOT_COUNT,
} as const;

export type RoiConfig = typeof ROI;

/** Team Preview 小縮圖模板條目（stub：空庫 → 永遠低信心） */
export interface ThumbTemplate {
  speciesId: string;
  speciesNameZh: string;
  /** 64×64 aHash 位元字串；實戰由 assets/templates/preview-thumbs 載入 */
  aHash: string;
}

/**
 * 本地模板庫 stub。
 * 實作時只放入 Team Preview 右側小圓／小方縮圖的 hash，不要用官方大圖。
 */
export const PREVIEW_THUMB_TEMPLATES: ThumbTemplate[] = [];

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

function hamming(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) d++;
  return d + Math.abs(a.length - b.length);
}

/** 將任意矩形裁切並縮放到 TEMPLATE_SIZE×TEMPLATE_SIZE */
function cropResizeToTemplate(
  src: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
): { imageData: ImageData; dataUrl: string } {
  const tmp = document.createElement('canvas');
  tmp.width = TEMPLATE_SIZE;
  tmp.height = TEMPLATE_SIZE;
  const tctx = tmp.getContext('2d');
  if (!tctx) {
    return {
      imageData: src.createImageData(TEMPLATE_SIZE, TEMPLATE_SIZE),
      dataUrl: '',
    };
  }
  const raw = src.getImageData(
    Math.max(0, rect.x),
    Math.max(0, rect.y),
    Math.max(1, rect.width),
    Math.max(1, rect.height),
  );
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = raw.width;
  rawCanvas.height = raw.height;
  rawCanvas.getContext('2d')!.putImageData(raw, 0, 0);
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(rawCanvas, 0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
  return {
    imageData: tctx.getImageData(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE),
    dataUrl: tmp.toDataURL('image/png'),
  };
}

function matchHash(
  hash: string,
): { speciesId: string | null; speciesNameZh: string | null; confidence: number } {
  if (PREVIEW_THUMB_TEMPLATES.length === 0) {
    // stub：無模板 → 合成低信心（可重複、可測 pipeline）
    const confidence = 0.12 + (hash.split('1').length % 7) * 0.01;
    return { speciesId: null, speciesNameZh: null, confidence };
  }
  let best = {
    speciesId: null as string | null,
    speciesNameZh: null as string | null,
    dist: 64,
  };
  for (const t of PREVIEW_THUMB_TEMPLATES) {
    const d = hamming(hash, t.aHash);
    if (d < best.dist) {
      best = { speciesId: t.speciesId, speciesNameZh: t.speciesNameZh, dist: d };
    }
  }
  const confidence = Math.max(0, 1 - best.dist / 16);
  if (confidence < CONFIDENCE_THRESHOLD) {
    return { speciesId: null, speciesNameZh: null, confidence };
  }
  return {
    speciesId: best.speciesId,
    speciesNameZh: best.speciesNameZh,
    confidence,
  };
}

function emptyResults(reasonConfidence = 0): RecognizeResult[] {
  return Array.from({ length: SLOT_COUNT }, (_, slot) => ({
    slot,
    confidence: reasonConfidence,
    speciesId: null,
    speciesNameZh: null,
    species: null,
  }));
}

/**
 * 從已繪製的整幀 canvas 辨認 6 槽（驗收：可餵 team-preview.png）。
 */
export async function recognizeEnemyTeamFromCanvas(
  canvas: HTMLCanvasElement,
  tune: RoiFineTune = DEFAULT_FINE_TUNE,
): Promise<RecognizeResult[]> {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !canvas.width || !canvas.height) return emptyResults();

    const content = computeContentRect(canvas.width, canvas.height);
    const panel = resolveEnemyPanel(tune);
    const panelPx = panelToFrameRect(content, panel);

    const results: RecognizeResult[] = [];
    for (let slot = 0; slot < SLOT_COUNT; slot++) {
      try {
        const sRect = slotRect(panelPx, slot);
        const tRect = thumbRectInSlot(sRect);
        const { imageData, dataUrl } = cropResizeToTemplate(ctx, tRect);
        const hash = averageHash(imageData);
        const matched = matchHash(hash);
        let speciesId = matched.speciesId;
        let speciesNameZh = matched.speciesNameZh;
        if (speciesId) {
          const sp = findSpecies(speciesId);
          if (!sp) {
            speciesId = null;
            speciesNameZh = null;
          } else {
            speciesNameZh = sp.nameZh;
          }
        }
        results.push({
          slot,
          confidence: matched.confidence,
          speciesId,
          speciesNameZh,
          species: speciesId,
          thumbnailDataUrl: dataUrl || undefined,
          hash,
        });
      } catch {
        results.push({
          slot,
          confidence: 0,
          speciesId: null,
          speciesNameZh: null,
          species: null,
        });
      }
    }
    return results;
  } catch {
    return emptyResults();
  }
}

/**
 * 從 live video 抓「一幀」後辨認（按鈕觸發，非連續）。
 */
export async function recognizeEnemyTeam(
  video: HTMLVideoElement,
  tune: RoiFineTune = DEFAULT_FINE_TUNE,
): Promise<RecognizeResult[]> {
  try {
    if (!video.videoWidth) return emptyResults();
    const canvas = grabFrame(video);
    return recognizeEnemyTeamFromCanvas(canvas, tune);
  } catch {
    return emptyResults();
  }
}
