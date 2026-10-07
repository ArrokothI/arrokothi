# Design-check 03 evidence

Subject `2690166797e80c6446be3308e736fbd363406f16`, contract revision 10,
owner choice 10 and the owner's 2026-10-07 answers. See the [standalone report](../design-06-check-03.md).
The report/evidence branch contains no implementation. Scratch commits below are local experimental
identities, not candidate C/H and not commits pushed to the owner branch.

| Evidence | Fresh observation |
|---|---|
| [original-81.txt](original-81.txt) | The supplied `probe_safe_positions.py` ran unchanged: 81 cases, zero unexpected, exit 0. It parses, not executes, its examples. |
| [probe_extended.py](probe_extended.py), [summary](extended-summary.json), [full results](extended.json) | 515 independently generated cases; survey, helper parse diagnostics and actual register output. 216 wrapper/position/value cases, 141 argument-admission cases, 94 all-root alias cases, 15 identity cases, 19 sibling cases, 26 table controls and four semantic observations. All parse diagnostics zero. Nine unmet expectations are recorded, not suppressed. Script exit 0 means collection completed. |
| [probe_credit.py](probe_credit.py), [credit.json](credit.json) | Five runtime cases passed; five victim leaves incorrectly `preserved`, with no victim register entry. Four poison leaves correctly held. Actual `hold_register`, `preserved_census`, `preserved_table` used. Script assertions require these exact counterexamples to reproduce. |
| [table-audit.md](table-audit.md), [table-runtime.mjs](table-runtime.mjs), [runtime output](table-runtime.json) | Per-row argument/result/no-write analysis; selected fresh/primitive controls, all ten constant descriptors, callback mutation/escape and non-fresh result counterexamples. Exit 0. |
| [measure.txt](measure.txt), [measured.json](measured.json) | Supplied `measure.py --write` freshly regenerates scratch fixtures. Exit 0. |
| [check_figures.py](check_figures.py), [figure-check.json](figure-check.json) | Independent read-only reconciliation: exact status counts, rule-1 count, 32 relinks, unchanged origin states/transfer set, 53 closures with witnesses, nine operator-only members listed, two owner-answered held members listed. Exit 0. |
| [corpus.json](corpus.json), [corpus-summary.json](corpus-summary.json), [stderr](corpus.stderr) | Fresh full `corpus` command at scratch `f22c4ad550ed9c6938c06138b5a8bdd49d15b213`: exit 0, empty stderr, `revalidation_complete`. Summary equals the supplied measured summary exactly. Raw JSON retains per-target refusal/credit evidence. |
| [manifest.json](manifest.json) | Subject, runtime, exact prototype/source identities and SHA-256 of delivered evidence. |

The nine target refusals are `dispatch:369,1173,1211,1256,1283,1363,1401,1426` and `values:115`
(historical member/target identities); each refusal list contains only P1-H. The `1363` and `1426`
targets are the two existing mappings; the other seven are new extras. No target-set kills are
earned. The nine operator-only historical members are listed separately in `figure-check.json`;
they are not these nine mapping targets.

**Reproduction.** Use a private clone with full required history and Node exactly v26.10.0 first
in PATH. `REVIEW` below is the absolute path to this evidence directory in the review clone;
`PROTOTYPE` is a new disposable clone. Do not apply the prototype to the review checkout or to
the owner's working checkout.

```sh
export PATH=/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin:$PATH
node --version
export REVIEW=/private/tmp/arrokothi-tools01-check03-20261007/docs/development/work/TOOLS-01/design-06-check-03
export PROTOTYPE=/private/tmp/arrokothi-tools01-check03-prototype
```

These preparation operations were run in the separate prototype clone:

```sh
git checkout --detach 60af5db9368f12451a3fe8a108511419316a5828
git apply "$REVIEW/../design-06-r4/prototype.diff"
npm ci --ignore-scripts
git add scripts/packet_tools.py tests/tooling/source-facts.mjs
git -c commit.gpgsign=false commit -m 'Scratch: apply exact design 06 revision 4 prototype for independent check'
```

That produced local scratch `011e2b04c15fadb8335a9d03477712b21f01c8d0`. The unchanged supplied
probe, independent probes and supplied regeneration commands were:

```sh
python3 -B "$REVIEW/../design-06-r4/probe_safe_positions.py" "$PROTOTYPE" > "$REVIEW/original-81.txt"
python3 -B "$REVIEW/probe_extended.py" "$PROTOTYPE" "$REVIEW/extended.json" > "$REVIEW/extended-summary.json"
python3 -B "$REVIEW/probe_credit.py" "$PROTOTYPE" "$REVIEW/credit.json"
node "$REVIEW/table-runtime.mjs" > "$REVIEW/table-runtime.json"
python3 -B "$REVIEW/../design-06-r4/measure.py" "$PROTOTYPE" "$REVIEW/measured.json" --write > "$REVIEW/measure.txt" 2>&1
```

The probes create and destroy their own fixture repositories/processes. `probe_credit.py` uses
the repository fixture's synthetic A10 record with `order_model_holds=false`; it is not a fresh
floor certification. Matrix/admission sources are syntax probes, including some expressions that
would throw if executed. Only `probe_credit.py`'s five complete tests and `table-runtime.mjs`'s
runtime assertions are claimed executed independently of the full corpus command.

Commit the two regenerated fixtures in the prototype clone before `corpus` (this produced local
scratch `f22c4ad550ed9c6938c06138b5a8bdd49d15b213`):

```sh
git add tests/fixtures/packet-tools/adoption.json tests/fixtures/packet-tools/mutations.json
git -c commit.gpgsign=false commit -m 'Scratch: regenerate r4 measurement fixtures'
git rev-parse HEAD
python3 -B scripts/packet_tools.py corpus --revision f22c4ad550ed9c6938c06138b5a8bdd49d15b213 --spec tests/fixtures/packet-tools/adoption.json > "$REVIEW/corpus.json" 2> "$REVIEW/corpus.stderr"
python3 -B "$REVIEW/check_figures.py" "$PROTOTYPE" "$REVIEW/figure-check.json"
```

A reproducer substitutes its newly created full 40-character scratch SHA in that last `corpus`
command. A first invocation with `--revision HEAD` was correctly refused before execution;
the successful invocation above uses the exact SHA. Scratch identities vary with commit metadata.
The supplied `measured.json` also contains a run-set-only identity comparison; that unadopted
alternative was not rerun.

**Collection corrections and limits.** The first independent matrix attempt used `line` where
the helper schema uses `location.line`; corrected before producing the delivered results. A first
table-runtime callback attempted a property write on its subsequent primitive value; it was
restricted to the root callback, then all assertions passed. Later matrix/credit reruns add
coverage for every table root and the explicitly requested legacy global getter. No prototype
source change was made to obtain any result. No full `verify`, typecheck, broad repository test,
live-provider or coarse-rule implementation run is claimed.

Dependencies are the repository's unchanged lockfile installation, scripts disabled. TypeScript
5.9.3's pinned file digests are checked by the repository helper. Existing license/notice files stay
in that installation. New attachments contain independently authored probes, repository-derived
observations and source references; they vendor no third-party source or assets.
