import type { PokemonSet, PokemonType, StatKey } from '../types';
import { ALL_TYPES, TYPE_COLORS, defensiveMatchups, matchupClass } from '../lib/typeChart';
import { typeIconUrl } from '../lib/typeIcons';
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
  /** 我方卡片：是否為速度軸選中對象 */
  selected?: boolean;
  onSelect?: () => void;
  /** Optional caption for move usage source (CBD Doubles) */
  movesSourceLabel?: string | null;
}

/** 屬性圖示 only（不顯示文字標籤） */
function TypeBadge({ type, size = 'md' }: { type: PokemonType | string; size?: 'sm' | 'md' }) {
  const url = typeIconUrl(type);
  const color = TYPE_COLORS[type as PokemonType];
  if (url) {
    return (
      <span className={`type-badge type-badge--icon type-badge--${size}`} title={String(type)}>
        <img src={url} alt={String(type)} className="type-badge__img" />
      </span>
    );
  }
  return (
    <span className="type-badge" style={{ background: color || '#666' }} title={String(type)}>
      {type}
    </span>
  );
}

function formatUsage(usage: string | number | undefined): string | null {
  if (usage == null || usage === '') return null;
  if (typeof usage === 'number') return `${usage}%`;
  const s = String(usage).trim();
  if (!s) return null;
  return /%$/.test(s) ? s : `${s}%`;
}

export function PokemonCard({ pokemon, variant, onSpeciesOverride, onSpeedChange, speciesOptions, selected, onSelect, movesSourceLabel }: Props) {
  const stats = calcAllStats(pokemon.baseStats);
  const maxStat = Math.max(150, ...Object.values(pokemon.baseStats));
  const matchups = pokemon.types.length ? defensiveMatchups(pokemon.types) : null;
  const moveLimit = variant === 'enemy' ? 6 : 4;

  const selectable = variant === 'my' && !!onSelect;
  const cardClass = [
    'pkmn-card',
    `pkmn-card--${variant}`,
    pokemon.identified ? '' : 'is-unidentified',
    selected ? 'is-selected' : '',
    selectable ? 'is-selectable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const identityCol = (
    <div className="pkmn-card__col pkmn-card__col--identity">
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
              onClick={(e) => e.stopPropagation()}
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
            {variant === 'enemy' ? (
              <span className="muted" title="do not guess held items">
                道具：—
              </span>
            ) : (
              <span>{pokemon.item || '無道具'}</span>
            )}
            <span>{pokemon.ability || '—'}</span>
          </div>
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
        <label className="pkmn-card__speed-input" onClick={(e) => e.stopPropagation()}>
          Spe 實值
          <input
            type="number"
            min={0}
            max={300}
            value={pokemon.speed || ''}
            placeholder="手填"
            onChange={(e) => onSpeedChange(Number(e.target.value) || 0)}
            onClick={(e) => e.stopPropagation()}
          />
        </label>
      )}
    </div>
  );

  const matchupCol = (
    <div className="pkmn-card__col pkmn-card__col--matchup">
      <div className="pkmn-card__types" aria-label="屬性">
        {pokemon.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>

      {matchups && (
        <div className="type-grid" title="屬性抗性／弱點（雙屬性乘算）">
          {ALL_TYPES.map((t) => {
            const m = matchups[t];
            const icon = typeIconUrl(t);
            const cls = matchupClass(m);
            return (
              <span key={t} className={`type-dot type-dot--${cls}`} title={`${t}: ×${m}`}>
                {icon ? <img src={icon} alt={t} className="type-dot__img" /> : t.slice(0, 1)}
                {(cls === 'weak' || cls === 'x4' || cls === 'immune' || cls === 'resist') && (
                  <span className="type-dot__mult">×{m === 0.25 ? '¼' : m === 0.5 ? '½' : m}</span>
                )}
              </span>
            );
          })}
        </div>
      )}

      <div className={`move-grid ${variant === 'enemy' ? 'move-grid--six' : ''}`}>
        {pokemon.moves.slice(0, moveLimit).map((mv, i) => {
          const moveIcon = typeIconUrl(mv.type);
          const usageLabel = formatUsage(mv.usage);
          return (
            <button
              key={i}
              type="button"
              className="move-btn"
              style={{ borderColor: TYPE_COLORS[mv.type as keyof typeof TYPE_COLORS] || '#666' }}
              title={usageLabel && movesSourceLabel ? `${mv.name} · ${usageLabel} · ${movesSourceLabel}` : mv.name}
            >
              <span className="move-btn__main">
                {moveIcon && (
                  <img src={moveIcon} alt={String(mv.type)} className="move-btn__type-icon" title={String(mv.type)} />
                )}
                <span className="move-btn__name">{mv.name}</span>
              </span>
              {usageLabel ? <small className="move-btn__usage">{usageLabel}</small> : mv.pp ? <small>{mv.pp}</small> : null}
            </button>
          );
        })}
      </div>
      {movesSourceLabel && pokemon.moves.some((m) => m.usage != null && m.usage !== '') ? (
        <p className="move-source-caption" title={movesSourceLabel}>
          使用率：{movesSourceLabel}
        </p>
      ) : null}
    </div>
  );

  return (
    <article
      className={cardClass}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={
        selectable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? !!selected : undefined}
      title={selectable ? (selected ? '取消選取（速度軸）' : '選取以對照速度軸') : undefined}
    >
      {/* 我方：左身份／數值・右屬性／弱點／招式；敵方鏡像左右對調 */}
      <div className={`pkmn-card__body ${variant === 'enemy' ? 'pkmn-card__body--mirror' : ''}`}>
        {identityCol}
        {matchupCol}
      </div>
    </article>
  );
}
