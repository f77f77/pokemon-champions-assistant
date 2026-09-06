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
}

function pct(value: number): number {
  const clamped = Math.min(SPEED_AXIS_MAX, Math.max(SPEED_AXIS_MIN, value));
  return ((clamped - SPEED_AXIS_MIN) / (SPEED_AXIS_MAX - SPEED_AXIS_MIN)) * 100;
}

export function SpeedAxis({ myTeam, enemyTeam }: Props) {
  const ticks = [50, 80, 100, 106, 113, 130, 150, 169, 172, 200];

  return (
    <section className="panel panel--speed">
      <header className="panel__header">
        <h2>速度軸</h2>
        <span className="panel__hint">敵方雙色帶：減速0／中性0／中性32／加速0 · 我方單點（手填 Spe）</span>
      </header>
      <div className="speed-axis">
        <div className="speed-axis__scale">
          {ticks.map((t) => (
            <span key={t} style={{ left: `${pct(t)}%` }}>
              {t}
            </span>
          ))}
        </div>

        {enemyTeam.map((p) => {
          if (!p.identified || !p.baseStats.spe) {
            return (
              <div key={p.id} className="speed-row speed-row--empty">
                <span className="speed-row__label">{p.species}</span>
                <div className="speed-row__track" />
              </div>
            );
          }
          const bands = enemySpeedBands(p.baseStats.spe);
          const slow = bands[0].value;
          const fast = bands[3].value;
          const n0 = bands[1].value;
          const n32 = bands[2].value;
          return (
            <div key={p.id} className="speed-row">
              <span className="speed-row__label" title={p.species}>
                {p.species}
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
        })}

        <div className="speed-divider">我方 Spe（手填）</div>

        {myTeam.map((p) => {
          const spe = mySpeedPoint(p.baseStats.spe, p.speed || undefined);
          return (
            <div key={p.id} className="speed-row speed-row--mine">
              <span className="speed-row__label">{p.species}</span>
              <div className="speed-row__track">
                {spe > 0 && (
                  <span
                    className="speed-point"
                    style={{ left: `${pct(spe)}%` }}
                    title={`${p.species} Spe ${spe}`}
                  >
                    ◆
                  </span>
                )}
              </div>
              <span className="speed-row__value">{spe || '—'}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
