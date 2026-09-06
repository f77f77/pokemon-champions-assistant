import type { PokemonSet, StatKey } from '../types';
import { ALL_TYPES, TYPE_COLORS, defensiveMatchups, matchupClass } from '../lib/typeChart';
import { calcAllStats } from '../lib/speedCalc';

const STAT_LABELS: { key: StatKey; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'A' },
  { key: 'def', label: 'D' },
  { key: 'spa', label: 'SA' },
  { key: 'spd', label: 'SD' },
  { key: 'spe', label: 'S' },
];

interface Props {
  pokemon: PokemonSet;
  variant: 'my' | 'enemy';
  onSpeciesOverride?: (name: string) => void;
  onSpeedChange?: (speed: number) => void;
  speciesOptions?: { key: string; label: string }[];
}

export function PokemonCard({ pokemon, variant, onSpeciesOverride, onSpeedChange, speciesOptions }: Props) {
  const stats = calcAllStats(pokemon.baseStats);
  const maxStat = Math.max(150, ...Object.values(pokemon.baseStats));
  const matchups = variant === 'enemy' && pokemon.types.length ? defensiveMatchups(pokemon.types) : null;

  return (
    <article className={`pkmn-card pkmn-card--${variant} ${pokemon.identified ? '' : 'is-unidentified'}`}>
      <header className="pkmn-card__header">
        <div className="pkmn-card__sprite" aria-hidden>
          {pokemon.thumbnailDataUrl ? (
            <img src={pokemon.thumbnailDataUrl} alt="" className="pkmn-card__thumb" />
          ) : pokemon.speciesKey ? (
            pokemon.speciesKey.slice(0, 2).toUpperCase()
          ) : (
            '??'
          )}
        </div>
        <div className="pkmn-card__title">
          {variant === 'enemy' && onSpeciesOverride ? (
            <select
              className="pkmn-card__species-select"
              value={pokemon.speciesKey || ''}
              onChange={(e) => onSpeciesOverride(e.target.value)}
              aria-label="手動覆寫種族"
            >
              <option value="">未識別</option>
              {(speciesOptions ?? []).map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <h3>{pokemon.species}</h3>
          )}
          {pokemon.formLabel && <span className="pkmn-card__form">{pokemon.formLabel}</span>}
          <div className="pkmn-card__meta">
            {variant === "enemy" ? (
              <span className="muted" title="do not guess held items">道具：—</span>
            ) : (
              <span>{pokemon.item || "無道具"}</span>
            )}
            <span>{pokemon.ability || '—'}</span>
          </div>
        </div>
        <div className="pkmn-card__types">
          {pokemon.types.map((t) => (
            <span key={t} className="type-badge" style={{ background: TYPE_COLORS[t] }}>
              {t}
            </span>
          ))}
        </div>
      </header>

      <div className="pkmn-card__stats">
        {STAT_LABELS.map(({ key, label }) => (
          <div key={key} className="stat-row">
            <span className="stat-row__label">{label}</span>
            <div className="stat-row__bar">
              <div
                className="stat-row__fill"
                style={{ width: `${Math.min(100, (pokemon.baseStats[key] / maxStat) * 100)}%` }}
              />
            </div>
            <span className="stat-row__num">
              {pokemon.baseStats[key]}
              <small>({stats[key]})</small>
            </span>
          </div>
        ))}
      </div>

      {variant === 'my' && onSpeedChange && (
        <label className="pkmn-card__speed-input">
          Spe 實值
          <input
            type="number"
            min={0}
            max={300}
            value={pokemon.speed || ''}
            placeholder="手填"
            onChange={(e) => onSpeedChange(Number(e.target.value) || 0)}
          />
        </label>
      )}

      {matchups && (
        <div className="type-grid" title="屬性抗性（離線）">
          {ALL_TYPES.map((t) => {
            const m = matchups[t];
            return (
              <span key={t} className={`type-dot type-dot--${matchupClass(m)}`} title={`${t}: ×${m}`}>
                {t.slice(0, 1)}
              </span>
            );
          })}
        </div>
      )}

      <div className={`move-grid ${variant === "enemy" ? "move-grid--six" : ""}`}>
        {pokemon.moves.slice(0, variant === "enemy" ? 6 : 4).map((mv, i) => (
          <button
            key={i}
            type="button"
            className="move-btn"
            style={{ borderColor: TYPE_COLORS[(mv.type as keyof typeof TYPE_COLORS)] || '#666' }}
          >
            <span>{mv.name}</span>
            {mv.pp && <small>{mv.pp}</small>}
          </button>
        ))}
      </div>
    </article>
  );
}
