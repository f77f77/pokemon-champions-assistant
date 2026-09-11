import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  listVideoDevices,
  openVideoStream,
  stopStream,
  pickPreferredDeviceId,
  loadSavedDeviceId,
  saveDeviceId,
  isPreferredCaptureDevice,
  grabFrame,
  grabImageSource,
  type VideoDevice,
} from '../lib/videoSource';
import {
  resolveEnemyPanel,
  panelCssPercent,
  cardCssPercent,
  thumbCssPercent,
  SLOT_COUNT,
  fixtureTeamPreviewUrl,
  currentFixtureLabel,
  type RoiFineTune,
} from '../lib/recognize';

interface Props {
  busy: boolean;
  /** 單幀 canvas（鏡頭或靜態選隊圖），走同一套 ROI → thumb → recognize */
  onRecognize: (canvas: HTMLCanvasElement) => void;
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
  const stillImgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stillUrlRef = useRef<string | null>(null);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [stillUrl, setStillUrl] = useState<string | null>(null);
  const [stillReady, setStillReady] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const panel = useMemo(() => resolveEnemyPanel(fineTune), [fineTune]);
  const panelPct = useMemo(() => panelCssPercent(panel), [panel]);
  const hasFrame = live || (!!stillUrl && stillReady);

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
      if (stillUrlRef.current) {
        URL.revokeObjectURL(stillUrlRef.current);
        stillUrlRef.current = null;
      }
    };
  }, []);

  function revokeStill() {
    if (stillUrlRef.current) {
      URL.revokeObjectURL(stillUrlRef.current);
      stillUrlRef.current = null;
    }
    setStillUrl(null);
    setStillReady(false);
  }

  function onDeviceChange(id: string) {
    setDeviceId(id);
    saveDeviceId(id);
  }

  function loadStillFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('請選擇圖片檔（image/*）');
      return;
    }
    // 靜態圖覆寫預覽，直到使用者重新開啟鏡頭
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);

    revokeStill();
    const url = URL.createObjectURL(file);
    stillUrlRef.current = url;
    setStillUrl(url);
    setStillReady(false);
    setError(null);
  }

  /** 載入內建 Team Preview 測試圖（最新實機畫面） */
  function loadFixtureStill() {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
    revokeStill();
    // 非 blob URL，revokeStill 不會誤撤銷
    const label = currentFixtureLabel();
    setStillUrl(fixtureTeamPreviewUrl(true));
    setStillReady(false);
    setError(null);
    console.info('[fixtures] loaded', label);
  }

  async function connect() {
    setError(null);
    try {
      revokeStill();
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

  function handleRecognize() {
    if (stillUrl && stillImgRef.current?.naturalWidth) {
      const img = stillImgRef.current;
      onRecognize(grabImageSource(img, img.naturalWidth, img.naturalHeight));
      return;
    }
    if (videoRef.current?.videoWidth) {
      onRecognize(grabFrame(videoRef.current));
    }
  }

  function onPreviewDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }

  function onPreviewDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function onPreviewDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    loadStillFile(e.dataTransfer.files?.[0]);
  }

  const statusLabel = stillUrl && stillReady ? '靜態圖' : live ? '已連接' : '無訊號';
  const statusOn = hasFrame;

  return (
    <section className="panel panel--capture">
      <header className="panel__header panel__header--row">
        <h2>擷取預覽</h2>
        <div className="capture-actions">
          <span className={`status-pill ${statusOn ? 'is-on' : ''}`}>{statusLabel}</span>
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || !hasFrame}
            onClick={handleRecognize}
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            loadStillFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          載入靜態選隊圖
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={loadFixtureStill}
          title="載入 public/fixtures/team-preview-live-latest.jpg（最新實機畫面）"
        >
          載入測試圖
        </button>
      </div>

      <div
        className={`capture-preview capture-preview--16x9${dragOver ? ' is-dragover' : ''}`}
        onDragOver={onPreviewDragOver}
        onDragLeave={onPreviewDragLeave}
        onDrop={onPreviewDrop}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          className="capture-preview__video"
          hidden={!live || !!stillUrl}
        />
        {stillUrl && (
          <img
            ref={stillImgRef}
            src={stillUrl}
            alt="靜態選隊圖預覽"
            className="capture-preview__still"
            onLoad={() => setStillReady(true)}
            onError={() => {
              setStillReady(false);
              setError('靜態圖載入失敗');
              revokeStill();
            }}
          />
        )}
        {!hasFrame && (
          <div className="capture-preview__placeholder">
            <p>無訊號／裝置不可用</p>
            <p className="muted">請選擇 AverMedia GC551 或 OBS Virtual Camera 後按「開啟鏡頭」</p>
            <p className="muted">或按「載入靜態選隊圖」／拖放截圖到此預覽區（無 GC551 亦可驗收）</p>
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
            const c = cardCssPercent(panel, slot);
            const t = thumbCssPercent(panel, slot);
            return (
              <div key={slot}>
                <div
                  className="capture-preview__roi capture-preview__roi--slot"
                  style={{
                    left: `${c.left}%`,
                    top: `${c.top}%`,
                    width: `${c.width}%`,
                    height: `${c.height}%`,
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
        {dragOver && (
          <div className="capture-preview__drop-hint" aria-hidden>
            放開以載入靜態選隊圖
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
      <p className="status-line">{busy ? '辨認中…' : statusText}</p>
    </section>
  );
}
