#!/usr/bin/env python3
"""TOOLS-02 design 02 §5: deterministic samples of a frozen commit's dispositions.
The reviewer chooses and records the independent seed after H is published. The population
hash covers the sorted IDs as UTF-8, one ID plus LF per line. Sampling gives no acceptance.
"""
import argparse
import hashlib
import json
import random
import re
import subprocess


def sample(manifest, seed, size, population='retired'):
    if size < 0 or population not in ('retired', 'closed', 'extracted'):
        raise ValueError('invalid sample size or population')
    origins = manifest['origins']
    if len({row['id'] for row in origins}) != len(origins):
        raise ValueError('duplicate origin ID')
    ids = sorted(row['id'] for row in origins if (
        row['state'] == 'triaged' if population == 'retired' else
        row['state'] == 'complete' and row.get('disposition', 'closed') == population))
    count = min(size, len(ids))
    return {'population': population, 'population_count': len(ids),
            'population_sha256': hashlib.sha256(''.join(key + '\n' for key in ids).encode()).hexdigest(),
            'seed': seed, 'requested': size, 'count': count,
            'unsafe_bound': count * 2 // 100 if population == 'retired' else None,
            'sample': random.Random(seed).sample(ids, count)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', required=True, help='full frozen C or H commit SHA')
    parser.add_argument('--manifest', default='tests/fixtures/packet-tools/adoption.json')
    parser.add_argument('--seed', type=int, required=True)
    parser.add_argument('--size', type=int, default=150)
    parser.add_argument('--population', choices=('retired', 'closed', 'extracted'), default='retired')
    args = parser.parse_args()
    if not re.fullmatch('[0-9a-f]{40}', args.revision):
        parser.error('revision must be a full commit SHA')
    data = subprocess.check_output(['git', 'show', args.revision + ':' + args.manifest])
    result = sample(json.loads(data), args.seed, args.size, args.population)
    print(json.dumps({'revision': args.revision, 'manifest': args.manifest, **result}, indent=2))


if __name__ == '__main__':
    main()
