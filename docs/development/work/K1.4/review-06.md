# Independent review 06 — K1.4, round 6 documentation correction

**Verdict: ACCEPT**, bound to **H `64c505bfee13cae340710942e69fe805723aaad9`**.
CLEANUP-K14-01 is closed: `execution-cycle.md` now states the three timer paths as their owners do, and
it adds no rule. The `values.md` clause (O-2), the quick start and the two SDK doc comments say the same
thing and match the code. The executable delta is empty. This is the bounded brief-06 review, as owner
choice 07 widens it. It does not reopen K1.4, which stays ACCEPTED at H
`e307943d6b315e724e49107c3b26a1100ef4916c` under [review 05](review-05.md).

## Identity, authority and scope

- **Reviewer:** a Claude Code desktop session, model Claude Fable 5.2 (`claude-fable-5-2`), on
  **2026-11-14** (America/New_York). No subagent or delegated reviewer was used. This session wrote no
  K1.4 design, code, report, brief or cleanup record.
- **Independence, stated in full.** The K1.4 coding agent was a different session and model (Claude
  Opus 5.5). This session runs on the owner's Mac under the same local account, and it has a notes
  directory that the coding-agent and coordination sessions also write. Before the review it read that
  directory's index and two of its notes. They summarize rounds 1 to 6 and say that a coordination
  session had already found the source delta comment-only. So this review was not blind to the
  implementer's account. Every fact
  below was derived again from the fresh clone and from GitHub; no working tree, file or result of the
  coding agent was used; the coverage map was derived from brief 06, owner choice 07 and the rule
  owners before implementation report 06 was opened. 006 requires a separate session and lets the owner
  select the reviewer. Whether this arrangement meets the owner's intent for independence is the
  owner's judgment, and this record gives the facts for it. The branch name follows the owner's
  instruction; this is not a Codex session.
- **Operator:** local OS user `rex-shih`; GitHub CLI authenticated as `Rex-Shih` (`gh auth status`, exit 0).
- **Machine:** hostname `MacBookAir`, MacBookAir10,1, Apple M1, 8 cores, 8 GiB RAM, arm64.
  **OS:** macOS 26.6.2, build 25G83; Darwin 25.6.0.
- **Environment and access:** a fresh clone of `https://github.com/ArrokothI/arrokothi.git` in a session
  scratch directory, checked out at H with a clean tree. Full Git objects, source, a shell and the
  downloaded CI evidence. Node **v26.10.0**, npm **11.19.1**, `npm ci` exit 0 (190 packages); TypeScript
  **5.9.3** from the lockfile; Python 3.13.5; Git 2.39.5; GitHub CLI 2.102.0. No dependency was edited.
- **B:** `608f9ece44dbe42b78974bdac9e7ddcd33697705` (remote `main` still advertises it).
- **Accepted H (review 05):** `e307943d6b315e724e49107c3b26a1100ef4916c`.
- **Cleanup head:** `b153ccacb57c35652be3aeba43f47a48905e077b`.
- **C:** `5b81a1b0cd9e73d7591ea23fd29195e24536d50d`. Its parent is the cleanup head.
- **H:** `64c505bfee13cae340710942e69fe805723aaad9`. Its parent is C. Remote `claude/k1.4` advertised
  exactly H when the review started. The review branch was created from H; it did not exist before.
- **Governing brief:** [brief 06](cleanup-01/brief-06.md) (R6-TIMERS, R6-SCOPE, R6-EVIDENCE), as
  [owner choice 07](owner-choice-07.md) widens it. Scope: only **CLEANUP-K14-01**, with O-2, over
  `b153ccac..C`.
- **Read at H:** [cleanup 01](cleanup-01.md), [reference check 01](reference-check-01.md), brief 06,
  owner choice 07, [implementation report 06](implementation-06.md) and its eleven evidence files.
