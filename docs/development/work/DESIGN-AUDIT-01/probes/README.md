# Reproduce the audit evidence

Run from the repository root, with Python 3 and Node supporting native TypeScript stripping. The saved runs use Node v26.8.1, macOS arm64, `canonicalize@3.0.0` and the repository's installed TypeScript. No package installation, source edit or product test edit is performed by these scripts. Original R8 tools use scratch copies for mutations; outputs under this packet are audit evidence, not product tests.

```sh
python3 docs/development/work/DESIGN-AUDIT-01/enumerate.py --check
python3 docs/development/work/DESIGN-AUDIT-01/probes/catalog.py --check
python3 docs/development/work/DESIGN-AUDIT-01/probes/records.py --check
python3 docs/development/work/DESIGN-AUDIT-01/probes/measure.py --check
python3 docs/development/work/DESIGN-AUDIT-01/probes/reverify-exotics.py
python3 docs/development/work/DESIGN-AUDIT-01/probes/review08.py all
python3 docs/development/work/DESIGN-AUDIT-01/probes/mechanism-cost.py
node --experimental-strip-types --no-warnings docs/development/work/DESIGN-AUDIT-01/probes/exotic-consumers.mts
python3 docs/development/work/DESIGN-AUDIT-01/probes/source-map.py
python3 docs/development/work/DESIGN-AUDIT-01/probes/searches.py
python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean
```

The own-key probes deliberately exercise large allocations; the largest recorded cases return RangeError. `review08.py` isolates cases in child processes and records bounded timeouts. Its all mode takes several minutes and rewrites its output files; rerun measurements afterward to regenerate aggregates. Expensive observational outputs are sealed in C, with source hashes and commands, and are checked at clean C without rerunning timing samples just to get different numbers. Exotics and deterministic consumer probes can be rerun cheaply at C with output directed outside the checkout.

A successful reproduction of a known defect is not conformance PASS. N15 suite survival is an evidence failure; a timed-out mutant is not a suite kill. The ablation script changes only disposable copies, deliberately assumes cooperative values, and is not a proposed fix. The source-map/compatibility/claim searches are read-only locators. The catalog is a conservative superset, not a claim that every inventoried file is a distinct oracle.
