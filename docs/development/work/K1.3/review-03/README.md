# Review 03 evidence

Subject: K1.3 correction round 2 at H `47c0b7f1c089260991649a6d814ad7db22b54a2f`, over C `c7abff65ceca3e3b21fd64ffee12ea2f636f5cbc`, base B `22c8c1db9958049eb8693dd5aa4d7005f2d565db`.

Run from an exact-H checkout with its locked dependencies and Node 26.10.0. The reviewer used `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin/node` on Darwin arm64. These commands reproduce the targeted evidence, not the composed packet verify. `EVIDENCE` below points to this directory in the review checkout; the candidate source remains at H. The new scripts dynamically import the candidate's files from the working directory and make no source edits. Their temporary in-process hooks are restored when finished.

```sh
EVIDENCE=/absolute/path/to/review-checkout/docs/development/work/K1.3/review-03
cd /absolute/path/to/exact-H-checkout
node --version
git rev-parse HEAD

node --experimental-strip-types --no-warnings --test \
  packages/kernel/tests/owner-guards.test.ts \
  packages/kernel/tests/owner-successor-search.test.ts \
  packages/kernel/tests/control-commits.test.ts \
  packages/kernel/tests/fault-oracle.test.ts \
  packages/kernel/tests/waits-*.test.ts \
  packages/kernel/tests/cancellation.test.ts \
  packages/kernel/tests/execution-deadline.test.ts \
  packages/kernel/tests/losing-outcomes.test.ts \
  packages/kernel/tests/ambient-time.test.ts \
  packages/kernel/tests/race-search.test.ts \
  docs/development/work/K1.3/attack-01/*.test.mjs

node --experimental-strip-types --no-warnings --test \
  packages/kernel/tests/state-plans.test.ts

node --experimental-strip-types --no-warnings --test \
  docs/development/work/K1.3/review-01/guard-probe.test.mjs \
  docs/development/work/K1.3/review-02/guard-search.test.mjs \
  docs/development/work/K1.3/review-02/owner-matrix.test.mjs

node --experimental-strip-types --no-warnings \
  packages/kernel/tests/race-search/run.ts
node --experimental-strip-types --no-warnings \
  docs/development/work/K1.3/review-01/extra-search.mjs
node --experimental-strip-types --no-warnings "$EVIDENCE/additional-search.mjs"
node --experimental-strip-types --no-warnings "$EVIDENCE/interrupted-commit.mjs"

python3 -B "$EVIDENCE/rerun-mutants.py" "$PWD"
python3 -B "$EVIDENCE/rerun-mutants.py" "$PWD" oracle.losingWindowAt
```

The historical-probe command intentionally exits 1: 16/17 pass, while the old position matrix expects 12 accepted exact covers. Approved whole-batch acknowledgment now permits only 2. The maintained successor search separately runs all 2,257 historical position rows with the corrected expectation, and all 15 generation rows remain named controls. Do not edit the historical probe to conceal the difference. All other commands above exited 0.

The selector uses H's `packet_tools.py` and registry blobs, filtering only `k13.*` (or the one explicitly selected oracle case). It does not alter the registry or mutant bodies. The maintained runner requires a Git checkout and physical dependency files; the successful mutation runs used a separate shared exact-H clone with existing locked dependencies copied, rather than a symlink. No install or dependency change was made.

`race-search.log` is the full maintained declared search: 456,976 exhaustive depth-4 words plus 20,000 supplementary length-12 words. Its inapplicable-letter skips and supplementary seed values are retained. `extra-search-r01.log` reruns the previous review's additional assertions over the exhaustive words. `additional-search.log` and `interrupted-commit.log` correspond to the independent new scripts beside them.

CI was downloaded, not rerun locally:

```sh
gh run download 40605040929 --repo ArrokothI/arrokothi --dir /absolute/path/to/download
gh run view 40605040929 --repo ArrokothI/arrokothi \
  --json headSha,status,conclusion,workflowName,url,createdAt,updatedAt,jobs
```

`ci-verify.json.gz` decompresses to the exact downloaded `verify.json`, including nested outputs and limits. `download-manifest.json` records original byte lengths and SHA-256 values for all four downloaded artifact files. The GitHub metadata is `ci-run.json`. `source-manifest.json` records every B..H path's B/H blobs and hashes; `cumulative.patch.gz` is the full binary-capable `git diff --binary B H`. `identities.json` includes the patch's uncompressed SHA-256, prerequisites, process-file identity and administrative-only C..H delta.

`cumulative-diff-check.log` records two pre-existing trailing spaces in review-01's retained `coverage-comparison.log`. These are historical evidence, outside the defect gate, and were preserved. The review's own staged check reports only those same two raw lines in the saved output; authored Markdown and probes pass.

To verify retained files from this directory:

```sh
shasum -a 256 -c SHA256SUMS
```

`SHA256SUMS` covers every evidence attachment except itself. The review text is outside this directory. The full Git recording commit binds the text and bundle together; its SHA is reported in the handoff.

Evidence remains bounded: inventory/adoption completeness is false, V-ENV witness holds remain, the CI profiles not run are not credited, the source guards are not general adversarial-program analyzers, and interrupted commits are not atomic recovery. No third-party code was incorporated by this review.
