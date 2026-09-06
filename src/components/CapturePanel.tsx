import { useEffect, useRef, useState } from 'react';
import { listVideoDevices, openVideoStream, stopStream, type VideoDevice } from '../lib/videoSource';
import { ROI } from '../lib/recognize';

interface Props {
  connected: boolean;
  busy: boolean;
  onRecognize: (video: HTMLVideoElement) => void;
  onGenerate: () => void;
  statusText: string;
}

export function CapturePanel({ connected, busy, onRecognize, onGenerate, statusText }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    listVideoDevices().then(setDevices).catch(() => setDevices([]));
    return () => stopStream(streamRef.current);
  }, []);

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
      setLive(true);
    } catch (e) {
      setLive(false);
      setError(e instanceof Error ? e.message : '無法開啟攝影機（可選 OBS Virtual Camera）');
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
          <span className={`status-pill ${live || connected ? 'is-on' : ''}`}>
            {live ? '已連接' : '未連接'}
          </span>
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy || !live}
            onClick={() => videoRef.current && onRecognize(videoRef.current)}
          >
            辨認敵方隊伍
          </button>
          <button type="button" className="btn btn--accent" disabled={busy} onClick={onGenerate}>
            生成對方隊伍
          </button>
        </div>
      </header>

      <div className="capture-toolbar">
        <select
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          aria-label="選擇攝影機"
        >
          <option value="">預設攝影機 / OBS</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
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

      <div className="capture-preview">
        <video ref={videoRef} muted playsInline className="capture-preview__video" />
        {!live && (
          <div className="capture-preview__placeholder">
            <p>OBS 虛擬鏡頭 / getUserMedia</p>
            <p className="muted">ROI 右側六縮圖：x={ROI.x} y={ROI.y} w={ROI.width} h={ROI.height}</p>
          </div>
        )}
        <div
          className="capture-preview__roi"
          style={{
            left: `${ROI.x * 100}%`,
            top: `${ROI.y * 100}%`,
            width: `${ROI.width * 100}%`,
            height: `${ROI.height * 100}%`,
          }}
          title="敵方縮圖 ROI"
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      <p className="status-line">{statusText}</p>
    </section>
  );
}
