/**
 * Team Preview 敵方縮圖 ROI（對齊 VGC 助手規格）。
 *
 * 座標系一律相對「去黑邊後的 16:9 內容區」(contentRect)，不是整幀。
 * 預設敵方面板：(left,top)=(0.811,0.143) → (right,bottom)=(0.965,0.832)
 * 再均分成 6 格；每格內再裁縮圖：水平 5%–38%、上內縮 25%／下內縮 5%（圖二 overlay：精靈偏下）。
 *
 * 微調：Settings 可對面板四邊做 ±2%（相對內容寬／高）偏移。
 */

export const TARGET_ASPECT = 16 / 9;

/** 敵方面板預設（相對 contentRect 的 0–1） */
export const ENEMY_PANEL_DEFAULT = {
  left: 0.811,
  top: 0.143,
  right: 0.965,
  bottom: 0.832,
} as const;

/** 單格內縮圖裁切（相對該 slot 矩形） */
export const THUMB_CROP = {
  /** 左緣（相對 slot 寬） */
  left: 0.05,
  /** 右緣（相對 slot 寬）— 5%–38% → 寬度 33% */
  right: 0.38,
  /** 上內縮（相對 slot 高）— 精靈偏下，多裁上方空白 */
  topInset: 0.25,
  /** 下內縮（相對 slot 高） */
  bottomInset: 0.05,
} as const;

export const SLOT_COUNT = 6;

/** 模板比對前縮放邊長（Team Preview 小縮圖，非大圖／HOME） */
export const TEMPLATE_SIZE = 64;

/** Settings 微調上限（相對內容寬／高） */
export const ROI_FINE_TUNE_MAX = 0.02;

export const ROI_STORAGE_KEY = 'pkmn-champions-roi-tune';
export const ROI_DEBUG_STORAGE_KEY = 'pkmn-champions-roi-debug';

