# Review 02 evidence

Subject: C `3e4c59faa7b6138693bb9094144cafff7a33158e`, H
`96214874577f2108a7578d1d6fcebc4af0f7173c`, base B
`608f9ece44dbe42b78974bdac9e7ddcd33697705`. See [the review](../review-02.md).

## Reproduction

Use an isolated checkout of C with workspace dependencies installed. Copy this directory into
`docs/development/work/K1.4/review-02/`; do not merge the review branch into the subject.
Prepend `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` to `PATH`.
Commands below run from that checkout's root:

```sh
node --experimental-strip-types --test docs/development/work/K1.4/review-02/review01-probes.mjs
node --experimental-strip-types --test packages/sdk/tests/bridge-*.test.ts packages/sdk/tests/wrapper-environment.test.ts packages/kernel/tests/binding-surface.test.ts tests/conformance/architecture/legacy-bridge-boundaries.test.ts tests/conformance/architecture/legacy-mapping.test.ts tests/conformance/architecture/kernel-landing-zone.test.ts tests/conformance/architecture/builder-docs-anchor.test.ts
python3 -I docs/development/work/K1.4/implementation-02/ablate.py
node --experimental-strip-types --test docs/development/work/K1.4/review-02/probes.mjs
python3 -I docs/development/work/K1.4/review-02/hold-mutant.py
```

The first three commands pass at C. `probes.mjs` has five tests: three pass and two fail on
the production lost-enqueue defect. Its hold-cascade test first checks the real implementation,
then requires the removed cascade to fail on a live parent/child. The last command survives:
412 maintained tests pass with the hold cascade removed. It restores the source in `finally`.
Do not run these prototype/source ablations concurrently in one process or checkout.

`review01-probes.mjs` is the original probe at
`0f415d6e016824ea9bddac0ca7aca3fd2d3accb5`, with exactly one replacement:
`LegacyDriver.lineage` → `LegacyDriver.collect` in its stack selector. No assertion or expected
result changed. The exact original's `observed` assertion fails because the old method was renamed;
both that output and the rebound run are retained. The maintained equivalent in
`bridge-observe.test.ts` uses the new selector and asserts that the intervention happened.

## External evidence

The independently downloaded [Packet verify run 42451451228](https://github.com/ArrokothI/arrokothi/actions/runs/42451451228),
job [128641343212](https://github.com/ArrokothI/arrokothi/actions/runs/42451451228/job/128641343212),
checks out C. `ci-revision.log` is an excerpt of that job's log, including its REVISION lines and checkout.
`ci-summary.json` and `ci-run.txt` are exact bytes from artifact 13608427277,
`packet-verify-3e4c59faa7b6138693bb9094144cafff7a33158e`.

- Downloaded ZIP SHA-256: `2a8afb2e6a2c53cd1692066619f8fbdd6b40cedcf1383d47d34cfc3b680baf7f`.
- Summary SHA-256: `4ea1b413555543f2e2223a826ba1081cd1aa00870b14fcb0677fc7cb5d2a078d`.
- Full raw `verify.json` and `verify.stderr.log` remain in the pinned external artifact;
  repository CI owns retention, advertised expiry `2027-02-06T05:36:37Z`.
- Summary contains 19 checks, all `passed: true`, result `checks_passed`. The independently
  inspected full payload reports 339 registered, 358 refusal and 238 value-cost mutants killed,
  all at C. The area gate's result is `reported`; it is not K14-G/E1 acceptance.

The full verify was not rerun. Local targeted checks used Node v26.10.0 on Darwin arm64 in a
detached worktree at C. Offline `npm ci` lacked a cached package; the existing workspace's installed
dependencies were copied to that worktree, preserving workspace links. Package sources and lockfile
were unchanged. CI's clean install and Linux run are independently inspected evidence, distinct
from these local reruns.

All attached probes/scripts are reviewer-authored or reused repository review material; no third-party
source, dependency or asset was incorporated by this review.
