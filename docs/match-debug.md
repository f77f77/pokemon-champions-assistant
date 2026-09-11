# Match debug (per-slot reject reasons)

## team-preview-test-1 slot 0 — expected `charizard` → `None` (AHASH_PREFILTER)

- conf=0.4049 margin=0.4049 need=0.08 types=['fire', 'flying'] typeScores=[{'id': 'fire', 'score': 0.6987}, {'id': 'flying', 'score': 0.6127}]
- aHash rank expected=171 ham=21 inCands=False candCount=114
- topCandidates=[{'speciesId': 'pincurchin', 'confidence': 0.6316, 'types': ['electric']}, {'speciesId': 'slowkinggalar', 'confidence': 0.6036, 'types': ['poison', 'psychic']}, {'speciesId': 'raichu', 'confidence': 0.5954, 'types': ['electric']}, {'speciesId': 'sirfetchd', 'confidence': 0.5827, 'types': ['fighting']}, {'speciesId': 'dedenne', 'confidence': 0.5793, 'types': ['electric', 'fairy']}, {'speciesId': 'sinistcha', 'confidence': 0.5759, 'types': ['ghost', 'grass']}, {'speciesId': 'milotic', 'confidence': 0.5666, 'types': ['water']}, {'speciesId': 'basculegion', 'confidence': 0.5623, 'types': ['ghost', 'water']}]
- typeVetoed=['pincurchin', 'slowkinggalar', 'raichu', 'sirfetchd', 'dedenne', 'sinistcha', 'milotic', 'basculegion', 'hawlucha', 'sharpedo', 'mudsdale', 'scolipede']

## team-preview-test-1 slot 1 — expected `aerodactyl` → `aerodactyl` (ok)

- conf=0.8355 margin=0.2138 need=0.025 types=[] typeScores=[{'id': 'flying', 'score': 0.5287}, {'id': 'rock', 'score': 0.477}]
- aHash rank expected=1 ham=8 inCands=True candCount=129
- topCandidates=[{'speciesId': 'aerodactyl', 'confidence': 0.8355, 'types': ['flying', 'rock']}, {'speciesId': 'pincurchin', 'confidence': 0.6217, 'types': ['electric']}, {'speciesId': 'salamence', 'confidence': 0.6044, 'types': ['dragon', 'flying']}, {'speciesId': 'hydreigon', 'confidence': 0.6007, 'types': ['dark', 'dragon']}, {'speciesId': 'sharpedo', 'confidence': 0.5798, 'types': ['dark', 'water']}, {'speciesId': 'overqwil', 'confidence': 0.5741, 'types': ['dark', 'poison']}, {'speciesId': 'liepard', 'confidence': 0.5724, 'types': ['dark']}, {'speciesId': 'skarmory', 'confidence': 0.5722, 'types': ['flying', 'steel']}]
- typeVetoed=[]

## team-preview-test-1 slot 2 — expected `sneasler` → `sneasler` (ok)

- conf=0.8365 margin=0.2109 need=0.025 types=[] typeScores=[{'id': 'poison', 'score': 0.5654}, {'id': 'fighting', 'score': 0.5057}]
- aHash rank expected=37 ham=14 inCands=True candCount=131
- topCandidates=[{'speciesId': 'sneasler', 'confidence': 0.8365, 'types': ['fighting', 'poison']}, {'speciesId': 'watchog', 'confidence': 0.6256, 'types': ['normal']}, {'speciesId': 'thievul', 'confidence': 0.6179, 'types': ['dark']}, {'speciesId': 'stunfisk', 'confidence': 0.6176, 'types': ['electric', 'ground']}, {'speciesId': 'typhlosionhisui', 'confidence': 0.6063, 'types': ['fire', 'ghost']}, {'speciesId': 'wyrdeer', 'confidence': 0.5999, 'types': ['normal', 'psychic']}, {'speciesId': 'gourgeistsmall', 'confidence': 0.5939, 'types': ['ghost', 'grass']}, {'speciesId': 'squawkabilly', 'confidence': 0.5892, 'types': ['flying', 'normal']}]
- typeVetoed=[]

