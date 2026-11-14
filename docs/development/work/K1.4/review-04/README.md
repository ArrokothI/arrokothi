# Review 04 evidence

Subject H: `1b98a76e625ef187ba179fdad2e823ac4dabd521`; payload C:
`697922e251a572d0c96f7a02c1b646b607c351fc`; base B:
`608f9ece44dbe42b78974bdac9e7ddcd33697705`; previous reviewed H:
`b1769c0fcdb73bfc6297551b87f80e74bc6cb588`.
The parent [review record](../review-04.md) owns the verdict and interpretation.

## Existing CI, independently retrieved

- [Run 43088962951](https://github.com/ArrokothI/arrokothi/actions/runs/43088962951),
  [job 130760659762](https://github.com/ArrokothI/arrokothi/actions/runs/43088962951/job/130760659762).
- Artifact **13893544648**, `packet-verify-697922e251a572d0c96f7a02c1b646b607c351fc`, downloaded through
  the GitHub connector. ZIP SHA-256:
  `5f384df2d736bd9130c296a1defd810f252ae1a20a20aae1ce5be44d98a7fc5a`, matching the artifact metadata.
- `ci-summary.json` and `ci-run.txt` are exact downloaded files. `ci-revision.log` extracts the job's
  REVISION and checked-out HEAD lines. Workflow metadata says main/B; these lines and the raw verify
  payload establish that C was tested.
- Full `verify.json` was downloaded and inspected, including the three mutation results; it is retained
  in the existing Actions artifact rather than duplicated here. Its digest, the summary/run/stderr
  digests, counts and identity checks are in `evidence.json`. That file was produced by the attached
  `check-evidence.py`, not copied from the implementer report.
- GitHub reports artifact expiry **2027-02-09**. The repository owner owns retention of the full CI
  artifact before expiry under `docs/development/archive.md`; the review commit retains these compact
  observations and all reviewer probes. No ephemeral download URL is an evidence locator.
- No workflow was dispatched or retried, and no full local verify was run.

## Reviewer executions

All commands ran from the repository root against H's source, with the existing installed dependencies,
on Darwin arm64 using:

```sh
export PATH=/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin:$PATH
```

`candidate.json`:

```sh
python3 -B scripts/packet_tools.py candidate \
  --payload 697922e251a572d0c96f7a02c1b646b607c351fc \
  --head 1b98a76e625ef187ba179fdad2e823ac4dabd521 \
  --spec docs/development/work/K1.4/verification.json
```

`evidence.json` (last argument is the directory containing downloaded `summary.json`, `verify.json`,
`run.txt` and `verify.stderr.log`; download the existing artifact, do not start CI):

```sh
python3 -B docs/development/work/K1.4/review-04/check-evidence.py /tmp/k14-review04/ci
```

`targeted.log`, exit 0, **507 tests / 507 pass**, 43 suites, zero failed/cancelled/skipped/TODO:

```sh
node --test --experimental-strip-types --test-reporter=tap \
  packages/sdk/tests/bridge-*.test.ts \
  packages/sdk/tests/wrapper-environment.test.ts \
  packages/kernel/tests/binding-surface.test.ts \
  tests/conformance/architecture/legacy-bridge-boundaries.test.ts \
  tests/conformance/architecture/legacy-mapping.test.ts \
  tests/conformance/architecture/kernel-landing-zone.test.ts \
  tests/conformance/architecture/builder-docs.test.ts
```

`prior-probes.mjs` is byte-identical to review 03's `probes.mjs` at
`5e36d514fb10347a182bbeaa36879ce9074fe72a` (Git blob
`888cec1c3882fbef21a624d2194716031f0d89e9`). The copy preserves assertions and relative imports.
`prior-probes.log` is this review's new execution, not an old log: exit 1, **3 pass / 5 expected fail**.
The five failures are the deliberately unbuilt L-36/L-37 guarantees, not new regressions.

```sh
node --test --experimental-strip-types --test-reporter=tap \
  docs/development/work/K1.4/review-04/prior-probes.mjs
```

`oracle.jsonl`, exit 0: independently counted table and nine executions of the exact candidate F-row
helpers. `inspect-oracle.mjs` disables only test registration, exposes the candidate helpers and writes
a temporary transpiled module beside the original test for import resolution, removing it in `finally`.
It changes no production file, adds explicit native-state/fault-count checks, and checks restoration of
both prototype wrappers. The full maintained oracle already ran in `targeted.log`.

```sh
node --experimental-strip-types docs/development/work/K1.4/review-04/inspect-oracle.mjs
```

`probes.log`, exit 0, **1/1**: public `app.cancel`, one request-cascade failure, real successful fallback,
both members terminal, no hold. The test asserts observed behavior that contradicts the blanket prose;
passing it is not a proposed change to cancellation semantics.

```sh
node --test --experimental-strip-types --test-reporter=tap \
  docs/development/work/K1.4/review-04/probes.mjs
```

Implementation-04's five logs were read at H; their executions are explicitly distinguished from
reviewer reruns in the review. No older review disposition is reopened. No new third-party material,
dependency, service or vendored code was introduced.
