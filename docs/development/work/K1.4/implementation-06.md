# Implementation report — K1.4, round 6

## Identity

- **Packet:** K1.4, the legacy bridge (K14-1 to K14-6; K14-G is K1.4-gate's). K1.4 is ACCEPTED at H
  `e307943d6b315e724e49107c3b26a1100ef4916c` ([review 05](review-05.md), Codex GPT-6;
  [acceptance 01](acceptance-01.md)). This round is the scoped documentation correction that 006's Layer-3 rule
  requires before the branch is merge-ready. It does not reopen K1.4 or change the accepted implementation.
  Records:
  - [Cleanup 01](cleanup-01.md) is BLOCKED on CLEANUP-K14-01, recorded in
    [reference check 01](reference-check-01.md). The finding is the cleanup agent's own, not a reviewer's.
    `execution-cycle.md` said that wait and Execution deadlines take effect only when the host fires them, which
    is wrong for a wait already due when its Outcome is accepted. Observation O-2 (`values.md:323`) is in the
    same record.
  - [Brief 06](cleanup-01/brief-06.md) governs, with criteria R6-TIMERS, R6-SCOPE and R6-EVIDENCE.
  - [Owner choice 07](owner-choice-07.md), 2026-11-14:
    - "Prepare correction now";
    - O-2: "Include O-2";
    - the same omission outside Layer 3: "Fix guide and comment";
    - "Run Packet verify".
  - Earlier records stand: [release 01](release-01.md), [brief 01](brief-01.md), designs [01](design-01.md) to
    [04](design-04.md), owner choices [01](owner-choices-01.md) to [06](owner-choice-06.md), and implementation
    reports [01](implementation-01.md) to [05](implementation-05.md).

  Process: [006](../../006-development-process.md) (its sections on owner-delegated final cleanup and on
  maintaining the mental-model reference), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), [017](../../017-known-limitations.md).
- **Prerequisites:** K1.3 and TOOLS-02 ranges 2–4 are accepted and integrated in B.
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), on the owner's Mac (arm64), on
  2026-11-14. It has a local checkout, a shell, Node v26.10.0, Python 3.13 and `gh`, and used no subagents.
  **Role overlap:** this session is the K1.4 coding agent. It also did the owner-delegated cleanup 01, raised
  CLEANUP-K14-01 and wrote brief 06. It is not the reviewer, and the review must be independent of all three roles.