## team-preview-test-1 slot 3 — expected `garchomp` → `garchomp` (ok)

- conf=0.7724 margin=0.1498 need=0.025 types=[] typeScores=[{'id': 'ground', 'score': 0.4793}, {'id': 'dragon', 'score': 0.4781}]
- aHash rank expected=93 ham=14 inCands=True candCount=216
- topCandidates=[{'speciesId': 'garchomp', 'confidence': 0.7724, 'types': ['dragon', 'ground']}, {'speciesId': 'pangoro', 'confidence': 0.6226, 'types': ['dark', 'fighting']}, {'speciesId': 'feraligatr', 'confidence': 0.6094, 'types': ['water']}, {'speciesId': 'samurotthisui', 'confidence': 0.6082, 'types': ['dark', 'water']}, {'speciesId': 'gengar', 'confidence': 0.5994, 'types': ['ghost', 'poison']}, {'speciesId': 'emboar', 'confidence': 0.595, 'types': ['fighting', 'fire']}, {'speciesId': 'krookodile', 'confidence': 0.5893, 'types': ['dark', 'ground']}, {'speciesId': 'grimmsnarl', 'confidence': 0.5838, 'types': ['dark', 'fairy']}]
- typeVetoed=[]

## team-preview-test-1 slot 4 — expected `rotomwash` → `rotomwash` (ok)

- conf=0.5913 margin=0.5913 need=0.055 types=['electric', 'water'] typeScores=[{'id': 'electric', 'score': 0.7698}, {'id': 'water', 'score': 0.6873}]
- aHash rank expected=1 ham=7 inCands=True candCount=157
- topCandidates=[{'speciesId': 'salamence', 'confidence': 0.6026, 'types': ['dragon', 'flying']}, {'speciesId': 'rotomwash', 'confidence': 0.5913, 'types': ['electric', 'water']}, {'speciesId': 'noivern', 'confidence': 0.5664, 'types': ['dragon', 'flying']}, {'speciesId': 'scizor', 'confidence': 0.5564, 'types': ['bug', 'steel']}, {'speciesId': 'basculegion', 'confidence': 0.5548, 'types': ['ghost', 'water']}, {'speciesId': 'kingambit', 'confidence': 0.5464, 'types': ['dark', 'steel']}, {'speciesId': 'runerigus', 'confidence': 0.5394, 'types': ['ghost', 'ground']}, {'speciesId': 'taurospaldeacombat', 'confidence': 0.5375, 'types': ['fighting']}]
- typeVetoed=['salamence', 'noivern', 'scizor', 'basculegion', 'kingambit', 'runerigus', 'taurospaldeacombat', 'venusaur', 'kleavor', 'decidueyehisui', 'ariados', 'excadrill']

## team-preview-test-1 slot 5 — expected `aegislash` → `aegislash` (ok)

- conf=0.6997 margin=0.0940 need=0.03 types=[] typeScores=[{'id': 'ghost', 'score': 0.4525}]
- aHash rank expected=9 ham=12 inCands=True candCount=162
- topCandidates=[{'speciesId': 'aegislash', 'confidence': 0.6997, 'types': ['ghost', 'steel']}, {'speciesId': 'stunfiskgalar', 'confidence': 0.6057, 'types': ['ground', 'steel']}, {'speciesId': 'mudsdale', 'confidence': 0.6054, 'types': ['ground']}, {'speciesId': 'aromatisse', 'confidence': 0.6046, 'types': ['fairy']}, {'speciesId': 'venusaur', 'confidence': 0.5892, 'types': ['grass', 'poison']}, {'speciesId': 'overqwil', 'confidence': 0.5858, 'types': ['dark', 'poison']}, {'speciesId': 'floette', 'confidence': 0.5855, 'types': ['fairy']}, {'speciesId': 'salamence', 'confidence': 0.5832, 'types': ['dragon', 'flying']}]
- typeVetoed=[]

