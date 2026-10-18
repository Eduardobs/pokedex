"""Refresh the bounded, offline PokéAPI move audit fixture (no test-time network)."""
import concurrent.futures
import json
from pathlib import Path
import time
import subprocess

BASE = 'https://pokeapi.co/api/v2/move/'
CACHE = Path('/tmp/atlas-pokeapi-moves')
CACHE.mkdir(exist_ok=True)

def read(url):
    for attempt in range(4):
        try:
            return json.loads(subprocess.check_output(['curl', '-sS', '-L', '--fail', '--max-time', '45', url]))
        except Exception:
            if attempt == 3:
                raise
            time.sleep(attempt + 1)

index = read(BASE + '?limit=2000')
entries = [entry for entry in index['results'] if int(entry['url'].rstrip('/').split('/')[-1]) <= 10000]
assert len(entries) == 919, 'Catalog changed: review the expected audit scope before refreshing.'

def fetch(entry):
    path = CACHE / (entry['name'] + '.json')
    if path.exists():
        data = json.loads(path.read_text())
    else:
        data = read(entry['url'])
        path.write_text(json.dumps(data))
    keys = ['id', 'name', 'type', 'damage_class', 'power', 'accuracy', 'pp', 'priority', 'target',
            'effect_chance', 'meta', 'stat_changes', 'effect_entries']
    result = {key: data[key] for key in keys}
    result['flavor_text_entries'] = [entry for entry in data['flavor_text_entries'] if entry['language']['name'] == 'en'][-1:]
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    moves = sorted(pool.map(fetch, entries), key=lambda move: move['id'])
assert [move['id'] for move in moves] == list(range(1, 920))
output = Path('src/data/third-party/pokeapi-battle-moves.json')
output.write_text(json.dumps(moves, ensure_ascii=False, indent=2) + '\n')
print(f'Saved {len(moves)} moves to {output}')
