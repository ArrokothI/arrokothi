# Review 11 evidence

Subject: B `a20d278185eaffc7f8b7489345a3624231ff6e6d`, C
`58d9c5c50ff3561c9f7b719a84acfd0b0d5d4d9f`, H
`dcac779bdf7e887bcf42c8a6407c1b24c2083a55`. These files preserve the independent review's scripts
and raw outputs. The reviewed implementation is unchanged. `MANIFEST.sha256` uses repository-relative
paths and includes the review and separate owner note, but not itself.

## Source and reproducibility

The repository's available pinned Git objects are the retained full source, including surrounding
tests and documents. Full binary diffs were obtained locally with `git diff --binary B H` and
`git diff --binary 35c6ba0277542236f21f95d695154fa0164feb96 H`; their hashes/sizes are recorded in
`source-identity.json`. Avoid treating the path lists or this README as substitutes for source.
No duplicate 30 MB historical-log patch is added to the repository.

Exact scripts as executed preserve scratch paths. For a fresh reproduction, use a disposable
environment: export H with `git archive` into `/tmp/arrokothi-review-r8`, supply its installed
dependencies as `node_modules`, and copy this evidence directory's scripts to
`/tmp/arrokothi-r8-review-evidence`. Existing archived results should be preserved elsewhere before
using that scratch output directory. The original run used the main checkout's installed
dependencies through a symlink, Node 25.2.1, npm 11.6.2 and TypeScript 5.9.3. Main checkout path in
`verify-identity.py` is recorded literally; adjust only that path for a different local checkout.

From the scratch directory, the probe commands are:

```sh
node --experimental-strip-types probe-independent.mjs /tmp/arrokothi-review-r8
node run-mutants.mjs
node run-read-mutant.mjs > read-mutant-result.json
node --experimental-strip-types probe-read-runtime.mjs > read-runtime-results.json
node run-faults.mjs > fault-results.json
node --experimental-strip-types probe-recovery-matrix.mjs --expect-correct
node --experimental-strip-types probe-whole-view.mjs
```

Capture stdout/stderr separately or together as appropriate; `probe-independent.json` is its stdout.
The full-suite mutation runners create temporary copies and record their paths. The runtime and
fault runners consume those freshly generated result files, so run them in the order above. The
whole-view and recovery probes originate in reviews 10 and 09 respectively; import/output paths
were adapted, while assertions were preserved. The whole-view script writes its JSON to the scratch
evidence directory. Main H validation used `npm test`, `npm run typecheck`,
`npm run check:builder-docs` and `node docs/development/work/K1.2-correction-01/check-records.mjs`.

The analyzer-only default-parameter variant replaces the receipt builder; the full-suite variant
inserts the helper after the original builder so existing source-anchor probes still operate.
Both variants and their outputs are explicitly preserved. The fault runner inserts an exception
before Activation construction in clean and mutant copies. It is a scoped construction-fault probe,
not a process-kill or memory-exhaustion experiment.

## Interpreting the records

- `identity.json` describes the clean candidate before reviewer artifacts were created. Its verifier
  reads the current working tree for local manifests/status; rerunning after recording this review
  will naturally include extra artifacts. Candidate objects remain pinned in the script.
- `submitted-log-audit.json` summarizes inspected implementation-07 evidence; it is not a rerun.
- `npm-test.txt` and the three `*-suite.txt` files are independent reruns. Their counts respectively
  show clean H passing 3,465 tests and each mutant passing all 1,411 Kernel tests.
- `fault-results.json` shows equal immediate public views but different next receipt positions;
  `read-runtime-results.json` shows the inherited getter's distinct count/throw/reentry effects.
- `coverage-before-report.md` preserves the initial revision-7 coverage and the revision-8 addendum,
  including the acknowledged report-exposure limitation.
- `claim-search-expanded.txt` is navigation evidence followed by source inspection, not semantic
  proof from text matching. `claim-search-command.json` records the exact argument vector and exit;
  review 11 explains the searched aliases and their interpretation.
- `remote.txt` records the unavailable live remote lookup. Local source and required immutable
  evidence remained available; no push status is inferred from cached refs.

All prior candidate/review records remain unchanged. No manifest identity converts test success into
semantic proof or extends the review to a later administrative commit.
