import { useEffect, useMemo, useRef, useState } from 'react';
import {
  listVideoDevices,
  openVideoStream,
  stopStream,
  pickPreferredDeviceId,
  loadSavedDeviceId,
  saveDeviceId,
  isPreferredCaptureDevice,
  type VideoDevice,
} from '../lib/videoSource';
import {
  resolveEnemyPanel,
  panelCssPercent,
  slotCssPercent,
  thumbCssPercent,
  SLOT_COUNT,
  type RoiFineTune,
} from '../lib/recognize';

interface Props {
  busy: boolean;
  onRecognize: (video: HTMLVideoElement) => void;
  onGenerate: () => void;
  statusText: string;
  fineTune: RoiFineTune;
  debugOverlay: boolean;
}

export function CapturePanel({
  busy,
  onRecognize,
  onGenerate,
  statusText,
  fineTune,
  debugOverlay,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const panel = useMemo(() => resolveEnemyPanel(fineTune), [fineTune]);
  const panelPct = useMemo(() => panelCssPercent(panel), [panel]);

  useEffect(() => {
    let cancelled = false;
    listVideoDevices()
      .then((list) => {
        if (cancelled) return;
        setDevices(list);
        const preferred = pickPreferredDeviceId(list, loadSavedDeviceId());
        setDeviceId(preferred);
      })
      .catch(() => {
        if (!cancelled) setDevices([]);
      });
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
    };
  }, []);

  function onDeviceChange(id: string) {
    setDeviceId(id);
    saveDeviceId(id);
  }

  async function connect() {
    setError(null);
    try {
      stopStream(streamRef.current);
      const stream = await openVideoStream(deviceId || undefined);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (deviceId) saveDeviceId(deviceId);
      setLive(true);
    } catch (e) {
      setLive(false);
      setError(
        e instanceof Error
          ? e.message
          : '無訊號／裝置不可用（請選 GC551 或 OBS Virtual Camera）',
      );
    }
  }

  function disconnect() {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  }

  return (
    <section className="panel panel--capture">
      <header className="panel__header panel__header--row">
        <h2>擷取預覽</h2>
        <div className="capture-actions">
          <span className={`status-pill ${live ? 'is-on' : ''}`}>
            {live ? '已連接' : '無訊號'}
          </span>
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || !live}
            onClick={() => videoRef.current && onRecognize(videoRef.current)}
          >
            {busy ? '辨認中…' : '辨認敵方隊伍'}
          </button>
          <button type="button" className="btn btn--accent" disabled={busy} onClick={onGenerate}>
            生成對方隊伍
          </button>
        </div>
      </header>

      <div className="capture-toolbar">
        <select
          value={deviceId}
          onChange={(e) => onDeviceChange(e.target.value)}
          aria-label="選擇攝影機（優先 GC551／AVerMedia）"
        >
          <option value="">自動（GC551 → OBS → 預設）</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {isPreferredCaptureDevice(d.label) ? `★ ${d.label}` : d.label}
            </option>
          ))}
        </select>
        {!live ? (
          <button type="button" className="btn btn--ghost" onClick={connect}>
            開啟鏡頭
          </button>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={disconnect}>
            關閉鏡頭
          </button>
        )}
      </div>

      <div className="capture-preview capture-preview--16x9">
        <video ref={videoRef} muted playsInline className="capture-preview__video" />
        {!live && (
          <div className="capture-preview__placeholder">
            <p>無訊號／裝置不可用</p>
            <p className="muted">請選擇 AverMedia GC551 或 OBS Virtual Camera 後按「開啟鏡頭」</p>
            <p className="muted">
              ROI 敵方面板 ({panel.left.toFixed(3)},{panel.top.toFixed(3)})–
              ({panel.right.toFixed(3)},{panel.bottom.toFixed(3)}) · 相對 16:9 內容區
            </p>
          </div>
        )}
        {/* 綠色：敵方面板／六槽；黃色：縮圖裁切（debug） */}
        <div
          className="capture-preview__roi capture-preview__roi--panel"
          style={{
            left: `${panelPct.left}%`,
            top: `${panelPct.top}%`,
            width: `${panelPct.width}%`,
            height: `${panelPct.height}%`,
          }}
          title="敵方面板 ROI"
        />
        {debugOverlay &&
          Array.from({ length: SLOT_COUNT }, (_, slot) => {
            const s = slotCssPercent(panel, slot);
            const t = thumbCssPercent(panel, slot);
            return (
              <div key={slot}>
                <div
                  className="capture-preview__roi capture-preview__roi--slot"
                  style={{
                    left: `${s.left}%`,
                    top: `${s.top}%`,
                    width: `${s.width}%`,
                    height: `${s.height}%`,
                  }}
                />
                <div
                  className="capture-preview__roi capture-preview__roi--thumb"
                  style={{
                    left: `${t.left}%`,
                    top: `${t.top}%`,
                    width: `${t.width}%`,
                    height: `${t.height}%`,
                  }}
                  title={`槽 ${slot + 1} 縮圖`}
                />
              </div>
            );
          })}
      </div>
      {error && <p className="error-text">{error}</p>}
      <p className="status-line">{busy ? '辨認中…' : statusText}</p>
    </section>
  );
}
