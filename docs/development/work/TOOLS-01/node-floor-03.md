# TOOLS-01 — A1 amendment accepted; floor run stops at repository cancellation

2026-10-03, Codex implementer (GPT-6 per owner assignment).
**A1–A6 pass. A7's file selection matches, but its repository run exits 1 with two cancelled
tests. Stopped before A8.** TOOLS-01 remains IN_PROGRESS, not review-ready. This is incremental
implementation evidence, not independent acceptance or hold credit.

## Amendment review

Fetched origin first. Local and remote `codex/tools-01` were clean and equal at
`4fda151f9d34d21c7eeb80f1cf57f79f2ce5e421`. Reviewed the complete
`git diff 1c3b8f8d..4fda151f`: only design 05 §6 A1 changed.

**Accepted for implementation.** The amendment resolves D05-A1-REV-01 by separating start
structure from result kind. It specifies an exact five-field join, refuses missing and duplicate
pairs, derives parents from start order/nesting, and checks terminal kind against source.
An empty suite and a test with subtests cannot earn leaf status. The synthetic file event remains
the explicit D05-CHK-02 exception. No changes to the contract or design were made here.

## Authorized installation

Installed the owner-authorized official **Node v22.9.0 darwin-arm64** distribution:

- [Archive](https://nodejs.org/dist/v22.9.0/node-v22.9.0-darwin-arm64.tar.gz).
- [SHASUMS256.txt](https://nodejs.org/dist/v22.9.0/SHASUMS256.txt), SHA-256
  `9667e91309fb995b37be7650ca3a1819ee8a93ace0891334f6eec8fa1daa0452`.
- Selected the one exact `node-v22.9.0-darwin-arm64.tar.gz` entry. The downloaded archive's
  SHA-256 matched **before extraction**:
  `7d62217f64491524db6bcfb059049d64fd6a9adcae52565ed54aaad365a55afd`.
- Installed at `/Users/rex-shih/.local/share/arrokothi/node-v22.9.0-darwin-arm64`.
  Its binary reports `v22.9.0`. The full distribution, including LICENSE/notices, is retained.
- Existing `/opt/homebrew/bin/node` still reports `v25.2.1`. No shell configuration or global
  symlink was changed. Download staging: `/private/tmp/tools-01-node-22.9.VjQFeS`.

Host: macOS 26.6.2 (25G83), Darwin arm64; Python 3.14.6. Child environments contain only inherited
PATH, HOME and TMPDIR when present, plus `LANG=C.UTF-8`. The selected Node bin is prepended to
PATH. Coverage runs additionally set their temporary `NODE_V8_COVERAGE`; the actual environments
and commands are attached. This implements the prerequisite probes' environment, not step 2's
change to `packet_tools.command()`.

## Results in order

Command, from the repository root:

```sh
python3 -B tests/tooling/check-node-floor.py \
  --node /Users/rex-shih/.local/share/arrokothi/node-v22.9.0-darwin-arm64/bin/node
```

**Exit 1**, after the A7 run. A1's deliberately failing children are expected fixture results;
they do not fail A1 or earn mutation credit.

| Check | Observation |
|---|---|
| A1 | PASS: nine paired registrations, five leaves, exact start order and parents. Passing/failing tests and suites, suite starts without details, empty suite, and `t.test` subtest all behave as specified. Eight altered-event controls refuse unknown type, source-kind mismatch, each missing-pair direction, duplicate starts/results, and missing start/result locations. |
| A2 | PASS: a typed generic function has its original UTF-16 range `[130,270)` with count 1. An astral character before it distinguishes code units from Python character indices. |
| A3 | PASS: assertion in a two-iteration loop counts 2; same-line untaken throw 0; skipped assertion after a throwing helper inside `try` counts 1; direct-throw control 0; short-circuit expression start 1 and assertion call 0; assertion text inside a template 1. Source guards remain necessary. |
| A4 | PASS: full suite/test path selects one leaf. Skip-all produces zero anchor counts and a synthetic file start/pass pair at 1:1, excluded from leaf credit. Sibling anchors stay zero. Multiple leaves and a passing child with a failing parent fail reach validity. |
| A5 | PASS: separate TAP/event destinations agree on five tests, one suite, five passes, zero fail/cancel/skip/todo. |
| A6 | PASS: existing TypeScript 5.9.3 subset matches the lock and all four recorded digests. `createSourceFile` and `createScanner` work from only that temporary subset. No extension or dependency added. |
| A7 | **Selection PASS; execution FAIL.** Package script exactly equals the declared flags/globs. Expanded and reported sets are equal: **173 files**. Run: **3,774 tests, 447 suites, 3,772 pass, 0 fail, 2 cancelled, 0 skipped/todo; exit 1**. |
| A8–A11 | NOT RUN / not implemented after this stop. Neither A9's refusal nor A10's fallback has been exercised. |

A7's literal selection requirement passed. The probe also refuses a failed repository run using
the existing `checks.json` zero-cancellation constraint; that is the stop above. These results
cannot establish A8's successful execution with unchanged counts.

## FLOOR-03-01: unreferenced timeout cancels an existing floor-runtime test

Node reports `ERR_TEST_FAILURE`, `failureType: cancelledByParent`, with
“Promise resolution is still pending but the event loop has already resolved” for:

- `tests/conformance/effects/fast-slow-equivalence.test.ts:252`,
  “every inline wait budget answers the same two questions and disturbs nothing”;
- the following test at line 283, “both paths journal the same phases in the same order”.

The enclosing suite also emits a failure event; Node's summary counts the two cancelled tests.
This is cancellation, not two assertion failures or two mutation kills.

**Mechanism traced.** The first test awaits `budget.race(outstanding)` at line 274 for the
50 ms wall-clock budget. `packages/core/src/reference/inline-wait.ts:45` deliberately calls
`unref()` on its expiry timer. That wait supplies no referenced handle to keep the process
alive. The pending test is cancelled on this Node floor, and its following sibling never runs.
The production comment explicitly describes the unreferenced-timer behavior, so changing it
would change intentional behavior outside this packet.

Bounded diagnosis, without a keepalive or source change:

| Run under the same declared environment | Node v22.9.0 | Existing Node v25.2.1 |
|---|---|---|
| Existing file alone | exit 1; 7 tests, 5 pass, 2 cancelled | exit 0; 7 pass |
| New minimal `unref-budget.ts` fixture, importing the unchanged reference budget | exit 1; 1 cancelled | exit 0; 1 pass |

The minimal fixture awaits the budget racing an unresolved promise and asserts its yielded
result. It isolates the timer/event-loop interaction from the Harness and Effect machinery.
This establishes the observed version-dependent behavior on this host; it does not establish
which Node internal change accounts for it. No production or existing conformance test was edited.

**Owner resolution needed before continuation.** Decide how to address the existing test's
process-lifetime assumption on the declared floor. A focused correction to test setup could keep
its process alive while exercising the intended unreferenced timer, but that is outside this
design's tooling migration and was not implemented. Raising the floor or adding a hidden
keepalive to the tooling would change the agreed verification conditions. After resolution,
rerun the floor battery and continue A8–A11 before step 2.

## Probe corrections and validation

Three initial probe expectations were corrected against the source/recorded behavior, without
changing a design mechanism:

1. The literal fixture oracle initially expected `t.test` at `t`; Node reports the `test`
   property location (line 20, column 11). The check now resolves that source call's property.
2. An initial A3 fixture used a direct throw but expected the design's throwing-helper count.
   The exact distinction in design-05-check's `swallowed-before` probe was restored. Both forms
   remain fixtures, with observed counts 1 and 0 respectively.
3. The synthetic-event check initially guessed absent line/column. Its observed 1:1 location
   is now checked, together with file/name equality and absence of a source registration.

The final run reproduces A1–A6 passes before A7's cancellation. The source oracle is limited
to these literal, one-registration-per-line fixtures, with known `node:test` imports. It is
not the general source parser planned for step 5. `npm run typecheck` passed (exit 0) on the
installed floor after the diagnostic fixture was added. Evidence/probe digests, Python syntax,
local links and whitespace checks passed. Repository tests were executed once as A7; only the
failing file and minimal fixture were rerun for diagnosis.

## Accessible evidence and exact remainder

[manifest.json](node-floor-03/manifest.json) records base identity, probe digests, install
digests, and hashes of these attachments:

- [floor-results.json.gz](node-floor-03/floor-results.json.gz): complete JSON from the final
  A1–A7 attempt, including raw events, fixture coverage ranges, environments, argv and exits.
- [isolated-failure.json](node-floor-03/isolated-failure.json): both runtimes on the existing file.
- [minimal-failure.json](node-floor-03/minimal-failure.json): both runtimes on the minimal fixture.

Read the compressed JSON with Python's stdlib `gzip.open(path, 'rt')`. Its compressed and
uncompressed digests are both recorded. The subject is `4fda151f` plus the named prerequisite
probe files; this was not a clean-C packet validation. The minimal diagnostic was added after
the full floor attempt and is identified separately in the manifest.

The install uses the unmodified official distribution; the TypeScript probe uses the existing
digest-pinned dependency and retains its LICENSE/notice files in temporary copies. No dependency
or third-party source was added to the repository. All new probe code was independently written;
the earlier repository-owned throwing-call counterexample supplied the distinguishing case.

Steps 2–12, the remaining floor checks, corpus migration, all hold attribution and independent
acceptance remain outstanding. The existing floor-01/floor-02 records are preserved. Changes are
limited to tooling probes/fixtures/README and this report/evidence. No production, Layer-3,
sealed-record, 007, mapping or `fault-oracle.ts` edit. No mechanism was changed to bypass the
cancellation. The final handoff supplies the verified non-force pushed head and tree state.