## team-preview-test-2 slot 0 — expected `whimsicott` → `None` (AHASH_PREFILTER)

- conf=0.6160 margin=0.0574 need=0.06 types=[] typeScores=[{'id': 'grass', 'score': 0.4944}]
- aHash rank expected=217 ham=21 inCands=False candCount=167
- topCandidates=[{'speciesId': 'appletun', 'confidence': 0.616, 'types': ['dragon', 'grass']}, {'speciesId': 'slurpuff', 'confidence': 0.5586, 'types': ['fairy']}, {'speciesId': 'wyrdeer', 'confidence': 0.5433, 'types': ['normal', 'psychic']}, {'speciesId': 'forretress', 'confidence': 0.5361, 'types': ['bug', 'steel']}, {'speciesId': 'clefable', 'confidence': 0.5287, 'types': ['fairy']}, {'speciesId': 'bellibolt', 'confidence': 0.5271, 'types': ['electric']}, {'speciesId': 'houndstone', 'confidence': 0.5262, 'types': ['ghost']}, {'speciesId': 'victreebel', 'confidence': 0.5221, 'types': ['grass', 'poison']}]
- typeVetoed=[]

## team-preview-test-2 slot 1 — expected `charizard` → `None` (AHASH_PREFILTER)

- conf=0.4771 margin=0.0182 need=0.08 types=['fire'] typeScores=[{'id': 'fire', 'score': 0.6915}]
- aHash rank expected=171 ham=22 inCands=False candCount=96
- topCandidates=[{'speciesId': 'azumarill', 'confidence': 0.5968, 'types': ['fairy', 'water']}, {'speciesId': 'qwilfish', 'confidence': 0.5952, 'types': ['poison', 'water']}, {'speciesId': 'aromatisse', 'confidence': 0.5782, 'types': ['fairy']}, {'speciesId': 'feraligatr', 'confidence': 0.5693, 'types': ['water']}, {'speciesId': 'pincurchin', 'confidence': 0.5641, 'types': ['electric']}, {'speciesId': 'mudsdale', 'confidence': 0.5608, 'types': ['ground']}, {'speciesId': 'salamence', 'confidence': 0.5592, 'types': ['dragon', 'flying']}, {'speciesId': 'krookodile', 'confidence': 0.5585, 'types': ['dark', 'ground']}]
- typeVetoed=['azumarill', 'qwilfish', 'aromatisse', 'feraligatr', 'pincurchin', 'mudsdale', 'salamence', 'krookodile', 'sinistcha', 'hawlucha', 'dragonite', 'garbodor']

## team-preview-test-2 slot 2 — expected `basculegion` → `basculegion` (ok)

- conf=0.7312 margin=0.1872 need=0.03 types=['water'] typeScores=[{'id': 'water', 'score': 0.7539}]
- aHash rank expected=14 ham=11 inCands=True candCount=176
- topCandidates=[{'speciesId': 'basculegion', 'confidence': 0.7312, 'types': ['ghost', 'water']}, {'speciesId': 'venusaur', 'confidence': 0.5877, 'types': ['grass', 'poison']}, {'speciesId': 'krookodile', 'confidence': 0.5818, 'types': ['dark', 'ground']}, {'speciesId': 'kleavor', 'confidence': 0.5793, 'types': ['bug', 'rock']}, {'speciesId': 'pincurchin', 'confidence': 0.5641, 'types': ['electric']}, {'speciesId': 'hawlucha', 'confidence': 0.5555, 'types': ['fighting', 'flying']}, {'speciesId': 'rhyperior', 'confidence': 0.5551, 'types': ['ground', 'rock']}, {'speciesId': 'ariados', 'confidence': 0.5466, 'types': ['bug', 'poison']}]
- typeVetoed=['venusaur', 'krookodile', 'kleavor', 'pincurchin', 'hawlucha', 'rhyperior', 'ariados', 'weavile', 'aromatisse', 'vileplume', 'aegislash', 'vivillonfancy']

