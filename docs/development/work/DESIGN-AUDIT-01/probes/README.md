Session: Codex desktop coding agent; GPT-6 per session instructions, exact serving variant unavailable. Access: local repository/history and supplied reference checkouts; sandboxed writes and restricted network with reviewed Git escalation; no original owner–Claude conversation or independent acceptance authority.

# Reproduce the audit evidence

For round 3 run only `python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean` (at H add `--C <full payload SHA>`). It includes all maintained round-1/2/3 regressions. Do not execute the historical R8 all-mode command below for this correction.

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

## Round 3 corpus contract

`corpus.py --check` reconciles 278 classified family labels and all 51 options, plus the 16 hostile labels and eight bindings. `round3-checks.py` runs declared expected observations from `hardening-corpus.json` and `review02-regressions.json`; all mutations run in disposable child processes. Known bad outputs are successful reproductions, not product conformance. It includes review-02 realm, brand, clone, validator-mutant and anchor scripts, with M7 now accepted. M2/M3/M5/M6 remain semantic-reading limits. The private transcript comparison cannot run without its source; its historical result remains evidence. Round-2 scripts retain the review-01 regressions and positive/frozen Kernel controls. No R8 timing rerun, SES installation or product suite is part of this audit profile.
