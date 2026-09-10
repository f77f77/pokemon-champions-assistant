import type { PokemonFormOption, PokemonSet, PokemonType, StatKey } from '../types';
import { ALL_TYPES, TYPE_COLORS, defensiveMatchups } from '../lib/typeChart';
import { typeIconUrl } from '../lib/typeIcons';
import { calcAllStats } from '../lib/speedCalc';
import { formatSpeciesLabel } from '../lib/species';
import { MOVES_SOURCE_LABEL } from '../lib/movesCache';

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
  onFormChange?: (formKey: string) => void;
  speciesOptions?: { key: string; label: string }[];
  /** 我方卡片：是否為速度軸選中對象 */
  selected?: boolean;
  onSelect?: () => void;
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

function formOptionsOf(pokemon: PokemonSet): PokemonFormOption[] {
  return Array.isArray(pokemon.forms) ? pokemon.forms : [];
}

function formatMultLabel(m: number): string {
  if (m === 0) return '0';
  if (m === 0.25) return '1/4';
  if (m === 0.5) return '1/2';
  if (m === 2) return '2';
  if (m === 4) return '4';
  return String(m);
}

function multCssKey(m: number): string {
  if (m === 0) return 'immune';
  if (m === 0.25) return 'quarter';
  if (m === 0.5) return 'half';
  if (m >= 4) return 'x4';
  if (m > 1) return 'weak';
  return 'half';
}

/** Group non-neutral matchups into compact rows; ×4 and ×0 share one row. */
function MatchupRows({ matchups }: { matchups: Record<PokemonType, number> }) {
  const byMult = new Map<number, PokemonType[]>();
  for (const t of ALL_TYPES) {
    const m = matchups[t];
    if (m === 1) continue; // hide neutral
    const list = byMult.get(m) ?? [];
    list.push(t);
    byMult.set(m, list);
  }

  const rowSpecs: Array<Array<{ mult: number; types: PokemonType[] }>> = [];
  // ×4 (and any ≥4) + ×0 share one compact row with dual badges
  const fours = [...byMult.entries()].filter(([m]) => m >= 4).sort((a, b) => b[0] - a[0]);
  const zeros = byMult.has(0) ? [{ mult: 0, types: byMult.get(0)! }] : [];
  const fourGroups = fours.map(([mult, types]) => ({ mult, types }));
  if (fourGroups.length || zeros.length) {
    rowSpecs.push([...fourGroups, ...zeros]);
  }
  for (const m of [2, 0.5, 0.25]) {
    if (byMult.has(m)) rowSpecs.push([{ mult: m, types: byMult.get(m)! }]);
  }
  // leftovers (e.g. ×⅛)
  const used = new Set<number>();
  for (const row of rowSpecs) for (const g of row) used.add(g.mult);
  for (const [m, types] of [...byMult.entries()].sort((a, b) => b[0] - a[0])) {
    if (used.has(m)) continue;
    rowSpecs.push([{ mult: m, types }]);
  }

  if (!rowSpecs.length) return null;

  return (
    <div className="type-grid" title="屬性抗性／弱點（雙屬性乘算；隱藏 ×1）">
      {rowSpecs.map((groups, ri) => (
        <div key={ri} className="type-grid__row">
          {groups.map(({ mult, types }) => (
            <span key={mult} className="type-grid__group">
              {types.map((t) => {
                const icon = typeIconUrl(t);
                return icon ? (
                  <img key={t} src={icon} alt={t} title={`${t}: ×${mult}`} className="type-grid__icon" />
                ) : (
                  <span key={t} className="type-grid__icon" title={`${t}: ×${mult}`}>
                    {t.slice(0, 1)}
                  </span>
                );
              })}
              <span className={`type-grid__mult type-grid__mult--${multCssKey(mult)}`} title={`×${mult}`}>
                {formatMultLabel(mult)}
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}


export function PokemonCard({
  pokemon,
  variant,
  onSpeciesOverride,
  onSpeedChange,
  onFormChange,
  speciesOptions,
  selected,
  onSelect,
}: Props) {
  const stats = calcAllStats(pokemon.baseStats);
  const maxStat = Math.max(150, ...Object.values(pokemon.baseStats));
  const matchups = pokemon.types.length ? defensiveMatchups(pokemon.types) : null;
  const moveLimit = variant === 'enemy' ? 6 : 4;
  const forms = formOptionsOf(pokemon);
  const showFormSelect = forms.length > 1 && !!onFormChange;
  const formSelectValue = forms.some((f) => f.formKey === pokemon.formKey)
    ? (pokemon.formKey as string)
    : forms.find((f) => f.isDefault)?.formKey || forms[0]?.formKey || '';
  const speciesTitle = formatSpeciesLabel(pokemon);

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
            <h3 title={speciesTitle}>{speciesTitle}</h3>
          )}
          {showFormSelect ? (
            <label className="pkmn-card__form-select-wrap" onClick={(e) => e.stopPropagation()}>
              <span className="muted">形態</span>
              <select
                className="pkmn-card__form-select"
                value={formSelectValue}
                onChange={(e) => onFormChange?.(e.target.value)}
                aria-label="切換形態／Mega"
              >
                {forms.map((f) => (
                  <option key={f.formKey} value={f.formKey}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            pokemon.formLabel && <span className="pkmn-card__form">{pokemon.formLabel}</span>
          )}
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

      {matchups && <MatchupRows matchups={matchups} />}

      <div className={`move-grid ${variant === 'enemy' ? 'move-grid--six' : ''}`}>
        {pokemon.moves.slice(0, moveLimit).map((mv, i) => {
          const moveIcon = typeIconUrl(mv.type);
          const usageLabel = formatUsage(mv.usage);
          const tip = usageLabel
            ? `${mv.name} · ${usageLabel} · ${MOVES_SOURCE_LABEL}`
            : mv.name;
          return (
            <button
              key={i}
              type="button"
              className="move-btn"
              style={{ borderColor: TYPE_COLORS[mv.type as keyof typeof TYPE_COLORS] || '#666' }}
              title={tip}
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
