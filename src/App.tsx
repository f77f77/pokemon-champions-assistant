import { useCallback, useMemo, useState } from 'react';
import { TeamPanel } from './components/TeamPanel';
import { EnemyPanel } from './components/EnemyPanel';
import { CapturePanel } from './components/CapturePanel';
import { SpeedAxis } from './components/SpeedAxis';
import { emptySlot, type PokemonSet } from './types';
import { SAMPLE_MY_TEAM_KEYS, findSpecies, speciesToSet } from './lib/species';
import { calcStat } from './lib/speedCalc';
import { recognizeEnemyTeam, CONFIDENCE_THRESHOLD } from './lib/recognize';
import { fetchTopMoves, top4ForCard } from './lib/movesCache';

function buildDemoMyTeam(): PokemonSet[] {
  return SAMPLE_MY_TEAM_KEYS.map((key, i) => {
    const sp = findSpecies(key)!;
    return speciesToSet(sp, `my-${i}`, {
      speed: calcStat(sp.baseStats.spe, 31, 0, 50, 1),
      item: ['勿花果', '突擊背心', '氣勢披帶', '講究眼鏡', '生命寶珠', '岩石盔甲'][i],
      ability: ['威嚇', '青草製造者', '無形拳', '古代活性', '威嚇', '再生力'][i],
    });
  });
}

function buildEmptyEnemy(): PokemonSet[] {
  return Array.from({ length: 6 }, (_, i) => emptySlot(i, 'enemy'));
}

export default function App() {
  const [myTeam, setMyTeam] = useState<PokemonSet[]>(() => buildDemoMyTeam());
  const [enemyTeam, setEnemyTeam] = useState<PokemonSet[]>(() => buildEmptyEnemy());
  const [status, setStatus] = useState('就緒 — 請連接 OBS 虛擬鏡頭或匯入我方隊伍');
  const [busy, setBusy] = useState(false);

  const connected = useMemo(() => true, []);

  const onSpeedChange = useCallback((index: number, speed: number) => {
    setMyTeam((prev) => prev.map((p, i) => (i === index ? { ...p, speed } : p)));
  }, []);

  const onSpeciesOverride = useCallback(async (index: number, speciesKey: string) => {
    if (!speciesKey) {
      setEnemyTeam((prev) => prev.map((p, i) => (i === index ? emptySlot(index, 'enemy') : p)));
      setStatus(`欄位 ${index + 1} 已重設為未識別`);
      return;
    }
    const sp = findSpecies(speciesKey);
    if (!sp) return;
    const moves = top4ForCard(await fetchTopMoves(sp.key));
    setEnemyTeam((prev) =>
      prev.map((p, i) =>
        i === index
          ? speciesToSet(sp, `enemy-${index}`, {
              speed: calcStat(sp.baseStats.spe, 31, 0, 50, 1),
              moves,
              confidence: 1,
            })
          : p,
      ),
    );
    setStatus(`已手動覆寫：${sp.nameZh}`);
  }, []);

  const onRecognize = useCallback(async (video: HTMLVideoElement) => {
    setBusy(true);
    setStatus('正在擷取影格並比對右側 ROI…');
    try {
      const results = await recognizeEnemyTeam(video);
      setEnemyTeam((prev) =>
        prev.map((p, i) => {
          const r = results[i];
          if (!r || r.confidence < CONFIDENCE_THRESHOLD || !r.species) {
            return {
              ...emptySlot(i, 'enemy'),
              confidence: r?.confidence ?? 0,
            };
          }
          const sp = findSpecies(r.species);
          if (!sp) return { ...emptySlot(i, 'enemy'), confidence: r.confidence };
          return speciesToSet(sp, `enemy-${i}`, { confidence: r.confidence });
        }),
      );
      setStatus('辨認完成（stub 低信心 → 未識別）。可手動覆寫種族。');
    } catch {
      setStatus('辨認失敗（已安全忽略）');
    } finally {
      setBusy(false);
    }
  }, []);

  const onGenerate = useCallback(async () => {
    setBusy(true);
    setStatus('正在生成對方隊伍（示範資料 + moves cache）…');
    try {
      const keys = ['roaring-moon', 'chien-pao', 'miraidon', 'ting-lu', 'ogerpon-wellspring', 'pelipper'];
      const next: PokemonSet[] = [];
      for (let i = 0; i < 6; i++) {
        const sp = findSpecies(keys[i])!;
        const moves = top4ForCard(await fetchTopMoves(sp.key));
        next.push(
          speciesToSet(sp, `enemy-${i}`, {
            speed: calcStat(sp.baseStats.spe, 31, 0, 50, 1),
            moves,
            item: '未定',
            ability: '未定',
          }),
        );
      }
      setEnemyTeam(next);
      setStatus('對方隊伍已生成（championsbattledata Doubles top-6 stub）');
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <strong>Pokémon Champions 對戰助手</strong>
          <span className="muted">v0.1 scaffold · Doubles</span>
        </div>
        <nav className="app-header__nav">
          <span>我方隊伍</span>
          <details className="settings">
            <summary>設置</summary>
            <div className="settings__body">
              <p>ROI／鏡頭於擷取區調整</p>
              <p>Spe 於我方卡片手填</p>
              <p>招式來源：championsbattledata Doubles stub</p>
            </div>
          </details>
        </nav>
      </header>

      <main className="layout">
        <TeamPanel team={myTeam} onTeamChange={setMyTeam} onSpeedChange={onSpeedChange} />
        <div className="layout__center">
          <CapturePanel
            connected={connected}
            busy={busy}
            onRecognize={onRecognize}
            onGenerate={onGenerate}
            statusText={status}
          />
          <SpeedAxis myTeam={myTeam} enemyTeam={enemyTeam} />
        </div>
        <EnemyPanel team={enemyTeam} onSpeciesOverride={onSpeciesOverride} />
      </main>

      <footer className="app-footer">{status}</footer>
    </div>
  );
}
