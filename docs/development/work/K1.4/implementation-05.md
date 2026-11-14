# Implementation report — K1.4, round 5

## Identity

- **Packet:** K1.4, the legacy bridge (K14-1 to K14-6; K14-G is K1.4-gate's). This round closes review 04's one
  finding, K14-R4-01, which is about prose only. It completes owner choice 05's route (d) and is not another
  cleanup implementation round. Records:
  - [review 04](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04.md)
    and its [brief 05](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04/brief-05.md):
    Codex GPT-6, CHANGES REQUIRED of H `1b98a76e625ef187ba179fdad2e823ac4dabd521`, one P2 finding, K14-R4-01. Read
    by commit on `codex/k1.4-review-04` at `8ca7288b041d376dad7a8c12f083e43427bbb101`, with `probes.mjs` and the
    other evidence files; not merged.
  - The owner's supplements of 2026-11-11, quoted in review 04: deviation 1 (L-36's CANCELLED variant), "Confirm
    both cases"; deviation 3 (the `driver.ts` comments), "Review as is", with a comment-only fix to follow. The
    owner's instruction for this round applies that fix now, as this round's payload. Brief 05's criteria
    R4-CLAIMS, R4-PRESERVE and R4-EVIDENCE govern.
  - [Owner choice 05](owner-choice-05.md) and [owner choice 06](owner-choice-06.md) stay in force. L-36, L-37,
    rows F1–F3 and every disposition review 04 closed stand.
  - Earlier records stand: [release 01](release-01.md), [brief 01](brief-01.md), designs [01](design-01.md) to
    [04](design-04.md), owner choices [01](owner-choices-01.md) to [06](owner-choice-06.md), and implementation
    reports [01](implementation-01.md) to [04](implementation-04.md).

  Process: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), [017](../../017-known-limitations.md).
- **Prerequisites:** K1.3 and TOOLS-02 ranges 2–4 are accepted and integrated in B.
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), on the owner's Mac (arm64), on
  2026-11-11. It has a local checkout, a shell, Node v26.10.0, Python 3.13 and `gh`, and used no subagents. It is
  not the reviewer.