## team-preview-test-2 slot 3 — expected `kingambit` → `kingambit` (ok)

- conf=0.6598 margin=0.0708 need=0.06 types=[] typeScores=[{'id': 'fire', 'score': 0.4537}]
- aHash rank expected=87 ham=16 inCands=True candCount=133
- topCandidates=[{'speciesId': 'kingambit', 'confidence': 0.6598, 'types': ['dark', 'steel']}, {'speciesId': 'scrafty', 'confidence': 0.589, 'types': ['dark', 'fighting']}, {'speciesId': 'toxtricity', 'confidence': 0.5871, 'types': ['electric', 'poison']}, {'speciesId': 'aegislash', 'confidence': 0.5865, 'types': ['ghost', 'steel']}, {'speciesId': 'excadrill', 'confidence': 0.5826, 'types': ['ground', 'steel']}, {'speciesId': 'hydrapple', 'confidence': 0.5786, 'types': ['dragon', 'grass']}, {'speciesId': 'weavile', 'confidence': 0.573, 'types': ['dark', 'ice']}, {'speciesId': 'delphox', 'confidence': 0.5634, 'types': ['fire', 'psychic']}]
- typeVetoed=[]

## team-preview-test-2 slot 4 — expected `sneasler` → `None` (AHASH_PREFILTER)

- conf=0.6062 margin=0.0092 need=0.06 types=[] typeScores=[{'id': 'fighting', 'score': 0.5683}]
- aHash rank expected=136 ham=22 inCands=False candCount=40
- topCandidates=[{'speciesId': 'scolipede', 'confidence': 0.6062, 'types': ['bug', 'poison']}, {'speciesId': 'sableye', 'confidence': 0.597, 'types': ['dark', 'ghost']}, {'speciesId': 'aurorus', 'confidence': 0.5951, 'types': ['ice', 'rock']}, {'speciesId': 'furfrou', 'confidence': 0.5807, 'types': ['normal']}, {'speciesId': 'goodrahisui', 'confidence': 0.5607, 'types': ['dragon', 'steel']}, {'speciesId': 'goodra', 'confidence': 0.5598, 'types': ['dragon']}, {'speciesId': 'decidueyehisui', 'confidence': 0.5559, 'types': ['fighting', 'grass']}, {'speciesId': 'wyrdeer', 'confidence': 0.5543, 'types': ['normal', 'psychic']}]
- typeVetoed=[]

## team-preview-test-2 slot 5 — expected `garchomp` → `None` (AHASH_PREFILTER)

- conf=0.5740 margin=0.0009 need=0.055 types=[] typeScores=[{'id': 'dragon', 'score': 0.5083}, {'id': 'ground', 'score': 0.4928}]
- aHash rank expected=150 ham=21 inCands=False candCount=95
- topCandidates=[{'speciesId': 'rhyperior', 'confidence': 0.574, 'types': ['ground', 'rock']}, {'speciesId': 'vileplume', 'confidence': 0.573, 'types': ['grass', 'poison']}, {'speciesId': 'glimmora', 'confidence': 0.5553, 'types': ['poison', 'rock']}, {'speciesId': 'incineroar', 'confidence': 0.5543, 'types': ['dark', 'fire']}, {'speciesId': 'grimmsnarl', 'confidence': 0.5492, 'types': ['dark', 'fairy']}, {'speciesId': 'zoroark', 'confidence': 0.5384, 'types': ['dark']}, {'speciesId': 'salamence', 'confidence': 0.5293, 'types': ['dragon', 'flying']}, {'speciesId': 'gliscor', 'confidence': 0.5249, 'types': ['flying', 'ground']}]
- typeVetoed=[]

## team-preview-test-3 slot 0 — expected `ninetalesalola` → `ninetalesalola` (ok)

