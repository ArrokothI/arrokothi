# Review 05 evidence

Independent Codex review on 2026-11-13, Europe/Berlin. Subject H is
`e307943d6b315e724e49107c3b26a1100ef4916c`; this directory records observations, not a product change.
See [the review](../review-05.md) for identity, scope, interpretation and verdict.

## Source and environment

Fresh network clone of `https://github.com/ArrokothI/arrokothi.git` into
`/Users/linzhenglin/Desktop/ArrokothAI/k1.4-review-05-fresh`, initially checked out at H with a clean tree.
Branch `codex/k1.4-review-05` was created directly from H. No review branch was merged.
Node v26.10.0, npm 11.19.1, TypeScript 5.9.3 from `npm ci`; macOS 15.6.1 (24G90),
Darwin 24.6.0 arm64, Mac16,8 / Apple M4 Pro / 48 GiB, hostname `localhost`.
OS operator `linzhenglin`; GitHub CLI 2.104.0 authenticated as `chrizeroxtwo`.
`gh auth status` returned 0 using the existing GitHub credential via GH_TOKEN. No credential is retained here.

`npm ci --cache /private/tmp/k14-review05-npm-cache` exited 0 (190 packages added).
The selected runtime was `/Users/linzhenglin/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin/node`.
No dependency/package/lockfile changes were made.

The pinned review input is `8ca7288b041d376dad7a8c12f083e43427bbb101`, read using `git show`:
`review-04.md`, `review-04/brief-05.md`, `review-04/probes.mjs` and its recorded trace.
`prior-probe.mjs` is byte-for-byte that probe (Git blob
`95a75e11221601b9ac3a061abf296e62bbd52fa4`), copied at the same directory depth to preserve its imports.
It is attributed to review 04, not claimed as a new review-05 counterexample.

## Reproduce local observations

From this clone's root, select Node v26.10.0 and run:

```sh
node docs/development/work/K1.4/review-05/preserve.mjs
python3 -B scripts/packet_tools.py candidate --payload 72d452bb39e0ae0f846d85e273441d06a9cd22fb --head e307943d6b315e724e49107c3b26a1100ef4916c --spec docs/development/work/K1.4/verification.json
node --test --experimental-strip-types --test-reporter=tap packages/sdk/tests/bridge-*.test.ts
node --test --experimental-strip-types --test-reporter=tap docs/development/work/K1.4/review-05/prior-probe.mjs
npm run check:builder-docs
python3 -B docs/development/work/K1.4/review-05/inspect-ci.py
```

All six exited 0. Outputs are respectively `preserve.jsonl`, `candidate.json`, `bridge-suites.log`,
`prior-probe.log`, `builder-docs.log` and `ci-inspection.json`. Bridge corpus: 259 tests / 19 suites;
prior probe: 1 test; both have zero failures, cancellations, skips or TODOs. Builder check:
75 Markdown files, 2,290 local links/anchors and 58 public package imports. It is a navigation guard,
not a semantic prose oracle. The final review's local links were also checked separately.

`preserve.mjs` independently traverses parsed AST nodes and exact token text, excluding JSDoc;
it also compares emitted JavaScript with comments removed. It checks every changed production source,
the full source-file inventory, the exact changed-file set, protected paths, verification keys, and dated
insertions into historical records. Controls distinguish changed literals and automatic-semicolon-insertion
structure, while ignoring a comment-only edit. It does not claim a general static-analysis guarantee.
All comparisons use pinned Git objects, so the recording commit does not alter the compared candidate.

## Existing CI, independently downloaded

- Run [43131441604](https://github.com/ArrokothI/arrokothi/actions/runs/43131441604), job
  [130896285058](https://github.com/ArrokothI/arrokothi/actions/runs/43131441604/job/130896285058).
- Artifact **13912370616**, `packet-verify-72d452bb39e0ae0f846d85e273441d06a9cd22fb`.
- Original ZIP SHA-256: `bb0c66324851f55cf0fb2548084f01d3e052adb04c37e2fe3f18351e4d17eda1`.
  Exact downloaded bytes are retained as `ci-artifact.zip` (3,066,462 bytes); digest matches GitHub metadata.
- Downloaded via authenticated `gh api` for the job's `/logs` and artifact's `/zip` endpoints.
  CLI required `--allow-escape-sequences` to save the job log with its terminal formatting.
  `ci-revision.log` preserves the unmodified REVISION/checkout/Node lines from that log.
- `ci-run-metadata.json` and `ci-artifacts.json` preserve API observations; `ci-summary.json` and
  `ci-run.txt` are exact copies from the ZIP. The raw `verify.json` and stdout/stderr are inside the ZIP.
- The workflow runs from `main` at B, but its job log and artifact bind the tested revision to C.
  `inspect-ci.py` counts **19/19** directly from `summary.json`'s `checks` array, checks the raw verify
  identity/results, and counts mutation records: **339 + 358 + 238**, all killed and non-invalid.
- `run.txt`: Linux x86_64, Node v26.10.0, npm 11.19.1, Python 3.13.18; start
  2026-11-12T01:01:00Z, finish 2026-11-12T03:12:11Z, exit 0.
- GitHub currently expires the artifact on 2027-02-10T01:00:37Z. The repository owner retains the ZIP in
  this review commit beyond that expiry; do not substitute a summary/hash for these raw observations.

No CI dispatch, rerun, full local Packet verify, integration or successor release occurred.
Earlier implementation logs retain their actual revision attribution. This review does not relabel them
as H executions. The H reruns above are separate from the existing CI at C.
