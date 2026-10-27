# Review 02 evidence — K1.3

Candidate H: `87db3c40c379d0d2186b16cfee9cc2b16d989a73`.
Payload C: `2454e8b702ea1bb2b12d9e0fe0f8b83f0f5e0d7c`.
Review date: 2026-10-27. This directory is review evidence, not a production patch.

## Contents and provenance

- `ci-run.json`: `gh run view 40456276499 --repo ArrokothI/arrokothi --json headSha,status,conclusion,workflowName,url,createdAt,updatedAt,jobs`.
- `ci-run.txt`, `ci-summary.json`, `ci-verify.stderr.log`: exact files from `gh run download 40456276499 --repo ArrokothI/arrokothi`. `ci-verify.json.gz` decompresses to the exact downloaded `verify.json`; gzip timestamp is zero. `download-manifest.json` records original uncompressed names, sizes and SHA-256 hashes. `SHA256SUMS` covers the files retained here.
- `identities.json`: full Git revisions and ancestry checked against H. `source-manifest.json` lists all 112 cumulative paths, the exact C..H administrative allowlist and unchanged process blobs.
- `targeted.log`: the combined required suites and original probes, 239 passing tests.
- `mutants.json`/`.stderr`: H's twelve `k13.*` cases run through the maintained registry runner; all clean controls pass and all twelve mutations fail their named assertions.
- `oracle-mutant.json`/`.stderr`: the added `oracle.losingWindowAt` case, clean control and named kill.
- `race-search.log`: full declared K13-9 search at H, plus the separately labelled supplementary walk and class witnesses.
- `guard-search.test.mjs`/`.log`: new reviewer counterexamples at the same internal `KernelState.prototype.apply` seam as maintained owner tests. Six wrong-disposition cases and two terminal-with-timeout cases should refuse under the promised S2 guarantee; **all eight assertions fail at H because no refusal occurs**. One ordinary terminal/registration positive test passes. Expected process exit at H: **1**.
- `owner-matrix.test.mjs`/`.log`: independently written bounded exact-cover and generation-freshness checks, 2 tests passing. Positions: sequences length 0–3 over eight numeric values, every split, two queued entries. Freshness: prior g1, candidate g0–g4, live/immediate wake/immediate expiry. Expected exit: 0.
- `clock-search.log`: bounded textual search of current description surfaces; multi-line surrounding context was also read. It is a search result, not proof about arbitrary spellings.
- `rerun-mutants.py`: review selector derived from this repository's review-01 selector, with H pinned. It imports H's maintained `scripts/packet_tools.py`, filters only the case IDs returned by `Git.document`, preserves each case and source blob unchanged, and calls the maintained mutations runner. It does not modify the registry on disk or award new evidence credit.

No composed verify was run locally. CI's full result was inspected per the user's instruction. Local runs used a detached exact-H clone with the repository dependencies available and Node v26.10.0 on Darwin arm64. Commands below assume `node` resolves to Node 26.10+ and `python3` is available. The review-only scripts are outside the candidate in the original execution, so candidate source and fixture bytes remain unchanged.

## Reproduction

Keep this evidence directory outside an exact-H checkout, or point `EVIDENCE` at the review branch while `CANDIDATE` names a separate H checkout. Install the checkout's existing dependencies if needed. Set these two paths, then run from the candidate root:

```sh
CANDIDATE=/absolute/path/to/exact-H-checkout
EVIDENCE=/absolute/path/to/review-02
cd "$CANDIDATE"
git rev-parse HEAD
node --version
node --experimental-strip-types --no-warnings --test \
  packages/kernel/tests/owner-guards.test.ts \
  docs/development/work/K1.3/review-01/guard-probe.test.mjs \
  packages/kernel/tests/waits-*.test.ts \
  packages/kernel/tests/cancellation.test.ts \
  packages/kernel/tests/execution-deadline.test.ts \
  packages/kernel/tests/losing-outcomes.test.ts \
  packages/kernel/tests/ambient-time.test.ts \
  packages/kernel/tests/race-search.test.ts \
  docs/development/work/K1.3/attack-01/*.test.mjs
python3 -B "$EVIDENCE/rerun-mutants.py" "$CANDIDATE"
python3 -B "$EVIDENCE/rerun-mutants.py" "$CANDIDATE" oracle.losingWindowAt
node --experimental-strip-types --no-warnings packages/kernel/tests/race-search/run.ts
node --experimental-strip-types --no-warnings --test "$EVIDENCE/owner-matrix.test.mjs"
node --experimental-strip-types --no-warnings --test "$EVIDENCE/guard-search.test.mjs"
```

The last command is intentionally red at H. Its stdout prints the actually committed state, queued IDs, disposition kinds and readiness before the missing-refusal assertion fails. The scripts restore the prototype method in `finally` and do not patch source files. Their plain frozen substitutions fit the declared plan field types; they are not hostile ingress values or a new public API.

Clock search:

```sh
rg -n -i 'fire.only|only when the host|take[s]? effect only|fireTimer|due at registration|due when it registers' \
  mental-model docs/development/002-implemented-kernel-baseline.md \
  docs/development/007-work-packets.md docs/development/017-known-limitations.md \
  docs/development/README.md docs/guides packages/kernel/src packages/sdk/README.md
```

Read the clock choice around `mental-model/rewrite-index.md:347` as well; the phrase crosses lines. Historical work records and legacy API descriptions do not override current Kernel owners.

Check retained bytes from this directory with `shasum -a 256 -c SHA256SUMS`. Decompress the CI raw JSON with `gzip -dc ci-verify.json.gz`; its uncompressed hash is in `download-manifest.json`. The review source and this manifest are retained in the same review commit; no external artifact expiry is required for inspection.