- conf=0.8442 margin=0.2895 need=0.025 types=['ice'] typeScores=[{'id': 'ice', 'score': 0.6745}, {'id': 'fairy', 'score': 0.5556}]
- aHash rank expected=141 ham=16 inCands=True candCount=216
- topCandidates=[{'speciesId': 'ninetalesalola', 'confidence': 0.8442, 'types': ['fairy', 'ice']}, {'speciesId': 'pelipper', 'confidence': 0.5922, 'types': ['flying', 'water']}, {'speciesId': 'pangoro', 'confidence': 0.5691, 'types': ['dark', 'fighting']}, {'speciesId': 'talonflame', 'confidence': 0.5633, 'types': ['fire', 'flying']}, {'speciesId': 'glalie', 'confidence': 0.5546, 'types': ['ice']}, {'speciesId': 'avalugghisui', 'confidence': 0.5506, 'types': ['ice', 'rock']}, {'speciesId': 'palafin', 'confidence': 0.5497, 'types': ['water']}, {'speciesId': 'abomasnow', 'confidence': 0.5428, 'types': ['grass', 'ice']}]
- typeVetoed=['pelipper', 'pangoro', 'talonflame', 'palafin', 'volcarona', 'machamp', 'beedrill', 'altaria', 'forretress', 'slowbro', 'slurpuff', 'appletun']

## team-preview-test-3 slot 1 — expected `empoleon` → `empoleon` (ok)

- conf=0.8455 margin=0.2320 need=0.025 types=['water'] typeScores=[{'id': 'water', 'score': 0.7851}]
- aHash rank expected=1 ham=6 inCands=True candCount=203
- topCandidates=[{'speciesId': 'empoleon', 'confidence': 0.8455, 'types': ['steel', 'water']}, {'speciesId': 'thievul', 'confidence': 0.6853, 'types': ['dark']}, {'speciesId': 'pangoro', 'confidence': 0.6829, 'types': ['dark', 'fighting']}, {'speciesId': 'pincurchin', 'confidence': 0.6757, 'types': ['electric']}, {'speciesId': 'indeedeef', 'confidence': 0.6661, 'types': ['normal', 'psychic']}, {'speciesId': 'baxcalibur', 'confidence': 0.6615, 'types': ['dragon', 'ice']}, {'speciesId': 'squawkabilly', 'confidence': 0.6607, 'types': ['flying', 'normal']}, {'speciesId': 'stunfiskgalar', 'confidence': 0.6415, 'types': ['ground', 'steel']}]
- typeVetoed=['thievul', 'pangoro', 'pincurchin', 'indeedeef', 'baxcalibur', 'squawkabilly', 'stunfiskgalar', 'kleavor', 'watchog', 'hawlucha', 'squawkabillyyellow', 'bellibolt']

## team-preview-test-3 slot 2 — expected `garchomp` → `garchomp` (ok)

- conf=0.7334 margin=0.1365 need=0.03 types=[] typeScores=[{'id': 'ground', 'score': 0.5434}, {'id': 'dragon', 'score': 0.4862}]
- aHash rank expected=83 ham=13 inCands=True candCount=224
- topCandidates=[{'speciesId': 'garchomp', 'confidence': 0.7334, 'types': ['dragon', 'ground']}, {'speciesId': 'grimmsnarl', 'confidence': 0.5969, 'types': ['dark', 'fairy']}, {'speciesId': 'glimmora', 'confidence': 0.5897, 'types': ['poison', 'rock']}, {'speciesId': 'rhyperior', 'confidence': 0.5821, 'types': ['ground', 'rock']}, {'speciesId': 'pincurchin', 'confidence': 0.5817, 'types': ['electric']}, {'speciesId': 'pangoro', 'confidence': 0.5807, 'types': ['dark', 'fighting']}, {'speciesId': 'kleavor', 'confidence': 0.5755, 'types': ['bug', 'rock']}, {'speciesId': 'taurospaldeacombat', 'confidence': 0.5712, 'types': ['fighting']}]
- typeVetoed=[]

## team-preview-test-3 slot 3 — expected `staraptor` → `staraptor` (ok)