- **Policy baseline:** AGENTS.md, [006](../../006-development-process.md),
  [008](../../008-implementation-report.md), [009](../../009-universal-prompts.md) and
  [012](../../012-review-methods.md). All are byte-identical at B and H. The rule owners were located
  through the mental-model reference: [waits](../../../../mental-model/mechanisms/waits.md#registering-a-wait),
  the [three clocks](../../../../mental-model/concepts/operations.md#three-clocks) and BASELINE's
  [timers](../../002-implemented-kernel-baseline.md#waits-timers-and-cancellation-api). The change is
  documentation of the in-process binding and the SDK host. It changes no Kernel, Runtime or deployment
  semantics.

The owner supplied the review instruction with the three bound commits and the CI run. It names the
`types.ts` doc comment as in scope and asks this review to judge that disclosed extension. That is an
owner instruction, not a reviewer invention.

## Candidate and evidence binding

The independently run [candidate check](review-06/candidate.json) returns `facts_verified`. C..H contains
**exactly** the `administrative_files` of C's `verification.json`:

1. `docs/development/007-work-packets.md`
2. `docs/development/work/K1.4/implementation-06.md`
3. `docs/development/work/K1.4/progress.md`

The 007 hunk adds one dated round-6 entry and leaves the K1.4 status `ACCEPTED`. The progress hunk adds
the round-6 resume point. No payload is hidden there. `verification.json` is identical at C and H.
The report's nine attached logs name tree `5f0e5b0a7b7300263066fd76b279ca2b8a2d1d06`; rebuilding C's
index without those logs gives exactly that tree, so they describe C's content.

I downloaded [Packet verify run 43569826480](https://github.com/ArrokothI/arrokothi/actions/runs/43569826480),
job **132371569876**, artifact **14106930394**. The run was dispatched from `claude/k1.4` when its head
was C. The [job-log excerpt](review-06/ci-revision.log) records:

```text
2026-11-14T07:10:32.4427442Z   REVISION: 5b81a1b0cd9e73d7591ea23fd29195e24536d50d
2026-11-14T07:10:39.2909382Z HEAD is now at 5b81a1b0 K1.4 round 6: Layer-3 timer-path correction (brief 06, owner choice 07)
```

The artifact's `run.txt` and raw `verify.json` also bind revision and head to C, with Node v26.10.0 and
exit 0. Counted from [summary.json](review-06/ci-summary.json)'s `checks` array: **19 entries, 19 with
`passed: true`, result `checks_passed`**. Eighteen are the checks C's spec declares; the nineteenth is
the advisory `area-gate: reported`, which accepts no E1 result. Repository tests **5,054**, archive
**4**, examples **18**, each with zero failures, cancellations, skips or TODOs; tool tests **777**. The
three mutation checks report **339 + 358 + 238** killed and no other count, the same as round 5, which
fits unchanged registries. [CI inspection](review-06/ci-inspection.json) holds these counts. The
[original ZIP](review-06/ci-artifact.zip) matches GitHub's digest,
`fef92b1228cd5e55aff73a87a4136cf689d3048eb828a061cf4f6ddd15f03449`. **No CI was started or retried.**
The full verification and the registered mutations are inspected evidence at C, not local reruns.

## Independent coverage and results

The coverage map came from brief 06, owner choice 07 and the rule owners, before the report was read:

- which decisions read the clock, and so which paths can make a deadline take effect;
- for each corrected sentence, the code or owner text that makes it true, and the nearest case that
  would make it false;
- which bytes may change in a prose-only round, and which may not.

The report covers the same boundaries. Its seven disclosed deviations are accounted for below.

| Criterion and method | Distinguishing check, result and evidence | Disposition |
|---|---|---|
| R6-TIMERS: text comparison with the owners, then observed behaviour | The corrected sentence agrees with `waits.md` steps 2 to 4, the K1.3 binding note at `operations.md:126`, BASELINE timer paths 1 to 3, 017 L-22 and `owner-guards.test.ts:362`. The Kernel reads the clock at exactly two sites, so the three paths are complete. | **PASS** |
| R6-SCOPE, as widened: Git, syntax-tree and spec checks | The 18 changed files are the two Layer-3 pages, the quick start, two comment-only SDK files, the spec, owner choice 07 and eleven evidence files. No test, fixture, registry, script or configuration byte changed. Kernel and core source equal B. | **PASS** |
| R6-EVIDENCE: identity and artifact checks | Own C and H, exact C..H allowlist, CI at exact C read from the downloaded artifact, own candidate check. | **PASS** |

### The timer sentences against their owners and the code

1. **`execution-cycle.md` adds no rule.** `waits.md` step 3 expires a wait whose deadline is due at the
   one accepted-time observation, inside the acceptance transaction, and step 2 lets an eligible
   unacknowledged Event win first. The new sentence says both and links step 3. The other two paths
   are the in-process binding's choice, which `operations.md:126` and BASELINE already record. The
   paragraph's first two sentences are unchanged from the accepted H.

   The three paths are exhaustive in the code. `readClock` has two call sites: `submitOutcome`, only
   for an `await` with a deadline (`coordinator.ts:1548`), and `fireTimer` (`coordinator.ts:2204`).
   Creation, dispatch and input ingress read no clock. The SDK's only `fireTimer` caller is
   `ApplicationHost.pump` (`host.ts:82`).

2. **The quick start and the `types.ts` comment match the bridge.** A pause's deadline is fixed when
   the pause is first observed and reused by its ID afterwards (`driver.ts:631–650`). A later step can
   therefore re-declare a pause whose stored deadline has passed. `pump` runs before the Kernel call in
   `start`, `input`, `resolveConfirmation` and `cancel`, and on every iteration of both run calls
   (`application.ts:291`, `:347`, `:370`, `:374`, `:395`; `host.ts:149`). `inspect` does not pump.

3. **The `host.ts` comment** now scopes host calls to live wait and Execution deadlines.
   `pendingTimers` lists only those two kinds, and L-22 says the same.

The [review probe](review-06/timer-paths.probe.mjs), with its [log](review-06/timer-paths.log), records
every `fireTimer` answer and the `wait` field of every accepted Outcome. It holds a step at the Driver's
own `submit.before` point, so it can act during the step. Implementation report 06 says its probe does
not exercise the queued-input exception through the SDK. This probe does. All five cases pass:

| Case | Schedule | Observed |
|---|---|---|
| A | Stored deadline passes during the step; nothing eligible queued; the run call has already returned and no host call follows | Outcome `wait.result: "expired"`, generation 2; Kernel `READY` with deadline readiness; **zero `fireTimer` calls**; a later run fails E with `arrokothi.bridge.wait_deadline_expired` and still fires nothing |
| B | As A, and `app.input` is made during the step | Outcome `wait.result: "woken"`, no timeout Event; the answer reaches the chat, which pauses again with a fresh deadline; zero fires |
| C | As A, and `app.resolveConfirmation` is made during the step while only an input pause is declared | The confirmation does not qualify; `wait.result: "expired"` |
| D (control) | Deadline still ahead at acceptance, then the clock passes it with no host call | `WAITING` after the deadline; the next run call expires it through exactly one `wait_deadline` fire |
| E | An Execution deadline already past at `start` | `READY` after creation, no cancellation; the next run call fires `execution_deadline` once and E is `CANCELLED` |

A and D separate the first path from the second. B and C show that the "unless … wakes the wait first"
clause is conditional on eligibility, as written. E shows that the third path has no
due-at-creation shortcut, so limiting the new sentence to waits is right.

### Values (O-2)

`packages/sdk/package.json` exports only `.`. `index.ts` exports `toCanonicalBytes` from `wrapper.ts`,
and `wrapper.ts` re-exports it unchanged from `internal/value-capture.ts`. So "the capture module stays
internal; the SDK's public entry re-exports its `toCanonicalBytes`" is exact, and BASELINE §16 records
the export. Dropping "internal" from the bullet's lead-in (deviation 2) removes the implication that
O-2 named.

Prompt B asks for no status on specification pages. The new clause states where the TypeScript binding
exposes the wrapper and links BASELINE. It names no packet and no acceptance, integration or release
state, and it replaces a sentence that named a packet ("K1.4 owns that bridge"). It is the text brief 06
proposed and the owner took. I accept it. A stricter editor could leave only the link; that is optional.

### Scope and preservation

The [delta check](review-06/executable-delta.mjs), with its [log](review-06/executable-delta.log), reads
pinned Git objects only.

| Changed source | Tokens compared (JSDoc excluded) | Result |
|---|---:|---|
| `packages/sdk/src/host.ts` | 1,001 | Same tokens and tree shape; same comment-free emit |
| `packages/sdk/src/types.ts` | 790 | Same tokens and tree shape; same comment-free emit |

The comparator's controls detect a changed literal, a split statement, a line break that changes the
parse and a changed optional marker, and they ignore comment and JSDoc edits. A directive comment is
invisible to a tree compare, so the six changed lines were checked separately: each is a doc-comment
line with no directive marker. No test, script or evidence tool anchors on the old or new comment text
(section 5 of the search below).

- All **196** production `src` files are listed at both revisions. The other **194** are blob-identical.
  Both changed files at the cleanup head equal the accepted H's.
- `tests`, `scripts`, `.github`, `examples`, `.agents`, `package.json`, `package-lock.json`,
  `tsconfig.json`, `packages/kernel` and `packages/core` have the same tree or blob at the cleanup
  head, C and H. That covers every test, fixture and registry.
- `packages/kernel/src`, `packages/core/src`, all of `packages/core` and the three mutation registries
  equal **B**. The Kernel package differs from B only in `binding-surface.test.ts`, which review 05
  accepted.
- `verification.json` differs in three keys: `administrative_files` (the report's name), `preserve`
  (40 entries appended, each pinned at the cleanup head) and `limits` (one round-6 sentence appended).
  The 18 checks, the inputs, the environment and the profiles are unchanged. All 73 preserved paths
  are unchanged at H, and together they cover every K1.4 record except `progress.md` and the spec.
- Across the round the K1.4 record directory gains 13 files and changes only `progress.md` and the
  spec. No earlier record, review or imported evidence file changed.

**The `types.ts` extension is accepted.** It is the third copy of one sentence, in the doc comment
application authors actually read. Leaving it would have left a known false current claim that brief
06's first question asks to find. It is comment-only by the check above. Owner choice 07 discloses it,
and the owner's review instruction names it. The owner may confirm it in the transcription.

### Search for other copies

The [search](review-06/claim-search.sh), with its [output](review-06/claim-search.log), covers the
mental model, the guides, the numbered development pages, package sources and READMEs, the skills, the
examples and the legacy mapping at H. It searches the rule by name ("take effect", "pump", "host
fire", "fire-only", "host call", "already due") and by alias (deadline, expiry and timer statements in
user-facing pages; scheduler and host statements in the mental model), and separately the wrapper's
visibility. Every remaining timer statement is scoped to the host-fired paths or names the
due-at-registration path: `operations.md:126`, `rewrite-index.md:346–352`, BASELINE `:529–539` and
`:1050`, 017 L-22, `coordinator.ts:291–294`, `:361–363` and `:664`, `time.ts:7–12`, and the three
corrected places. **No other current copy of the wrong claim was found.** Sealed records, research and
package tests were not searched as current pages; each describes its own revision.

### Local executions on H's product tree

| Execution | Result |
|---|---|
| Candidate check, delta check and CI inspection | All exit 0 |
| Review probe | **5/5** |
| The implementer's probe, unchanged | **2/2**; it reproduces its attached log |
| `owner-guards.test.ts`, `waits-registration.test.ts`, `bridge-deadline-cancel.test.ts` | **85/85**, 13 suites; includes the three-path tests and every W-2 branch with the Event-wins tie ([log](review-06/pinned-tests.log)) |
| `npm run test:sdk` | **787/787**, 53 suites, zero failures, cancellations, skips or TODOs |
| `npm run typecheck` | Exit 0 |
| `npm run check:builder-docs` | Exit 0: 75 Markdown files, 2,302 links and anchors, 58 imports |
| Links on the lines the correction added | 3 of 3 resolve, including both new anchors ([log](review-06/prose-links.log)) |

Not run locally: the full Packet verify, the full `npm test`, the mutation registries, the Kernel
sweeps and the race search. CI ran them at C, and the product tree at H equals C's. No live provider,
large-memory timing, durable recovery, isolation, packaging or E1 claim is made or checked.

## Findings and observations

**No blocking finding.** No P0, P1 or P2. The observations below are P3. None is required for
acceptance.

- **R6-OBS-01.** The last `limits` sentence of `verification.json` still says that fresh-clone local
  checks ran before the CI dispatch. In round 6 they ran after it. The report discloses this as
  deviation 5, and the CI run at C is the handoff evidence either way.
- **R6-OBS-02.** The quick start's option rows (`:76`, `:86`) give a deadline's value and its
  consequence. Read alone they could suggest instant enforcement. The corrected paragraph at
  `:155–160` says when a deadline takes effect. The report names this as a residual risk; it is an
  L-22 wording item, outside CLEANUP-K14-01.
- **R6-OBS-03.** The guide and the `types.ts` comment say "already passed" and "still ahead". The
  Kernel treats `now == deadline` as due, which `waits-registration.test.ts` pins. The exact instant
  is unstated in the prose and does not matter to a reader working in milliseconds.
- **R6-OBS-04.** `014-owner-progress-summary.md:389–390` still describes CLEANUP-K14-01 as open. This
  round preserves 014 by design, so it is correct that H did not edit it. Cleanup 02 should refresh it.

## Finding disposition, acceptance map and handoff

| Item | Review-06 disposition |
|---|---|
| CLEANUP-K14-01 (P2, the cleanup agent's own finding) | **CLOSED.** The execution-cycle paragraph agrees with its owner, and the same omission is corrected in the quick start and both SDK doc comments. |
| O-2 (observation) | **Taken**, accurately. |
| O-3 (owner item) | Not in scope; untouched. |
| K14-R4-01 and earlier findings | Carried by review 05 and its pinned predecessors. Not reopened. |

| Criterion | Disposition at exact H |
|---|---|
| R6-TIMERS | **PASS** |
| R6-SCOPE, as owner choice 07 widens it | **PASS**, including the disclosed `types.ts` extension |
| R6-EVIDENCE | **PASS** |
| K14-1 to K14-6 | Not re-evaluated. Review 05's dispositions at `e307943d` stand, with L-36 and L-37. Between that H and this one, the only changes outside `docs/development/` are three prose pages and two comment-only source files. |
| K14-G | **DEFERRED to K1.4-gate**, as before. |

**Closure note (012).** The misunderstood invariant was that every deadline needs a host fire. Its
owner is `waits.md` step 3, and the counterexample is `owner-guards.test.ts:362`. The dependent
descriptions were the execution-cycle paragraph, the quick start and two doc comments; the rule's
owner, the binding note, BASELINE and L-22 were already right. The cause was a rule restated away from
its owner, and cleanup 01's suggestion addresses it: name the owning page for each Layer-3 sentence a
packet adds. There is no new finding, so no correction brief is written.

Third-party reuse: none. The review uses repository fixtures, Node, TypeScript and the Python standard
library. This branch adds only the review and its evidence. It does not edit the candidate, transcribe
the ledger, merge, integrate or release a successor. The push and the remote SHA are reported
separately; this record does not name its own recording commit.

**Transcription:** the round-6 documentation correction of K1.4 is accepted at exact H below.
CLEANUP-K14-01 is closed and O-2 is taken. K1.4 remains `ACCEPTED` for K14-1 to K14-6 under review 05,
with L-36 and L-37 retained. Cleanup may resume. Integration and any successor release remain
owner-controlled, and K14-G stays K1.4-gate's.

ACCEPT — H `64c505bfee13cae340710942e69fe805723aaad9` — K1.4 round 6 documentation correction (CLEANUP-K14-01, brief 06 as widened by owner choice 07).
