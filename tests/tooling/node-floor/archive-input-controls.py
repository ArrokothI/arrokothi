#!/usr/bin/env python3
"""Reject a changed, missing, additional or retyped entry in the pinned snapshot."""
import importlib.util
import json
from pathlib import Path
import tempfile

spec = importlib.util.spec_from_file_location('floor', Path(__file__).parents[1] / 'check-node-floor.py')
floor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(floor)

with tempfile.TemporaryDirectory(prefix='tools-01-archive-control-') as temporary:
    snapshot = Path(temporary) / 'snapshot'
    snapshot.mkdir()
    original = floor.prepare_archive_snapshot(snapshot)
    rejected = []

    def refuses(label):
        try:
            floor.verify_archive_snapshot(snapshot)
        except AssertionError:
            rejected.append(label)
        else:
            raise AssertionError('accepted changed archive: ' + label)

    sample = snapshot / 'docs/development/work/K1.0/validation-01/MANIFEST.md'
    data = sample.read_bytes()
    sample.write_bytes(data + b'\nchanged\n')
    refuses('changed bytes')
    sample.unlink()
    refuses('missing file')
    sample.write_bytes(data)
    extra = snapshot / 'unexpected-floor-input'
    extra.write_text('extra')
    refuses('extra file')
    extra.unlink()
    link = snapshot / '.claude/skills/arrokothi-architecture'
    target = link.readlink()
    link.unlink()
    link.write_text(str(target))
    refuses('symlink replaced by file')
    link.unlink()
    link.symlink_to(target)
    assert floor.verify_archive_snapshot(snapshot) == original

print(json.dumps({'verified': original, 'refused': rejected}))