- conf=0.8590 margin=0.2530 need=0.025 types=['flying'] typeScores=[{'id': 'flying', 'score': 0.5816}]
- aHash rank expected=73 ham=13 inCands=True candCount=212
- topCandidates=[{'speciesId': 'staraptor', 'confidence': 0.859, 'types': ['flying', 'normal']}, {'speciesId': 'thievul', 'confidence': 0.6784, 'types': ['dark']}, {'speciesId': 'liepard', 'confidence': 0.6199, 'types': ['dark']}, {'speciesId': 'pangoro', 'confidence': 0.6065, 'types': ['dark', 'fighting']}, {'speciesId': 'talonflame', 'confidence': 0.6059, 'types': ['fire', 'flying']}, {'speciesId': 'arcaninehisui', 'confidence': 0.6015, 'types': ['fire', 'rock']}, {'speciesId': 'runerigus', 'confidence': 0.597, 'types': ['ghost', 'ground']}, {'speciesId': 'hawlucha', 'confidence': 0.5858, 'types': ['fighting', 'flying']}]
- typeVetoed=['thievul', 'liepard', 'pangoro', 'arcaninehisui', 'runerigus', 'gourgeistsmall', 'tsareena', 'excadrill', 'mudsdale', 'taurospaldeacombat', 'aromatisse', 'gourgeist']

## team-preview-test-3 slot 4 — expected `whimsicott` → `None` (MARGIN_TOO_SMALL)

- conf=0.6219 margin=0.0013 need=0.06 types=[] typeScores=[{'id': 'grass', 'score': 0.5648}, {'id': 'fairy', 'score': 0.5444}]
- aHash rank expected=210 ham=18 inCands=True candCount=219
- topCandidates=[{'speciesId': 'whimsicott', 'confidence': 0.6219, 'types': ['fairy', 'grass']}, {'speciesId': 'appletun', 'confidence': 0.6207, 'types': ['dragon', 'grass']}, {'speciesId': 'lopunny', 'confidence': 0.5635, 'types': ['normal']}, {'speciesId': 'slurpuff', 'confidence': 0.5626, 'types': ['fairy']}, {'speciesId': 'wyrdeer', 'confidence': 0.5558, 'types': ['normal', 'psychic']}, {'speciesId': 'pelipper', 'confidence': 0.5484, 'types': ['flying', 'water']}, {'speciesId': 'gourgeistsmall', 'confidence': 0.543, 'types': ['ghost', 'grass']}, {'speciesId': 'hippowdon', 'confidence': 0.5365, 'types': ['ground']}]
- typeVetoed=[]

## team-preview-test-3 slot 5 — expected `charizard` → `charizard` (ok)

- conf=0.5508 margin=0.5508 need=0.055 types=['fire', 'flying'] typeScores=[{'id': 'fire', 'score': 0.7045}, {'id': 'flying', 'score': 0.5948}]
- aHash rank expected=5 ham=16 inCands=True candCount=40
- topCandidates=[{'speciesId': 'pincurchin', 'confidence': 0.5715, 'types': ['electric']}, {'speciesId': 'feraligatr', 'confidence': 0.5666, 'types': ['water']}, {'speciesId': 'charizard', 'confidence': 0.5508, 'types': ['fire', 'flying']}, {'speciesId': 'aromatisse', 'confidence': 0.5476, 'types': ['fairy']}, {'speciesId': 'garbodor', 'confidence': 0.4965, 'types': ['poison']}, {'speciesId': 'leafeon', 'confidence': 0.4817, 'types': ['grass']}, {'speciesId': 'flareon', 'confidence': 0.476, 'types': ['fire']}, {'speciesId': 'malamar', 'confidence': 0.4734, 'types': ['dark', 'psychic']}]
- typeVetoed=['pincurchin', 'feraligatr', 'aromatisse', 'garbodor', 'leafeon', 'flareon', 'malamar', 'vileplume', 'forretress', 'incineroar', 'golisopod', 'camerupt']

