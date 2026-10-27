# K1.3 review 01 evidence

Subject H: `d05af3476b1523dadee0858373c0713610103419`; payload C: `db0d0fee95466edc7a527ef234a2170fb6fedebb`.
Reviewer runs used Node v26.10.0 on Darwin arm64. The original CI run used Node v26.10.0 and Python 3.13.16 on Linux x64. The review was finalized with client date 2026-10-27; run metadata preserves the original UTC timestamps.

`SHA256SUMS` covers every other evidence file. `download-manifest.json` separately records the sizes and SHA-256 digests of the original downloaded CI files, including the uncompressed `verify.json`. `ci-verify.json.gz` decompresses byte-for-byte to that original JSON. The review commit is the retention owner; no temporary directory is needed to read this evidence.

## Supplied full verification

Downloaded, not rerun locally:

```sh
gh run view 40387031804 --repo ArrokothI/arrokothi --json headSha,status,conclusion,url,jobs
gh run download 40387031804 --repo ArrokothI/arrokothi --dir <download-directory>
gzip -dc ci-verify.json.gz > <output-directory>/verify.json
```

The artifact name is `packet-verify-db0d0fee95466edc7a527ef234a2170fb6fedebb`. `ci-run.json` is the run metadata, `ci-summary.json` the downloaded summary, `ci-run.txt` the downloaded runner record, and `ci-verify.stderr.log` its stderr. `ci-verify.json.gz` retains full nested per-check results and output, not only the summary. The actual verify step ran 2026-10-26 19:28:40Z–21:10:51Z.

## Local checks

Run from a checkout of H with its locked dependencies and Node 26.10.0 first on PATH. The review scripts import candidate files from the current working directory. Replace `<evidence>` with this directory's absolute path.

```sh
node --experimental-strip-types --no-warnings --test \
  packages/kernel/tests/waits-*.test.ts \
  packages/kernel/tests/cancellation.test.ts \
  packages/kernel/tests/execution-deadline.test.ts \
  packages/kernel/tests/losing-outcomes.test.ts \
  packages/kernel/tests/ambient-time.test.ts \
  packages/kernel/tests/race-search.test.ts \
  docs/development/work/K1.3/attack-01/*.test.mjs
node --experimental-strip-types --no-warnings packages/kernel/tests/race-search/run.ts
node --experimental-strip-types --no-warnings <evidence>/extra-search.mjs
node --experimental-strip-types --no-warnings --test <evidence>/guard-probe.test.mjs
```

Outputs: `suites.log` (211 pass), `race-search.log` (456,976 exhaustive + 20,000 supplementary, 20 classes/37 witnesses), `extra-search.log` (456,976 runs with additional independent assertions), `guard-probe.log` (3 pass, **3 expected failures at H**, exit 1). The guard probe changes only plans passed through the same prototype seam used by the maintained owner-guard tests and restores the prototype after each call; it changes no repository source. Its last case uses the ordinary API and passes, demonstrating expiry with zero host fires. The extra search changes only observation methods to add assertions, restores them, and never changes candidate plans/state.

## Selected registry reruns

`rerun-mutants.py` imports the candidate's unchanged `scripts/packet_tools.py`, uses the full pinned revision H, and filters only the registry cases returned by the Git document reader. Default selection is `k13.*`; the other allowed selection is the new `oracle.losingWindowAt`. Source blobs, dependency digests, clean controls, mutation application and failure classification stay with the maintained runner.

```sh
python3 -B <evidence>/rerun-mutants.py <physical-checkout-at-H>
python3 -B <evidence>/rerun-mutants.py <physical-checkout-at-H> oracle.losingWindowAt
```

Outputs: `mutants.json` (12 clean controls and 12 kills), `oracle-mutant.json` (1 clean control and 1 kill), and their stderr files. The physical checkout requirement matters: the first setup attempt was refused by the runner because dependencies were symlinked; it was not counted as a kill. The successful runs used a detached temporary clone at H and a physical copy of the existing locked dependency tree. The runner's held `mechanism_witness`/`semantic_credit: none` classifications are retained in the raw JSON; this selected run claims no full-verify or universal conformance credit.

## Poison-scope comparison

`rerun-coverage.py` runs `race-search.test.ts` alone and the exact remaining poison-sweep scope with `NODE_V8_COVERAGE`, then invokes the candidate's `owner-choice-02/coverage-compare.py` in both directions. It excludes only `race-search.test.ts`, `fault-sweep.test.ts`, and `poison-catalog.test.ts` from the scenario run. It accepts an optional fresh output directory as its second argument; the recorded run used its default `/private/tmp/k13-review-01-evidence`.

```sh
python3 -B <evidence>/rerun-coverage.py <checkout-at-H> <fresh-output-directory>
```

Retained outputs: `coverage-race.log`, `coverage-scenarios.log`, `coverage-comparison.log`. A compact `coverage-offsets.json.gz` retains the per-file merged covered ranges derived from the raw V8 files, along with the exact comparison result in each direction. `coverage-manifest.json` records raw coverage-file hashes and sizes. This short comparison can be rerun; the original V8 files are not copied into Git. V8 offsets are source positions (UTF-16 units), called “bytes” by the owner's script; the set difference compares the same source revision and is unaffected by that label. This proves source-range inclusion, not value/order equivalence under poisoning.
