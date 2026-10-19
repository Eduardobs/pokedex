"""Refresh the bounded, offline PokéAPI ability audit fixture (no test-time network)."""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import time

BASE = 'https://pokeapi.co/api/v2/ability/'
CACHE = Path('/tmp/atlas-pokeapi-abilities')
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
assert len(entries) == 314, 'Catalog changed: review the expected audit scope before refreshing.'


def fetch(entry):
    path = CACHE / (entry['name'] + '.json')
    if path.exists():
        data = json.loads(path.read_text())
    else:
        data = read(entry['url'])
        path.write_text(json.dumps(data))
    keys = ['id', 'name', 'is_main_series', 'generation', 'effect_entries', 'effect_changes']
    result = {key: data[key] for key in keys}
    result['flavor_text_entries'] = [
        flavor for flavor in data['flavor_text_entries'] if flavor['language']['name'] == 'en'
    ][-1:]
    return result


with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    abilities = sorted(pool.map(fetch, entries), key=lambda ability: ability['id'])
assert [ability['id'] for ability in abilities] == list(range(1, 315))
output = Path('src/data/third-party/pokeapi-battle-abilities.json')
output.write_text(json.dumps(abilities, ensure_ascii=False, indent=2) + '\n')
print(f'Saved {len(abilities)} abilities to {output}')
