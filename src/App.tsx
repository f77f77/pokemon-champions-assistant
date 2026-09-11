import { useCallback, useEffect, useMemo, useState } from 'react';
import { TeamPanel } from './components/TeamPanel';
import { EnemyPanel } from './components/EnemyPanel';
import { CapturePanel } from './components/CapturePanel';
import { SpeedAxis } from './components/SpeedAxis';
import { emptySlot, type PokemonSet } from './types';
import { SAMPLE_MY_TEAM_KEYS, SPECIES_DB, findSpecies, speciesToSet } from './lib/species';
import { calcStat } from './lib/speedCalc';
import {
  recognizeEnemyTeamFromCanvas,
  CONFIDENCE_THRESHOLD,
  loadFineTune,
  saveFineTune,
  loadDebugOverlay,
  saveDebugOverlay,
  ROI_FINE_TUNE_MAX,
  ENEMY_PANEL_DEFAULT,
  type RoiFineTune,
} from './lib/recognize';
import { fetchTopMoves, fetchTopItems, top4ForCard, top6ForCard, MOVES_SOURCE_LABEL } from './lib/movesCache';

async function buildDemoMyTeam(): Promise<PokemonSet[]> {
  const out: PokemonSet[] = [];
  for (let i = 0; i < SAMPLE_MY_TEAM_KEYS.length; i++) {
    const key = SAMPLE_MY_TEAM_KEYS[i];
    const sp = findSpecies(key)!;
    const moves = top4ForCard(await fetchTopMoves(sp.key));
    const items = await fetchTopItems(sp.key, 2);
    out.push(
      speciesToSet(sp, `my-${i}`, {
        speed: calcStat(sp.baseStats.spe, 31, 0, 50, 1),
        item: items[0]?.name || ['勿花果', '突擊背心', '氣勢披帶', '講究眼鏡', '生命寶珠', '岩石盔甲'][i],
        items,
        ability: ['威嚇', '青草製造者', '無形拳', '古代活性', '威嚇', '再生力'][i],
        moves,
      }),
    );
  }
  return out;
}

function buildEmptyEnemy(): PokemonSet[] {
  return Array.from({ length: 6 }, (_, i) => emptySlot(i, 'enemy'));
}

function clampTune(v: number): number {
  return Math.min(ROI_FINE_TUNE_MAX, Math.max(-ROI_FINE_TUNE_MAX, v));
}

/** Sync form switch so controlled <select> commits on the first change event. */
function applyFormSync(prev: PokemonSet, formKey: string): PokemonSet | null {
  const form = prev.forms?.find((f) => f.formKey === formKey);
  if (!form) return null;
  const patched: PokemonSet = {
    ...prev,
    formKey: form.formKey,
    formLabel: form.label,
    types: [...form.types],
    baseStats: { ...form.baseStats },
    speed: calcStat(form.baseStats.spe, 31, 0, 50, 1),
  };
  const sp = findSpecies(form.showdownId) || findSpecies(formKey);
  // Different allowlist record (gender / regional sibling) → swap species identity.
  // Same showdownId (Base → Mega on Garchomp) → keep this record and only patch form fields.
  if (sp && sp.key !== prev.speciesKey) {
    return speciesToSet(sp, prev.id, {
      thumbnailDataUrl: prev.thumbnailDataUrl,
      confidence: prev.confidence ?? 1,
      identified: true,
      item: prev.item,
      items: prev.items,
      ability: undefined,
      moves: prev.moves,
      speed: calcStat(form.baseStats.spe, 31, 0, 50, 1),
      formKey: form.formKey,
      formLabel: form.label,
      types: [...form.types],
      baseStats: { ...form.baseStats },
    });
  }
  return patched;
}

/** Resolve CBD showdown id for a formKey without reading React state. */
function resolveFormMoveIds(formKey: string): { primaryId: string; fallbackId?: string; label: string } | null {
  for (const s of SPECIES_DB) {
    const form = s.forms?.find((f) => f.formKey === formKey);
    if (form) {
      return {
        primaryId: form.showdownId || s.key,
        fallbackId: s.key,
        label: form.label,
      };
    }
  }
  const sp = findSpecies(formKey);
  if (sp) return { primaryId: sp.key, fallbackId: sp.key, label: sp.formLabel || sp.nameZh };
  return null;
}

