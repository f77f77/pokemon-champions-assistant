/**
 * Team Preview 敵方小縮圖辨認（本地 aHash + 灰階 NCC，無雲端）。
 *
 * 流程：抓一幀 → contentRect（去黑邊）→ 敵方面板 ROI → 6 pitch → 紅卡本體（留 gap）→
 * 每格黃框正方形（邊長=紅卡本體高，左側精靈）→ 抑制紅卡底 → content-aware 重對齊 →
 * 64×64 多尺度／微位移灰階比對（mask = 模板 alpha ∩ query 非黑）。
 *
 * 模板庫：public/templates/{showdownId}.png — 切自官方 sprite_poke_3（trim 透明邊 → contain 64）。
 * Manifest source: sprite_poke_3。灰階特徵 only（NCC/SSD/aHash）；不拉伸。
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
  CARD_GAP_FRAC,
  PANEL_OUTER_MARGIN_FRAC,
  SLOT_COUNT,
  TEMPLATE_SIZE,
  ROI_FINE_TUNE_MAX,
  computeContentRect,
  resolveEnemyPanel,
  panelToFrameRect,
  slotRect,
  cardRect,
  thumbRectInSlot,
  panelVisualNorm,
  panelCssPercent,
  slotCssPercent,
  cardCssPercent,
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

/** Query multi-scale / translation sweep (mirror scripts/match-test-fixtures.py) */
export const MATCH_SCALES = [0.8, 0.95, 1.1, 1.25, 1.4] as const;
export const MATCH_SHIFTS = [-8, -4, 0, 4, 8] as const;

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
  /** 64×64 aHash 位元字串（僅不透明像素） */
  aHash: string;
  /** 灰階 float（長度 TEMPLATE_SIZE²），用於 NCC */
  gray: Float32Array;
  /** Alpha mask 0/1（sprite_poke_3 透明底忽略）；缺省視為全 1 */
  mask?: Float32Array;
  /** 可選：原圖 data URL（除錯） */
  dataUrl?: string;
}

/**
 * Fallback seed showdownIds when manifest is missing (new team-select fixtures).
 * Prefer public/templates/manifest.json ROI-crop entries at runtime.
 */
export const SEED_TEMPLATE_IDS = [
  'charizard',
  'aerodactyl',
  'meowscarada',
  'garchomp',
  'rotomwash',
  'aegislash',
] as const;

const SEED_META: Record<string, string> = {
  charizard: '噴火龍',
  aerodactyl: '化石翼龍',
  meowscarada: '魔幻假面喵',
  garchomp: '烈咬陸鯊',
  rotomwash: '清洗洛托姆',
  aegislash: '堅盾劍怪',
  whimsicott: '風妖精',
  basculegion: '幽尾玄魚',
  kingambit: '仆刀將軍',
  sneasler: '大狃拉',
  ninetalesalola: '阿羅拉九尾',
  empoleon: '帝王拿波',
  staraptor: '姆克鷹',
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

/** 正規化互相關 ∈ [-1,1]；可選 mask（>0 的像素才計入） */
function ncc(a: Float32Array, b: Float32Array, mask?: Float32Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let count = 0;
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < n; i++) {
    if (mask && mask[i] <= 0) continue;
    meanA += a[i];
    meanB += b[i];
    count++;
  }
  if (count < 8) return 0;
  meanA /= count;
  meanB /= count;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    if (mask && mask[i] <= 0) continue;
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

/** 正規化 SSD 相似度 ∈ [0,1]（1 = 相同）；可選 mask */
function ssdSimilarity(a: Float32Array, b: Float32Array, mask?: Float32Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (mask && mask[i] <= 0) continue;
    const d = (a[i] - b[i]) / 255;
    sum += d * d;
    count++;
  }
  if (count < 8) return 0;
  return Math.max(0, 1 - Math.sqrt(sum / count) * 2);
}

function alphaMaskFromImageData(data: ImageData, threshold = 12): Float32Array {
  const { data: px } = data;
  const out = new Float32Array(data.width * data.height);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    out[j] = px[i + 3] > threshold ? 1 : 0;
  }
  return out;
}

/**
 * Draw source into TEMPLATE_SIZE×TEMPLATE_SIZE with contain/letterbox
 * (preserve aspect; pad black). Never stretch — stretch breaks NCC matching.
 */