## team-preview-live-latest slot 0 — expected `froslass` → `froslass` (ok)

- conf=0.7168 margin=0.1975 need=0.03 types=['ice'] typeScores=[{'id': 'ice', 'score': 0.6235}]
- aHash rank expected=6 ham=8 inCands=True candCount=223
- topCandidates=[{'speciesId': 'froslass', 'confidence': 0.7168, 'types': ['ghost', 'ice']}, {'speciesId': 'feraligatr', 'confidence': 0.5715, 'types': ['water']}, {'speciesId': 'furfrou', 'confidence': 0.571, 'types': ['normal']}, {'speciesId': 'decidueye', 'confidence': 0.5434, 'types': ['ghost', 'grass']}, {'speciesId': 'sinistcha', 'confidence': 0.5427, 'types': ['ghost', 'grass']}, {'speciesId': 'annihilape', 'confidence': 0.5413, 'types': ['fighting', 'ghost']}, {'speciesId': 'orthworm', 'confidence': 0.5393, 'types': ['steel']}, {'speciesId': 'gourgeistsmall', 'confidence': 0.5391, 'types': ['ghost', 'grass']}]
- typeVetoed=['feraligatr', 'furfrou', 'decidueye', 'sinistcha', 'annihilape', 'orthworm', 'gourgeistsmall', 'slowkinggalar', 'slowbrogalar', 'roserade', 'hatterene', 'toxapex']

## team-preview-live-latest slot 1 — expected `garchomp` → `garchomp` (ok)

- conf=0.7738 margin=0.1627 need=0.025 types=[] typeScores=[{'id': 'dragon', 'score': 0.4866}, {'id': 'ground', 'score': 0.4823}]
- aHash rank expected=93 ham=14 inCands=True candCount=216
- topCandidates=[{'speciesId': 'garchomp', 'confidence': 0.7738, 'types': ['dragon', 'ground']}, {'speciesId': 'samurotthisui', 'confidence': 0.6111, 'types': ['dark', 'water']}, {'speciesId': 'pangoro', 'confidence': 0.6001, 'types': ['dark', 'fighting']}, {'speciesId': 'grimmsnarl', 'confidence': 0.5992, 'types': ['dark', 'fairy']}, {'speciesId': 'glimmora', 'confidence': 0.5964, 'types': ['poison', 'rock']}, {'speciesId': 'gengar', 'confidence': 0.5898, 'types': ['ghost', 'poison']}, {'speciesId': 'rhyperior', 'confidence': 0.5853, 'types': ['ground', 'rock']}, {'speciesId': 'krookodile', 'confidence': 0.5755, 'types': ['dark', 'ground']}]
- typeVetoed=[]

## team-preview-live-latest slot 2 — expected `basculegion` → `basculegion` (ok)

- conf=0.8277 margin=0.1975 need=0.025 types=['water'] typeScores=[{'id': 'water', 'score': 0.7705}]
- aHash rank expected=1 ham=6 inCands=True candCount=163
- topCandidates=[{'speciesId': 'basculegion', 'confidence': 0.8277, 'types': ['ghost', 'water']}, {'speciesId': 'basculegionf', 'confidence': 0.6302, 'types': ['ghost', 'water']}, {'speciesId': 'venusaur', 'confidence': 0.5918, 'types': ['grass', 'poison']}, {'speciesId': 'hawlucha', 'confidence': 0.5835, 'types': ['fighting', 'flying']}, {'speciesId': 'mawile', 'confidence': 0.5738, 'types': ['fairy', 'steel']}, {'speciesId': 'rillaboom', 'confidence': 0.5685, 'types': ['grass']}, {'speciesId': 'krookodile', 'confidence': 0.5611, 'types': ['dark', 'ground']}, {'speciesId': 'floette', 'confidence': 0.5605, 'types': ['fairy']}]
- typeVetoed=['venusaur', 'hawlucha', 'mawile', 'rillaboom', 'krookodile', 'floette', 'salamence', 'torterra', 'rhyperior', 'kleavor', 'aromatisse', 'decidueyehisui']

