# K1.4 — independent review 01

**CHANGES REQUIRED.** Four reproduced production defects and one required-corpus gap prevent acceptance.
The Kernel source and mutation faults were preserved; the passing CI does not exercise the failing interactions.

## Identity and authority

- Reviewer: independent Codex desktop session, GPT-6, 2026-11-07 (America/New_York). This session did not
  implement, attack or check the design. No subagents. The owner reports that all those earlier sessions were
  Claude Opus; this review therefore re-derived the critical predicates instead of treating their agreement
  as independent corroboration.
- Reviewed branch: `origin/claude/k1.4`.
  - **B:** `608f9ece44dbe42b78974bdac9e7ddcd33697705`.
  - **C:** `0d05d32971dfeda89dc874450e38f440af2c4a1d`.
  - **H:** `072f9627791f43e4d990a6f47c3e32510cbbc011`.
- Review branch: `codex/k1.4-review-01`, created directly from H. Live `git ls-remote origin
  refs/heads/claude/k1.4 refs/heads/codex/k1.4-review-01` advertised H for the candidate and no existing review
  branch. Final review-commit/push identity belongs in the external handoff, not a self-referential record.
- Governing baseline: AGENTS.md, [006](../../006-development-process.md), [008](../../008-implementation-report.md)
  and [012](../../012-review-methods.md) at B, unchanged at H; the
  [slice-audit skill](../../../../.agents/skills/arrokothi-slice-audit/SKILL.md). 017's proportionality and accepted
  limits apply. K1.3 and TOOLS-02 integration are prerequisites present in B, not reopened here.
- Owners read first: the mental-model overview/reference and Kernel, Runtime, Driver and Deployment pages;
  the owning execution-cycle, waits, lifecycle, integration and evidence mechanisms; the values contract;
  development front door, baseline and roadmap. The prior-art reading map and its relevant canonical-bytes /
  live-object-validation sections were consulted as background. No external project's behavior is used as
  normative or acceptance evidence in this review.