export interface ContentRect {
  /** 內容區左上角（像素，相對整幀） */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoiFineTune {
  /** 相對 content 寬／高的偏移，建議 |v| ≤ 0.02 */
  dLeft: number;
  dTop: number;
  dRight: number;
  dBottom: number;
}

export const DEFAULT_FINE_TUNE: RoiFineTune = {
  dLeft: 0,
  dTop: 0,
  dRight: 0,
  dBottom: 0,
};

export interface PanelRectNorm {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * 從整幀推導 16:9 內容區（處理 letterbox／pillarbox 黑邊）。
 * 假設遊戲畫面為 16:9，置中於 capture 幀內。
 */
export function computeContentRect(
  frameW: number,
  frameH: number,
  targetAspect: number = TARGET_ASPECT,
): ContentRect {
  if (frameW <= 0 || frameH <= 0) {
    return { x: 0, y: 0, width: Math.max(1, frameW), height: Math.max(1, frameH) };
  }
  const frameAspect = frameW / frameH;
  if (frameAspect > targetAspect) {
    // 左右黑邊（pillarbox）
    const width = Math.floor(frameH * targetAspect);
    const x = Math.floor((frameW - width) / 2);
    return { x, y: 0, width, height: frameH };
  }
  if (frameAspect < targetAspect) {
    // 上下黑邊（letterbox）
    const height = Math.floor(frameW / targetAspect);
    const y = Math.floor((frameH - height) / 2);
    return { x: 0, y, width: frameW, height };
  }
  return { x: 0, y: 0, width: frameW, height: frameH };
}

/** 套用 ±2% 微調後的敵方面板（相對 content） */
export function resolveEnemyPanel(tune: RoiFineTune = DEFAULT_FINE_TUNE): PanelRectNorm {
  const left = clamp(ENEMY_PANEL_DEFAULT.left + tune.dLeft, 0, 0.98);
  const top = clamp(ENEMY_PANEL_DEFAULT.top + tune.dTop, 0, 0.98);
  const right = clamp(ENEMY_PANEL_DEFAULT.right + tune.dRight, left + 0.02, 1);
  const bottom = clamp(ENEMY_PANEL_DEFAULT.bottom + tune.dBottom, top + 0.02, 1);
  return { left, top, right, bottom };
}

/** 敵方面板 → 整幀像素矩形 */
export function panelToFrameRect(content: ContentRect, panel: PanelRectNorm): PixelRect {
  const x = content.x + panel.left * content.width;
  const y = content.y + panel.top * content.height;
  const width = (panel.right - panel.left) * content.width;
  const height = (panel.bottom - panel.top) * content.height;
  return {
    x: Math.floor(x),
    y: Math.floor(y),
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
  };
}

/** 第 slot 格（0–5）的整幀像素矩形（六等分垂直） */
export function slotRect(panelPx: PixelRect, slot: number, slots: number = SLOT_COUNT): PixelRect {
  const slotH = panelPx.height / slots;
  return {
    x: panelPx.x,
    y: Math.floor(panelPx.y + slot * slotH),
    width: panelPx.width,
    height: Math.max(1, Math.floor(slotH)),
  };
}

/**
 * 單格內縮圖裁切（相對 slot：水平 5%–38%，上內縮 25%／下內縮 5%）。
 * 回傳整幀像素座標。
 */
export function thumbRectInSlot(slot: PixelRect): PixelRect {
  const insetTop = slot.height * THUMB_CROP.topInset;
  const x = slot.x + slot.width * THUMB_CROP.left;
  const y = slot.y + insetTop;
  const width = slot.width * (THUMB_CROP.right - THUMB_CROP.left);
  const height = slot.height * (1 - THUMB_CROP.topInset - THUMB_CROP.bottomInset);
  return {
    x: Math.floor(x),
    y: Math.floor(y),
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
  };
}

/** Overlay 用：相對「預覽容器／內容區」的 CSS %（0–100） */
export function panelCssPercent(panel: PanelRectNorm): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  return {
    left: panel.left * 100,
    top: panel.top * 100,
    width: (panel.right - panel.left) * 100,
    height: (panel.bottom - panel.top) * 100,
  };
}

export function slotCssPercent(
  panel: PanelRectNorm,
  slot: number,
  slots: number = SLOT_COUNT,
): { left: number; top: number; width: number; height: number } {
  const panelH = panel.bottom - panel.top;
  const slotH = panelH / slots;
  return {
    left: panel.left * 100,
    top: (panel.top + slot * slotH) * 100,
    width: (panel.right - panel.left) * 100,
    height: slotH * 100,
  };
}

export function thumbCssPercent(
  panel: PanelRectNorm,
  slot: number,
  slots: number = SLOT_COUNT,
): { left: number; top: number; width: number; height: number } {
  const panelH = panel.bottom - panel.top;
  const panelW = panel.right - panel.left;
  const slotH = panelH / slots;
  const slotTop = panel.top + slot * slotH;
  const left = panel.left + panelW * THUMB_CROP.left;
  const top = slotTop + slotH * THUMB_CROP.topInset;
  const width = panelW * (THUMB_CROP.right - THUMB_CROP.left);
  const height = slotH * (1 - THUMB_CROP.topInset - THUMB_CROP.bottomInset);
  return {
    left: left * 100,
    top: top * 100,
    width: width * 100,
    height: height * 100,
  };
}

export function loadFineTune(): RoiFineTune {
  try {
    const raw = localStorage.getItem(ROI_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FINE_TUNE };
    const parsed = JSON.parse(raw) as Partial<RoiFineTune>;
    return {
      dLeft: clamp(Number(parsed.dLeft) || 0, -ROI_FINE_TUNE_MAX, ROI_FINE_TUNE_MAX),
      dTop: clamp(Number(parsed.dTop) || 0, -ROI_FINE_TUNE_MAX, ROI_FINE_TUNE_MAX),
      dRight: clamp(Number(parsed.dRight) || 0, -ROI_FINE_TUNE_MAX, ROI_FINE_TUNE_MAX),
      dBottom: clamp(Number(parsed.dBottom) || 0, -ROI_FINE_TUNE_MAX, ROI_FINE_TUNE_MAX),
    };
  } catch {
    return { ...DEFAULT_FINE_TUNE };
  }
}

export function saveFineTune(tune: RoiFineTune): void {
  localStorage.setItem(ROI_STORAGE_KEY, JSON.stringify(tune));
}

export function loadDebugOverlay(): boolean {
  try {
    return localStorage.getItem(ROI_DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveDebugOverlay(on: boolean): void {
  localStorage.setItem(ROI_DEBUG_STORAGE_KEY, on ? '1' : '0');
}