- **Branch:** `claude/k1.4`, in its own worktree.
  - Base B: `608f9ece44dbe42b78974bdac9e7ddcd33697705`. Remote main is still B.
  - Accepted H: `e307943d6b315e724e49107c3b26a1100ef4916c`. On top of it, review 05 at `7bf80555` and three
    administrative commits: A `99e54a56`, the evidence import `15d2a131` and cleanup `b153ccac`. Those commits
    change nothing outside `docs/`.
  - Payload C: `5b81a1b0cd9e73d7591ea23fd29195e24536d50d`, directly on the cleanup head
    `b153ccacb57c35652be3aeba43f47a48905e077b`.
  - Candidate H: the commit that contains this report. Its full SHA goes in the external handoff.
  - The C..H allowlist (`administrative_files` in C's `verification.json`) is exactly:
    `docs/development/007-work-packets.md`, `docs/development/work/K1.4/implementation-06.md` and
    `docs/development/work/K1.4/progress.md`.
- **Push:** C was pushed before the CI dispatch. H is pushed after this report is committed.

## Changes and coverage

**Executable code: none.** `host.ts` and `types.ts` print identically without comments at the cleanup head and at
C. The cleanup head's code equals H `e307943d`. No test, fixture, mutation registry or script under `packages/`,
`tests/` or `scripts/` changed. Kernel and core source are byte-identical to B.

**Layer 3** (brief 06):

| Page | Before | Now |
|---|---|---|
| [`execution-cycle.md`](../../../../mental-model/mechanisms/execution-cycle.md) line 17, third sentence (R6-TIMERS) | "A wait deadline or an Execution deadline takes effect only when the host fires it, so a host that never pumps timers never expires anything." | A wait whose deadline is already due when its Outcome is accepted, and for which no queued Event qualifies, expires inside that acceptance decision with no host fire. A link to [registering a wait](../../../../mental-model/mechanisms/waits.md#registering-a-wait) step 3 follows. A live wait's deadline and an Execution deadline take effect only when the host fires them, so a host that never pumps timers never expires either of those. The first two sentences are unchanged |
| [`values.md`](../../../../mental-model/concepts/values.md#in-process-value-capture) line 323 (O-2) | "Through the internal SDK TypeScript wrapper … This module is not a public SDK entry; K1.4 owns that bridge." | "Through the SDK TypeScript wrapper …". The capture module stays internal; the SDK's public entry re-exports its `toCanonicalBytes`. Status stays out of the page apart from a link to [BASELINE §16](../../002-implemented-kernel-baseline.md#16-application-sdk-above-core) |

**Under owner choice 07** (the same omission outside Layer 3):

| Where | Before | Now |
|---|---|---|
| [Quick start](../../../guides/deployment/quick-start.md) lines 155–160 | "Deadlines take effect at the next host call: every `start`, … call fires due Kernel timers first." | A human-wait deadline on a waiting Execution and an Execution deadline take effect at the next host call, which fires due Kernel timers first. A human pause whose deadline has already passed when a step's Outcome declares it expires as that Outcome is accepted, with no host call, unless an `input` or `resolveConfirmation` made during the step wakes the wait first |
| `packages/sdk/src/host.ts:77`, `ApplicationHost.pump` doc | "(L-22: deadlines take effect at host calls)" | "live wait and Execution deadlines take effect at host calls (L-22)". `pendingTimers` lists only those two kinds |
| `packages/sdk/src/types.ts:59–61`, `humanWaitDeadlineMs` doc | "Deadlines take effect at the next host call." | A deadline still ahead when a step's Outcome declares the pause takes effect at the next host call. One already passed by then expires as that Outcome is accepted, unless an input or confirmation answer queued during the step wakes the wait first |

**Packet configuration:** `verification.json` changes only these keys:
- `administrative_files`: names this report.
- `limits`: one round 6 entry.
- `preserve`: 40 new entries at the cleanup head `b153ccac`:
  - every K1.4 record and review file except `progress.md` and `verification.json`;
  - `waits.md`, `operations.md`, BASELINE, 017 and 014.

  So the candidate check proves that this round left the accepted records, the imported evidence and the rule
  owners unchanged.

**Brief 06 question 1, other copies of the timer rule:** I grepped `mental-model/`, `docs/guides/`, BASELINE, 017,
`packages/sdk/src`, the SDK README, `packages/kernel/src` and `.agents/skills`. The results are in
`timer-grep.log`.

Corrected:
- the execution-cycle sentence;
- the quick start;
- `host.ts:77`;
- `types.ts:59`.

Already correct and left unchanged:
- [waits § Registering a wait](../../../../mental-model/mechanisms/waits.md#registering-a-wait), which owns the rule;
- the K1.3 binding note at `operations.md:126`, which the new paragraph follows almost word for word;
- BASELINE's timer paths 1–3 and line 538;
- 017 L-22;
- the rewrite index's clock entry (`rewrite-index.md:346–352`);
- the Kernel's `clock` doc comment (`coordinator.ts:360–363`).

**Brief 06 question 2:** O-2 is taken (owner choice 07).

**Also checked and left unchanged:**
- The quick start's option rows:
  - `executionDeadline`: "At expiry the Kernel cancels …";
  - human-wait deadline: "each declared human pause expires that many milliseconds after it was first observed".

  They give a deadline's value and its consequence, not who fires it. The corrected paragraph below them now says
  when a deadline takes effect. See the residual risks.
- The SDK README and the builder skill state no timer rule.

**Evidence** in [`implementation-06/`](implementation-06/). Each log header names the tree it ran on,
`5f0e5b0a7b7300263066fd76b279ca2b8a2d1d06`. That is C's tree without the nine logs: `.gitignore` ignores `*.log`,
so the logs were force-added after the runs. Rebuilding C's index without them gives exactly that tree.
- `comment-only.log`: round 5's unchanged `implementation-05/comment-only.mjs`, run as `<b153ccac> <B>` on the
  working tree before the logs were added. Result: `comment_and_document_only`.
  - `host.ts` and `types.ts` print identically without comments;
  - `verification.json` changes only `administrative_files`, `preserve` and `limits`;
  - the rest are documents and the new probe;
  - Kernel source, core source and the three mutation registries equal B.
- `linkcheck.py` and `linkcheck.log`: a local Markdown path/anchor check (relative links, GitHub heading slugs,
  explicit anchors; fenced blocks and inline code skipped). It covers `mental-model/`, `docs/guides/`,
  `docs/development/*.md` and `docs/development/work/K1.4/`: 109 files, 2,690 links, 0 broken.
  `linkcheck-control.log` is a scratch copy of `mental-model/` and the development pages with a missing path
  and a misspelled anchor planted on line 17. It reports exactly those two and exits 1.
- `timer-grep.log`: every remaining match is scoped to the host-fired paths or names the due-at-registration path.
- `due-at-registration.probe.mjs` and `due-at-registration.log`: an SDK-level check of the new guide sentence,
  not a maintained test. It records every `ExecutionCoordinator.fireTimer` answer. A chat parks on a pause with a
  100 ms deadline, then a stray input wakes the Kernel wait but not the pause, as in B-DEADLINE-STRAY.
  - With the clock moved past the deadline before the re-declaring Outcome, E fails with
    `arrokothi.bridge.wait_deadline_expired` and `fireTimer` is never called.
  - In the control, the deadline passes after the pause is re-declared. Exactly one `wait_deadline` fire answers
    `expired`.

  2/2 pass.
- `sdk-tests.log` (787/787), `architecture-tests.log` (390/390), `builder-docs.log` (passed) and `typecheck.log`
  (exit 0).

### Prior findings

| Finding | Disposition | Evidence |
|---|---|---|
| CLEANUP-K14-01 (P2; the cleanup agent's own) | Closed in prose, for the reviewer to judge: the execution-cycle paragraph states the three paths as `waits.md`, the binding note and BASELINE do. Under owner choice 07, the guide and SDK copies of the same omission are corrected | The `execution-cycle.md` diff; `timer-grep.log`; K1.3's `owner-guards.test.ts:362` and `waits-registration.test.ts`, which CI runs unchanged; `due-at-registration.log` at the SDK level |
| O-2 (observation) | Taken | The `values.md` diff; the link resolves (`linkcheck.log`) |
| O-3 (owner item) | Not in scope | Reference check 01 leaves it to the rewrite schedule's owner |

Review 05's dispositions are unchanged: K14-R4-01 closed, and L-36 and L-37 retained.

### Brief 06 criteria

- **R6-TIMERS.** The paragraph now names the due-at-registration path, inside the accepting decision with no host
  fire. It also keeps `waits.md` step 2's precedence ("for which no queued Event qualifies") and points to step 3.
  The live wait and the Execution deadline are left as the two host-fired paths. That matches `waits.md` steps
  2–4, the binding note at `operations.md:126` and BASELINE timer paths 1–3. The grep finds no unqualified "never
  pumps" or "take(s) effect only when".
- **R6-SCOPE**, as owner choice 07 amends it:
  - `git diff --name-only b153ccac C` lists 18 files: the two Layer-3 pages, the quick start, the two SDK files
    (comments only), `verification.json`, owner choice 07 and the 11 files under `implementation-06/`.
  - `e307943d..b153ccac` is the cleanup's administrative range, with nothing outside `docs/`.
  - Kernel and core trees equal B. No test, fixture, mutation registry or executable line changed.
  - The historical records are unchanged, and the preserve entries make the candidate check prove it at H.
- **R6-EVIDENCE.** This round has its own C (`5b81a1b0`) and H, with the local path/anchor check (and control),
  the architecture tests, builder docs, typecheck and Packet verify at C. Round 5's CI run `43131441604` is cited
  only as evidence about round 5's C `72d452bb`.

### Deviations and decisions for the owner

1. **Scope beyond brief 06.**
   - The quick start and `host.ts:77` are owner choice 07.
   - `types.ts:59` was not named in that question. A follow-up grep after the answer found it: the same sentence
     in the `humanWaitDeadlineMs` doc. I corrected it under the same choice, as the same family and comment-only.
     Owner choice 07 records this as a disclosed extension.
2. **`values.md` also drops "internal" from the bullet's bold lead-in.** Brief 06 proposed changing only the last
   sentence. "Through the internal SDK TypeScript wrapper" carries the implication O-2 names, so the lead-in now
   reads "Through the SDK TypeScript wrapper". The next sentence says that the capture module stays internal.
3. **The execution-cycle wording differs from brief 06's suggested text.** It adds `waits.md` step 2's precedence
   ("for which no queued Event qualifies"), says "when its Outcome is accepted" rather than "when it registers"
   (one accepted-time reading, step 3) and ends "never expires either of those". The brief left the wording to
   the coding agent.
4. **`verification.json` changed**, as in round 5: `administrative_files` must name this report, and the
   `limits` entry and `preserve` entries describe and bind this round. Every check, input and profile is
   unchanged.
5. **Order of local checks.** The last `limits` entry, unchanged since round 1, says "Fresh-clone local checks run
   before the CI dispatch". This round ran the worktree checks above before the dispatch and the fresh-clone checks
   after it, while CI ran. The results are below. I did not change C to repair the sentence: that would need a
   new C and a new CI run.
6. **The comment-only check ran from the cleanup head, not from H `e307943d`.** The round 5 script reads the
   previous version of every changed JSON file. It fails on JSON added since H, because the evidence import added
   `review-01/candidate.json` and others. `e307943d..b153ccac` changes nothing outside `docs/`, so `host.ts` and
   `types.ts` at the cleanup head equal those at H. The script also lists `linkcheck.py` as a document, because it
   only parses TypeScript and JavaScript.
7. **The CI dispatch used `--ref claude/k1.4`.** The workflow file there is byte-identical to B's, because
   `verification.json` preserves `.github` at B. The run checks out the `revision` input.

### Additional self-found defects (separate provenance)

1. **My first guide and `types.ts` wording omitted `waits.md` step 2's precedence.** It said that a pause already
   past its deadline expires as the Outcome is accepted. An input or confirmation queued during the step wakes
   the wait first. Both now say so. The fix came before C.
2. **My first log headers called their tree "the index that becomes C".** `*.log` is gitignored, so the logs were
   not in that index. The headers now say what the tree is, and the equality was checked after the commit.
3. **My first link-check control copied only two pages,** so the copy's missing sibling pages flooded it. The
   control in C copies the whole of `mental-model/` and the development pages, and fails on exactly the two
   planted links.

### Not changed, and the strongest remaining risk

- **The quick start's human-wait row** still says a pause "expires that many milliseconds after it was first
  observed". It gives the deadline's value. A reviewer could read it as instant enforcement, which L-22 rules out.
  That would be an L-22 wording item, not CLEANUP-K14-01.
- **The queued-input exception at the SDK level** follows from `waits.md` step 2. Kernel tests pin it
  (`waits-registration.test.ts`). The probe does not exercise it through the SDK, because that would need an
  input injected while a step runs.
- **O-3** is untouched (owner item).
- **The strongest risk is independence.** The same session found the defect, wrote the brief, took the owner's
  scope answers and implemented the correction. The review should compare the new paragraph and the guide text
  with `waits.md` directly, not with brief 06's framing.

## Validation and interpretation

**Packet verify CI at C** with spec `docs/development/work/K1.4/verification.json`: run
[`43569826480`](https://github.com/ArrokothI/arrokothi/actions/runs/43569826480) at C
`5b81a1b0cd9e73d7591ea23fd29195e24536d50d`. It ran from 07:10:47 to 08:35:33 UTC on 2026-11-14 (Node v26.10.0, Linux x86_64) and passed: `checks_passed`, 19 of 19 checks, exit 0. Its `run.txt` names C as both revision and head. The repository tests ran 5,054/5,054 with 0 failed, cancelled, skipped or todo; the tool tests ran 777, the archive tests 4/4 and the example tests 18/18. `profiles_not_run` lists the live-provider and large-memory-timing profiles (owner choice 01), `result_reuse` is false, and acceptance is not evaluated.

**Local checks:**
- In a fresh clone at C, with `npm ci` and Node v26.10.0, run after the CI dispatch (deviation 5):
  - `npm test`: 5,054/5,054, with 0 failed, cancelled, skipped or todo;
  - `npm run typecheck`: exit 0;
  - `regenerate` on the adoption manifest: `table_current`;
  - `corpus`: `mappings_complete`; `inventory`: `provenance_verified`;
  - the architecture tests: 390/390; `npm run check:builder-docs`: passed;
  - the clone's `git status` stayed clean.
- In the worktree, on the tree recorded in the logs:
  - `npm run test:sdk`: 787/787;
  - architecture tests: 390/390;
  - `npm run check:builder-docs`: passed (75 files, 2,299 local links and anchors, 58 imports);
  - `npm run typecheck`: exit 0;
  - the probe: 2/2;
  - the link check: 0 broken, and its control fails as it should;
  - comment-only: `comment_and_document_only`;
  - `git diff --check`: clean.

**Checks not run:** the review probes, ablations and attack scripts of earlier rounds. No executable line
changed, and CI runs every registered test and mutant unchanged. No live-provider canaries or large-memory
timing (`profiles_not_run`, owner choice 01). No E1 benchmark (K14-G is K1.4-gate's).

**Why the evidence supports the brief** (implementer assessment, not acceptance): the corrected sentences now state
what the accepted code does. That behaviour is K1.3's W-2, pinned by `owner-guards.test.ts:362` and
`waits-registration.test.ts`, and it is observed through the SDK by `due-at-registration.log`. The candidate check
binds the scope. K14-1 to K14-6 stand as review 05 accepted them: no executable change since H `e307943d`.

**Third-party code and licences:** none. `linkcheck.py` uses only the Python standard library. The probe uses
Node builtins and repository packages.

## Handoff

Ready for an independent review of H over C `5b81a1b0cd9e73d7591ea23fd29195e24536d50d` and B
`608f9ece44dbe42b78974bdac9e7ddcd33697705`, bounded by brief 06 as owner choice 07 amends it. The round's own
delta is `b153ccac..H`; the cumulative diff is `B..H`. Packet verify passed at C (run `43569826480`, 19 of 19 checks). There is no self-acceptance. K1.4 stays ACCEPTED
at H `e307943d`, cleanup stays BLOCKED until this correction is reviewed, and K14-G stays with K1.4-gate.
