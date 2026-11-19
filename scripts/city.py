"""Read complete municipal exports with their catalogue dates and row counts."""
import datetime
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/'


def read(dataset, kind):
    cache = os.environ.get('CITY_INPUT_DIR')
    if cache:
        return json.loads((Path(cache) / f'{dataset}.{kind}.json').read_text())
    url = BASE + dataset + ('/exports/json' if kind == 'data' else '')
    with urlopen(Request(url, headers={'User-Agent': 'CoolCode Vancouver snapshot'}), timeout=150) as response:
        return json.load(response)


def dataset(name):
    metadata = read(name, 'meta')['metas']['default']
    rows = read(name, 'data')
    if not rows or len(rows) != metadata['records_count']:
        raise ValueError(f'Incomplete {name} export')
    return rows, metadata['modified'][:10]


def publish(data, status):
    status['retrieved'] = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
    for name, contents in [('data', data), ('status', status)]:
        path = ROOT / 'web' / (name + '.json')
        staging = path.with_suffix('.tmp')
        staging.write_text(json.dumps(contents, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
        staging.replace(path)
