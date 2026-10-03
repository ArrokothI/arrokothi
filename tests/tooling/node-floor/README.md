# Node v22.9.0 prerequisite probe

From the repository root:

```sh
python3 -B tests/tooling/check-node-floor.py --node /absolute/path/to/node-v22.9.0/bin/node
```

This currently checks **A1 only**, the first prerequisite in TOOLS-01 design 05 §6. The fixture
intentionally fails one assertion so that both passing and failing event metadata can be checked.
The probe's JSON separates that expected child exit from whether A1 passes. Exit 1 from the
Python probe means the metadata assumption failed; it is not mutation-kill credit.

Node v22.9.0 omits `details.type` on the fixture's leaf pass/fail events. The probe preserves that
failure rather than supplying a default. A2–A11 were not implemented or run after this stop.
These `.mjs` fixtures are outside the repository's `.test.ts` suite globs. See the packet's
[step-1 report](../../../docs/development/work/TOOLS-01/node-floor-01.md).
