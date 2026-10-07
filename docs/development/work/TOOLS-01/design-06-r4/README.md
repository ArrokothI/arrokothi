# Design 06 revision 4: prototype and measurement

Scratch evidence for [design 06](../design-06.md) revision 4. It is not the build, and it earns no credit.

- [prototype.diff](prototype.diff) applies to `60af5db9` (`git apply`). It contains the safe-position
  `ambientMatches` and a `survey` operation in `tests/tooling/source-facts.mjs`. It also changes one
  line of `limited_origins` in `scripts/packet_tools.py`: the C2-LIMIT reading behind the revision's
  owner question, which counts a listed member as refused or rule-1 held.
- [probe_safe_positions.py](probe_safe_positions.py) `<clone>` parses 81 cases and executes none. It
  exits 0 only when every hazard matches and every control does not.
- [measure.py](measure.py) `<clone> <log.json> [--write]` regenerates the manifest the way design 06's
  build did and logs the figures. With `--write`, commit the two rewritten fixtures, then run
  `python3 -B scripts/packet_tools.py corpus --revision <that commit> --spec tests/fixtures/packet-tools/adoption.json`.
- [measured.json](measured.json) holds the logged figures and that `corpus` summary.

Reproduce, with Node v26.10.0 first in PATH:

1. Clone at `60af5db9`, apply the diff and commit.
2. Add `node_modules` with `npm ci --ignore-scripts`.
3. Run the probe, then `measure.py --write`.
4. Commit the two rewritten fixtures and run `corpus`.
