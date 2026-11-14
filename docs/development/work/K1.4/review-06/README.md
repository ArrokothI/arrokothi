# Review 06 evidence

Independent review on 2026-11-14 (America/New_York) by a Claude Code desktop session, Claude Fable 5.2.
Subject H is `64c505bfee13cae340710942e69fe805723aaad9`, over C
`5b81a1b0cd9e73d7591ea23fd29195e24536d50d` and the cleanup head
`b153ccacb57c35652be3aeba43f47a48905e077b`. This directory records observations, not a product change.
See [the review](../review-06.md) for identity, the independence statement, scope and the verdict.

## Source and environment

A fresh network clone of `https://github.com/ArrokothI/arrokothi.git` in a session scratch directory,
checked out at H with a clean tree. The branch `codex/k1.4-review-06` was created directly from H. No
branch was merged.

- Node v26.10.0 and npm 11.19.1, from `~/.local/share/arrokothi/node-v26.10.0-darwin-arm64`;
  `npm ci` exit 0, 190 packages; TypeScript 5.9.3 from the lockfile; Python 3.13.5; Git 2.39.5.
- macOS 26.6.2 (25G83), Darwin 25.6.0, arm64; MacBookAir10,1, Apple M1, 8 cores, 8 GiB; hostname
  `MacBookAir`.
- OS operator `rex-shih`; GitHub CLI 2.102.0 authenticated as `Rex-Shih`. No credential is kept here.
- No dependency, package or lockfile change.

## Files

| File | What it is |
|---|---|
| `timer-paths.probe.mjs`, `timer-paths.log` | The review's SDK-level probe of the three timer paths and the queued-input exception; 5/5 |
| `executable-delta.mjs`, `executable-delta.log` | Ancestry, the exact changed-file set, syntax-tree and emit equality of the two changed sources, tree equality of everything executable, the spec's changed keys, the C..H allowlist and the preserved paths |
| `candidate.json` | The repository's own candidate check: `facts_verified` |
| `pinned-tests.log` | `owner-guards.test.ts`, `waits-registration.test.ts` and `bridge-deadline-cancel.test.ts`: 85/85 |
| `implementer-probe-rerun.log` | Implementation 06's unchanged probe, rerun: 2/2 |
| `sdk-tests.log`, `typecheck.log`, `builder-docs.log` | `npm run test:sdk` 787/787; `npm run typecheck` exit 0; builder docs passed |
| `claim-search.sh`, `claim-search.log` | The search of current pages for other copies of the corrected claims, and for anchors on the comment text |
| `prose-links.py`, `prose-links.log` | Every link on a line the correction added resolves at H: 3 of 3 |
| `inspect-ci.py`, `ci-inspection.json` | The CI artifact bound to C and counted |
| `ci-artifact.zip` | The exact downloaded artifact (3,066,802 bytes) |
| `ci-summary.json`, `ci-run.txt` | Exact copies from the ZIP |
| `ci-run-metadata.json`, `ci-artifacts.json`, `ci-revision.log` | GitHub API observations, and the unmodified REVISION, checkout and Node lines of the job log |

Every `*.log` header names H and the command. The logs are ignored by `.gitignore` and were force-added.

## Reproduce

From the clone's root at H, with Node v26.10.0 selected and `npm ci` done:

```sh
node docs/development/work/K1.4/review-06/executable-delta.mjs
python3 -B scripts/packet_tools.py candidate --payload 5b81a1b0cd9e73d7591ea23fd29195e24536d50d --head 64c505bfee13cae340710942e69fe805723aaad9 --spec docs/development/work/K1.4/verification.json
node --test --experimental-strip-types --test-reporter=spec docs/development/work/K1.4/review-06/timer-paths.probe.mjs
node --test --experimental-strip-types --test-reporter=spec docs/development/work/K1.4/implementation-06/due-at-registration.probe.mjs
node --test --experimental-strip-types --test-reporter=spec packages/kernel/tests/owner-guards.test.ts packages/kernel/tests/waits-registration.test.ts packages/sdk/tests/bridge-deadline-cancel.test.ts
npm run test:sdk
npm run typecheck
npm run check:builder-docs
sh docs/development/work/K1.4/review-06/claim-search.sh
python3 -I docs/development/work/K1.4/review-06/prose-links.py
```

All ten exited 0. `executable-delta.mjs`, `claim-search.sh` and `prose-links.py` read pinned Git objects
only, so the commit that records them does not change what they compare. The probe patches
`ExecutionCoordinator.prototype.fireTimer`, `ExecutionCoordinator.prototype.submitOutcome` and
`LegacyDriver.prototype.gate` inside its own process, to record answers and to hold one submission. It
changes no file and is not a maintained test.

The CI inspection needs the artifact in its own empty directory:

```sh
mkdir /tmp/k14-r06-artifact
unzip -q docs/development/work/K1.4/review-06/ci-artifact.zip -d /tmp/k14-r06-artifact
python3 -I docs/development/work/K1.4/review-06/inspect-ci.py /tmp/k14-r06-artifact
```

## Existing CI, independently downloaded

- Run [43569826480](https://github.com/ArrokothI/arrokothi/actions/runs/43569826480), job
  [132371569876](https://github.com/ArrokothI/arrokothi/actions/runs/43569826480/job/132371569876),
  attempt 1, `workflow_dispatch` on `claude/k1.4` while its head was C.
- Artifact **14106930394**, `packet-verify-5b81a1b0cd9e73d7591ea23fd29195e24536d50d`.
- ZIP SHA-256 `fef92b1228cd5e55aff73a87a4136cf689d3048eb828a061cf4f6ddd15f03449`, equal to the digest in
  GitHub's artifact metadata. It holds `run.txt`, `summary.json`, `verify.json` (27,539,047 bytes) and
  `verify.stderr.log`.
- Downloaded with the authenticated `gh api` artifact `/zip` endpoint; the job log with
  `gh run view --log --job`. The saved job log's SHA-256 was
  `dfcf56901d4d04b8f3176467d0d3be3568e95e13aa5505cf7ddd9e44bf4bdfd2`; only the excerpt is kept here.
- `inspect-ci.py` counts **19 of 19** from `summary.json`'s `checks` array. Eighteen are declared in C's
  spec and the nineteenth is the advisory `area-gate`. It also checks that `verify.json` and `run.txt`
  name C, and reads the mutation results: 339, 358 and 238 killed.
- `run.txt`: Linux x86_64, 4 CPUs, Node v26.10.0, npm 11.19.1, Python 3.13.18; started
  2026-11-14T07:10:47Z, finished 2026-11-14T08:35:33Z, exit 0.
- GitHub lists the artifact's expiry as 2027-02-12T07:10:28Z. The ZIP is kept in this commit so that the
  raw record of the verified payload outlives that date, as review 05 did for its C. The owner may
  move it under the retention policy.

No CI was dispatched or rerun, and no full local Packet verify was run. The local runs above are
separate from the CI run at C and are not presented as a substitute for it.