- **Branch:** `claude/k1.4`, in its own worktree.
  - Base B: `608f9ece44dbe42b78974bdac9e7ddcd33697705`. Main has not moved since.
  - Payload C: `72d452bb39e0ae0f846d85e273441d06a9cd22fb`, directly on the reviewed H `1b98a76e`.
  - Candidate H: the commit that contains this report. Its full SHA goes in the external handoff.
  - The C..H allowlist (`administrative_files` in C's `verification.json`) is exactly:
    `docs/development/007-work-packets.md`, `docs/development/work/K1.4/implementation-05.md` and
    `docs/development/work/K1.4/progress.md`.
- **Push:** C was pushed before the CI dispatch. H is pushed after this report is committed.

## Changes and coverage

**Executable code: none.** The TypeScript printer, with comments removed, prints `application.ts`, `driver.ts`
and `types.ts` identically at the reviewed H and at C. No test, fixture, mutation registry or script changed; the
one new script is this round's evidence check. Kernel and core source are byte-identical to B. In
`verification.json` only `administrative_files` and `limits` changed (deviation 3).

**Source comments** (R4-CLAIMS), in `packages/sdk/src`:

| Where (lines at the reviewed H) | Now says |
|---|---|
| `driver.ts` header, 19–24 | The sticky `ended` flag stops further native steps for E, and the Driver *requests* native cancellation of every non-terminal member. A request does not prove an ended member: READY or WAITING ends at once, RUNNING answers `cancellation_pending`, and a failed step leaves it RUNNING with no later step (017 L-36). It names where the request happens (`submit` for a native terminal decision, `terminate` for every other ending exit) and how `requestCancellation` swallows a rejection before `app.cancel` requests again. Only `terminate` turns a rejected request into a protocol hold, which the Kernel records only for E's unresolved Activation while E is not terminal. Outside an exchange, a rejection at `cancel.root-created` fails `start`, which cancels E, and one at `cancel.application` rejects `app.cancel` |
| `TERMINATE_SITES` doc, 98 | One label per call site that *requests* the end of a lineage |
| `endLineage` doc, 209 | Requests native cancellation from `site`; fulfilment means every request was made, not that every member ended |
| `createRoot` doc, 218 | A cancellation that arrived meanwhile requests the new root's cancellation |
| `requestCancellation`, 257 (new doc comment) | Sets the flag synchronously and requests; a rejected request is swallowed, with no hold, and `app.cancel` requests again |
| `hasEnded` doc, 269 | Whether the sticky flag is set: the Driver starts no further native step for E |
| `cascade` doc, 274 | Calls native `cancelExecution` per non-terminal member; READY or WAITING ends at once; RUNNING answers `cancellation_pending`, which it does not check; a rejected read or call rejects |
| `terminate` doc, 637–639 | Requests the lineage's cancellation, then closes the ledger and offers the Outcome; a fulfilled request does not prove every member ended; a rejection becomes a Kernel-only hold, recorded only while the exchange is unresolved and E is not terminal |
| `application.ts`, `app.cancel` | Requests again, which also reaches a child that a running step spawned since the first request; a member whose step is still running keeps its request pending, and a failed step never applies it |
| `types.ts`, `humanWaitDeadlineMs` | On expiry the bridge *requests* cancellation of the native lineage |

`cancellationSettled`'s one-line doc comment is unchanged (deviation 1). Method names (`endLineage`, `hasEnded`),
the `CANCEL_REASON` string and the hold diagnostics are executable and unchanged.

**Documents:**
- [017](../../017-known-limitations.md) L-36: the last sentence of its first cell now limits protocol-failure
  reporting to `terminate`, for E's unresolved Activation while E is not terminal. It says that the request a
  Kernel cancellation starts swallows its rejection, and that `app.cancel`'s fallback then requests again, with no
  hold when the fallback is fulfilled (review 04's probe). Review 04 is added to its sources.
- [The baseline](../../002-implemented-kernel-baseline.md): the cleanup paragraph says "native steps", names the
  earlier Kernel `CANCELLED` beside `FAILED`, qualifies the rejection sentence the same way, and states the
  swallow and fallback. The limits index now reads "L-29 to L-37".
- [The quick start](../../../guides/deployment/quick-start.md): the `executionDeadline` row says the Driver
  *requests* the end of the native lineage (L-36). Its cancellation and Harness-migration rows already did.
- `verification.json`: the round 3 limit's "a Kernel-only report when native cleanup fails" is scoped to
  `terminate`'s rejected cleanup request, and a round 5 entry states this round's scope.
- **Dated corrections**, each headed "Correction, 2026-11-11 (round 5, after review 04 K14-R4-01; brief 05)":
  [implementation report 03](implementation-03.md) (the D04-CHK-02 bullet), [design 04](design-04.md) (the
  D04-CHK-02 `terminate` bullet) and [implementation report 04](implementation-04.md) (deviation 3, and the
  "Unchanged from round 3" item). No earlier line was removed or reworded.
- **Checked and left unchanged:** the capabilities guide's cancellation bullet, the quick start's cancellation and
  `harness.cancelExecution` rows, both legacy-mapping entries, the `bridge-terminate.test.ts` header and census
  comment, owner choice 06, design 03's round 4 correction and the SDK README. Each says "request" or limits its
  claim to the rows; none states that every rejected cleanup request becomes a hold. Test names and assertion
  messages saying that a lineage ended are row-specific and assert the native terminal state. They are
  executable test text, so they stay.

**Evidence** in [`implementation-05/`](implementation-05/):
- `comment-only.mjs`: for each changed TypeScript file it compares both versions printed without comments. It
  lists every other changed file by kind, and checks Kernel source, core source and the three mutation registries
  against B. `comment-only.log` is its run on the working tree that became C: `comment_and_document_only`.
  `comment-only-control.log` is the control: on round 4's range (`b1769c0f`..`697922e2`) it flags
  `bridge-terminate.test.ts` and fails.
- `review-04-probe.log`: review 04's `probes.mjs` (blob `95a75e11221601b9ac3a061abf296e62bbd52fa4`), copied
  unchanged into `review-04/` for the run and removed after. It passes 1/1 and prints the same trace as review
  04: one fault, `cancel.request` rejected, `cancel.application` fulfilled, Kernel `CANCELLED`, both members
  `CANCELLED`, no holds, no later step.
- `bridge-suites.log`: every `packages/sdk/tests/bridge-*.test.ts`, 259/259.

### Prior findings (review 04)

| Finding | Disposition | Evidence |
|---|---|---|
| K14-R4-01 (P2) | Closed in prose: the source comments, L-36, the baseline and its limits index, the quick start and `verification.json` now describe requests and their limit. Earlier records get dated corrections | The two traces brief 05 names: B-TERM-LIMIT (in `bridge-suites.log`) and review 04's probe (`review-04-probe.log`). `comment-only.log` for the unchanged code |

Review 04's closed dispositions are unchanged: K14-R3-01's behaviour as L-36 (both cases confirmed by the owner),
K14-R3-02 closed by F1–F3, K14-R3-03 closed as L-37, and the earlier R1/R2 findings and D03/D04 conditions as
review 03 left them.

### Brief 05 criteria

- **R4-CLAIMS.** Each sentence now names one fact and its boundary. The facts are: the request, its fulfilment
  with a pending receipt, the Driver's own scheduling suppression (the `ended` flag), the native terminal state
  (READY or WAITING only, at once), and rejection reporting (`terminate` only, for an unresolved exchange of a
  non-terminal E). The header and the `endLineage`, `cascade` and `terminate` docs match B-TERM-LIMIT's three
  cases and review 04's F1 trace. The dependent summaries, including the baseline's limits index, are corrected
  or checked as listed above.
- **R4-PRESERVE.** No executable line changed (`comment-only.log`). L-36's FAILED and CANCELLED cases, L-37's
  exclusions, F1–F3 and every closed disposition are unchanged. The bridge suites pass 259/259, including the 90
  termination tests. Kernel source, core source and the registries are byte-identical to B. Historical records
  keep every line; corrections are dated insertions.
- **R4-EVIDENCE.** C `72d452bb` is a new payload on H `1b98a76e`, with its own Packet verify run and the
  administrative allowlist above. Round 4's CI run `43088962951` is cited only as evidence about round 4's C
  `697922e2`.

### Deviations and decisions for the owner

1. **`cancellationSettled`'s doc comment is unchanged.** I first rewrote it. Twelve B-TERM-CENSUS controls then
   failed, because they insert their test method before that exact line (`ANCHOR` in
   `bridge-terminate.test.ts`). Editing the test is outside brief 05, and the line is true: "finished" covers a
   rejected request, which `requestCancellation` swallows. So the line is byte-identical, and the swallow is
   documented on `requestCancellation` instead.
2. **More comments than the review named.** `createRoot`, `hasEnded`, `TERMINATE_SITES`, the new
   `requestCancellation` doc, `app.cancel`'s comment and the `humanWaitDeadlineMs` doc said "ends" or "cancels" a
   lineage in the same sense. Brief 05 asks for the dependent current descriptions too, so they are corrected in
   the same family.
3. **`verification.json` changed.** Its `administrative_files` must name this round's report (006), and its
   limits carried the same blanket wording. It configures packet verification, not product behaviour. Every
   check, input, preserve entry and profile is unchanged.

### Additional self-found defects (separate provenance)

1. **The old header also said "Every exit that ends E goes through `terminate`".** That was false before this
   round: a native terminal decision ends E in `submit`, which requests cancellation itself and offers the
   Outcome without `terminate`. Found while mapping the rejection paths for R4-CLAIMS. The header now names both
   routes.
2. **The first comment edit broke a test anchor** (deviation 1). The bridge suites caught it before any commit.

### Not changed, and the strongest remaining risk

- **L-36 and L-37** are unchanged, and so is the behaviour they record.
- **Names still say "end".** `endLineage`, `hasEnded` and the hold diagnostics' "not confirmed ended" are
  executable identifiers and strings. Their doc comments now say what they do. Renaming them would change code
  and the census labels' call sites, which brief 05 excludes.
- **The strongest risk** is still L-36: a native member can stay RUNNING with a pending cancellation, with no hold
  and no recovery.

## Validation and interpretation

**Packet verify CI at C** with spec `docs/development/work/K1.4/verification.json`: run
[`43131441604`](https://github.com/ArrokothI/arrokothi/actions/runs/43131441604) at C
`72d452bb39e0ae0f846d85e273441d06a9cd22fb`: started 2026-11-12 01:01:00 UTC, finished 03:12:11 UTC: `checks_passed`,
19/19, exit 0, Node v26.10.0, Linux x86_64. Repository tests 5,054/5,054; archive tests 4/4; example tests 18/18;
tool tests 777; typecheck; adoption `mappings_complete`; inventory `provenance_verified`; dimensions
`coverage_reported`; registered, refusal and value-cost mutants `selected_cases_passed`; refusal and oracle
censuses; Kernel sweeps; race search; value-cost dimensions and continuations; builder docs; area gate
`reported`. The job log and `run.txt` both report revision and head C.

**Local checks:**
- A fresh clone at C, with `npm ci` and Node v26.10.0:
  - `npm test`: 5,054/5,054, with 0 failed, cancelled, skipped or todo;
  - `npm run typecheck`: exit 0;
  - `regenerate` on the adoption manifest: `table_current`, so the comment edits shifted no line-anchored
    evidence the manifest reads;
  - `corpus`: `mappings_complete`; `inventory`: `provenance_verified`;
  - the architecture tests: 390/390; `npm run check:builder-docs`: passed.
- In the worktree (identical to C):
  - `bridge-suites.log`: 259/259; `npm run check:builder-docs`: passed; `npm run typecheck`: exit 0;
  - `review-04-probe.log`: 1/1, with review 04's trace;
  - `comment-only.log`: `comment_and_document_only`; `comment-only-control.log`: fails on round 4's test change,
    as it should;
  - round 3's `ablate.py` text anchors still match exactly once each in the new `driver.ts` (six edits over five
    rows). The two anchors that include comment lines, in `terminate` and the exchange's final catch, were not
    edited.
- `comment-only.mjs` rerun from H against C itself (`<H 1b98a76e> <B> <C>`): `comment_and_document_only`, exit 0. It lists 15 changed
  files: the 3 source files print identically without comments, `verification.json` changes only
  `administrative_files` and `limits`, and the rest are documents, logs and the new script. Git prints one
  `fatal: path … exists on disk, but not in '1b98a76e…'` line on stderr for the new script; the script catches it
  and lists the file as new.

**Checks not run:** review 03's probes, the prior-review probes, design check 04's attacks, review 02's hold
mutant and the five ablations were not rerun locally: the code is identical without comments, and their logs
under [`implementation-04/`](implementation-04/) stand for round 4's C. CI runs the registered mutants and every
test unchanged. No live-provider canaries or large-memory timing (`profiles_not_run`, owner choice 01). No E1
benchmark (K14-G is K1.4-gate's).

**Why the evidence supports each criterion** (implementer assessment, not acceptance):
- **K14-4:** the current cleanup documentation now states requests and L-36's limit, and the rejection-reporting
  boundary as the code has it (R4-01).
- **K14-1, K14-2, K14-3, K14-5 and K14-6:** no executable change since round 4, which review 04 passed (K14-1 with
  L-36, K14-6 with L-37).

**Third-party code and licences:** none. The evidence script uses Node builtins and the TypeScript compiler API
already in the repository.

## Handoff

Ready for an independent review of H over C `72d452bb39e0ae0f846d85e273441d06a9cd22fb` and B
`608f9ece44dbe42b78974bdac9e7ddcd33697705`, bounded by brief 05. Packet verify CI run
[`43131441604`](https://github.com/ArrokothI/arrokothi/actions/runs/43131441604) at C reports `checks_passed`, 19/19.
There is no self-acceptance, and K14-G stays with K1.4-gate.
