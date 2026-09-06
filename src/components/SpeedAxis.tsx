import type { PokemonSet } from '../types';
import {
  SPEED_AXIS_MAX,
  SPEED_AXIS_MIN,
  enemySpeedBands,
  mySpeedPoint,
} from '../lib/speedCalc';

interface Props {
  myTeam: PokemonSet[];
  enemyTeam: PokemonSet[];
  /** 我方選中欄位 index；null = 未選 */
  selectedAllyIndex: number | null;
}

function pct(value: number): number {
  const clamped = Math.min(SPEED_AXIS_MAX, Math.max(SPEED_AXIS_MIN, value));
  return ((clamped - SPEED_AXIS_MIN) / (SPEED_AXIS_MAX - SPEED_AXIS_MIN)) * 100;
}

function EnemySpeedRow({ pokemon }: { pokemon: PokemonSet }) {
  if (!pokemon.identified || !pokemon.baseStats.spe) {
    return (
      <div className="speed-row speed-row--empty">
        <span className="speed-row__label">{pokemon.species}</span>
        <div className="speed-row__track" />
      </div>
    );
  }
  const bands = enemySpeedBands(pokemon.baseStats.spe);
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
          style={{ left: `${pct(slow)}%`, width: `${Math.max(1, pct(n0) - pct(slow))}%` }}
          title={`減速0–中性0：${slow}–${n0}`}
        />
        <div
          className="speed-band speed-band--mid"
          style={{ left: `${pct(n0)}%`, width: `${Math.max(1, pct(n32) - pct(n0))}%` }}
          title={`中性0–中性32：${n0}–${n32}`}
        />
        <div
          className="speed-band speed-band--fast"
          style={{ left: `${pct(n32)}%`, width: `${Math.max(1, pct(fast) - pct(n32))}%` }}
          title={`中性32–加速0：${n32}–${fast}`}
        />
        {bands.map((b) => (
          <span
            key={b.id}
            className={`speed-mark speed-mark--${b.kind}`}
            style={{ left: `${pct(b.value)}%` }}
            title={`${b.label}: ${b.value}`}
          />
        ))}
      </div>
    </div>
  );
}

function AllySpeedRow({ pokemon }: { pokemon: PokemonSet }) {
  const spe = mySpeedPoint(pokemon.baseStats.spe, pokemon.speed || undefined);
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
            style={{ left: `${pct(spe)}%` }}
            title={`${pokemon.species} Spe ${spe}`}
          >
            ◆
          </span>
        )}
      </div>
      <span className="speed-row__value">{entered ? spe : '—'}</span>
    </div>
  );
}

export function SpeedAxis({ myTeam, enemyTeam, selectedAllyIndex }: Props) {
  const ticks = [50, 80, 100, 106, 113, 130, 150, 169, 172, 200];
  const enemies = enemyTeam.slice(0, 6);
  const enemyTop = enemies.slice(0, 3);
  const enemyBottom = enemies.slice(3, 6);
  const selectedAlly =
    selectedAllyIndex != null && selectedAllyIndex >= 0 && selectedAllyIndex < myTeam.length
      ? myTeam[selectedAllyIndex]
      : null;

  return (
    <section className="panel panel--speed">
      <header className="panel__header">
        <h2>速度軸</h2>
        <span className="panel__hint">
          敵方雙色帶：減速0／中性0／中性32／加速0 · 我方單點（點選隊員 · 手填 Spe）
        </span>
      </header>
      <div className="speed-axis">
        <div className="speed-axis__scale">
          {ticks.map((t) => (
            <span key={t} style={{ left: `${pct(t)}%` }}>
              {t}
            </span>
          ))}
        </div>

        {selectedAlly ? (
          <>
            {enemyTop.map((p) => (
              <EnemySpeedRow key={p.id} pokemon={p} />
            ))}
            <AllySpeedRow pokemon={selectedAlly} />
            {enemyBottom.map((p) => (
              <EnemySpeedRow key={p.id} pokemon={p} />
            ))}
          </>
        ) : (
          <>
            {enemies.map((p) => (
              <EnemySpeedRow key={p.id} pokemon={p} />
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
