/**
 * getUserMedia / OBS 虛擬鏡頭來源。
 * OBS 設定：工具 → 虛擬攝影機 → 啟動；在系統攝影機列表選「OBS Virtual Camera」。
 */

export interface VideoDevice {
  deviceId: string;
  label: string;
}

export async function listVideoDevices(): Promise<VideoDevice[]> {
  try {
    // 部分瀏覽器需先取得權限才會顯示 label
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((s) => {
      s.getTracks().forEach((t) => t.stop());
    }).catch(() => undefined);

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `攝影機 ${i + 1}`,
      }));
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

/** 從 video 元素抓一幀到 canvas */
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