function drawContained(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  opts?: { padBlack?: boolean },
): void {
  ctx.clearRect(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
  if (opts?.padBlack !== false) {
    // Capture path: black letterbox pad (matches gray pipeline).
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
  }
  // Template load: leave cleared (transparent) so alpha mask works.
  const sw = Math.max(1, srcW);
  const sh = Math.max(1, srcH);
  const scale = Math.min(TEMPLATE_SIZE / sw, TEMPLATE_SIZE / sh);
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const dx = Math.floor((TEMPLATE_SIZE - dw) / 2);
  const dy = Math.floor((TEMPLATE_SIZE - dh) / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, sw, sh, dx, dy, dw, dh);
}

function imageDataFromBitmap(bmp: ImageBitmap): ImageData {
  const c = document.createElement('canvas');
  c.width = TEMPLATE_SIZE;
  c.height = TEMPLATE_SIZE;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  // Same contain path as capture crops so NCC compares like-for-like.
  drawContained(ctx, bmp, bmp.width, bmp.height, { padBlack: false });
  return ctx.getImageData(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
}

/** Manifest / seed template entries under public/templates/. */
interface ManifestTemplateEntry {
  speciesId: string;
  speciesNameZh?: string;
  file?: string;
  source?: string;
}

interface TemplatesManifest {
  templates?: ManifestTemplateEntry[];
  defaultSource?: string;
}

interface ResolvedTemplateFile {
  speciesId: string;
  nameZh: string;
  /** File under public/templates/ (may include variants e.g. sableye-test2.png) */
  file: string;
}

/**
 * Resolve template files to load: manifest.json ROI-crop entries (multi-file per
 * showdownId allowed) ∪ SEED_TEMPLATE_IDS as `{id}.png` fallback.
 */
async function resolveTemplateFiles(): Promise<ResolvedTemplateFile[]> {
  const files: ResolvedTemplateFile[] = [];
  const seenFiles = new Set<string>();
  try {
    const url = `${templatesBaseUrl()}manifest.json`;
    const res = await fetch(url);
    if (res.ok) {
      const manifest = (await res.json()) as TemplatesManifest;
      for (const t of manifest.templates ?? []) {
        if (!t?.speciesId) continue;
        if (t.source && t.source !== 'sprite_poke_3' && t.source !== 'roi-crop') continue;
        const file = t.file || `${t.speciesId}.png`;
        if (seenFiles.has(file)) continue;
        seenFiles.add(file);
        files.push({
          speciesId: t.speciesId,
          nameZh: t.speciesNameZh || SEED_META[t.speciesId] || t.speciesId,
          file,
        });
      }
    }
  } catch {
    /* fall back below */
  }
  if (files.length === 0) {
    for (const id of SEED_TEMPLATE_IDS) {
      const file = `${id}.png`;
      if (seenFiles.has(file)) continue;
      seenFiles.add(file);
      files.push({ speciesId: id, nameZh: SEED_META[id] ?? id, file });
    }
  } else {
    // Ensure seed files are present even if omitted from an older manifest
    for (const id of SEED_TEMPLATE_IDS) {
      const file = `${id}.png`;
      if (seenFiles.has(file)) continue;
      seenFiles.add(file);
      files.push({ speciesId: id, nameZh: SEED_META[id] ?? id, file });
    }
  }
  return files;
}

async function fetchTemplateFile(file: string): Promise<ImageData | null> {
  try {
    const url = `${templatesBaseUrl()}${file}`;
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

export async function loadPreviewThumbTemplates(
  force = false,
): Promise<ThumbTemplate[]> {
  if (!force && PREVIEW_THUMB_TEMPLATES.length > 0) return PREVIEW_THUMB_TEMPLATES;
  if (!force && loadPromise) return loadPromise;

  loadPromise = (async () => {
    const loaded: ThumbTemplate[] = [];
    const entries = await resolveTemplateFiles();
    for (const { speciesId, nameZh, file } of entries) {
      const imageData = await fetchTemplateFile(file);
      if (!imageData) continue;
      const zh = findSpecies(speciesId)?.nameZh ?? nameZh ?? SEED_META[speciesId] ?? speciesId;
      const mask = alphaMaskFromImageData(imageData);
      loaded.push({
        speciesId,
        speciesNameZh: zh,
        aHash: averageHash(imageData),
        gray: toGray(imageData),
        mask,
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

/**
 * Suppress near-maroon Team Select card background (and thin bottom bar).
 */
function suppressCardBackground(data: ImageData): ImageData {
  const { width, height, data: px } = data;
  const out = new ImageData(width, height);
  const op = out.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const maroon = r > 70 && r > g * 1.5 && r > b * 1.3 && g < 100 && b < 110;
    if (maroon) {
      op[i] = op[i + 1] = op[i + 2] = 0;
      op[i + 3] = 255;
    } else {
      op[i] = r;
      op[i + 1] = g;
      op[i + 2] = b;
      op[i + 3] = 255;
    }
  }
  // Zero mostly-dark bottom rows (UI bar)
  for (let y = height - 1; y >= Math.max(0, height - 12); y--) {
    let dark = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (op[i] + op[i + 1] + op[i + 2] < 45) dark++;
    }
    if (dark / width > 0.55) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        op[i] = op[i + 1] = op[i + 2] = 0;
      }
    } else {
      break;
    }
  }
  return out;
}

/**
 * Tight square around non-black sprite blob (content-aware recenter).
 */
function contentAwareSquare(data: ImageData, pad = 6): ImageData {
  const { width, height, data: px } = data;
  let x0 = width;
  let y0 = height;
  let x1 = 0;
  let y1 = 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (px[i] + px[i + 1] + px[i + 2] > 20) {
        count++;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x + 1 > x1) x1 = x + 1;
        if (y + 1 > y1) y1 = y + 1;
      }
    }
  }
  if (count < 16) return data;
  let side = Math.max(x1 - x0, y1 - y0) + pad;
  side = Math.min(side, width, height);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let sx = Math.round(cx - side / 2);
  let sy = Math.round(cy - side / 2);
  sx = Math.max(0, Math.min(sx, width - side));
  sy = Math.max(0, Math.min(sy, height - side));
  const c = document.createElement('canvas');
  c.width = side;
  c.height = side;
  const ctx = c.getContext('2d')!;
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  srcCanvas.getContext('2d')!.putImageData(data, 0, 0);
  ctx.drawImage(srcCanvas, sx, sy, side, side, 0, 0, side, side);
  return ctx.getImageData(0, 0, side, side);
}

function grayFromImageData(data: ImageData): Float32Array {
  return toGray(data);
}

function averageHashGray(gray: Float32Array, size = 8): string {
  const block = TEMPLATE_SIZE / size;
  const vals: number[] = [];
  for (let gy = 0; gy < size; gy++) {
    for (let gx = 0; gx < size; gx++) {
      let s = 0;
      const y0 = Math.floor(gy * block);
      const x0 = Math.floor(gx * block);
      const y1 = Math.floor((gy + 1) * block);
      const x1 = Math.floor((gx + 1) * block);
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          s += gray[y * TEMPLATE_SIZE + x];
          n++;
        }
      }
      vals.push(s / Math.max(1, n));
    }
  }
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return vals.map((v) => (v >= avg ? '1' : '0')).join('');
}

function queryNonblackMask(gray: Float32Array, thr = 12): Float32Array {
  const out = new Float32Array(gray.length);
  for (let i = 0; i < gray.length; i++) out[i] = gray[i] > thr ? 1 : 0;
  return out;
}

function intersectMask(a?: Float32Array, b?: Float32Array): Float32Array | undefined {
  if (!a) return b;
  if (!b) return a;
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] > 0 && b[i] > 0 ? 1 : 0;
  return out;
}

