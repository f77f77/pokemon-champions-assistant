import type { PokemonSet } from '../types';
import { PokemonCard } from './PokemonCard';
import { SPECIES_DB, formatSpeciesLabel } from '../lib/species';

interface Props {
  team: PokemonSet[];
  onSpeciesOverride: (index: number, speciesKey: string) => void;
  onFormChange?: (index: number, formKey: string) => void;
}

function compareSpeciesOptions(
  a: (typeof SPECIES_DB)[number],
  b: (typeof SPECIES_DB)[number],
): number {
  const da = a.nationalDex ?? Number.POSITIVE_INFINITY;
  const db = b.nationalDex ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  // Same dex (e.g. Paradox / Mega): stable secondary by formKey then key
  const fa = a.formKey || a.key;
  const fb = b.formKey || b.key;
  const byForm = fa.localeCompare(fb);
  if (byForm !== 0) return byForm;
  return a.key.localeCompare(b.key);
}

export function EnemyPanel({ team, onSpeciesOverride, onFormChange }: Props) {
  const options = [...SPECIES_DB].sort(compareSpeciesOptions).map((s) => ({
    key: s.key,
    label: formatSpeciesLabel(s),
  }));

  return (
    <section className="panel panel--enemy">
      <header className="panel__header">
        <h2>敵方隊伍</h2>
        <span className="panel__hint">低信心 → 未識別；可手動覆寫</span>
      </header>
      <div className="panel__cards">
        {team.map((p, i) => (
          <PokemonCard
            key={p.id}
            pokemon={p}
            variant="enemy"
            speciesOptions={options}
            onSpeciesOverride={(key) => onSpeciesOverride(i, key)}
            onFormChange={onFormChange ? (fk) => onFormChange(i, fk) : undefined}
          />
        ))}
      </div>
    </section>
  );
}
