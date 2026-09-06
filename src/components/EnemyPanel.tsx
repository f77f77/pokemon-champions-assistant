import type { PokemonSet } from '../types';
import { PokemonCard } from './PokemonCard';
import { SPECIES_DB } from '../lib/species';
import { getMovesSourceLabel } from '../lib/movesCache';

interface Props {
  team: PokemonSet[];
  onSpeciesOverride: (index: number, speciesKey: string) => void;
}

export function EnemyPanel({ team, onSpeciesOverride }: Props) {
  const options = SPECIES_DB.map((s) => ({ key: s.key, label: s.nameZh }));

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
            movesSourceLabel={p.speciesKey ? getMovesSourceLabel(p.speciesKey) : null}
          />
        ))}
      </div>
    </section>
  );
}
