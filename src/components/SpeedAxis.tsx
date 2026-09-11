import { useMemo, useState } from 'react';
import type { PokemonSet } from '../types';
import {
  SPEED_AXIS_MAX,
  SPEED_AXIS_MAX_TAILWIND,
  SPEED_AXIS_MIN,
  applyTailwind,
  enemySpeedBands,
  mySpeedPoint,
} from '../lib/speedCalc';

interface Props {
  myTeam: PokemonSet[];
  enemyTeam: PokemonSet[];
  /** 我方選中欄位 index；null = 未選 */
  selectedAllyIndex: number | null;
}

const BASE_TICKS = [50, 80, 100, 106, 113, 130, 150, 169, 172, 200];
const TAILWIND_TICKS = [...BASE_TICKS, 250, 300, 344, 400];

function pct(value: number, axisMax: number): number {
  const clamped = Math.min(axisMax, Math.max(SPEED_AXIS_MIN, value));
  return ((clamped - SPEED_AXIS_MIN) / (axisMax - SPEED_AXIS_MIN)) * 100;
}

function EnemySpeedRow({
  pokemon,
  tailwind,
  axisMax,
}: {
  pokemon: PokemonSet;
  tailwind: boolean;
  axisMax: number;
}) {
  if (!pokemon.identified || !pokemon.baseStats.spe) {
    return (
      <div className="speed-row speed-row--empty">
        <span className="speed-row__label">{pokemon.species}</span>
        <div className="speed-row__track" />
      </div>
    );
  }
  const bands = enemySpeedBands(pokemon.baseStats.spe).map((b) => ({
    ...b,
    value: applyTailwind(b.value, tailwind),
  }));
  const slow = bands[0].value;
  const fast = bands[3].value;
  const n0 = bands[1].value;
  const n32 = bands[2].value;
  return (
    <div className="speed-row">
      <span className="speed-row__label" title={pokemon.species}>
        {pokemon.species}
      </span>
      <div className="speed-row__track">
        <div
          className="speed-band speed-band--slow"
          style={{ left: `${pct(slow, axisMax)}%`, width: `${Math.max(1, pct(n0, axisMax) - pct(slow, axisMax))}%` }}
          title={`減速0–中性0：${slow}–${n0}${tailwind ? '（順風 ×2）' : ''}`}
        />
        <div
          className="speed-band speed-band--mid"
          style={{ left: `${pct(n0, axisMax)}%`, width: `${Math.max(1, pct(n32, axisMax) - pct(n0, axisMax))}%` }}
          title={`中性0–中性32：${n0}–${n32}${tailwind ? '（順風 ×2）' : ''}`}
        />
        <div
          className="speed-band speed-band--fast"
          style={{ left: `${pct(n32, axisMax)}%`, width: `${Math.max(1, pct(fast, axisMax) - pct(n32, axisMax))}%` }}
          title={`中性32–加速0：${n32}–${fast}${tailwind ? '（順風 ×2）' : ''}`}
        />
        {bands.map((b) => (
          <span
            key={b.id}
            className={`speed-mark speed-mark--${b.kind}`}
            style={{ left: `${pct(b.value, axisMax)}%` }}
            title={`${b.label}: ${b.value}${tailwind ? '（順風 ×2）' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

function AllySpeedRow({
  pokemon,
  tailwind,
  axisMax,
}: {
  pokemon: PokemonSet;
  tailwind: boolean;
  axisMax: number;
}) {
  const raw = mySpeedPoint(pokemon.baseStats.spe, pokemon.speed || undefined);
  const spe = applyTailwind(raw, tailwind);
  const entered = pokemon.speed != null && pokemon.speed > 0;
  return (
    <div className="speed-row speed-row--mine speed-row--selected-ally">
      <span className="speed-row__label" title={pokemon.species}>
        {pokemon.species}
      </span>
      <div className="speed-row__track">
        {entered && spe > 0 && (
          <span
            className="speed-point"
            style={{ left: `${pct(spe, axisMax)}%` }}
            title={`${pokemon.species} Spe ${spe}${tailwind ? '（順風 ×2）' : ''}`}
          >
            ◆
          </span>
        )}
        {/* Spe overlay inside track so track width matches enemy rows */}
        <span className="speed-row__value speed-row__value--overlay" aria-label="Spe">
          {entered ? spe : '—'}
        </span>
      </div>
    </div>
  );
}

export function SpeedAxis({ myTeam, enemyTeam, selectedAllyIndex }: Props) {
  const [allyTailwind, setAllyTailwind] = useState(false);
  const [enemyTailwind, setEnemyTailwind] = useState(false);
  const axisMax = allyTailwind || enemyTailwind ? SPEED_AXIS_MAX_TAILWIND : SPEED_AXIS_MAX;
  const ticks = useMemo(
    () => (axisMax > SPEED_AXIS_MAX ? TAILWIND_TICKS : BASE_TICKS),
    [axisMax],
  );
  const enemies = enemyTeam.slice(0, 6);
  const enemyTop = enemies.slice(0, 3);
  const enemyBottom = enemies.slice(3, 6);
  const selectedAlly =
    selectedAllyIndex != null && selectedAllyIndex >= 0 && selectedAllyIndex < myTeam.length
      ? myTeam[selectedAllyIndex]
      : null;

  return (
    <section className="panel panel--speed">
      <header className="panel__header panel__header--row panel__header--speed">
        <h2>速度軸</h2>
        <span className="panel__hint">
          敵方雙色帶：減速0／中性0／中性32／加速0 · 我方單點（點選隊員 · 手填 Spe）
          {allyTailwind || enemyTailwind ? ' · 順風 Spe ×2' : ''}
        </span>
        <div className="speed-axis__toggles">
          <label className={`speed-axis__tw ${allyTailwind ? 'is-on' : ''}`}>
            <input
              type="checkbox"
              checked={allyTailwind}
              onChange={(e) => setAllyTailwind(e.target.checked)}
            />
            我方順風
          </label>
          <label className={`speed-axis__tw ${enemyTailwind ? 'is-on' : ''}`}>
            <input
              type="checkbox"
              checked={enemyTailwind}
              onChange={(e) => setEnemyTailwind(e.target.checked)}
            />
            敵方順風
          </label>
        </div>
      </header>
      <div className="speed-axis">
        <div className="speed-axis__scale speed-row" aria-hidden="true">
          <span className="speed-row__label" />
          <div className="speed-row__track speed-axis__scale-track">
            {ticks.map((t) => (
              <span key={t} style={{ left: `${pct(t, axisMax)}%` }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {selectedAlly ? (
          <>
            {enemyTop.map((p) => (
              <EnemySpeedRow key={p.id} pokemon={p} tailwind={enemyTailwind} axisMax={axisMax} />
            ))}
            <AllySpeedRow pokemon={selectedAlly} tailwind={allyTailwind} axisMax={axisMax} />
            {enemyBottom.map((p) => (
              <EnemySpeedRow key={p.id} pokemon={p} tailwind={enemyTailwind} axisMax={axisMax} />
            ))}
          </>
        ) : (
          <>
            {enemies.map((p) => (
              <EnemySpeedRow key={p.id} pokemon={p} tailwind={enemyTailwind} axisMax={axisMax} />
            ))}
            <div className="speed-ally-prompt" role="status">
              點選我方隊員
            </div>
          </>
        )}
      </div>
    </section>
  );
}