async function fetchMovesForForm(formKey: string, moveCount: 4 | 6) {
  const ids = resolveFormMoveIds(formKey);
  if (!ids) {
    return {
      moves: moveCount === 4 ? top4ForCard([]) : top6ForCard([]),
      items: [] as Awaited<ReturnType<typeof fetchTopItems>>,
    };
  }
  let movesRaw = await fetchTopMoves(ids.primaryId);
  let items = await fetchTopItems(ids.primaryId, 2);
  if (!movesRaw.length && ids.fallbackId && ids.fallbackId !== ids.primaryId) {
    movesRaw = await fetchTopMoves(ids.fallbackId);
  }
  if (!items.length && ids.fallbackId && ids.fallbackId !== ids.primaryId) {
    items = await fetchTopItems(ids.fallbackId, 2);
  }
  return {
    moves: moveCount === 4 ? top4ForCard(movesRaw) : top6ForCard(movesRaw),
    items,
  };
}

export default function App() {
  const [myTeam, setMyTeam] = useState<PokemonSet[]>(() =>
    SAMPLE_MY_TEAM_KEYS.map((key, i) => {
      const sp = findSpecies(key)!;
      return speciesToSet(sp, `my-${i}`, {
        speed: calcStat(sp.baseStats.spe, 31, 0, 50, 1),
        item: ['勿花果', '突擊背心', '氣勢披帶', '講究眼鏡', '生命寶珠', '岩石盔甲'][i],
        ability: ['威嚇', '青草製造者', '無形拳', '古代活性', '威嚇', '再生力'][i],
      });
    }),
  );
  const [enemyTeam, setEnemyTeam] = useState<PokemonSet[]>(() => buildEmptyEnemy());
  const [status, setStatus] = useState('就緒 — 請連接 GC551／OBS、載入靜態選隊圖，或匯入我方隊伍');
  const [busy, setBusy] = useState(false);
  const [fineTune, setFineTune] = useState<RoiFineTune>(() => loadFineTune());
  const [debugOverlay, setDebugOverlay] = useState(() => loadDebugOverlay());
  /** 速度軸對照用：目前選中的我方隊員 index */
  const [selectedAllyIndex, setSelectedAllyIndex] = useState<number | null>(null);

  // Prefer CBD Doubles top-4 for ally demo when baked usage exists; else 未載入 (no fake stubs).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await buildDemoMyTeam();
      if (!cancelled) setMyTeam(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const panelPreview = useMemo(() => {
    const l = ENEMY_PANEL_DEFAULT.left + fineTune.dLeft;
    const t = ENEMY_PANEL_DEFAULT.top + fineTune.dTop;
    const r = ENEMY_PANEL_DEFAULT.right + fineTune.dRight;
    const b = ENEMY_PANEL_DEFAULT.bottom + fineTune.dBottom;
    return `(${l.toFixed(3)},${t.toFixed(3)})–(${r.toFixed(3)},${b.toFixed(3)})`;
  }, [fineTune]);

  const onSpeedChange = useCallback((index: number, speed: number) => {
    setMyTeam((prev) => prev.map((p, i) => (i === index ? { ...p, speed } : p)));
  }, []);

  const onSelectAlly = useCallback((index: number) => {
    setSelectedAllyIndex((prev) => (prev === index ? null : index));
  }, []);

  const onMyTeamChange = useCallback((team: PokemonSet[]) => {
    setMyTeam(team);
    setSelectedAllyIndex((prev) =>
      prev != null && prev >= 0 && prev < team.length ? prev : null,
    );
  }, []);

  const onAllyFormChange = useCallback((index: number, formKey: string) => {
    setMyTeam((prev) => {
      const cur = prev[index];
      if (!cur) return prev;
      const next = applyFormSync(cur, formKey);
      if (!next) return prev;
      return prev.map((p, i) => (i === index ? next : p));
    });
    const meta = resolveFormMoveIds(formKey);
    const label = meta?.label || formKey;
    setStatus(`已切換形態：${label}（種族值／屬性已更新）`);
    void (async () => {
      const { moves, items } = await fetchMovesForForm(formKey, 4);
      setMyTeam((prev) =>
        prev.map((p, i) => (i === index && p.formKey === formKey ? { ...p, moves, items, item: items[0]?.name ?? p.item } : p)),
      );
      setStatus(`已切換形態：${label}（種族值／屬性／招式已更新）`);
    })();
  }, []);

  const onEnemyFormChange = useCallback((index: number, formKey: string) => {
    setEnemyTeam((prev) => {
      const cur = prev[index];
      if (!cur) return prev;
      const next = applyFormSync(cur, formKey);
      if (!next) return prev;
      return prev.map((p, i) => (i === index ? next : p));
    });
    const meta = resolveFormMoveIds(formKey);
    setStatus(`敵方形態：${meta?.label || formKey}`);
    void (async () => {
      const { moves, items } = await fetchMovesForForm(formKey, 6);
      setEnemyTeam((prev) =>
        prev.map((p, i) => (i === index && p.formKey === formKey ? { ...p, moves, items } : p)),
      );
    })();
  }, []);

  const onAllySpeciesChange = useCallback((index: number, speciesKey: string) => {
    if (!speciesKey) return;
    const sp = findSpecies(speciesKey);
    if (!sp) return;
    setMyTeam((prev) =>
      prev.map((p, i) =>
        i === index
          ? speciesToSet(sp, p.id, {
              speed: calcStat(sp.baseStats.spe, 31, 0, 50, 1),
              moves: top4ForCard([]),
              item: p.item,
              ability: p.ability,
              thumbnailDataUrl: p.thumbnailDataUrl,
            })
          : p,
      ),
    );
    setStatus(`已選擇種族：${sp.nameZh}`);
    void (async () => {
      const moves = top4ForCard(await fetchTopMoves(sp.key));
      const items = await fetchTopItems(sp.key, 2);
      setMyTeam((prev) =>
        prev.map((p, i) => (i === index && p.speciesKey === sp.key ? { ...p, moves, items, item: items[0]?.name ?? p.item } : p)),
      );
    })();
  }, []);

  const onSpeciesOverride = useCallback((index: number, speciesKey: string) => {
    if (!speciesKey) {
      setEnemyTeam((prev) =>
        prev.map((p, i) => (i === index ? { ...emptySlot(index, 'enemy'), thumbnailDataUrl: p.thumbnailDataUrl } : p)),
      );
      setStatus(`欄位 ${index + 1} 已重設為未識別`);
      return;
    }
    const sp = findSpecies(speciesKey);
    if (!sp) return;
    // Apply species + stats + types immediately so override works even when
    // template match failed / moves fetch is slow (controlled select must update on first change).
    setEnemyTeam((prev) =>
      prev.map((p, i) =>
        i === index
          ? speciesToSet(sp, `enemy-${index}`, {
              speed: calcStat(sp.baseStats.spe, 31, 0, 50, 1),
              moves: top6ForCard([]),
              confidence: 1,
              item: undefined,
              items: [],
              ability: undefined,
              thumbnailDataUrl: p.thumbnailDataUrl,
            })
          : p,
      ),
    );
    setStatus(`已手動覆寫：${sp.nameZh}（弱點／速度軸已更新）`);
    void (async () => {
      const moves = top6ForCard(await fetchTopMoves(sp.key));
      const items = await fetchTopItems(sp.key, 2);
      setEnemyTeam((prev) =>
        prev.map((p, i) => (i === index && p.speciesKey === sp.key ? { ...p, moves, items } : p)),
      );
    })();
  }, []);

  const updateTune = useCallback((patch: Partial<RoiFineTune>) => {
    setFineTune((prev) => {
      const next: RoiFineTune = {
        dLeft: clampTune(patch.dLeft ?? prev.dLeft),
        dTop: clampTune(patch.dTop ?? prev.dTop),
        dRight: clampTune(patch.dRight ?? prev.dRight),
        dBottom: clampTune(patch.dBottom ?? prev.dBottom),
      };
      saveFineTune(next);
      return next;
    });
  }, []);

  const resetTune = useCallback(() => {
    const next = { dLeft: 0, dTop: 0, dRight: 0, dBottom: 0 };
    saveFineTune(next);
    setFineTune(next);
  }, []);

  const toggleDebug = useCallback(() => {
    setDebugOverlay((prev) => {
      const next = !prev;
      saveDebugOverlay(next);
      return next;
    });
  }, []);

  const onRecognize = useCallback(
    async (canvas: HTMLCanvasElement) => {
      setBusy(true);
      setStatus('辨認中… 擷取單幀並裁切右側 6 縮圖');
      try {
        const results = await recognizeEnemyTeamFromCanvas(canvas, fineTune);
        const next: PokemonSet[] = [];
        for (let i = 0; i < 6; i++) {
          const r = results[i];
          const speciesKey = r?.speciesId ?? r?.species ?? null;
          const conf = r?.confidence ?? 0;
          if (!r || conf < CONFIDENCE_THRESHOLD || !speciesKey) {
            next.push({
              ...emptySlot(i, 'enemy'),
              confidence: conf,
              thumbnailDataUrl: r?.thumbnailDataUrl,
            });
            continue;
          }
          const sp = findSpecies(speciesKey);
          if (!sp) {
            next.push({
              ...emptySlot(i, 'enemy'),
              confidence: conf,
              thumbnailDataUrl: r.thumbnailDataUrl,
            });
            continue;
          }
          const [movesRaw, items] = await Promise.all([fetchTopMoves(sp.key), fetchTopItems(sp.key, 2)]);
          next.push(
            speciesToSet(sp, `enemy-${i}`, {
              speed: calcStat(sp.baseStats.spe, 31, 0, 50, 1),
              confidence: conf,
              moves: top6ForCard(movesRaw),
              item: undefined,
              items,
              ability: undefined,
              thumbnailDataUrl: r.thumbnailDataUrl,
            }),
          );
        }
        setEnemyTeam(next);
        const hit = results.filter(
          (r) => (r.speciesId || r.species) && r.confidence >= CONFIDENCE_THRESHOLD,
        ).length;
        setStatus(
          hit > 0
            ? `辨認完成：${hit}/6 命中模板（弱點／速度軸／top6 招式已刷新）`
            : '辨認完成（低信心 → 未識別）。可手動覆寫種族；縮圖已裁切。',
        );
      } catch {
        setStatus('辨認失敗（已安全忽略）');
      } finally {
        setBusy(false);
      }
    },
    [fineTune],
  );

  const onGenerate = useCallback(async () => {
    setBusy(true);
    setStatus('正在生成對方隊伍（示範資料 + moves cache）…');
    try {
      // Prefer allowlisted top Doubles species when present in SPECIES_DB
      const keys = ['kingambit', 'garchomp', 'sneasler', 'basculegion', 'whimsicott', 'incineroar'];
      const next: PokemonSet[] = [];
      for (let i = 0; i < 6; i++) {
        const sp = findSpecies(keys[i]) ?? findSpecies('pelipper')!;
        const [movesRaw, items] = await Promise.all([fetchTopMoves(sp.key), fetchTopItems(sp.key, 2)]);
        next.push(
          speciesToSet(sp, `enemy-${i}`, {
            speed: calcStat(sp.baseStats.spe, 31, 0, 50, 1),
            moves: top6ForCard(movesRaw),
            item: undefined,
            items,
            ability: undefined,
          }),
        );
      }
      setEnemyTeam(next);
      setStatus(`對方隊伍已生成（${MOVES_SOURCE_LABEL}；無資料顯示未載入）`);
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <strong>Pokémon Champions 對戰助手</strong>
          <span className="muted">v0.1 · Doubles · GC551</span>
        </div>
        <nav className="app-header__nav">
          <span>我方隊伍</span>
          <details className="settings">
            <summary>設置</summary>
            <div className="settings__body">
              <p className="settings__title">ROI 微調（±2%）</p>
              <p className="muted settings__hint">預設 {panelPreview} · 相對 16:9 內容區</p>
              {(
                [
                  ['dLeft', '左'],
                  ['dTop', '上'],
                  ['dRight', '右'],
                  ['dBottom', '下'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="settings__row">
                  <span>{label}</span>
                  <input
                    type="range"
                    min={-ROI_FINE_TUNE_MAX}
                    max={ROI_FINE_TUNE_MAX}
                    step={0.001}
                    value={fineTune[key]}
                    onChange={(e) => updateTune({ [key]: Number(e.target.value) })}
                  />
                  <span className="settings__val">{(fineTune[key] * 100).toFixed(1)}%</span>
                </label>
              ))}
              <div className="settings__actions">
                <button type="button" className="btn btn--ghost" onClick={resetTune}>
                  重設 ROI
                </button>
                <label className="settings__check">
                  <input type="checkbox" checked={debugOverlay} onChange={toggleDebug} />
                  ROI 除錯疊加（綠面板／黃縮圖）
                </label>
              </div>
              <hr />
              <p>鏡頭：優先 GC551／AVerMedia，其次 OBS</p>
              <p>Spe 於我方卡片手填</p>
              <p>招式來源：{MOVES_SOURCE_LABEL}（無資料→未載入）</p>
              <p>模板：僅 Team Preview 小縮圖</p>
            </div>
          </details>
        </nav>
      </header>

      <main className="layout">
        <TeamPanel
          team={myTeam}
          onTeamChange={onMyTeamChange}
          onSpeedChange={onSpeedChange}
          onFormChange={onAllyFormChange}
          onSpeciesChange={onAllySpeciesChange}
          selectedIndex={selectedAllyIndex}
          onSelectAlly={onSelectAlly}
        />
        <div className="layout__center">
          <CapturePanel
            busy={busy}
            onRecognize={onRecognize}
            onGenerate={onGenerate}
            statusText={status}
            fineTune={fineTune}
            debugOverlay={debugOverlay}
          />
          <SpeedAxis myTeam={myTeam} enemyTeam={enemyTeam} selectedAllyIndex={selectedAllyIndex} />
          <p className="usage-source-global" title={MOVES_SOURCE_LABEL}>
            使用率來源：{MOVES_SOURCE_LABEL}
          </p>
        </div>
        <EnemyPanel
          team={enemyTeam}
          onSpeciesOverride={onSpeciesOverride}
          onFormChange={onEnemyFormChange}
        />
      </main>

      <footer className="app-footer">{busy ? '辨認中…' : status}</footer>
    </div>
  );
}
