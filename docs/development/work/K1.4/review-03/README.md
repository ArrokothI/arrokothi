# Review 03 evidence

Subject H `b1769c0fcdb73bfc6297551b87f80e74bc6cb588`, payload C
`3e8b4bac60266fda3e277ae0dd381c4936e15ff3`, base B
`608f9ece44dbe42b78974bdac9e7ddcd33697705`. See [the review](../review-03.md) and
[the recorded-limit brief](brief-04.md). This directory records independent reviewer executions;
it does not change the candidate's implementation or acceptance state.

## Reproduction and expected results

Use an isolated checkout of H with its workspace dependencies installed, and copy this directory to
`docs/development/work/K1.4/review-03/`; do not merge a review branch into the candidate.
Run from the repository root with Node v26.10.0 on PATH. The recorded local runs used
`/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin`, Darwin arm64 and the workspace's
existing dependencies. No package, lockfile or production-source edit was retained.

```sh
python3 -B scripts/packet_tools.py candidate --payload 3e8b4bac60266fda3e277ae0dd381c4936e15ff3 --head b1769c0fcdb73bfc6297551b87f80e74bc6cb588 --spec docs/development/work/K1.4/verification.json
node --experimental-strip-types --test packages/sdk/tests/bridge-*.test.ts packages/sdk/tests/wrapper-environment.test.ts packages/kernel/tests/binding-surface.test.ts tests/conformance/architecture/legacy-bridge-boundaries.test.ts tests/conformance/architecture/legacy-mapping.test.ts tests/conformance/architecture/kernel-landing-zone.test.ts tests/conformance/architecture/builder-docs-anchor.test.ts
node --experimental-strip-types --test docs/development/work/K1.4/review-03/prior-review01-probes.mjs docs/development/work/K1.4/review-03/prior-probes.mjs
python3 -I docs/development/work/K1.4/implementation-03/ablate.py
python3 -I docs/development/work/K1.4/review-03/prior-hold-mutant.py
node --experimental-strip-types --test docs/development/work/K1.4/review-03/d04-attacks.mjs
node --experimental-strip-types --test docs/development/work/K1.4/review-03/probes.mjs
```

| Output | Exit / expected observation at H |
|---|---|
| `candidate.json` | 0; `facts_verified`, exact B/C/H and administrative allowlist |
| `targeted.log` | 0; 489 tests pass, 42 suites, zero failures/cancellations/skips/TODOs |
| `prior-probes.log` | 0; all ten prior-review probes pass |
| `implementation-ablations.log` | 0; all five removed-fix variants caught, each unmodified control passes |
| `prior-hold-mutant.log` | 1; 487 pass, two fail (T13 and its logged baseline): the formerly surviving hold mutant is now caught |
| `d04-witnesses.log` | 1; both historical defect assertions fail: child now completes, and the failed cleanup now reports a hold |
| `probes.log` | 1; eight tests, three pass and five fail: see below |

The new `probes.mjs` has two cleanup-completion assertions that fail, three passing paired runs that
prove the cancellation labels are non-equivalent under one failed request cascade, and three
fail-closed census assertions that fail. A passing non-equivalence witness is evidence of an omitted
row, not a passing equivalence. Each injected failure is selected by the actual port call's stack,
and the tests assert that the injection happened exactly once. Census probes extract and execute the
candidate's exact census function through the installed TypeScript compiler API. They add source
strings, not production edits.

Run prototype and source-ablation commands sequentially in an isolated checkout.
`prior-hold-mutant.py` edits one source site and restores its exact bytes in `finally`;
`implementation-03/ablate.py` uses temporary copies. Prototype replacements in probes are restored in
`finally`. The final production diff was empty. Logs are fresh executions from this review, not copied
historical output. The local log files retain the test runner's output, including expected failures; trailing whitespace
was removed from six lines in `d04-witnesses.log` and `prior-hold-mutant.log` for the repository whitespace check.

## Prior-record provenance

- `prior-probes.mjs` and `prior-hold-mutant.py` are byte-for-byte copies of review 02's `probes.mjs`
  and `hold-mutant.py` at `b655733b9b90810eca747c61b8f2095f5f201341`.
- `prior-review01-probes.mjs` is byte-for-byte review 02's `review01-probes.mjs` at that same commit.
  Review 02 had rebound the original review-01 stack selector from `LegacyDriver.lineage` to
  `LegacyDriver.collect`; no assertion was changed here.
- `d04-install-design.mjs` and `d04-attacks.mjs` were extracted from the embedded scripts in
  `design-check-04.md` at `dc21f8e989b0828a236d65d3988eb9ade5391af3`. Their `@ROOT@` placeholders are
  rebound to this checkout via `import.meta.dirname`. **The prototype installer was read and retained,
  not applied to H.** Only the attacks ran, against the real candidate, with their old defect assertions.
- The implementation ablation runner is the candidate's existing file at H; it was not modified.

All added probes are reviewer-authored or reused repository review material. No external dependency,
third-party source or asset was added. TypeScript is an already-installed repository dependency.

## External verification evidence

The independently inspected [run 42528215484](https://github.com/ArrokothI/arrokothi/actions/runs/42528215484)
and [job 128876429472](https://github.com/ArrokothI/arrokothi/actions/runs/42528215484/job/128876429472)
check out C. `ci-revision.log` preserves the job's REVISION lines and checkout line. The workflow's
metadata SHA is distinct from the explicitly requested, logged and checked-out revision.

`ci-summary.json` and `ci-run.txt` are exact downloaded bytes from artifact **13640786681**,
`packet-verify-3e8b4bac60266fda3e277ae0dd381c4936e15ff3`.

| Payload | SHA-256 |
|---|---|
| Downloaded artifact ZIP | `50929a69652b23e0cd0191532f0a39265b8aa44d929e4894b76fdabbdc4f4644` |
| `summary.json` | `8efbe7600e62dac939be0de0f80958e2236fd685b0fbff7d61eb556821015625` |
| Full `verify.json` | `e0b2bd26e4e74f48036c0381bd3625dd91cb1edf6a12b36aeba6a6fa0e3e6cf1` |
| `run.txt` | `eb4ac83f9e881796249636a60be3ca3532b2bd32365dd5f16fbec7a920ea4c20` |

The downloaded summary array contains **19 checks, all 19 `passed: true`, result `checks_passed`**.
The full raw payload was independently inspected: repository tests 5,034, archive tests four,
example tests 18, tool tests 777; registered mutation counts 339 + 358 + 238 killed.
The area gate says `reported`, not E1 acceptance. CI used Node v26.10.0, npm 11.19.1,
Python 3.13.18, Linux x86_64, four CPUs; start `2026-11-08T22:03:13Z`, finish
`2026-11-09T00:14:08Z`, exit zero.

Full `verify.json`, `verify.stderr.log` and the ZIP remain in the pinned external artifact, owned by
repository CI retention, with advertised expiry **2027-02-06T22:02:52Z**. These linked artifact
identities and digests, rather than an inaccessible temporary download path, bind that raw evidence.
The preserved summary and run metadata do not replace the raw payload. Archive retention must preserve
it before expiry if continued access is needed.

No workflow dispatch, full verify or CI rerun was performed by this review. CI's clean install/Linux
results are independently inspected evidence, distinct from the local focused reruns above.
