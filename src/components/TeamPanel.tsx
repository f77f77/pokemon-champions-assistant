import { useState } from 'react';
import type { PokemonSet } from '../types';
import { PokemonCard } from './PokemonCard';
import { DEMO_SHOWDOWN_PASTE, parseTeamImport } from '../lib/showdownPaste';
import { getMovesSourceLabel } from '../lib/movesCache';

interface Props {
  team: PokemonSet[];
  onTeamChange: (team: PokemonSet[]) => void;
  onSpeedChange: (index: number, speed: number) => void;
  selectedIndex: number | null;
  onSelectAlly: (index: number) => void;
}

export function TeamPanel({ team, onTeamChange, onSpeedChange, selectedIndex, onSelectAlly }: Props) {
  const [paste, setPaste] = useState(DEMO_SHOWDOWN_PASTE);
  const [open, setOpen] = useState(false);

  function applyImport() {
    onTeamChange(parseTeamImport(paste));
    setOpen(false);
  }

  return (
    <section className="panel panel--team">
      <header className="panel__header">
        <h2>我方隊伍</h2>
        <button type="button" className="btn btn--ghost" onClick={() => setOpen((v) => !v)}>
          {open ? '關閉匯入' : 'Showdown / JSON'}
        </button>
      </header>
      {open && (
        <div className="import-box">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={8}
            placeholder="貼上 Showdown paste 或 JSON…"
            aria-label="隊伍匯入"
          />
          <div className="import-box__actions">
            <button type="button" className="btn btn--primary" onClick={applyImport}>
              匯入隊伍
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setPaste(DEMO_SHOWDOWN_PASTE)}>
              載入示範
            </button>
          </div>
        </div>
      )}
      <p className="panel__hint panel__hint--inline">點選卡片以對照速度軸</p>
      <div className="panel__cards">
        {team.map((p, i) => (
          <PokemonCard
            key={p.id}
            pokemon={p}
            variant="my"
            selected={selectedIndex === i}
            onSelect={() => onSelectAlly(i)}
            onSpeedChange={(spe) => onSpeedChange(i, spe)}
            movesSourceLabel={p.speciesKey ? getMovesSourceLabel(p.speciesKey) : null}
          />
        ))}
      </div>
    </section>
  );
}