/** Scale+shift gray plane onto TEMPLATE_SIZE canvas (black pad / center-crop). */
function placeScaledGray(gray: Float32Array, scale: number, dx: number, dy: number): Float32Array | null {
  const nw = Math.max(1, Math.round(TEMPLATE_SIZE * scale));
  // Draw via canvas for bilinear resize
  const src = document.createElement('canvas');
  src.width = TEMPLATE_SIZE;
  src.height = TEMPLATE_SIZE;
  const sctx = src.getContext('2d')!;
  const img = sctx.createImageData(TEMPLATE_SIZE, TEMPLATE_SIZE);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) {
    const v = Math.max(0, Math.min(255, gray[i]));
    img.data[j] = img.data[j + 1] = img.data[j + 2] = v;
    img.data[j + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);
  const scaled = document.createElement('canvas');
  scaled.width = nw;
  scaled.height = nw;
  const xctx = scaled.getContext('2d')!;
  xctx.imageSmoothingEnabled = true;
  xctx.drawImage(src, 0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE, 0, 0, nw, nw);
  const out = new Float32Array(TEMPLATE_SIZE * TEMPLATE_SIZE);
  if (nw >= TEMPLATE_SIZE) {
    let x = Math.floor((nw - TEMPLATE_SIZE) / 2) + dx;
    let y = Math.floor((nw - TEMPLATE_SIZE) / 2) + dy;
    x = Math.max(0, Math.min(x, nw - TEMPLATE_SIZE));
    y = Math.max(0, Math.min(y, nw - TEMPLATE_SIZE));
    const patch = xctx.getImageData(x, y, TEMPLATE_SIZE, TEMPLATE_SIZE);
    for (let i = 0, j = 0; j < patch.data.length; i++, j += 4) {
      out[i] = 0.299 * patch.data[j] + 0.587 * patch.data[j + 1] + 0.114 * patch.data[j + 2];
    }
  } else {
    const ox = Math.floor((TEMPLATE_SIZE - nw) / 2) + dx;
    const oy = Math.floor((TEMPLATE_SIZE - nw) / 2) + dy;
    if (ox < 0 || oy < 0 || ox + nw > TEMPLATE_SIZE || oy + nw > TEMPLATE_SIZE) return null;
    const patch = xctx.getImageData(0, 0, nw, nw);
    out.fill(0);
    for (let row = 0; row < nw; row++) {
      for (let col = 0; col < nw; col++) {
        const j = (row * nw + col) * 4;
        const v = 0.299 * patch.data[j] + 0.587 * patch.data[j + 1] + 0.114 * patch.data[j + 2];
        out[(oy + row) * TEMPLATE_SIZE + (ox + col)] = v;
      }
    }
  }
  return out;
}