## team-preview-live-latest slot 3 — expected `kingambit` → `kingambit` (ok)

- conf=0.6887 margin=0.1343 need=0.03 types=[] typeScores=[{'id': 'dark', 'score': 0.4704}]
- aHash rank expected=25 ham=23 inCands=True candCount=40
- topCandidates=[{'speciesId': 'kingambit', 'confidence': 0.6887, 'types': ['dark', 'steel']}, {'speciesId': 'gourgeistsmall', 'confidence': 0.5544, 'types': ['ghost', 'grass']}, {'speciesId': 'gourgeist', 'confidence': 0.5429, 'types': ['ghost', 'grass']}, {'speciesId': 'gourgeistsuper', 'confidence': 0.5347, 'types': ['ghost', 'grass']}, {'speciesId': 'gourgeistlarge', 'confidence': 0.5341, 'types': ['ghost', 'grass']}, {'speciesId': 'scrafty', 'confidence': 0.525, 'types': ['dark', 'fighting']}, {'speciesId': 'scolipede', 'confidence': 0.5225, 'types': ['bug', 'poison']}, {'speciesId': 'delphox', 'confidence': 0.5118, 'types': ['fire', 'psychic']}]
- typeVetoed=[]

## team-preview-live-latest slot 4 — expected `sneasler` → `sneasler` (ok)

- conf=0.8400 margin=0.2328 need=0.025 types=[] typeScores=[{'id': 'poison', 'score': 0.5631}, {'id': 'fighting', 'score': 0.5361}]
- aHash rank expected=31 ham=16 inCands=True candCount=57
- topCandidates=[{'speciesId': 'sneasler', 'confidence': 0.84, 'types': ['fighting', 'poison']}, {'speciesId': 'scolipede', 'confidence': 0.6072, 'types': ['bug', 'poison']}, {'speciesId': 'empoleon', 'confidence': 0.607, 'types': ['steel', 'water']}, {'speciesId': 'wyrdeer', 'confidence': 0.607, 'types': ['normal', 'psychic']}, {'speciesId': 'lucario', 'confidence': 0.6062, 'types': ['fighting', 'steel']}, {'speciesId': 'furfrou', 'confidence': 0.606, 'types': ['normal']}, {'speciesId': 'toxtricitylowkey', 'confidence': 0.6049, 'types': ['electric', 'poison']}, {'speciesId': 'aurorus', 'confidence': 0.6023, 'types': ['ice', 'rock']}]
- typeVetoed=[]

## team-preview-live-latest slot 5 — expected `golisopod` → `golisopod` (ok)

- conf=0.8706 margin=0.2912 need=0.025 types=['water'] typeScores=[{'id': 'water', 'score': 0.69}]
- aHash rank expected=1 ham=9 inCands=True candCount=97
- topCandidates=[{'speciesId': 'golisopod', 'confidence': 0.8706, 'types': ['bug', 'water']}, {'speciesId': 'slowkinggalar', 'confidence': 0.5856, 'types': ['poison', 'psychic']}, {'speciesId': 'feraligatr', 'confidence': 0.5794, 'types': ['water']}, {'speciesId': 'aromatisse', 'confidence': 0.5698, 'types': ['fairy']}, {'speciesId': 'abomasnow', 'confidence': 0.5533, 'types': ['grass', 'ice']}, {'speciesId': 'bellibolt', 'confidence': 0.5484, 'types': ['electric']}, {'speciesId': 'roserade', 'confidence': 0.5367, 'types': ['grass', 'poison']}, {'speciesId': 'forretress', 'confidence': 0.5364, 'types': ['bug', 'steel']}]
- typeVetoed=['slowkinggalar', 'aromatisse', 'abomasnow', 'bellibolt', 'roserade', 'forretress', 'appletun', 'spiritomb', 'machamp', 'zoroark', 'passimian', 'krookodile']
