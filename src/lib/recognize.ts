/**
 * Team Preview 敵方小縮圖辨認（本地 aHash + 灰階 NCC，無雲端）。
 *
 * 流程：抓一幀 → contentRect（去黑邊）→ 敵方面板 ROI → 6 等分 →
 * 每格 thumb 裁切（左 20–55%、上內縮 25%／下內縮 5%）→ 縮放 TEMPLATE_SIZE → 比對。
 *
 * 模板庫：public/templates/{showdownId}.png（僅 Team Preview 小縮圖，非大美術／HOME art）。
 * 預設比對 ROI-crop 種子（source: roi-crop）。CBD menu sprites
 * （assets/templates/preview-thumbs/，source: cbd）為可選次要來源，畫面風格常與選隊縮圖不合。
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

/** Team Preview 小縮圖模板條目 */
export interface ThumbTemplate {
  speciesId: string;
  speciesNameZh: string;
  /** 64×64 aHash 位元字串 */
  aHash: string;
  /** 灰階 float（長度 TEMPLATE_SIZE²），用於 NCC */
  gray: Float32Array;
  /** 可選：原圖 data URL（除錯） */
  dataUrl?: string;
}

/**
 * VGC seed showdownIds（圖二敵方欄 top→bottom）。
 * Forms/Mega/shiny、Rotom 家電型、Lycanroc 晝／夜、Hippowdon 性別色差日後各自加模板。
 */
export const SEED_TEMPLATE_IDS = [
  'noivern',
  'lycanroc', // Midday / 白晝
  'politoed',
  'rotom', // base form
  'kangaskhan',
  'hippowdon',
] as const;

const SEED_META: Record<string, string> = {
  noivern: '音爆音波',
  lycanroc: '鬃岩狼人',
  politoed: '蚊香蛙皇',
  rotom: '洛托姆',
  kangaskhan: '袋獸',
  hippowdon: '河馬獸',
};

/** 執行期模板庫（載入後填入；空 → 低信心／未識別） */
export let PREVIEW_THUMB_TEMPLATES: ThumbTemplate[] = [];

let loadPromise: Promise<ThumbTemplate[]> | null = null;

function templatesBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? `${base}templates/` : `${base}/templates/`;
}

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

function toGray(data: ImageData): Float32Array {
  const { width, height, data: px } = data;
  const out = new Float32Array(width * height);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    out[j] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  }
  return out;
}

function hamming(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) d++;
  return d + Math.abs(a.length - b.length);
}

/** 正規化互相關 ∈ [-1,1]；同圖 ≈ 1 */
function ncc(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < n; i++) {
    meanA += a[i];
    meanB += b[i];
  }
  meanA /= n;
  meanB /= n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  if (den < 1e-6) return 0;
  return num / den;
}

/** 正規化 SSD 相似度 ∈ [0,1]（1 = 相同） */
function ssdSimilarity(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = (a[i] - b[i]) / 255;
    sum += d * d;
  }
  // 典型同圖 ≈ 0；差異大時 sum/n 可 > 1 → clamp
  return Math.max(0, 1 - Math.sqrt(sum / n) * 2);
}

function imageDataFromBitmap(bmp: ImageBitmap): ImageData {
  const c = document.createElement('canvas');
  c.width = TEMPLATE_SIZE;
  c.height = TEMPLATE_SIZE;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bmp, 0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
  return ctx.getImageData(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
}

async function fetchTemplatePng(speciesId: string): Promise<ImageData | null> {
  try {
    const url = `${templatesBaseUrl()}${speciesId}.png`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const data = imageDataFromBitmap(bmp);
    bmp.close();
    return data;
  } catch {
    return null;
  }
}

/**
 * 載入 public/templates/ 種子庫（一次；之後快取）。
 * 失敗的檔案略過；全空時辨認一律未識別。
 */
export async function loadPreviewThumbTemplates(
  force = false,
): Promise<ThumbTemplate[]> {
  if (!force && PREVIEW_THUMB_TEMPLATES.length > 0) return PREVIEW_THUMB_TEMPLATES;
  if (!force && loadPromise) return loadPromise;

  loadPromise = (async () => {
    const loaded: ThumbTemplate[] = [];
    for (const id of SEED_TEMPLATE_IDS) {
      const imageData = await fetchTemplatePng(id);
      if (!imageData) continue;
      const zh = findSpecies(id)?.nameZh ?? SEED_META[id] ?? id;
      loaded.push({
        speciesId: id,
        speciesNameZh: zh,
        aHash: averageHash(imageData),
        gray: toGray(imageData),
      });
    }
    PREVIEW_THUMB_TEMPLATES = loaded;
    return loaded;
  })();

  try {
    return await loadPromise;
  } finally {
    /* keep loadPromise for reuse */
  }
}

/** 將任意矩形裁切並縮放到 TEMPLATE_SIZE×TEMPLATE_SIZE */
function cropResizeToTemplate(
  src: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
): { imageData: ImageData; dataUrl: string; gray: Float32Array } {
  const tmp = document.createElement('canvas');
  tmp.width = TEMPLATE_SIZE;
  tmp.height = TEMPLATE_SIZE;
  const tctx = tmp.getContext('2d');
  if (!tctx) {
    const empty = src.createImageData(TEMPLATE_SIZE, TEMPLATE_SIZE);
    return { imageData: empty, dataUrl: '', gray: toGray(empty) };
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
  const imageData = tctx.getImageData(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
  return {
    imageData,
    dataUrl: tmp.toDataURL('image/png'),
    gray: toGray(imageData),
  };
}

/**
 * 本地比對：灰階 NCC（主）+ SSD + aHash（輔）。
 * confidence ∈ [0,1]；低於 CONFIDENCE_THRESHOLD → 呼叫端當未識別。
 */
function matchTemplate(hash: string, gray: Float32Array): {
  speciesId: string | null;
  speciesNameZh: string | null;
  confidence: number;
} {
  if (PREVIEW_THUMB_TEMPLATES.length === 0) {
    const confidence = 0.12 + (hash.split('1').length % 7) * 0.01;
    return { speciesId: null, speciesNameZh: null, confidence };
  }

  let best = {
    speciesId: null as string | null,
    speciesNameZh: null as string | null,
    confidence: 0,
  };

  for (const t of PREVIEW_THUMB_TEMPLATES) {
    const nccScore = (ncc(gray, t.gray) + 1) / 2; // [-1,1] → [0,1]
    const ssdScore = ssdSimilarity(gray, t.gray);
    const hashBits = Math.max(hash.length, t.aHash.length) || 64;
    const hashScore = Math.max(0, 1 - hamming(hash, t.aHash) / (hashBits * 0.35));
    // 權重：NCC 主導（對亮度偏移較穩），SSD／hash 輔助
    const confidence = Math.min(1, nccScore * 0.55 + ssdScore * 0.25 + hashScore * 0.2);
    if (confidence > best.confidence) {
      best = {
        speciesId: t.speciesId,
        speciesNameZh: t.speciesNameZh,
        confidence,
      };
    }
  }

  if (best.confidence < CONFIDENCE_THRESHOLD) {
    return { speciesId: null, speciesNameZh: null, confidence: best.confidence };
  }
  return best;
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
    await loadPreviewThumbTemplates();
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
        const { imageData, dataUrl, gray } = cropResizeToTemplate(ctx, tRect);
        const hash = averageHash(imageData);
        const matched = matchTemplate(hash, gray);
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

/** 測試圖路徑（相對 Vite BASE_URL） */
export function fixtureTeamPreviewUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/')
    ? `${base}fixtures/team-preview.png`
    : `${base}/fixtures/team-preview.png`;
}