function* iterQueryVariants(gray0: Float32Array): Generator<Float32Array> {
  yield gray0;
  for (const sc of MATCH_SCALES) {
    for (const dy of MATCH_SHIFTS) {
      for (const dx of MATCH_SHIFTS) {
        if (Math.abs(sc - 1) < 1e-6 && dx === 0 && dy === 0) continue;
        const g = placeScaledGray(gray0, sc, dx, dy);
        if (g) yield g;
      }
    }
  }
}

/**
 * Crop yellow square → suppress maroon BG → content-aware recenter → 64×64.
 * Square crop resizes without stretch (aspect already 1:1).
 */
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
  const suppressed = suppressCardBackground(raw);
  const recentered = contentAwareSquare(suppressed);
  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = recentered.width;
  rawCanvas.height = recentered.height;
  rawCanvas.getContext('2d')!.putImageData(recentered, 0, 0);
  // Square → drawContained is identity scale letterbox (fills 64)
  drawContained(tctx, rawCanvas, recentered.width, recentered.height);
  const imageData = tctx.getImageData(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
  return {
    imageData,
    dataUrl: tmp.toDataURL('image/png'),
    gray: grayFromImageData(imageData),
  };
}

/**
 * 本地比對：多尺度／微位移 + 灰階 NCC（主）+ SSD + aHash（輔）。
 * mask = 模板 alpha ∩ query 非黑。confidence ∈ [0,1]。
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

  for (const g of iterQueryVariants(gray)) {
    const qMask = queryNonblackMask(g);
    const h = averageHashGray(g);
    for (const t of PREVIEW_THUMB_TEMPLATES) {
      const mask = intersectMask(t.mask, qMask);
      const nccScore = (ncc(g, t.gray, mask) + 1) / 2;
      const ssdScore = ssdSimilarity(g, t.gray, mask);
      const hashBits = Math.max(h.length, t.aHash.length) || 64;
      const hashScore = Math.max(0, 1 - hamming(h, t.aHash) / (hashBits * 0.35));
      const confidence = Math.min(1, nccScore * 0.55 + ssdScore * 0.25 + hashScore * 0.2);
      if (confidence > best.confidence) {
        best = {
          speciesId: t.speciesId,
          speciesNameZh: t.speciesNameZh,
          confidence,
        };
      }
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
 * 從已繪製的整幀 canvas 辨認 6 槽（驗收：可餵 team-preview-test-*.png）。
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
        // Recognition crop: full pitch square (side≈pitch). Overlay yellow uses card
        // body (CARD_GAP_FRAC) via thumbCssPercent; shrinking the match crop to card
        // body regresses fixtures (~11/18 vs ~15/18).
        const sRect = slotRect(panelPx, slot);
        const tRect = thumbRectInSlot(sRect);
        const { imageData, dataUrl, gray } = cropResizeToTemplate(ctx, tRect);
        const hash = averageHash(imageData);
        const matched = matchTemplate(hash, gray);
        let speciesId = matched.speciesId;
        let speciesNameZh = matched.speciesNameZh;
        if (speciesId) {
          const sp = findSpecies(speciesId);
          if (sp) {
            speciesNameZh = sp.nameZh;
          }
          // Keep matched showdownId even if species DB lacks an entry (template zh retained).
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

/** Built-in Team Preview fixtures under public/fixtures/ (cycles on each load). */
export const TEAM_PREVIEW_FIXTURES = [
  'fixtures/team-preview-test-1.png',
  'fixtures/team-preview-test-2.png',
  'fixtures/team-preview-test-3.png',
] as const;

let fixtureCursor = 0;

function withBase(rel: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const path = rel.replace(/^\//, '');
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

/** 測試圖路徑（相對 Vite BASE_URL）；每次呼叫前進下一張 */
export function fixtureTeamPreviewUrl(advance = true): string {
  const rel = TEAM_PREVIEW_FIXTURES[fixtureCursor % TEAM_PREVIEW_FIXTURES.length];
  if (advance) fixtureCursor = (fixtureCursor + 1) % TEAM_PREVIEW_FIXTURES.length;
  return withBase(rel);
}

/** Peek current fixture label without advancing */
export function currentFixtureLabel(): string {
  const rel = TEAM_PREVIEW_FIXTURES[fixtureCursor % TEAM_PREVIEW_FIXTURES.length];
  return rel.split('/').pop() || rel;
}
