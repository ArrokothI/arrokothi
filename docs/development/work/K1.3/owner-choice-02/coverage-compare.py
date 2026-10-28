"""K1.3 owner choice 02: Kernel source bytes covered by one V8 coverage run and not by another.

Usage, from the repository root, with Node v26.10.0 first on PATH:
    NODE_V8_COVERAGE=<a> node --experimental-strip-types --no-warnings --test packages/kernel/tests/race-search.test.ts
    NODE_V8_COVERAGE=<b> node --experimental-strip-types --no-warnings --test <every other poison-sweep file>
    python3 -B coverage-compare.py <a> <b> packages/kernel/src

A byte counts as covered when the innermost V8 block range containing it has a nonzero count. The
script prints, per file under packages/kernel/src, the bytes covered in <a> and not in <b>. Swapping
<a> and <b> is the control: the scenario files cover bytes the race search does not.
"""
import glob
import json
import os
import sys
from collections import defaultdict


def covered(directory):
    result = defaultdict(set)
    for path in glob.glob(os.path.join(directory, '*.json')):
        for script in json.load(open(path)).get('result', []):
            if '/packages/kernel/src/' not in script['url']:
                continue
            name = script['url'].split('/packages/kernel/src/')[1]
            ranges = [(r['startOffset'], r['endOffset'], r['count']) for fn in script['functions'] for r in fn['ranges']]
            if not ranges:
                continue
            counts = [0] * max(r[1] for r in ranges)
            for start, stop, count in sorted(ranges, key=lambda r: r[0] - r[1]):
                counts[start:stop] = [count] * (stop - start)
            result[name] |= {offset for offset, count in enumerate(counts) if count > 0}
    return result


def main(first, second, source):
    a, b = covered(first), covered(second)
    only = {name: sorted(a[name] - b.get(name, set())) for name in sorted(a)}
    only = {name: offsets for name, offsets in only.items() if offsets}
    for name, offsets in only.items():
        text = open(os.path.join(source, name)).read()
        runs, start, previous = [], offsets[0], offsets[0]
        for offset in offsets[1:]:
            if offset != previous + 1:
                runs.append((start, previous))
                start = offset
            previous = offset
        runs.append((start, previous))
        print(f'{name}: {len(offsets)} bytes only in the first run, {len(runs)} ranges')
        for start, stop in runs[:20]:
            print(f'   L{text.count(chr(10), 0, start) + 1}: ' + text[start:stop + 1].strip().replace(chr(10), ' ')[:110])
    print(f'files covered: first {len(a)}, second {len(b)}; files with bytes only in the first: {len(only)}')


if __name__ == '__main__':
    main(*sys.argv[1:4])