- Then read [brief 01](brief-01.md), [release 01](release-01.md), [design 01](design-01.md),
  [owner choices 01](owner-choices-01.md), [02](owner-choices-02.md), [owner choice 03](owner-choice-03.md),
  [attack 01 at cffb2c81](https://github.com/ArrokothI/arrokothi/blob/cffb2c81244f7f0955e9b20d30fac70e8a1e1e5d/docs/development/work/K1.4/attack-01.md),
  [design check 01 at 5f18c44c](https://github.com/ArrokothI/arrokothi/blob/5f18c44c6e086d68311862cc95f1417a9c1f17de/docs/development/work/K1.4/design-check-01.md),
  [design 02](design-02.md), and [implementation 01](implementation-01.md). The two separate-branch records
  were read from those exact Git objects. Design 02 supersedes design 01 where stated.
- Access: local source and Git history, shell, GitHub job/artifact APIs and downloaded evidence. Local Node
  was **v26.10.0**, selected by prepending
  `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` to PATH. No live model, isolated
  deployment, process-recovery or E1 benchmark claim was tested or earned.

## Candidate and CI evidence

The independently run candidate check reported [facts_verified](review-01/candidate.json): B, C and H have
the required relationship, and C..H touches exactly the allowlist read from the spec at C:

1. `docs/development/007-work-packets.md`
2. `docs/development/work/K1.4/implementation-01.md`
3. `docs/development/work/K1.4/owner-choice-03.md`
4. `docs/development/work/K1.4/owner-choice-03/limited-members.json`
5. `docs/development/work/K1.4/progress.md`

Content inspection found administrative status, report and owner-decision material, not a post-C production,
test or verification change. Owner choice 03 explicitly authorizes the six limited-origin extras without
adoption credit; its member-list digest matches the decision. The spec's historical K1.3 whitespace exception
is preserved at its pinned revision. `git diff --exit-code B H -- packages/kernel/src` was empty, exit 0.

CI inspected: [Packet verify run 42405868481](https://github.com/ArrokothI/arrokothi/actions/runs/42405868481),
successful job **128503308457**, artifact **13590783007**, named
`packet-verify-0d05d32971dfeda89dc874450e38f440af2c4a1d`. The workflow's own head is the workflow version on
main at B; its **REVISION input is C**, and its checked-out subject is C. This distinction was verified from
the job log's [REVISION lines](review-01/ci-revision-excerpt.log) and the artifact's
[run.txt](review-01/ci-run.txt): `revision=C`, `head=C`, Node v26.10.0, npm 11.19.1, Python 3.13.18,
Linux x86_64, four CPUs, 2026-11-07 19:22:26–21:08:03 UTC, exit 0.

Downloaded the artifact ZIP and its actual `summary.json`, rather than counting prose in the implementation
report. [The retained summary](review-01/ci-summary.json) has **19 checks, all 19 `passed: true`**, and result
`checks_passed`. Artifact ZIP SHA-256:
`eb41740004e1c785b4519858dac97136dd9e2f09438baf4e314825e196304798`.
Summary SHA-256: `7bff3bbc1c88ba4db8f762264a361a80120cd5dab84b0319f1534326afd1b013`.
The full raw `verify.json` remains in that pinned Actions artifact, owned by the repository's CI, with reported
expiry 2027-02-05T19:22:08Z; the downloaded summary/run metadata are retained here in Git.

| CI check(s), counted from summary.json | Observed result |
|---|---|
| tool-tests | 777 tests |
| inventory; adoption; dimensions | `provenance_verified`; `mappings_complete`; `coverage_reported` |
| registered-mutants; refusal-mutants; value-cost-mutants | All `selected_cases_passed`; raw verify results report 339 / 358 / 238 kills respectively |
| refusal-census; oracle-census; typecheck | Passed |
| repository-tests | 4,897 tests; 0 failed, cancelled, skipped or todo |
| archive-tests | 4 tests; 0 failed, cancelled, skipped or todo |
| kernel-sweeps; race-search; value-cost-dimensions; value-cost-continuations | Passed |
| example-tests | 18 tests; 0 failed, cancelled, skipped or todo |
| builder-docs; area-gate | Passed; area gate is `reported`, not E1 acceptance |

The full verify was **not rerun**, as the owner instructed. CI corpus and mutation results were inspected
before the additional counterexample search. Local targeted command:

```sh
export PATH=/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin:$PATH
node --test packages/sdk/tests/bridge-classify.test.ts packages/sdk/tests/bridge-flow.test.ts \
  packages/sdk/tests/bridge-deadline-cancel.test.ts packages/sdk/tests/bridge-values.test.ts \
  packages/sdk/tests/bridge-inventory.test.ts packages/sdk/tests/wrapper-environment.test.ts \
  packages/kernel/tests/binding-surface.test.ts \
  tests/conformance/architecture/legacy-bridge-boundaries.test.ts \
  tests/conformance/architecture/legacy-mapping.test.ts \
  tests/conformance/architecture/kernel-landing-zone.test.ts \
  tests/conformance/architecture/builder-docs-anchor.test.ts
python3 -B scripts/packet_tools.py candidate \
  --payload 0d05d32971dfeda89dc874450e38f440af2c4a1d \
  --head 072f9627791f43e4d990a6f47c3e32510cbbc011 \
  --spec docs/development/work/K1.4/verification.json
node --test docs/development/work/K1.4/review-01/probes.mjs
```

The [targeted suite](review-01/targeted.log) passed **352 tests, 27 suites**, zero failures/cancellations/
skips/todos, exit 0. The [independent probes](review-01/probes.mjs) assert the required behavior and deliberately
remain failing at H: **5 tests, 1 control passed, 4 failed**, no skips/cancellations/todos, exit 1
([output](review-01/probes.log), with whitespace-only lines normalized). Initial probe-authoring mistakes concerning the native `delivered` status and
the shape of a disposition were corrected before this retained run; those were not candidate findings.

## Independent coverage and bounded search

Applied 012's normative, deterministic, race/fault, native Driver, packaging and process methods. The owned
boundaries are SDK intent → canonical Kernel input, dispatch → native lineage, asynchronous native settlement
→ Outcome, whole-batch acknowledgment → reported native disposition, and accepted pause → subsequent SDK call.
All findings concern the SDK/Driver or its evidence, not a proposed change to Kernel semantics.

| Obligation / interaction | Independent examination and result |
|---|---|
| Creation, root identity, replay and cancellation ordering | Traced Kernel creation before `createRoot`, one-shot root ID, creation-in-progress wait, collision refusal, exact start replay and cancellation before/after native creation. Existing barriers and ordinary-flow tests pass. No additional root-identity defect found. |
| Pause classification and pending native work | Read every classifier branch and record read. The 2,205-cell product runs once for a single member and once under a parent (4,410 evaluations), but fixes every operation to `status: pending, outcome: null`, has at most one operation in the varied member, and never varies a read interleaving. Its resumption set is none/pending/settled. A mixed two-operation settlement breaks the claimed conclusion: R1-01. |
| Lineage termination | Followed sticky `ended`, pre-forward/pre-step/post-step checks, child-first cancellation, completion/failure descendant cascade, late root creation and native spawn's transaction/cancellation check. Existing cancel and child-expiry probes pass. The additional test obligations stated in design 02 are not all implemented: R1-05. Physical stop remains L-20, not a new requirement. |
| Deadlines and host loop | Checked pause identity/deadline carry, stray input re-await, already-due registration, ingress pumping, absolute creation deadline retry, timer-induced cache invalidation, READY candidates, busy/park notifications and bounded host return. Existing manual-clock and slow-two-Execution checks pass. No tighter wall-clock/background-pump guarantee is inferred beyond L-22/L-31. |
| Input identity and failure accounting | Compared caller intent with derived canonical payload before/after the child pause disappears; exact retry fails (R1-02). Injected one store-read exception before forwarding a two-Event batch; both Events are acknowledged without results (R1-03). Traced early rejection, partial forwarding and encoding-error exits for the same accounting mechanism. |
| Protocol refusal, native values and Emission carry | Traced second control-scoped caller, named failures, failure-detail omission, bounded message and carry order/limit. Existing forced-refusal, over-limit and carry checks pass. An encoding failure that drops ingress accounting is included in R1-03's required closure. |
| K14-4 inventory | Checked exported/member and reachable-guide extraction, row coverage, refusals and new interleave/mailbox/input rows. The 52-row table is structurally closed over its declared extraction scope; its hook test observes object identity only after initialization and misses R1-04. Structural enumeration is not preserved behavior. |
| K14-6 mapping | Reconciled the exact 164-file set: 79 R, 38 U, 12 S, 11 X, 7 P, 7 N, 6 G, 4 M. P/X targets exist and old native regressions are retained. The asserted kept properties for input retry and native-only waits fail under R1-02/R1-01 despite set completeness. |
| Boundaries and wrapper | Reviewed longest-prefix zone attribution, exact four SDK Kernel importers, relative/type/barrel rejected-edge controls and private manifests. Rechecked public exports and the BINDING-01 prefix exception: only the exact environment-check call and import widening are stripped before comparison. Fresh-process tests cover all eight free identifiers, property replacement, harmless shadow and capture-time shadow. No additional K14-3/K14-5 defect found. |

The additional search was bounded to one application at a time for new probes, a root plus one called child
for identity, two operations on one root for settlement, and two queued inputs plus one pre-forward exception
for accounting. The snapshot probe delays the supported async store port at the Driver's context/operation
read boundary; a stack predicate selects that window. It releases the real executor and waits at most 200
event-loop turns for the real native store to become READY. It forges no records. A second host run establishes
that this is stranded work, not a transient diagnostic discrepancy. The retry probe includes a control with
the original explicit child destination; the ordinary input/completion control passes. No production source
was modified, and no new mutation-kill credit is claimed.

Source review also covered the unchanged native settlement/spawn mechanisms on which the new Driver relies.
This is not an exhaustive interleaving proof, and deep arbitrary Runtime graphs, native writer takeover,
process death, live providers, large-memory timing, hostile same-process realms and physical containment were
not tested. Those are outside this packet's declared profile/limits. No K14-1..6 obligation is silently
deferred; the unresolved ones are FAIL below. K14-G alone is explicitly assigned to K1.4-gate by release 01.

## Design-check disposition audit

| Item | Disposition at H |
|---|---|
| D01-CHK-01 | **FAIL evidence closure.** Termination mechanism is present and inspected; B-CANCEL-PREROOT and B-CANCEL-MIDSTEP-CHILD pass. B-FAIL-CASCADE does not implement its full promised scope (R1-05). No new production cascade failure is claimed. |
| D01-CHK-02 | **FAIL.** Positive predicate exists, but separate async reads do not establish its premise. Product omits operation status/outcome and mixed settlement schedules (R1-01). The native-timer guard cannot repair this race. |
| D01-CHK-03 | **PASS.** Separate control caller; forced Driver-fail refusal produces a protocol-failure hold. |
| D01-CHK-04 | **PASS.** Anchored per-pause deadlines, required host-entry pumping and absolute creation deadline identity are implemented; targeted manual-clock/retry checks pass. |
| D01-CHK-05 | **PASS for value disposition.** Input refusal and bounded native failure/output handling match the accepted limit; accounting on the exceptional exit is R1-03 under ACK-01. |
| D01-CHK-06 | **PASS.** Public surface, preserved capture prefix and in-window environment check agree with the revised contract. |
| D01-CHK-07 | **PASS.** Published Scheduler contract remains unchanged; unfiltered FIFO and lineage-specific claims are exercised. |
| D01-CHK-08 | **FAIL semantic closure.** Extraction/member lists exist, including new rows; preservation of controller services is false during invocation (R1-04), and ingress preservation has R1-02/R1-03. |
| D01-CHK-09 | **PASS set closure.** All 164 declared files are mapped, including SDK helpers, examples and binding-surface. This does not make the kept properties pass: see K14-6. |
| D01-CHK-10 | **PASS source/order.** Reason and default destination derive from the accepted pause Emission/cache in declared order. Its interaction with immutable retry identity is not resolved by that rule (R1-02). |
| D01-CHK-11 | **PASS.** Native root creation is inside start; replay avoids creation; creation error cancels and throws. Cancellation/root-less windows have deterministic coverage. |
| D01-CHK-12 | **PASS.** Named private-Kernel import admission and longest-prefix zones; an example import is rejected. |
| D01-CHK-13 | **PASS.** Owner-authorized breaking changes, ignored maxActivationsPerRun warning and core-only N rows are reflected in code/docs. |
| D01-CHK-14 | **FAIL in INGRESS-01 × retry and ACK-01** (R1-02/R1-03). ID-01, one-shot ALS-01, EMIT-01 carry, HOST-01's candidate/change loop, SIDE-01 and PUB-01 dispositions are present. GROW-01 is an accepted measured limit. Fixture requalification and owner-choice-03 extras preserve existing credit, as checked below. |

## Preservation and attribution

No weakened existing assertion, expected result or mutant fault was found in the cumulative diff. In
particular, `mutations.json`, `refusal-guards.json` and `value-cost.json` are byte-identical to B. The value-cost
source list adds eight SDK files and removes none. Existing SDK/example receipt assertions were moved to the
accepted ingress Emission; expected native outcomes and external call counts remain. The supplied-scheduler
test is migrated because that option is explicitly refused; its initial-input property remains asserted and
root/creation barriers are added elsewhere. Landing-zone mutants use an eligible published integration
package after the SDK became private, retaining the same forbidden mutations and expected rejection.

The adoption-manifest comparison was by stable identity, not positional array diff: all 1,549 origins and
1,272 preserved-table members remain; the only preserved status changes are **12 unread → refused**. The 23
credited preserved members remain 23. Eighteen existing suite-target changes are declaration-line shifts;
six new targets/extras have owner choice 03. Twelve unread-witness counterexamples are removed, six authorized
replacement counterexamples added, and all shared counterexample records are unchanged. No kill or preserved
credit is created by those replacements. This agrees with CI `mappings_complete`; it does not excuse the new
behavioral/corpus gaps below.

Layer-3 integration/execution-cycle and baseline/guide changes keep native effects, Agent/Workflow quality
and isolation out of Kernel guarantees. The public SDK is deliberately private/unpublishable under the owner
decisions. No new third-party dependency, copied/adapted external code or asset appears in the payload or this
review's probes; `node:async_hooks` is a Node builtin. No new licensing clearance is claimed.

## Findings

### 1. K14-R1-01 — P1: an incoherent lineage read can strand native READY work in Kernel WAITING

**At H:** `packages/sdk/src/legacy-bridge/driver.ts:334–346` (`lineage`), `:378–388` (await submission),
and `packages/sdk/tests/bridge-classify.test.ts:39–46` (fixed pending/null operation fixture).
Governing: K14-1/K14-2/K14-6, design 02 D01-CHK-02, and the Runtime/Kernel wait boundary.

**Failure scenario:** a Function issues two capability operations. One is dispatched and suspended; the
other requires human confirmation. After the Driver reads the context as WAITING, the dispatched operation
settles before `pendingOperationsOf` returns. The classifier sees the old WAITING context, the now-settled
operation and the remaining confirmation, and accepts `await`. The actual native store is READY. The probe
observes `confirmation_required`, Kernel WAITING/native READY, handler count 1, and the same stranded state
after another host run. No native timer, unsupported service write or hostile caller is involved.

**Cause and required fix:** design 02's soundness argument assumes the facts being classified hold together.
Absence of native timers proves nothing about completion during those reads. Establish a coherent or
validated quiescence observation through Outcome commitment, including concurrent settlement/notification
windows; do not merely add a READY special case to this fixture. Keep native scheduling inside the Driver.
Expand the product to operation status/outcome and relevant resumption states, plus mixed-operation and
parent/child schedules. The maintained test must reject a committed wait that strands runnable native work.
This questions an accepted K1.4 design premise, not the earlier Kernel wait contract.

### 2. K14-R1-02 — P2: an exact input retry changes identity after its implicit child destination changes

**At H:** `packages/sdk/src/application.ts:321–335`; the cache is superseded at
`packages/sdk/src/legacy-bridge/driver.ts:389–392`. Governing: K14-4/K14-6, owner choice Q5, design 02
INGRESS-01, and the kept property in `legacy-mapping.json` for `interaction/event-delivery.test.ts`.

**Failure scenario:** a Workflow's conversational child is the sole input pause. Submit
`{ requestKey: "reply", label: "user", payload: "again" }` without a destination; it is accepted for the child.
Drive the lineage until that pause disappears (the probe ends on the child's cumulative model-call budget).
Retry the identical object: it throws `duplicate_conflict`. Supplying the original child explicitly still
replays the original Event, confirming that Kernel replay works. Recomputing the implicit destination changed
the canonical payload to the root before lookup.

**Required fix:** bind the originally resolved destination to the accepted caller request identity and
preserve exact replay across pause changes/terminal state. A changed caller payload or explicit destination
must still conflict; no second native delivery is allowed. Resolve the interaction of accepted default routing
and exact retry in the design, including transition to multiple waiting members. Silently requiring an
explicit destination for previously valid retries would change accepted behavior and needs the owner.

### 3. K14-R1-03 — P2: terminal error paths acknowledge unforwarded Events without reporting them discarded

**At H:** `packages/sdk/src/legacy-bridge/driver.ts:210–215`, `:228–231`, `:245–247`, `:437–443`.
Governing: K14-1/K14-4, design 02 ACK-01, 017 L-29 and integration's managed-native-session accounting rule.

**Failure scenario:** queue initial input plus a second valid input before the first dispatch. A supported
RuntimeStore throws once on the native-root read before forwarding. The Driver accepts a native-error fail;
both Kernel mailbox Events are `acknowledged`, the Function never ran, and there is no `ingress_result`.
The probe establishes all of those facts. The exception path passes an empty results array; early initial-input
rejection also exits before accounting for later Events, and `finish` can silently erase results on encoding
failure. The timeout branch alone does the explicit discard accounting.

**Required fix:** make per-batch accounting survive every terminal exit. Preserve completed forwarding
results and classify each unattempted Event as discarded, with bounded encodable output; do not fabricate a
native-processing receipt. Test before-first, after-partial, initial-rejection and encoding-failure exits with
multiple Events, original receipts/IDs and zero forbidden extra native delivery. L-29 permits discard only
with its report; it does not permit this omission.

### 4. K14-R1-04 — P2: the preserved controller hook receives an uninitialized scheduler

**At H:** `packages/sdk/src/application.ts:143–148,177`; inventory S-OPT-NATIVE at
`packages/sdk/tests/bridge-inventory.test.ts:249–262` and S-SERVICES at `:318`.
Governing: K14-4 and design 02 D01-CHK-08.

**Failure scenario:** inside the documented `controllers(services)` hook, read
`services.scheduler.queuedCount()` or retain that scheduler for controller construction. `scheduler` is
`undefined` at invocation, causing a TypeError (or retaining undefined). B initialized the services before
calling the hook. The inventory stores the mutable services object and checks identity only after creation,
when the scheduler has been patched in, so it passes without testing the promised behavior.

**Required fix:** expose the initialized, actual lineage scheduler when invoking the hook. Add an assertion
inside the callback and check that the retained scheduler is the one the app uses. This is a read-only use;
L-34's unsupported writes do not authorize breaking it. A temporary placeholder that later changes identity
would leave the same defect for callbacks that retain the member.

### 5. K14-R1-05 — P2: the claimed termination corpus omits required failure/completion cases

**At H:** design 02 §3's B-FAIL-CASCADE row and implementation 01's statement that every §3 item is maintained;
`packages/sdk/tests/bridge-flow.test.ts:33–46` and `bridge-deadline-cancel.test.ts:187–201` are the actual
B-FAIL-CASCADE coverage. Governing: D01-CHK-01, K14-1 and 012's rule that inventories cannot claim more than
they execute.

**Failure scenario in the evidence:** deleting the completion descendant cascade, or failing to cascade for
an unexercised Driver-failure trigger, is not distinguished by the named B-FAIL-CASCADE cases. Those cases
exercise a native-store failure on a root and deadline expiry with one called child. Other root-only failure
tests do not supply the missing descendant assertion. The suite does not implement
the design's required completed-root/live-descendant case or each Driver-originated fail with a live lineage.
A bounded read/search of all `packages/sdk/tests/*.ts`, including the inventory, found no equivalent completion
case. This is a missing required oracle and a false closure claim, not a demonstrated production cascade bug.

**Required fix:** add the specified terminal-trigger/descendant cases with whole-lineage and subsequent-run
assertions, and show that removing the relevant cascade is caught. Reconcile each trigger with the shared
mechanism, including late-child cancellation, rather than multiplying test names without varying the exit.
Correct the report's closure claim. 017 does not waive this explicit evidence obligation/false current claim.

## Criterion verdict and handoff

| Criterion | Verdict | Reason |
|---|---|---|
| K14-1 | **FAIL** | The Kernel is driven through the supported entry, but R1-01/R1-03 violate exchange behavior and R1-05 leaves required terminal coverage open. |
| K14-2 | **FAIL** | The structural Driver boundary is present; the native-to-Kernel wait mapping is unsound under R1-01. |
| K14-3 | **PASS** | Source boundary, ownership inventory, import/zone controls and targeted architecture checks agree; Kernel source is unchanged. |
| K14-4 | **FAIL** | The closed inventory overstates preservation of retry, ingress accounting and controller services (R1-02/R1-03/R1-04). |
| K14-5 | **PASS** | Wrapper exports, cooperative limits, prefix preservation and environment refusal controls match the accepted decision. |
| K14-6 | **FAIL** | The mapping's file set is complete, but its explicitly kept native-wait and exact-input-retry properties fail (R1-01/R1-02). |
| K14-G | **DEFERRED** | Release 01 assigns the combined E1 gate to unreleased K1.4-gate; no benchmark acceptance is claimed. |

This is the first implementation review, so 006's repeated-failure stop-and-redesign trigger has not fired.
Nevertheless, the correction must address the accepted design's shared assumption that sequential observations
form a stable fact: during lineage reads, across retry routing and during hook initialization. Whole-batch
accounting needs one owner across every exit. Existing green tests examined fixed snapshots, immediate retries,
post-construction identity and one timeout discard path; they did not distinguish these failures.

The [correction brief](review-01/brief-02.md) supplies the next-round questions and bounded required outcomes.
All five findings are reviewer-originated; no owner supplemental finding or new owner decision is claimed.
No production fix, acceptance, integration, status-ledger transcription or successor release is performed by
this review. The owner may forward the brief for correction of the same packet; a fresh C/H and cumulative
independent re-review are required.

CHANGES REQUIRED — H `072f9627791f43e4d990a6f47c3e32510cbbc011` — K1.4 (K14-1 through K14-6).
