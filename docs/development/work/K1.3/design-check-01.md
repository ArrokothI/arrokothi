# Design check 01 — K1.3

2026-10-25, Codex desktop, GPT-6 per this session's instructions (serving variant not exposed),
independent of the Claude implementer and the separate attack session. The owner requested this
check under [006's design-check rule](../../006-development-process.md#packet-lifecycle).
This is a design check, not implementation acceptance; no K1.3 production code exists at the subject.

**Subject:** `origin/claude/k1.3` at `4b45e697da910ba4fd0473b79c5df6d0f7d12ca5`.
The request contained literal `<SHA>`; the fetched branch tip is the pin used here. Design base B:
`22c8c1db9958049eb8693dd5aa4d7005f2d565db`.
**Attack evidence:** `6052f0a7a5629601f7b1612cd3944b27c5da44f2`, on
`codex/k1.3-design-attack`, is a direct descendant adding only attack-01 and its three probes.
The subject itself has no attack record. This review branch starts at that evidence commit so the
links below resolve; the design and implementation being checked remain the pinned subject's bytes.

Read [brief 01](brief-01.md), [release 01](release-01.md), [design 01](design-01.md),
[attack 01](attack-01.md) and its probes; the mental-model overview/reference and relevant major
abstractions; the brief's governing [waits](../../../../mental-model/mechanisms/waits.md),
[lifecycle](../../../../mental-model/mechanisms/lifecycle.md),
[core](../../../../mental-model/concepts/core.md#waiting-for-what-arrives),
[operations](../../../../mental-model/concepts/operations.md#three-clocks) and
[recovery](../../../../mental-model/mechanisms/recovery.md) owners. Also checked authority,
execution-cycle, creation, Driver integration, rewrite-index §4, the B/W/CL/CX worksheet decisions,
K0 fixture §22, the development front door, BASELINE, 006/007/008/012/017 and the research reading
map's waits, plan/apply and evidence sections. Research was background, not authority for an outcome.

Implementation trace: all five requested files —
[plan.ts](../../../../packages/kernel/src/plan.ts),
[state.ts](../../../../packages/kernel/src/state.ts),
[coordinator.ts](../../../../packages/kernel/src/coordinator.ts),
[outcome.ts](../../../../packages/kernel/src/outcome.ts),
[lifecycle.ts](../../../../packages/kernel/src/lifecycle.ts) — plus the relevant Driver/identity
contracts and terminal/late-report tests. Search covered capture and replay precedence, immutable
identity, plan preparation/application, all existing state-owner arms, dispatch/redelivery,
takeover/recovery revalidation, delivery-log ownership, B-5 dispositions and the proposed clock calls.

**Disposition:** the plan/apply design is viable. Required corrections below concern its evidence,
one misstated existing behavior, and incomplete new boundary contracts. They do not require replacing
the coordinator/state-owner decomposition. Under 006, this conditional verdict does not authorize
implementation while the two owner choices below remain unanswered. Record the corrections and
answers before building; implementation acceptance still requires a later independent C/H review.

## Findings

### D01-CHK-01 — Make K13-5's mutant requirement finishable (P2)

Design lines 387–393 promise that all three alternative selectors fail one of the five examples.
Attack F1/A01 is confirmed: the correct union of eligible Events plus T, sorted and truncated without
an explicit mandatory-first step, passes all five. The rerun selection probe reports no failures for
`sort-union`. W-2 checks eligible backlog before minting T; an eligible arrival during the live wait
retires it before a timer can mint T. Consequently every eligible Event beside a real T at reservation
is newer than T. For an Event wake, the mandatory member is already the earliest eligible candidate.

This inherited evidence claim is wrong, not a new production defect. The maintained
[fixture §22](../../../../tests/fixtures/k0/public-fixture-specification.md#22-round-16-correction-b-2s-wait-ended-batch-decomposed)
already records the reachability argument under “Foreclosed rather than manufactured.” The current
waits page's explanation overclaims what its examples distinguish too.

Required: preserve all five examples and the owned mandatory-member rule; distinguish omission of
timeout **membership** (killable) from omission of explicit **priority** over the correct union
(equivalent on reachable states). Record the latter's equivalence under 012, and correct the brief,
design and dependent current explanatory prose. A synthetic R-before-T selector test may check the
literal selection function, but cannot be represented as a reachable Kernel history or a live-search
kill. This check approves that evidence clarification, not a change to W-2/W-9. Do not alter sealed K0
history. No owner question about a forbidden earlier eligible result is needed.

### D01-CHK-02 — Correct the K13-9 oracle before using it (P2)

Three concrete problems need correction:

- Lines 487–490 exclude payload bytes. Attack F2/A05 proves that replacing retained nonempty input
  with null then passes the comparison. Fixed test input still has to survive transitions. Retain
  independent expected content and compare it after every step, in both inspection and delivered
  Activations; do not derive expected bytes from the implementation's current view.
- INV-7 (line 502) says a wait-ended batch contains “nothing ineligible,” but §4 makes every timeout
  ineligible. The legal witness S5 `d`, bound 1, contains only T1 and violates the invariant as written.
  State the exception precisely: all members other than the exact mandatory timeout must be eligible
  under the retired selector. Other generations' timeout Events remain excluded. Keep the separate
  nonempty, bound, ordering and mandatory-member assertions.
- The harness learns keys only from `pendingTimers()`. An omitted timer must not make the reference
  model omit the same work. Derive expected pending keys from model state and compare the listing;
  retain real observed keys for delivery separately. Keep one stable, injective Event-ID mapping
  across the run, and compare original receipt/refusal references on retries. Rebuilding names from
  each view or masking opaque tokens without checking their relations would hide A21's defects.

The hand trace for INV-7 is reproducible directly from design §4/§8 and its S5 seed: g1 expires,
T1 is queued, and `dispatch(bound: 1)` must carry T1 even though `eligible(wait, T1) === false`.
Add it as a maintained oracle-positive control. Add A05/A21 as negative controls; the corrected oracle
must accept the lawful trace and reject each corrupted one. These are false evidence claims about
build-right-now data/semantics, not optional analyzer completeness under 017.

### D01-CHK-03 — Turn the attack's blanket corpus promise into an explicit map (P2)

The attack was written after this design. Line 619's promise to keep every attack item is therefore
not an answer to F3. Keep the bounded search: its arithmetic is correct and depth four from eight
seeds at two bounds is a useful, finishable claim. It does not cover arbitrary length-nine histories,
changing selectors/content, middle timer keys, arbitrary historical Outcomes, or contradictory
delivery reports. A deeper walk over the same alphabet does not supply those dimensions.

Carry every row of the attack map below into maintained Kernel tests or a documented equivalent-mutant
entry. Named deterministic cases are sufficient; there is no requirement to expand the alphabet
combinatorially. Report the exhaustive and supplementary searches separately, validate seed prefixes,
count skips and exercised transitions, and pin the supplementary RNG/seed and whether 20,000 is total
or per seed/bound. Define `x` on a seed with no Execution deadline: a no-deadline key produces `stale`
with no clock advance, or the action is an explicit skip. Never let `max(now, undefined)` poison time.
Compilation/loader failures are not semantic mutant kills; an expected owner guard must be named.

### D01-CHK-04 — Preserve the actual terminal redelivery contract (P2)

Design §10, lines 275–277, says redelivery returns `terminal_destination` through an existing terminal
check. It does not: `coordinator.ts`'s `redeliver` checks for an unresolved exchange first, and
[terminal.test.ts](../../../../packages/kernel/tests/terminal.test.ts) explicitly pins
`no_unresolved_exchange` after completion. The other named control paths use `#openExchange`, which
does have the terminal check. Attack A22 and the baseline-mismatch note are correct.

Required: retain COMPLETED/FAILED behavior. Use the same `no_unresolved_exchange` answer for
CANCELLED after the cancellation plan removes the exchange, and correct §10's claim. No new delivery
or logical state change is permitted. Keep `terminal_destination` for fresh Outcomes on
COMPLETED/FAILED and `cancellation_terminal_conflict` only for CANCELLED, after OA-2 replay/conflict.
No source requires uniform tokens across all controls. This resolves design Q4 and attack O6 without
requesting an unnecessary change to accepted K1.2 behavior. Any deliberate change to that older token
would instead need the owner under the brief's stop condition.

### D01-CHK-05 — Finish the timer-key representation (P2)

The listed key includes `deadline`, but §7 never decides whether that supplied value participates in
identity, is merely descriptive, or makes a mismatching key malformed. That is observable API behavior.
The same API must address a generation retired during registration, which never appears in
`pendingTimers()` (A13). Leaving it to the host to guess undermines the chosen representation.

Required binding clarification: identity is Execution ID plus timer kind plus generation (null for
the immutable Execution deadline); the persisted Kernel deadline alone decides due-ness. Specify
whether a mismatching descriptive deadline is ignored or refused and test it; neither may accelerate
expiry. Publish a typed key/construction rule for an immediately expired generation using the accepted
wait decision and retained deadline. Define malformed numbers, unknown kind, foreign/unknown
Execution, never-issued generation, and a well-formed generation lacking a deadline against §7's
classification table. Build with strings when calling `packIdentity`: the §7 shorthand passes `g`
as a number, whereas its existing implementation explicitly accepts strings only.

Host-only `pendingTimers`/`fireTimer` is acceptable in this trusted in-process binding. It is not a
tenant-facing read/control API and makes no remote authorization claim. The timer must consult current
state after its clock callback, so a hint cannot override cancellation, a replacement generation or
the stored deadline. The representation details above are implementation-owned; no architectural
owner decision about a universal timer format is required.

### D01-CHK-06 — Complete the Driver cancellation contract (P1; owner choice)

The additive optional hook, returning only `undefined`, invoked after cancellation commits, is a
reasonable boundary. Require prompt return, Driver ownership of async failures, no return-value or
thenable observation, and containment of both member lookup and invocation throws. A thrown hook
cannot change the already committed cancellation. Repeated cancellation must not repeat the request.
This establishes a request, never physical stop or safe takeover.

However §9 invokes it only if an exchange is open and gives it only the current attempt's Activation.
Counterexample: A1 returns an accepted `await` while its native session/form still exists; cancellation
then arrives in WAITING. The design retires the wait but never calls an otherwise capable Driver.
The same gap exists after `continue` before the next dispatch. Neither an accepted Outcome nor the
absence of an unresolved Activation proves native work has stopped. Lifecycle/CX-1 requires requesting
Driver cancellation; integration's identity mapping and pause rules permit native lifetimes spanning
Activations. The existing “no physical interruption guarantee” limit does not describe this omission.

**Owner question:** approve an optional Execution-scoped cancellation request with optional current
attempt coordinates (recommended), or explicitly restrict K1.3's request support to an open attempt
and record that additional unsupported case. Exact public shape and that support limit are not fixed
by the sources. Omitting the hook altogether also needs an explicit unsupported-request decision;
“never guaranteed to stop” is not permission to claim a request was made. Update design Q2, the Driver
type/authoring contract, BASELINE and 017 together. Tests must cover RUNNING, WAITING, READY after a
resolved exchange, repeated cancel, throw, absent hook and reentrant Outcome/delivery reports.
The requirement to ask the Driver is source-decided; only its binding and declared support choice
remain with the owner. No provider-native model or graph knowledge belongs in the Kernel.

### D01-CHK-07 — Record the Execution-deadline admission policy (P2; owner choice)

W-9 decides that a wait's accepted Event beats a later accepted timer; lifecycle and CL-1 decide that
Execution-deadline cancellation uses the same accepted ordering as explicit cancellation. They do
not choose when the host must detect expiry, or whether creation/dispatch must consult time when
the instant is already past. The owner's decision 1 fixes the field's source, immutability and
canonical identity, not that admission policy. Design Q3 is therefore a real remaining choice.

**Owner question:** approve §9's fire-only enforcement, including creation with a past deadline being
READY and an Outcome/dispatch before the fire being eligible to win (recommended for this binding),
or require time checks on those paths. For fire-only enforcement, record the host pumping obligation
and absence of an instant-enforcement guarantee in BASELINE/017. Do not describe it as a consequence
of W-9 alone. Test past-due creation, Outcome-before-fire, fire-before-Outcome, and the wait/Execution
deadline orders 10/25, 10/5 and 10/10. No matter which policy is selected, accepted expiry creates no
timeout Event, accepts no later progress, and cannot reopen COMPLETED/FAILED.

## Criterion closure at the design stage

PASS here means the proposed closing mechanism is coherent and finishable, not that unbuilt K1.3
code has passed. FAIL identifies a required design/evidence correction. No in-scope criterion is
silently deferred.

| Criterion | Check | Result |
|---|---|---|
| K13-1 | §3's closed grammar and eager single capture cover all four required malformed forms; table rows include structural values, unknown nested fields, inert/duplicate/empty-text cases and 256/257 aggregate bound. AND/ANY-OF and single-kind-as-one-element-set preserve the owner. Keep whole refusal and authority precedence; A19 below supplies the exact corpus obligation. | PASS |
| K13-2 | Ingress/mint category is chosen by Kernel path; application input consults subscriptions and timeout never matches. Synthetic dependency-selector units cover AND/ANY-OF; no live K2 matching claim is made. A04/A20 add changing-selector and spoof contrasts. | PASS |
| K13-3 | §5 excludes the acknowledged batch before scanning all remaining queued Events, then consults one accepted-time observation, then installs WAITING. The eligible/due tie goes to the Event. Clock callbacks occur before the basis and all semantic checks. A12/A15/A18 close the branch and reentrancy cases. | PASS |
| K13-4 | One generation retires as a whole; duplicate expiry refers to the original T, stale fires do not change logical state, and late input is not timer-fenced. §7's current-state resolution is sound; the public key and immediate-expiry replay need D01-CHK-05. | FAIL until D01-CHK-05 |
| K13-5 | Reservation-time filtering, exact mandatory T, capacity fill, acceptance-order presentation and one-dispatch readiness match B-2/B-6/B-7/B-8. The promised third mutant kill does not close. | FAIL: D01-CHK-01 |
| K13-6 | One cancellation plan disposes queued/reserved entries without acknowledgment, retains delivery ownership, ends holds and fences before all fresh Outcome checks; accepted replay remains first. Losing content keys are per-Execution and include epoch/base/content. Driver support and redelivery wording remain defective; explicit nonempty and retry corpus is required. | FAIL: D01-CHK-03/04/06 |
| K13-7 | One cancellation builder for explicit/deadline causes is appropriate; compare B-5 dispositions except reason and allow only declared actor/cause/fire differences elsewhere. Optional creation field preserves absent-field identity and conflicts on added/removed/changed deadline. Enforcement policy and Driver support must be settled. | FAIL: D01-CHK-06/07 |
| K13-8 | Injected clock, explicit host fire, source census and runtime poison windows are a finishable combination. As 012/L-11 require, call the census a bounded syntactic regression guard; no ambient-time guarantee rests on that guard alone. Manual-clock/read-count tests and direct zone inspection cover current code. | PASS |
| K13-9 | 13^4 × 8 × 2 = 456,976 runs, checked after each step; fixed seeds and deterministic model make the declared search finite. Payload exclusion and INV-7 are wrong, timer-list/identity comparisons need independent expectations, and attack contrasts need the explicit maintained map. | FAIL: D01-CHK-02/03 |

## Representations, authority and the remaining design questions

The [rewrite-index §4](../../../../mental-model/rewrite-index.md#4-explicitly-undecided--implementation-owned)
choices are acceptable with the findings above:

| Choice | Disposition |
|---|---|
| Per-Execution generation starting at 1, including immediate retirement | Keep. Equality fences timer artifacts, not authenticated results; no lifetime reuse/expiry is introduced. Persist it only under K3's future durability contract. |
| `{subscriptionClass}` | Keep. It uses the existing ingress content field and exact equality; it never turns a kind into authority. |
| `kernel.wait.timeout`, `kernel_timeout`, null payload, Execution/generation ID | Keep as binding choices. Maintain destination, generation/deadline and accepted order in both mailbox and Activation projections; no fabricated ingress receipt/Input ID. Clarify timer keys and numeric packing per D01-CHK-05. |
| Retired selector plus species/generation/timeout in readiness | Keep. Re-evaluate at reservation and consume once; redelivery/takeover retain the already pinned batch. |
| Frozen cancellation record plus indexed losing proposals | Keep per Execution, keyed by Activation and full canonical content identity including epoch/base. The frozen record must not expose its shared mutable delivery list. The state owner attaches that list as it currently does for resolved exchanges; plans may not carry mutable owner records. Mask only those operational rows in late-report comparisons. |
| Safe integer clock, optional injection, host-chosen unit | Keep the representation and optional injection; no clock means explicit deadline refusal, no ambient fallback. Record the unit/precision/source at operations' existing marker and in BASELINE, leaving `OPEN(implementation)` in place. D01-CHK-07 decides enforcement policy. |

Design Q1 / attack O1: approve the proposed separate `cancelScopes`. Visibility, `controlScopes`
or a submission grant alone must not cancel; invisible/missing returns `unknown_destination`, and
visible-without-cancel-power returns scoped `unauthorized_control`. Identity.ts expressly limits
existing `controlScopes` to the three exchange controls. Reusing it as an undifferentiated cancel
grant would widen their authority. Naming a new field is a binding choice within this design check,
not a need to invent a new architectural permission system. Cover all permission combinations.

Design Q5 / attack O4: approve optional clock with explicit `deadline_unsupported`, unusable readings
as `clock_unavailable` only when the decision needs the deadline, and one read at the stated capture
point. Correct “never affected by the clock”: an unusable reading does not override replay, the fence
or an eligible Event, but a callback can independently accept input/cancellation. Compare the outer
decision against the state after that callback; do not demand rollback of its nested decision or
claim a replay call is globally side-effect-free. Read-count tests distinguish submitOutcome calls
from fireTimer, which also reads the clock.

Attack O5: unindexable malformed proposals may use the proposed unindexed rejection. They have no
usable canonical proposal identity to replay; retain the cancellation classification/reason without
pre-authority content diagnostics. This does not excuse failing to index a well-formed losing proposal.
Exact fresh-object retries and two distinct contents must be checked (A07/A08/A23).

Design Q4 / attack O6 is resolved by D01-CHK-04. Design Q6 / attack O7 is resolved by trusted-host scope
and D01-CHK-05's required explicit key rules. Design Q2 / attack O2 and design Q3 / attack O3 are the
two remaining owner choices in D01-CHK-06/07. No other architectural owner question was found.

Design Q7: the proposed in-process persistence, inert dependencies, clock-unit/monotonicity,
retention-growth, host-only API and bounded-search limits are suitable for 017 with named triggers
and later owners. Physical interruption stays unsupported as a guarantee; the request-support limit
must accurately follow D01-CHK-06. Fire-only enforcement depends on D01-CHK-07. Record the actual
new IDs at build time; do not assume an ID that concurrent TOOLS-02 work may use.

The suspect basis design is answered for this binding: no host callback occurs between the basis
read, state-dependent decision construction and apply. A clock that accepts cancellation first leaves
the outer fire to form a current-state discard; no internal caller retry is needed. Read the basis
before building state-dependent plan facts, and re-read those facts after the last callback. A fresh
basis stamped onto stale cached facts is not sufficient. Preserve K1.2's post-safety-callback checks.

S1–S5 are useful owner checks, but their stated universal claims need every writer covered. In
particular, enforce READY before dispatch and RUNNING/current exchange before Outcome; require the
matching live generation only when a cancellation actually retires one; do not reject cancellation
from READY/RUNNING for lacking a live wait. S2's “acknowledged or ended” does not itself prove cancel
never acknowledges; S4 does not prove the correct deadline; S5 does not prove eligible selection.
Keep those semantic checks under the narrowed L-15 and the deterministic/model tests, with direct
owner-plan negative controls for the claimed structural guards. The existing closed union, data-only
plan contract and per-arm prepare/commit layout accommodate the four new variants. No second writer,
callback inside apply or mutable reader escape is approved.

## Attack disposition and required build corpus

All 24 items are accounted for here. `K13-Axx` below are required provenance labels for the build's
maintained tests/entries, not claims that those implementation tests already exist. Preserve the three
attack probes as evidence. This map supersedes the design's unqualified line 619 promise.

| Attack item | Answer or carried corpus obligation |
|---|---|
| A01 / F1 | D01-CHK-01: keep five cases; record sort-union equivalence and distinguish missing T membership. K13-A01. |
| A02 | §9 retains original delivery log; add delivered/failed/contradictory repeats, failed-first and redelivery capabilities after cancellation. K13-A02. |
| A03 | Equality to the live generation decides; add S4 `e d w fire(g2)`, with g2 retired by Event and by timeout, checking g3 untouched. K13-A03. |
| A04 | New registration owns its own selector; s→x and x→s, including alternative-plus-subscription, must retain unmatched input. K13-A04. |
| A05 / F2 | D01-CHK-02: compare nonempty retained payload and reject the null-replacement transcript. K13-A05. |
| A06 | Add the explicit S4 `e d q p p p` regression. Do not claim it is covered by a four-letter suffix. K13-A06. |
| A07 | §10 uses content equality, not object identity; fresh equal loser, another loser, then original retry must reuse the retained refusal. K13-A07. |
| A08 | Change only progress, then only an Emission; retain separate full-content rejection keys and replay each original. K13-A08. |
| A09 | OA-2 wins before fence: after a losing A2 submission, saved A1 exact retry returns original receipt and changed A1 conflicts. K13-A09. |
| A10 | §9/§10 ordering is sound; all four next steps in both orders, nonempty progress/Emissions, two reserved Events and backlog. Check every forbidden partial commit. K13-A10. |
| A11 | Preserve an older acknowledgment; terminal-dispose reserved/backlog; exact input retry replays, changed conflicts, fresh is refused. K13-A11. |
| A12 | W-2 decides S0 `e d z` differently at bounds 1/2; include no/future/due deadline and decision/disposition/readiness assertions. K13-A12. |
| A13 | Duplicate g1 before/after reservation, after continue, during g2 and after cancellation; immediate-expiry key under D01-CHK-05. One stable T. K13-A13. |
| A14 | Five cases plus bound-3 T with two ineligible backlog entries, and eligible candidates exceeding bound after wake. K13-A14. |
| A15 | §5/suspect 1 plus post-callback revalidation: clock accepts cancel/input, cancelScopes getter completes, interrupt submits Outcome/reports delivery. Check nested decision first. K13-A15. |
| A16 | Same prefixes through explicit cancel and deadline, including holds/queued T; narrowly mask cause/actor/reason/fire fields, preserve all content and ownership. K13-A16. |
| A17 | Owner decision 1: exact creation retry and added/removed/changed deadline, numeric edges and absent-field identity compatibility. Past-due admission follows D01-CHK-07. K13-A17. |
| A18 | D−1/D/D+1, throwing/NaN/no clock, eligible queued Event, replay and not-due fire; one reading at the stated points, no ambient fallback. K13-A18. |
| A19 | §3's complete valid/invalid table, including aggregate 256/257 across all lists and duplicate-heavy inputs; whole refusal. K13-A19. |
| A20 | §4 source category first: spoofed kind/ID/correlation payload cannot bypass subscriptions; selector-unit AND/ANY-OF and timeout exclusion. K13-A20. |
| A21 | D01-CHK-02: independent expected pending keys, stable injective ID correspondence, retry reference checks, and cancellation corruption beside delivery rows. K13-A21. |
| A22 | D01-CHK-04: cancellation refuses dispatch/redelivery/takeover/recover; preserve established COMPLETED/FAILED tokens. K13-A22. |
| A23 | OA-1 scope first, then OA-2/fence: invisible retries, grant-less visible caller, two Executions, malformed independent coordinates; no cross-Execution rejection alias. K13-A23. |
| A24 | Separate deadline fields with 10/25, 10/5, 10/10, both accepted-fire orders; wait-first T terminal-disposed, Execution-first no T. K13-A24. |

F3 is carried by D01-CHK-03 and these named deterministic additions. Attack O1–O7 are explicitly
disposed above. Source-decided cases are build obligations; the two genuine owner choices are not
silently converted to settled oracle expectations. None of this adds live K2 ingress, K3 persistence,
native interruption proof, isolation, or a successor release.

## Validation and handoff

Independently reran on Node v26.10.0, Darwin arm64:

```sh
/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin/node --test docs/development/work/K1.3/attack-01/*.test.mjs
```

Result: **11 tests passed, 0 failed, 0 skipped, exit 0**. These establish the attack's evidence
distinctions, not K1.3 implementation conformance. The selection output again has zero failures for
`sort-union`. Existing terminal and late-report tests were inspected, not independently rerun here;
their results in attack-01 remain attributed to that session. No full verify, full npm test, typecheck
or mutation registry was run, as requested. Artifact-only link/anchor, finding/attack-ID and whitespace
checks accompany this record. No production code, accepted status, canonical owner or prior evidence
was modified. No third-party source was copied/adapted and no dependency was added.

Before build: record D01-CHK-01–07's corrections, the two owner answers and the maintained corpus map.
Update the current explanatory overclaim at its owner in the build, preserve historical evidence,
and maintain BASELINE/rewrite-index/affected Layer 3 with the implementation. The reviewed design
does not establish any shipped behavior. A changed mechanism or contrary owner answer must be
checked against the affected findings before implementation; the later C/H review checks the build.

APPROVED WITH REQUIRED CHANGES
