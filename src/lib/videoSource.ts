/**
 * getUserMedia 視訊來源：AverMedia GC551 擷取卡優先，其次 OBS Virtual Camera。
 * 裝置選擇會記住 deviceId（localStorage）。
 */

export interface VideoDevice {
  deviceId: string;
  label: string;
}

export const DEVICE_STORAGE_KEY = 'pkmn-champions-video-device';

const PREFERRED_LABEL_RE = /gc551|avermedia|aver.?media/i;
const OBS_LABEL_RE = /obs/i;

export function isPreferredCaptureDevice(label: string): boolean {
  return PREFERRED_LABEL_RE.test(label);
}

export function isObsVirtualCam(label: string): boolean {
  return OBS_LABEL_RE.test(label);
}

/** 排序：GC551/AVerMedia → OBS → 其餘 */
export function rankVideoDevices(devices: VideoDevice[]): VideoDevice[] {
  return [...devices].sort((a, b) => {
    const score = (d: VideoDevice) => {
      if (isPreferredCaptureDevice(d.label)) return 0;
      if (isObsVirtualCam(d.label)) return 1;
      return 2;
    };
    return score(a) - score(b);
  });
}

export function pickPreferredDeviceId(
  devices: VideoDevice[],
  savedId?: string | null,
): string {
  if (savedId && devices.some((d) => d.deviceId === savedId)) return savedId;
  const ranked = rankVideoDevices(devices);
  return ranked[0]?.deviceId ?? '';
}

export function loadSavedDeviceId(): string | null {
  try {
    return localStorage.getItem(DEVICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveDeviceId(deviceId: string): void {
  try {
    if (deviceId) localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    else localStorage.removeItem(DEVICE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export async function listVideoDevices(): Promise<VideoDevice[]> {
  try {
    // 部分瀏覽器需先取得權限才會顯示 label
    await navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        s.getTracks().forEach((t) => t.stop());
      })
      .catch(() => undefined);

    const devices = await navigator.mediaDevices.enumerateDevices();
    const list = devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `攝影機 ${i + 1}`,
      }));
    return rankVideoDevices(list);
  } catch {
    return [];
  }
}

export async function openVideoStream(deviceId?: string): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { width: { ideal: 1280 }, height: { ideal: 720 } },
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/** 從 video 元素抓一幀到 canvas（單次，非連續） */
export function grabFrame(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const c = canvas ?? document.createElement('canvas');
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('無法取得 canvas context');
  ctx.drawImage(video, 0, 0, w, h);
  return c;
}

/** 從靜態圖／ImageBitmap 抓到 canvas（驗收用：team-preview.png） */
export function grabImageSource(
  source: CanvasImageSource,
  width: number,
  height: number,
  canvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const c = canvas ?? document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('無法取得 canvas context');
  ctx.drawImage(source, 0, 0, width, height);
  return c;
}
