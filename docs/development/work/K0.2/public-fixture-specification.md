# K0.2 public fixture, baseline contract and E0 records

**Fixture version:** `arrokothi-k0-public-fixture/1` (exported as `FIXTURE_VERSION`).
**Repository revision:** the commit containing this file; the external handoff supplies the SHA.
**Implementation:** [`tests/conformance/k0/`](../../../../tests/conformance/k0).
**Governing decisions:** the accepted [K0.1 worksheet](../K0.1/protocol-worksheet.md), especially
Decision M-1 and the §11 boundary map. Where this document and that worksheet disagree, the worksheet
wins and this document needs a correction.

> **Status.** This is *prepared fixture material*. It is not a passed K0 exit, not an E0 result, not an
> E1 result, and not evidence about any Kernel. No candidate implements the target protocol; the only
> candidate shipped against the real repository refuses every scenario, and
> [`refusal.test.ts`](../../../../tests/conformance/k0/refusal.test.ts) fails if that ever stops being
> true without someone claiming the change.

## 1. What the fixture is

A scenario is a **schedule**: an ordered list of laboratory commands, each paired with the complete
expected observation afterwards. Expectations are complete rather than partial because a forbidden
mutation is an unchanged field — asserting only the headline state is precisely the mistake
Decision M-1 calls out ("suppressing only next state while installing losing progress is a failing
control, not a conforming variant").

Determinism is structural, not a timing assumption. Every ordering the fixture depends on is a
scheduled command, so there is no race to lose, no clock to tune and no flake to retry. It runs
offline with no model, network, container or database.

| Scenario | Observes | Control? |
|---|---|---|
| `k0-trace` | 001's K0 trace end to end, as W-8's cases 1–5; distinct Outcome receipts across acceptances | — |
| `delayed-runtime-non-blocking` | a delayed Runtime does not block another Execution; W-4; distinct create receipts across keys | — |
| `identity-create-and-activation` | create-key conflict; ordinary redelivery (same ID/epoch/input); distinct Activation IDs; takeover under the same ID with pinned input; stale old-epoch fencing | — |
| `identity-producer-scope` | cross-producer create and same-destination application ingress; exact replay and conflicting content (ID-2); W-2 step 2 running for an empty dependency list (§19) | — |
| `control-whole-envelope-validation` | a valid prefix earns nothing; a structurally empty wait is refused; OA-5's whole-envelope zero-partial-state family (progress/emissions/ack/intent/deadline/wait/readiness/next-state) plus rejected-mints-none | — |
| `control-duplicate-conflicting-outcome` | receipt replay versus conflict, including conflicting-mints-none | M-1, §11 row 3 |
| `control-stale-timer-and-lost-wake` | lost wake at registration; generation fencing; timer idempotency; both B-6 entry boundaries for a deadline-bearing wait | M-1, §11 row 5 |
| `control-subscription-wait-deadline` | W-8 case 6: B-7's mandatory timeout member, both paths | §11 row 5 |
| `wait-structure-not-satisfiability` | a valid-but-inert alternative registers and counts; the eligibility category rule's two negative arms; no per-alternative satisfied flag | §11 row 5 |
| `control-cancel-versus-complete` | the cancellation fence, in both orders, including losing-mints-none | M-1, §11 row 7 |
| `control-completion-obligations` | a completing envelope carrying owned work is refused whole; terminal ingress refusal | §11 row 8 |
| `control-missing-checkpoint-code` | recovery hold versus fresh-restored fabrication | M-1, §11 row 9 |
| `effect-refusal-and-sink-attribution` | K1's Effect refusal, observed through the independent ledger | — |

Four of these were added after round-1 review, one after round-3 review and one after round-10 review; see §§8, 10 and 17.
No scenario was added in round 13: its two findings were ownership and comparison defects, and the
schedule the empty-dependency clause needed already existed (§19).

[`coverage.ts`](../../../../tests/conformance/k0/coverage.ts) maps the scenarios onto §11 at the
granularity of the **independently distinguishable assertion** — 123 entries across the ten rows, not
ten row entries and not the 33 prose-level obligations of two revisions ago. The unit is
behavioural rather than editorial: two clauses in one cell are separate assertions when a plausible
implementation can get one right and the other wrong, because that is the candidate the oracle has to
be able to fail. §11 row 5 states the standard itself — "Each of these is **separately** observable".

Of the 123, **110** resolve to a scenario step plus at least one counterexample the oracle demonstrably
rejects at that step; **four** (R3-c3, R6-a1, R8-b2, R2-c4) are marked `shared`, meaning two §11 rows name
one observable fact and one transcript is the honest evidence for both, with the identity written down
and checked; **one** (R10-b) is a negative obligation enforced by scanning the corpus; **eight** are
explicitly assigned with the governing source that permits the deferral — R8-c to K2.4, R5-a4 to
K1.3 (which W-9's *Left open* note names as the owner of a declared subscription identity's concrete
spelling), R4-b1/b2/b3 to K2.2/K2.3/K4.1 for the Effect-admission, Effect-settlement and
child/message-operation receipt boundaries, which have no observable K0 case while K1 refuses Effects
and has no composition surface, and R1-f to K5.2 plus R5-c6/c7 to K1.3 for the three clauses round 13's
re-audit found unowned in either direction (§19). Twenty-one entries carry an `atomicity` note, required whenever an entry's counterexamples
cross more than one coupled field group. `COUPLED_FIELD_GROUPS` is a review heuristic only, never
proof that within-group partial failures are impossible: `state`/`liveWaitGeneration` stay grouped
only for W-3's definitional link, while `waitEndedReadiness` and `acceptedDeadline` are deliberately
ungrouped so wake/retirement/readiness/deadline partials cannot hide. Each note names the specific bug
construction's writers rather than invoking normative coupling. `coverage.test.ts` enforces all of it,
including that **no counterexample defends two assertions** except through a declared `shared` link,
that **no two counterexamples at one step move the same set of observation fields**, and that scenario
row attribution agrees with the map in both directions.
`interactions.test.ts` sweeps the corpus for the cross-scenario invariants, including that a non-null
accepted deadline belongs to the live wait, that stale delivery after logical retirement stays a no-op
without constraining physical timers, and that no fenced submission accepts a deadline fact.

## 2. How the oracle is known to work

A fixture nobody can fail is worth nothing, and one that fails everything is worth no more. Both are
excluded by construction:

- a **conforming transcript** must report `PASS`. It is derived from the scenarios' own expectations,
  so it proves only that the runner can pass something — that circularity is stated in the code and is
  the limit of what this direction establishes;
- **110 violating transcripts**, each a plausible wrong implementation, must report `FAIL` at the
  exact step, and the failure detail must name the exact observation field at issue **where the
  discrimination is an observation field**. Failing for an unrelated reason would be an accident rather
  than discrimination, so the field names are asserted. One transcript deliberately names none:
  `effect-refusal/refusal-claimed-while-the-sink-was-called` changes no observation at all and is
  caught only by the independent ledger, which is the whole design of C3's attribution evidence — a
  candidate can report the correct refusal and still have dispatched the operation. Its
  `mustNameFields` is empty and `coverage.test.ts` exempts it from the field-set collision rule for the
  same reason.
  Each transcript must also **name the governing decision its behavior breaks**, and that citation is
  checked: a transcript that cannot cite one is a preference rather than a counterexample, and failing
  a candidate for it would make the oracle reject conforming work;
- the **refusing candidate** must report `REFUSED` for every scenario — a third verdict that is neither
  a pass nor a failure;
- the oracle **fails closed**. A step asserting independent-ledger attribution cannot pass because the
  runner was invoked without a usable observer: omission is a type error, and an unusable observer at
  runtime fails the assertion rather than skipping it. That holds for a conforming candidate too —
  otherwise the guard would be discriminating on who was running rather than on whether the obligation
  was actually checked.

Each violating transcript names the bug a real implementation would plausibly have. Two are worth
reading directly: `control-cancel/losing-progress-installed-with-next-state-suppressed` is the variant
M-1 names, and keeps the *correct* `CANCELLED` headline while committing the loser's progress,
emissions and batch acknowledgment underneath it; `effect-refusal/refusal-claimed-while-the-sink-was-called`
leaves the observation entirely conforming and is caught only by the independent ledger.

## 3. Unsafe and state-loss control specifications

This is what each control must observe, and what a conforming candidate must therefore never do.
Decision M-1 fixes four of them; round-1 review added two more for §11 obligations that were going
unobserved. M-1 is a floor, not a ceiling.

| Control | Must observe | Must never |
|---|---|---|
| Duplicate/conflicting Outcome | exact duplicate returns the original receipt; conflicting duplicate is a recorded rejection with none of its content merged, even when the rejection is correct | advance the revision on replay, re-publish an accepted emission, silently absorb a conflict without a rejection, or merge conflicting content into accepted state beside a correct rejection |
| Stale timer / lost wake | an already-accepted eligible Event is found at registration; a superseded generation's timer is a no-op; a re-delivered timer is idempotent; an authenticated result is never generation-fenced; registration and every retirement path — B-6 path A at Outcome acceptance, B-6 path B at a later Event's own acceptance boundary, and B-7 current-generation expiry — clear the accepted deadline fact, while a stale delivery clears nothing | persist `WAITING` over an eligible Event already in the mailbox, wake a replacement wait from a retired generation, mint a second timeout Event, treat a timeout as proof the awaited work did not happen, leave a retired deadline fact live on any of the three retirement paths, or wipe the live deadline on a fenced stale delivery |
| Cancel versus complete | both orders; CX-6 rejection for `continue`, `complete` **and** a deadline-bearing `await`; zero batch acknowledgment; unchanged progress and emissions; zero wait, accepted deadline fact, readiness and next-state change; B-5 disposition at `CANCELLED`; the same recorded rejection on exact retry; an accepted completion staying terminal and replaying its receipt | install the loser's progress, acknowledge its reserved batch, manufacture a receipt for a rejected submission, register the loser's wait, accept its deadline fact while staying `CANCELLED`, arm its readiness, or reopen a terminal Execution |
| Missing checkpoint/code | an inspectable recovery hold naming the unavailable pinned revision; accepted progress and revision intact | present empty or fresh Runtime state as the restored one, discard accepted progress, or invent a semantic wait for an unresolved Activation |
| Subscription-only wait with a deadline (W-8 case 6) | B-7 path B mints exactly one timeout Event; at bound 1 the batch is exactly that Event even though an ineligible input was accepted earlier; B-7 path A yields `READY` at registration when the deadline is already due | require the timeout to match a dependency alternative the wait does not have, let older ineligible backlog take the slot, or persist a past deadline as a live wait |
| Completion obligations (§11 row 8) | `complete` proposing owned work is refused whole with a recorded, inspectable reason; the Execution stays non-terminal and nothing in the envelope is committed; terminal ingress is refused rather than queued | reach a terminal state with unaccounted owned work, strip the Effect and accept the rest, commit progress or acknowledgment under a reported refusal, or accept ordinary input into a terminal Execution's mailbox |

**State loss is the subject's failure even when the laboratory is safe.** The benchmark
[methodology](../../../../../benchmark/docs/methodology.md) requires a subject that loses its state
while the lab checkpoint survives to fail *subject* recovery. The missing-checkpoint control is that
shape in Kernel-local form, and its verdict must not be repaired by any laboratory checkpoint.

## 4. Direct baseline specification

001's K0 deliverable: "The direct baseline is ordinary code plus explicit state and policy; keep
validators/services identical across candidates."

**The direct arm.** Ordinary application code that solves the same public application shape without a
Kernel: explicit state it owns, explicit policy checks it performs itself, and its own control flow.
It is a *competent* arm, not a strawman — it may use any ordinary technique a careful engineer would,
including its own retries, its own persistence and its own idempotency keys.

**Identical across arms — the same instances, not equivalents:**

| Shared | Why identity matters |
|---|---|
| the operation sink and its ledger | attribution must be comparable; two sinks would make "what was attempted" arm-specific |
| business validators and policy predicates | a difference here measures the validator, not the architecture |
| fixture inputs, schedules and fault timings | the comparison is about response to the same world |
| the human-response channel and its authentication | consent and identity must not be cheaper for one arm |
| declared retention, limits and deadlines | one arm must not win by being allowed to keep more |

**Allowed to differ:** internal state representation, storage mechanism, concurrency approach, code
organization, and whether an obligation is tracked explicitly or structurally. That difference *is* the
experiment.

**Comparable observations:** attempted operations at the sink and their order; lost, duplicated or
misattributed accepted inputs; whether an obligation survived a fault; whether a terminal result was
reported truthfully; operator work required to reach a correct end state.

**Explicitly incomparable, and not to be reported as a win:** internal API ergonomics, lines of code,
model quality, latency under an unmeasured configuration, and anything the laboratory supplied to one
arm and not the other. Laboratory protection earns no subject credit in either direction.

**Fairness rules.** Neither arm may read private evaluation material. Neither may be given a power the
other is denied — including inspection, repair or a second attempt — unless that power is itself the
declared subject of the comparison and is recorded as an intervention. If there is no meaningful
comparative question for a shape, the benchmark roadmap's own instruction applies: omit the experiment
rather than manufacture one.

## 5. Public application shapes

Benchmark E0 names two. Both are fresh synthetic fixtures specified here; neither is a copy of a
private P0X case, and no private evaluation case, rubric or held-out material appears in this file.

### 5.1 Shape A — reviewed artifact publication

A request produces a draft artifact, a reviewer approves or rejects the exact draft, and approval
publishes it once. The comparative question is real: approval binds a *specific* payload, and the
interesting failures are all about that binding coming loose.

| Aspect | Specification |
|---|---|
| Authoritative state | **Application** owns the artifact content, the reviewer roster and what "published" means. **Kernel** owns accepted inputs, the approval Event, the publish Effect's intent, attempt and settlement. **Runtime** owns how it decides to propose a draft. **Sink** owns the record of what was actually attempted. |
| Attempted-action boundary | `artifact.publish` at the shared sink, carrying the exact artifact revision. Nothing else crosses. |
| Input acceptance | the draft request, and the reviewer's decision, which is authenticated application input correlated to the exact draft revision. A decision naming a superseded revision is refused, not silently applied. |
| Physical controls | the sink is harmless and never disabled to see whether real harm occurs. The laboratory records every attempt including refused ones. |
| Failure observations | publishing a revision the reviewer did not approve; publishing twice for one approval; reporting success on an `unknown` settlement; losing an approval accepted before the wait registered; completing while a publish attempt is still unresolved. |
| Planned unsafe control | a subject that treats an ordinary corrective message as withdrawal of approval and publishes anyway (kernel.md: "Ordinary correction input cannot itself withdraw an action"). |
| Planned state-loss control | the approval is accepted, the subject loses its own state, the laboratory checkpoint survives; the subject must fail recovery rather than be rehydrated by the harness. |
| Explicitly unsupported at K0 | any durability, isolation or latency claim; the publish Effect itself, which K1 refuses outright until K2. |

### 5.2 Shape B — restartable request across two independent jobs plus human input

One request needs two independent jobs plus a human answer. The jobs settle in either order, the human
may reply early or late, and the whole thing must survive a restart. The comparative question is
whether an obligation the subject already accepted survives being interrupted.

| Aspect | Specification |
|---|---|
| Authoritative state | **Application** owns what the two jobs mean and what answer is acceptable. **Kernel** owns the accepted request, each job's result Event, the human request's durable correlation, the wait and its generation, and the terminal result. **Runtime** owns accumulating the all-of join in its own progress — there is no Kernel join primitive. |
| Attempted-action boundary | `job.submit` twice and `human.request` once, all at the shared sink; results return as correlated Events. |
| Input acceptance | job results are trusted settlement ingress; the human answer is authenticated application input with its own declared subscription. Knowing a correlation ID grants no settlement authority. |
| Physical controls | restart between any two scheduled commands; the ledger survives independently of the subject. |
| Failure observations | a result accepted before its wait is lost; an early human reply is dropped; a stale timer wakes a replacement wait; a restart double-submits a job; completion is accepted while one job is still unresolved; a wait timeout is reported as proof the job failed. |
| Planned unsafe control | a subject that retries a non-idempotent `job.submit` after an `unknown` settlement, so the ledger shows two attempts for one logical request. |
| Planned state-loss control | restart after both jobs settled but before the Outcome was accepted; the subject must reconcile against the surviving ledger rather than restart the jobs. |
| Explicitly unsupported at K0 | actual process death, which is E4/K3; the restart here is a scheduled command, not a kill. |

### 5.3 Claim ledger entries

The methodology requires: requirement, responsible component, observed boundary, raw evidence
location, laboratory intervention, verdict rule. Entered here as *specifications awaiting E0*, not as
results.

| Requirement | Responsible component | Observed boundary | Raw evidence | Lab intervention | Verdict rule |
|---|---|---|---|---|---|
| An approved payload is the only one published | Kernel (action binding) + Application (approval semantics) | sink attempt, with artifact revision | ledger entries | none during scored generation | any attempt whose revision differs from the approved one fails, whether or not the sink was harmless |
| One approval yields at most one publish | Kernel (logical action ID versus physical attempts) | sink attempts sharing a logical operation ID | ledger entries | none | a second attempt without a recorded retry contract fails |
| An accepted obligation survives restart | Kernel (accepted truth) + subject recovery | accepted inputs and results after restart | fixture observations plus ledger | restart is a declared, logged intervention | losing an accepted input or result fails; refusing truthfully does not |
| Unknown work is never reported as done | Kernel (certainty versus responsibility) | terminal result versus ledger disposition | both, compared | none | a terminal success over an `unknown` settlement fails |
| Laboratory protection earns no subject credit | Laboratory | sink containment | intervention log | containment always on | a subject that attempted an unsafe action fails its prevention claim even though the sink was harmless |

## 6. E0 ownership, and why this criterion is blocked

E0 is owned by the benchmark repository, not by this one. This repository can prepare the fixture and
specify the shapes — that is criteria C1–C7 above — but it cannot produce, grant or infer an E0 result.

**Observed external state.** The benchmark repository at revision
`98756f8c10bd806125da8318f1a129bc030aca61` states in `docs/roadmap.md:3` that "E0–E6 are **planned**,
not implemented by this documentation revision", and `docs/current-state.md:79` still lists "Start E0
ownership/claim fixtures" under next useful work. It was inspected read-only; no file, ref,
configuration or evidence in it was changed by this packet.

| Field | Value |
|---|---|
| Criterion | K0.2-C8, "obtain pinned E0 evidence" |
| State | **BLOCKED_EXTERNAL** |
| Unavailable input | any E0 fixture, ownership record, baseline contract, evaluator version or control result |
| Responsible actor | benchmark repository owner |
| Unblock condition | E0's deliverable produced and accepted in that repository at a pinned revision, with artifact identities recordable here |
| Claimed | nothing. No E0 acceptance is claimed, implied or self-granted |

The owner released this packet with that consequence stated in advance. Because K0.2 is K0's final
gate packet, **K0 does not close** while C8 is open, regardless of how C1–C7 are judged.

## 7. What this material does not establish

- It is not evidence about any Kernel. No candidate implements the protocol.
- The conforming transcript proves the runner can report `PASS`; it says nothing about an implementation.
- Two independent derivations agreeing (literal expectations and the coded predicates in
  `protocol-vocabulary.ts`) is stronger than one, but both are readings of the same worksheet; agreement
  is not proof that the reading is correct.
- No durability, isolation, performance, cost or application-value claim is made or implied.
- Nothing here is packaged or exported. S1 owns any published surface; K1.0 may relocate these files
  into the target landing zone.
- E-6's at-limit and one-past value matrix is assigned to K1.2 by this packet's contract and is not
  built here; only the four accepted bounds are recorded.
- §11 row 8's second clause — a *previously owned* obligation settled or transferred before completion
  — is assigned to K2.4. It has no observable K0 case while K1 refuses Effects, and CX-3 says so.

## 8. What round-1 review changed

The first candidate was reviewed and returned CHANGES REQUIRED on three findings. What they cost is
worth stating plainly, because two of the three were cases of this document and its fixture claiming
more than they established.

**K02-R1-01 — inherited §11 coverage was incomplete.** The coverage map was row-granular and its test
proved only that each row number pointed at a scenario that existed. Several §11 rows state several
distinguishing obligations in one cell, so the check passed while row 1's conflict half, all three of
row 2's identity claims, row 5's B-7 registration and bound-1 cases, row 6's terminal arm, row 8's
completion check and row 10's negative obligation went untested. Re-deriving §11 found ten such gaps —
the four the review named and six more. Four scenarios were added (`identity-create-and-activation`,
`control-whole-envelope-validation`, `control-subscription-wait-deadline`,
`control-completion-obligations`), twenty violating transcripts were added, and the map was rebuilt at
obligation granularity with a counterexample required per obligation. Two claims in the previous
revision were false and are withdrawn: that the stale-timer control already covered W-8 case 6 (it
does not — that case is sharp only because the wait has *no* dependency alternatives), and that the
row-attribution check constituted coverage.

**K02-R1-02 — the ledger was not independent against retained references.** Absent read methods were
not enough: entries held the caller's own objects under a shallow freeze, so a candidate keeping a
reference to its input, its returned result, or anything nested inside either could rewrite recorded
history after the fact. The sink now deep-copies on record and returns a separate copy, and six tests
mutate every retained reference and assert later reads are unchanged. All six were confirmed to fail
against the previous implementation.

**K02-R1-03 — ledger assertions failed open.** The runner skipped a step's ledger expectation whenever
the observer happened to be absent, so the one bad candidate catchable only through the ledger could
pass on call shape alone. The runner now takes the whole sink bundle — omission is a type error — and
an unusable observer at runtime fails the assertion rather than skipping it.

## 9. What round-2 review changed

Round 2 closed all three round-1 findings but raised two P1 defects of its own, both in material added
by that correction. Both were upheld.

**K02-R2-01 — the completion control demanded a distinction the protocol does not make.** The control
required a completion-specific rejection *reason*, and shipped a counterexample that failed a
candidate whose reason said only that Effects are unsupported before K2. That candidate is conforming:
EF-1 and EF-2 require every K1 Outcome proposing an Effect to be refused as a whole envelope at
validation, and §11 row 4 asks for "a recorded, inspectable reason" without fixing which one. The
fixture was therefore rejecting a correct K1 implementation, and had turned an unobservable internal
distinction into a normative requirement — the opposite failure mode from round 1's under-coverage,
and a worse one, because an over-constrained oracle fails work that is right. The requirement is
withdrawn: the control now pins the same EF-2 refusal reason the Effect-refusal scenario uses, and
asserts what the protocol actually mandates — the Execution reaches no terminal state, the envelope is
refused whole, and nothing in it is committed. The invalid counterexample is replaced by a genuine
one: a candidate that reports the refusal while committing the progress and acknowledgment underneath
it. §11 row 8's previously-owned-obligation clause remains assigned to K2.4, as before.

**K02-R2-02 — the ledger snapshot was neither faithful nor immutable for a valid member name.** E-1
permits any well-formed string as an object member name, so `"__proto__"` is ordinary JSON data —
`JSON.parse('{"__proto__":{"x":1},"safe":2}')` produces it as an own data property. The snapshot copied
members by plain assignment, which for that one key invokes the inherited setter instead of creating
an own property: the member vanished from the record, its value became the copy's prototype, and
`deepFreeze` never walked there, leaving it mutable after the fact. The independent ledger was
therefore incomplete about what a candidate attempted and rewritable through the prototype it grew.
Members are now written with `defineProperty`, so no key gets special treatment, and the freeze walks
`Reflect.ownKeys`. Seven regression tests cover the member at top level, nested, inside arrays and in
a returned observation, plus the neighbouring shadowing names; five fail against the previous
implementation.

## 10. What round-3 review changed

Round 3 closed both round-2 findings but reopened round 1's `K02-R1-01` through a new finding, and the
finding is correct. The correction is forward from C3; nothing from round 2 is reverted.

**K02-R3-01 — the coverage unit was still not the unit §11 uses.** C2/C3 replaced row-granular
coverage with "obligations", which was much finer, but the unit was still in places a *prose grouping*
whose single counterexample exercised one clause out of several. The worksheet states the standard
itself, in row 5's opening words: "Each of these is **separately** observable." Four concrete blind
spots were named, and re-deriving all ten rows against that standard found the rest. The unit is now
the **independently distinguishable assertion**, and the test applied is behavioural rather than
editorial: two clauses are separate assertions when a plausible implementation can get one right and
the other wrong. The inventory went from 33 entries to 69, and the corpus from 30 violating transcripts
to 65.

Two of the four named blind spots needed a new observation, because the required fact was not visible
at all:

- **Wait-ended readiness.** §3's four-row table treats readiness as an accepted, recoverable record
  with an identity and a species; `B-8` forbids a second one arming behind the first and re-selecting
  a batch after reservation. The stale-timer control reaches exactly that state and its `forbids`
  prose claimed to forbid it, but the observation surface could not see readiness, so no candidate
  could be failed for it. `Observation.waitEndedReadiness` is a list, deliberately: a nullable field
  would hide the two-entry failure by construction.
- **Effect intents.** §11 row 3 requires a partway failure to leave "no Effect intent" and row 4
  requires refusal "before any Effect intent, ID or proposal-key binding ever exists". The independent
  ledger records *physical attempts*, not intent creation, so a candidate could mint and retain an
  intent, attempt nothing, and pass. `Observation.effectIntents` must be empty at every step of every
  scenario; a field that is always empty is the smallest observation that turns "never exists" into a
  checked fact. Its limit is stated in the code: it observes *retained accepted* intent, and an intent
  constructed and discarded inside the same rejected transaction leaves no accepted record and is
  unobservable by any means.

The other two needed scenarios, not observations. W-1's selector grammar was enforced only by
`checkWaitWellFormed`, which `rule-agreement.test.ts` checks against the worksheet — that shows the
fixture agrees with the worksheet, not that a candidate is held to it, and no scenario had ever
submitted a wait breaking those rules. The envelope control now submits all three, and
`rule-agreement.test.ts` welds the helper to the corpus: every rule the helper applies must be a rule
some scenario makes a candidate answer for, so the two cannot drift apart into parallel statements
again. LP-1's freshness assertion was "covered" by a cancellation-atomicity transcript, which
demonstrates CX-6/OA-3 and says nothing about a stale local read; it now has its own step — an Outcome
submitted under the writer epoch an immediately preceding takeover superseded — and its own transcript.
A twelfth scenario, `wait-structure-not-satisfiability`, carries W-1's positive half: a valid-but-inert
alternative is accepted and counts, and the eligibility category rule's two negative arms hold.

Two structural guards were added against the defect class rather than the instances. `coverage.test.ts`
now requires that **no counterexample defends two assertions** — the shape of the LP-1 defect, which
passes every other check while leaving an assertion unguarded — except through an explicit `shared`
link that names the identity and is itself checked; and scenario row attribution must agree with the
map in **both** directions, the missing direction having let `control-cancel-versus-complete` go on
claiming row 10 after its row-10 attribution moved elsewhere.

**A second K02-R2-01-class defect was found and fixed while doing this.** The oracle compared every
rejection's *reason text* verbatim. Only one is canonical: CX-6 fixes "cancellation accepted before
Outcome acceptance" by name, and nothing fixes the wording of any other rejection — §11 row 4 asks
only for "a recorded, inspectable reason". C3's own vocabulary note said exactly this and the runner
did not implement it, so the fixture would have failed a conforming candidate for phrasing a permitted
message differently. `runScenario` now compares the classification exactly and always, requires a
non-empty reason always, and compares reason text only for CX-6. Loosening an oracle is where holes
open, so all five directions are pinned by test: the reworded non-canonical reason that must now pass,
and the blank reason, changed classification, dropped rejection and reworded CX-6 reason that must
still fail.

**The repaired blind spots are mutation-checked.** Adding a counterexample proves the oracle rejects it
now, not that it failed to before, which is the claim a coverage correction has to make.
`blind-spot-regression.test.ts` reconstructs the C3 oracle — the two absent observation fields, and the
scenario steps that did not exist, pinned by their C3 labels from `acb5e01` — and shows each repaired
case passing it. It also checks itself: a counterexample C3 already caught must fail the invisibility
test, so the suite cannot pass vacuously.

## 11. What round-4 review changed

Round 4 closed the four concrete blind spots from round 3 but kept `K02-R3-01` open as a systemic
finding, and added one of its own. Both are correct and both are fixed forward from C4; nothing from
rounds 2 or 3 is reverted.

**K02-R4-01 — the fixture invented a rule about a spelling the worksheet assigns away.** C4's
well-formedness helper rejected `subscriptionClass: ""`, a scenario submitted one and required
refusal, and a counterexample treated accepting it as a protocol violation. W-1 rule 3 says only that
a subscription entry *is* a declared subscription identity, and W-9's closing *Left open* note names
the owner of everything else about it: "the exact spelling of a declared subscription identity ... —
K1.3 owns that, and W-1 constrains only that it is finite, declarative and compared by equality." The
empty string is finite, declarative and equality-compared, so it satisfies every constraint W-1
actually imposes, and a conforming K1 implementation may choose a representation in which it is an
ordinary identity.

This is round 2's `K02-R2-01` in a worse form. There, an over-tight comparison would have failed a
conforming candidate; here a *counterexample* asserted that conforming behaviour is a violation. It
also survived a sweep: round 4 swept rejection *reason* strings for exactly this class and did not
look at validity *rules*.

Within this fixture's representation — `subscriptionClass` is a `string` — no submittable value can
fail the property W-1 states, so there is no honest negative case to write. The rule, its scenario
step and its counterexample are removed, and R5-a4 is assigned to K1.3 with the quotation above.
Writing a real negative case requires first choosing the representation, which is the assigned work.
What W-1 fixes about subscriptions independently of spelling is still observed by R5-a6, R5-b1 and
R5-b2/R5-b2b.

**The sweep that finding requires turned up two more of the same class**, both mine and neither
reported by the review. Both are corrected here:

- **The recovery hold's reason was compared verbatim.** PC-5 requires "an inspectable recovery-hold
  state" and fixes no wording, exactly as §11 row 4 requires a recorded reason without fixing one.
  Round 3 corrected the rejection reason and did not sweep the neighbouring free-text field.
- **Receipts and Activation IDs were compared literally.** These are the only two token families a
  candidate *mints* rather than receives from the schedule — every other identity a scenario asserts
  is fixture-supplied data. §2's *Left open* note leaves "exact receipt serialization (opaque token
  vs. structured tuple)" to the implementation, and ID-3/ID-9 are purely relational. The runner now
  requires a **bijection** between expected and observed tokens within a run — the same expected token
  always names the same observed token, and two never collapse onto one — which is what "same means
  same, different means different" amounts to, and rejects every counterexample in the corpus. ~~The
  epoch is deliberately left as an integer and the reason recorded: ID-4 permits that representation
  in terms, and every assertion made of it is about advancement and supersession.~~ **That last
  sentence was wrong, and round-13 review finding K02-R13-01 disproved it from the corpus; see §19.**

**K02-R4-02 — the assertion-atomicity rule was applied only to new entries.** C4 defined the right
unit and re-derived the entries it was *adding* against it, while leaving inherited entries at the
granularity they already had. The review named four: row 3's "no progress and no accepted emissions",
row 5(f)'s "retires nothing and wakes nothing", row 8's completion bundle, and row 8's
"deleting it or treating it as processed". Re-running the rule over every entry found those and six
more. The inventory went from 69 entries to 83 and the corpus from 65 transcripts to 77.

The entries split were: rows 2 (acknowledgment stopping at the batch, both directions), 3 (the
duplicate's two writers; the partway failure's two writers), 5 (rule 1 with and without a deadline;
W-7's "neither wakes nor acknowledges"; the stale timer's retire and wake halves; W-4's lifecycle
claim and the record's existence), 7 (the retry's two halves; and Decision M-1's named composite,
which stays composite *because M-1 names it* and now says so in an `atomicity` note), and 8
(completion's five separately-violable clauses; the terminal disposition's two forbidden alternatives).

**Why the existing guard could not catch this, and what now does.** The round-3 guard checks that no
counterexample defends two entries. It is structurally blind to the opposite failure — one entry
holding two independently violable assertions — as the review says. Prose cannot be checked
mechanically, but the fields a counterexample actually moves can. `coverage.ts` declares
`COUPLED_FIELD_GROUPS`: sets of observation fields that one accepted transaction usually writes
together, each citing the decision that couples them in conforming code. An entry whose
counterexamples cross more than one group must carry a written `atomicity` note naming the specific
bug construction's writers. Seventeen did. That does not prove atomicity — nothing here can — but it converts a silent assumption
into a reviewable claim, which is the remedy `forbiddenBy` already applies to counterexamples. A third
guard stops a split being cosmetic: no two counterexamples at one step may move the same set of
fields.

**Mutation-checking a split is a different claim from mutation-checking a blind spot, and is made as
such.** Round 3's blind spots were invisible — no field, no step — so the old oracle genuinely passed
them. Round 4's were visible but unattributed: the complete expected observation would have rejected
many of these candidates, while the map claimed a transcript per assertion and did not have one.
`blind-spot-regression.test.ts` therefore records, for each split pair, the field set the single C4
transcript used to move, transcribed from `e2721dd` and checkable against it, and asserts that the two
halves now divide it. It also guards the withdrawal in K02-R4-01: the empty subscription identity must
stay well formed, and no scenario may require a candidate to reject one.

## 12. What round-5 review changed

Round 5 returned CHANGES REQUIRED on two P1 findings, both in material added to fix round 4. Both are
correct and both are fixed forward from C5; nothing from rounds 2–4 is reverted. The R5-a4 assignment,
the valid round-4 splits, the readiness/Effect-intent observation surfaces and the non-canonical
free-text handling are all preserved.

**K02-R5-01 — one TokenRelation imposed cross-namespace uniqueness between receipts and Activation
IDs.** C5 replaced literal comparison with a relational bijection, but constructed one shared
`TokenRelation` for both families. An implementation using the same opaque string in the receipt
namespace and the Activation-ID namespace was treated as a collision even when every relation within
each namespace was correct; ID-3/ID-9 constrain Activation IDs against Activation IDs and ID-6/ID-7
constrain receipts against receipts, and nothing requires the raw spellings to be disjoint. The runner
now holds one bijection per family. A conforming probe reuses `opaque-1`/`opaque-2` across families
and passes, while collapsing two receipts or two Activation IDs within their own family still fails.
Other normalization state was swept: rejection keying (canonical CX-6 vs. free text), per-family
rewrite, recovery-hold presence/reason and fixture-supplied deadline values couple nothing across
families; the single shared relation was the only coupling.

**K02-R5-02 — the atomicity guard was circular/incomplete and the row-7 deadline mutation was
unobservable.** C5 grouped fields a *conforming* accepted transaction writes together and required a
note when a counterexample crossed groups. That is a review prompt, not proof a broken implementation
cannot partially write one fact — and R3-b's note used it as proof, claiming record-and-merge is "not
plausible" when OA-5 exists to prohibit exactly that partial writer. `COUPLED_FIELD_GROUPS` is now
documented as heuristic only; `state`/`liveWaitGeneration` stay grouped solely for W-3's definitional
link while `waitEndedReadiness` and the new deadline observation are deliberately ungrouped, and all
twenty notes were re-audited against plausible broken writers/transactions rather than normative
coupling (C6 observed that deadline as `pendingTimers`, corrected further below):

- R3-b splits into R3-b (recorded rejection) and R3-b2 (no merge beside a correct rejection), with a
  dedicated conflict-path transcript that keeps the `duplicate_conflict` rejection and leaks only the
  conflicting progress;
- R7-a6 splits into next-state (existing), wait (live generation), deadline and
  readiness, exercised by a new cancellation-losing `await` carrying a wait with a deadline at
  `control-cancel-versus-complete` step 11. The deadline half observes the accepted logical deadline
  fact rather than an absence inferred from terminal state or `liveWaitGeneration`;
- R5-b2/b3/c1/d3 gain writer-model notes for their full-wake transactions (one upstream
  misclassification plus one downstream B-6 retirement), with withheld/persisted-deadline
  transcripts carrying the live accepted deadline;
- the remaining notes name validation vs. acceptance vs. commit vs. control vs. recovery writers
  explicitly and point at the separate entries where a second writer's partial is independently
  covered, rather than claiming a candidate is implausible because the protocol requires atomicity.

The inventory goes from 83 entries to 87 (row 3: 8→9, row 7: 13→16) and the corpus from 77
transcripts to 81 over 12 scenarios / 90 steps. `blind-spot-regression.test.ts` pins the R3-b field
division against C5, the new losing-`await` schedule/observation, and the single-field deadline leak;
`interactions.test.ts` sweeps the accepted-deadline invariants and that no fenced submission accepts
a deadline fact.

## 13. What round-6 review changed

Round 6 returned CHANGES REQUIRED on one P1 finding in the round-6 material itself. It is correct
and is fixed forward from C6; nothing from rounds 2–6 is reverted. The separate token namespaces,
the R3-b split, the deadline-bearing losing-`await` schedule, the separate wait/readiness/next-state
counterexamples and the heuristic status of `COUPLED_FIELD_GROUPS` are all preserved.

**K02-R6-01 — `pendingTimers` conflated accepted deadline state with timer mechanism.** C6 observed
the deadline half of R7-a6 as retained timer registrations with a corpus invariant that timers "live
exactly while a deadline wait is live". That silently chooses an eager timer-cancellation design:
W-3 explicitly permits a timer scheduled for a retired generation to arrive later as a stale no-op,
and W-9/§4 leave timer mechanism, storage layout, deadline units/precision and the instant source
implementation-owned. A conforming implementation retaining a physical timer after logical retirement
would have been failed for scheduler retention — the same over-constraint class as rejection text,
subscription spelling and token namespaces in earlier rounds. The schedule was never the problem and
is unchanged.

The observation is now `Observation.acceptedDeadline: number | null` — the accepted logical deadline
fact W-2 step 4 persists with the live registration ("with the live registration, its generation
and its deadline"), committed by OA-4 and forbidden for rejected Outcomes by OA-5/CX-6. It is
non-null exactly while a deadline wait is live (`2000` under `g2`, `1000` under `gd1`, `1` in the
persisted-past-deadline transcript); it is null for a rejected losing `await`, for live waits
without deadlines, and — crucially — for retired waits even though a physical timer scheduled
earlier may still arrive later and be fenced as stale. Retirement clears the logical fact and
requires no physical timer cancellation or removal. Deadline values are fixture-supplied (the
`deadline` of a submitted `WaitRecord`), so comparison is literal laboratory data, like Event IDs
and generations — unlike the candidate-minted receipt/Activation-ID families. R7-a6c's transcript
is renamed `control-cancel/losing-await-accepts-a-deadline` and leaks only `5000` beside `CANCELLED`,
a correct CX-6 rejection and null live generation.

Every dependent wording was swept so none claims timer-registration lifetime as semantics:
`fixture.ts`, the losing-`await` comment and step-11 `forbids`, the stale-timer and W-8-case-6
expectations, the three deadline transcripts, the R5-b4/R5-c3/C6-heuristic notes, and the
contract/C9 text. `interactions.test.ts` replaces the timer-lifetime block with accepted-deadline
invariants (non-null only beside the live wait; every pair a submitted one; a live and a fenced case
present so neither direction is vacuous) plus the required W-3 regression: stale deliveries for
already-retired generations (`g1` at step 6, `g2` at step 8 of the stale-timer control) are still
scheduled and still no-ops that change no logical fact. `blind-spot-regression.test.ts` pins that no
observation key constrains timer/scheduler mechanism under any name, and that retirement (step 7:
`READY`, deadline null) precedes a still-permitted stale delivery (step 8).

Counts are unchanged by this round (87 obligations, 81 transcripts, 20 notes, 12 scenarios /
90 steps): one violation renamed, one field replaced, two regression tests added.

## 14. What round-7 review changed

Round 7 returned CHANGES REQUIRED on one P1 finding in the round-7 material itself. It is correct
and is fixed forward from C7; nothing from rounds 2–7 is reverted. The neutral `acceptedDeadline`
observation, W-3's stale-timer permissiveness, the per-family token namespaces, the R3-b split, the
losing-`await` schedule, the existing splits and the heuristic-only coupling table are all preserved.

**K02-R7-01 — the neutral deadline field owned only three of its lifecycle transitions.** C7 could
*see* five more accepted-deadline behaviors but owned none of them as assertions: the complete
structural observation would incidentally reject such transcripts, which C7/C9 explicitly say does
not count — the same visible-but-unattributed failure mode round 4 corrected. Re-derived against
§11 row 5(c)/(d) at the packet's own granularity, the lifecycle is now fully owned:

- registration persistence (W-2 step 4): R5-c4 — a durably registered future-deadline wait carries
  its deadline; the transcript parks `WAITING` under the right generation with the fact dropped;
- registration-time immediate retirements: R5-c5 (B-7 path A already-due) and R5-d4 (B-6 eligible
  Event at registration) — correct immediate retirement with the deadline fact left behind;
- current-expiry retirement (B-7 path B, the second row-5(d) species): R5-d5 — timeout minted,
  generation retired, readiness committed, deadline fact left live;
- stale fencing (W-3): R5-f4 — a fenced delivery for a retired generation wipes the live deadline
  while retiring nothing, completing the f1a/f1a2/f1b wake/retire/Event halves.

Each new transcript moves *only* `acceptedDeadline` at its step, so no split is cosmetic and no new
`atomicity` note is owed; the path-A leftover additionally narrows R5-c3's five-field ordering-swap
transcript to its one-field partial. `blind-spot-regression.test.ts` pins the five single-field
moves at five distinct steps and the narrowing. The cancellation-loser leak (R7-a6c) is untouched.

The inventory goes from 87 entries to 92 (row 5: 28→33) and the corpus from 81 transcripts to 86
over the same 12 scenarios / 90 steps — no schedule or expectation changed, because the expectations
already stated every deadline fact and only the owning counterexamples were missing.

## 15. What round-8 review changed

Round 8 returned CHANGES REQUIRED on one P1 finding in the round-8 material itself. It is correct and
is fixed forward from C8; nothing from rounds 2–8 is reverted. All five round-8 deadline transcripts
are preserved unchanged, `acceptedDeadline` remains the accepted logical deadline fact with no
physical timer-registration or cancellation lifetime requirement anywhere, and W-3's stale-timer
permissiveness, the per-family token namespaces, the R3-b split, the losing-`await` schedule and the
heuristic-only coupling table are all intact.

**K02-R8-01 — deadline cleanup was unowned on B-6 path B, a distinct acceptance boundary.** The
accepted worksheet makes B-6 reach one state through two entry boundaries, and round 8 owned only
the first:

- **path A** — Outcome acceptance creates the registration, W-2 step 2 finds an already-accepted
  eligible Event, and the registration and its generation retire inside that same Outcome
  transaction; the cleanup writer lives in Outcome acceptance;
- **path B** — the Execution is already durably `WAITING`, and a later eligible Event retires the
  registration and creates readiness at **that Event's own acceptance boundary**, with no Outcome
  anywhere in the transaction; the cleanup writer lives in Event acceptance/ingress routing.

Round 8's eligible-wake entry (R5-d4) used path A only, and the corpus's one path-B wake
(`k0-trace`) registers a wait with **no deadline**, so no schedule existed in which a live accepted
deadline is ended by a later Event. A candidate could therefore persist the deadline correctly, clear
it correctly on the path-A immediate wake, clear it correctly on expiry, and still leave it behind on
path B — leaving `state = READY`, `liveWaitGeneration = null`, the correct Event-triggered readiness
and the correct mailbox facts, with the retired generation's deadline still live.

`control-stale-timer-and-lost-wake` gains the two steps that discriminate it, deliberately in the
scenario that already owns path A so the two boundaries can be read side by side: `g3` is a wait on
`corr-3` with a **future** deadline of 3000, submitted when the mailbox holds nothing eligible, so it
parks durably as `WAITING` with the deadline as an accepted fact; then `res-3` is accepted and ends it
through path B. The conforming observation is `READY`, `liveWaitGeneration` null, exactly one
Event-triggered readiness for `g3`, `res-3` queued and unacknowledged, the progress revision
unadvanced — and `acceptedDeadline` back to null.

- **R5-d6** owns that transition. Its transcript,
  `control-stale-timer/path-B-wake-leaves-the-accepted-deadline`, moves **only** `acceptedDeadline`,
  leaving 3000 behind while every other path-B result stays correct.
- **R5-d4** is narrowed to name path A explicitly, so the two entries cannot be read as one.
- `blind-spot-regression.test.ts` pins the schedule (parked with a live deadline, then ended by an
  `accept_event` rather than a `deliver_timer`), the single-field move, that no other transcript
  shares the step, that path A's step is a `submit_outcome` and path B's an `accept_event`, and that
  `k0-trace`'s path-B wake stays deadline-less so it cannot absorb the assertion.

**The whole accepted-deadline sweep was re-run rather than assumed**, by enumerating every boundary
at which a deadline is submitted or live, and checking each species for a transcript that moves only
`acceptedDeadline`: persistence on durable registration (R5-c4), immediate retirement at registration
via B-7 path A (R5-c5) and via B-6 path A (R5-d4), current-generation expiry via B-7 path B (R5-d5),
a later eligible Event via B-6 path B (R5-d6, new), stale delivery changing nothing (R5-f4), and a
fenced losing `await` accepting nothing (R7-a6c). The ordering assertion that a past deadline is
never persisted stays with R5-c3. One further point the sweep surfaced was left unowned at this
revision — the malformed wait carrying a deadline refused at `control-whole-envelope-validation` step
4 — on the reading that §11 states a zero-deadline clause only in row 7. **Round-9 review overturned
that reading and it is now owned as R3-c4; see §16.**

The inventory goes from 92 entries to 93 (row 5: 33→34) and the corpus from 86 transcripts to 87,
over 12 scenarios and 92 steps (`control-stale-timer-and-lost-wake` 11→13). This is the first round
since round 5 that adds a schedule: the finding is precisely that no schedule could express the
transition, so no transcript over the existing corpus could have closed it.

## 16. What round-9 review changed

Round 9 returned CHANGES REQUIRED on one P1 finding, and the finding is against §15's own reasoning
rather than against its correction. It is fixed forward from C9; nothing from rounds 2–9 is reverted.
The `g3`/`res-3` B-6 path-B schedule, R5-d6, R5-d4's path-A narrowing, all six accepted-deadline
lifecycle transcripts, the per-family token namespaces, the R3-b and cancellation splits, and the
implementation-neutral distinction between accepted logical deadline state and physical timer
mechanism are all preserved unchanged.

**K02-R9-01 — OA-5 deadline inertness on a malformed rejected Outcome was visible but unattributed.**
§15 recorded this transition and declined to own it, on the reading that §11 row 3's parenthetical
(`progress`, `Effect intent`, `acknowledgment`) is exhaustive and that the zero-deadline clause is
stated only in row 7. **That reading was too narrow.** Row 3 cites OA-1–OA-6, and OA-5 states the
clause directly: a rejected Outcome creates no Effects, acknowledges no Events, commits no progress,
accepts no emissions and creates **no wait/deadline/readiness/next-state transition**. A malformed
envelope is a rejected Outcome, so the assertion was stated for this boundary all along and simply
had no owner.

No schedule was added, because the schedule already existed. `control-whole-envelope-validation` step
4 submits a structurally empty `await` carrying a deadline of 5000 and requires the whole envelope to
be refused: `malformed_envelope`, the Execution still `RUNNING` with its Activation and pinned batch
intact, `liveWaitGeneration` null, and `acceptedDeadline` null.

- **R3-c4** owns the deadline clause at that boundary, joining R3-c1 (progress), R3-c1b (emissions),
  R3-c2 (acknowledgment) and R3-c3 (Effect intent, `shared` with row 4) in row 3's zero-partial-state
  family.
- Its transcript, `envelope/malformed-wait-leaks-its-accepted-deadline`, is a partial under a
  **correct** refusal: the rejection, lifecycle, live generation, Activation and batch are all right,
  and only `acceptedDeadline` leaks as 5000 — the deadline parsed and committed during the envelope
  walk and never rolled back when validation refused.
- **R7-a6c does not stand in for it.** That is the same fact at the CX-6 cancellation/terminal-conflict
  fence, a different rejection writer, and the two entries now cross-reference each other. A candidate
  that commits its deadline after whole-envelope validation but before the terminal-conflict check
  gets exactly one of them right — the writer/boundary test round 8 applied to B-6's two paths, applied
  here to the two rejection paths.
- `blind-spot-regression.test.ts` pins that the step really does submit and refuse a deadline-bearing
  malformed wait, that the transcript moves exactly `acceptedDeadline` to the refused envelope's own
  value, that it is a partial under a correct refusal rather than the pre-existing acceptance failure
  at the same step (which removes the rejection and moves the lifecycle, and does **not** move the
  deadline), and that the two rejection writers carry different classifications.

The inventory goes from 93 entries to 94 (row 3: 9→10) and the corpus from 87 transcripts to 88, over
the same 12 scenarios / 92 steps. No scenario, step or expectation changed: the observation already
stated the fact, and only the owning counterexample was missing.

## 17. What round-10 review changed

Round 10 returned CHANGES REQUIRED on three P1 findings, all instances of C10's own decision-level
rule — read the governing decision a row cites, never the row's illustrative parenthetical — applied
as a cumulative method rather than another one-field patch. It is fixed forward from C10; nothing from
rounds 2–10 is reverted. R3-c4, the `g3`/`res-3` B-6 path-B schedule, R5-d6, all six accepted-deadline
lifecycle transcripts, the per-family receipt/Activation-ID token relations, all prior splits and the
logical-deadline/physical-timer distinction are preserved. `K02-R9-01` stays closed.

**K02-R10-01 — OA-5's whole-envelope rejection family was still only partly owned.** Row 3 cites
OA-1–OA-6, and OA-5 forbids a rejected Outcome from creating Effects, acknowledging Events, committing
progress, accepting emissions **and** creating any wait/deadline/readiness/next-state transition. The
inventory owned progress (R3-c1), emissions (R3-c1b), acknowledgment (R3-c2), Effect intent (R3-c3,
`shared` with row 4) and deadline (R3-c4), but no row-3 owner for wait/lifecycle, readiness or
next-state under a correct rejection — the same visible-but-unattributed class as rounds 4, 7 and 8,
now at the whole-envelope-validation writer rather than the CX-6 fence, which has its own full family
(R7-a2/a3/a4/a5/a6/a6b/a6c/a6d) and cannot stand in for this one.

- **R3-c5** owns wait/lifecycle at the malformed future-deadline `await` (step 4): correct
  `malformed_envelope` refusal with pinned Activation/batch, no deadline and no readiness, but
  `WAITING` under `g-bad`. Lifecycle-group move (`state` + `liveWaitGeneration`), distinct from the
  acceptance failure at the same step (which removes the rejection) and from R3-c4's deadline-only
  move.
- **R3-c6** owns next-state at the duplicate-emission envelope (step 2), which already carries a valid
  `next: continue`: correct refusal with no progress/emissions/acknowledgment, but `READY`. Single
  `state` move, distinct from every other half there.
- **R3-c7** owns readiness-only (now step 8). Round 11 found that a valid wait alone was
  insufficient: without an eligible Event it would not end. The corrected schedule first accepts
  `cont-1` after reservation, outside `[in-1]`. The subscription-only `g-good` would match it under
  W-2 step 2 / B-6 path A if accepted. An unrelated duplicate emission still requires
  `malformed_envelope`. The violating transcript preserves that rejection, RUNNING, the pinned
  Activation/batch, no progress/emissions/acknowledgment, no live wait and no accepted deadline,
  changing only `waitEndedReadiness` to `{ generation: g-good, species: event }`. No CX-6 evidence
  is reused and readiness stays ungrouped.

**K02-R10-02 — row 2 still under-covered ID-3/ID-4/ID-9.** Takeover is three facts (same ID in R2-c1,
advanced epoch in R2-c2, same immutable input), but only the first two were owned, and ordinary
redelivery (ID-9 case 1 / ID-3) was unrepresentable: the vocabulary had `dispatch` (new exchange) and
`takeover` (new attempt) but no "same attempt delivered again".

- `in-2` is accepted after dispatch but before redelivery/takeover, queued but never reserved, so a
  wrong repin has deterministic content to include while the conforming batch stays `["in-1"]`.
- **R2-c3** owns takeover input immutability at the takeover step: correct ID and epoch with the batch
  repinned to `["in-1", "in-2"]`. Single activation-group field.
- **R2-d1/d2/d3** own ordinary redelivery at the new `redeliver_dispatch` step (same ID, same epoch,
  same input), each a single-field transcript with distinct sets. The command is the smallest vocabulary
  that can say ID-9 case 1; `dispatch` and `takeover` cannot.
- **R2-c4** gives row 2 an honest owner for ID-9 case 3's stale old-epoch rejection — the same observable
  fact R10-a/LP-1 already evidences at the next step — as a justified `shared` link (one stale-read bug
  violates both decisions at once; a second transcript moving the same fields is forbidden).
- The stale step, the taken-over acceptance (now acknowledging only `["in-1"]` with `in-2` retained) and
  the next dispatch (now pinning `["in-2"]` under `act-2`) are updated for the new mailbox content; R2-a
  and R10-a shift indices with them.

**K02-R10-03 — producer scope and accepted receipts were not representable.** ID-2 binds input identity
to producer namespace + destination + producer request key; the fixture carried no producer dimension,
so global raw-key deduplication passed. `Observation.receipt` was documented as the most recent accepted
**Outcome** receipt while scenarios used it for create and silently retained it across dispatch/ingress.

- `create`/`create_retry` gain an optional `producer` namespace (ID-2's triple); pre-round-10 schedules
  stay in one implicit scope with unchanged meaning. The new `identity-producer-scope` scenario reuses
  one raw key text (`req-shared`) across `prod-a`/`prod-b` for different Executions without colliding,
  with same-producer retry still returning the same identity and receipt. **R1-c1/c2** own the ID and
  receipt halves with separate single-field globally-deduplicating transcripts, preserving K02-R5-01's
  per-family separation.
- `receipt` is clarified as the most recent opaque acceptance receipt among K0.2's
  opaque-receipt-bearing boundaries — creation and Outcome acceptance. Dispatch intent's acceptance
  identity is the Activation ID + epoch + pinned batch (ID-3/ID-4/ID-9, row 2 cites those, not ID-6/ID-7);
  subsequent input-ingress position is the per-Execution acceptance order (B-4, fixture-supplied Event
  IDs via `queued`). Neither mints a separate opaque receipt in K0.2, so retention across
  `accept_event`/`dispatch`/`redeliver_dispatch`/`takeover` is correct absence, not omission.
  Effect-admission, Effect-settlement and child/message-operation receipts have no observable K0 case
  while K1 refuses Effects and has no composition surface, and are explicitly assigned to K2.2/K2.3/K4.1
  as **R4-b1/b2/b3** rather than fabricated.
- ID-6/ID-7 are re-derived at the actual opaque boundaries: same on replay (R1-a2 for create, R3-a1 for
  Outcome, both pre-existing), distinct on new (R1-c2 across producers, **R1-d1** across keys in the
  delayed-Runtime schedule, **R3-d1** across Activations in the K0 trace), and none on reject (**R1-b3**
  for create conflict, **R3-b3** for duplicate conflict, **R3-c8** for malformed envelope, **R7-a9** for
  the cancellation loser itself, **R10-a2** for the stale writer) — each a single receipt-only move
  beside a correct rejection, distinct from every other half at its step. Spelling stays
  implementation-owned with per-family bijections unchanged.

The inventory goes from 94 entries to 114 (row 1: 5→9, row 2: 6→11, row 3: 10→16, row 4: 4→7, row 7:
16→17, row 10: 3→4; rows 5, 6, 8, 9 unchanged at 34, 5, 9, 2) and the corpus from 88 transcripts to 104,
over 13 scenarios / 98 steps (one new scenario with three steps; one new whole-envelope step; two new
identity steps for the late arrival and redelivery). Twenty atomicity notes, unchanged — every new
transcript is single-field (or single lifecycle-group for R3-c5), so none owes a note. Dependent rows,
including row 8's shared rejection paths, were re-swept after the surface change; `coverage.test.ts`
re-enforces no-shared-transcript, no-shared-field-set and bidirectional row attribution, and
`blind-spot-regression.test.ts` pins the three round-10 families, the redelivery/takeover field
division with its shared stale link, and the producer/receipt splits.


## 18. Round-11 correction: readiness preconditions and application-input identity

Revision 12 fixes forward from C11/H11 under [review-11.md](review-11.md). R11-01/-02/-03 are
implemented and offered for independent review; the earlier claims that R10-01/-03 were fully
closed were superseded by that review. R10-02 and the accepted prior corrections remain intact.

R3-c7's schedule now supplies an already accepted eligible Event outside the reserved batch (§17).
Its regression derives eligibility and proves the Event survives hypothetical W-2 step-1 batch
acknowledgment. This distinguishes a premature readiness commit from invented readiness.
R2-b2's later valid-Outcome evidence moves to step 9 and still acknowledges exactly `[in-1]`,
retaining `cont-1` for a later exchange.

`FixtureEvent` now requires authenticated `producer` and `requestKey` for application inputs;
Kernel Events/timeouts keep their own provenance. All existing application input schedules supply
explicit identities; the default single producer preserves their meaning. Create command identity
and initial input metadata agree. `accept_event` uses producer + destination + requestKey, with
exact-content replay retaining the original acceptance position and changed content recording
`duplicate_conflict`. The observation's rejection field documents create/input as well as Outcome
rejections. Input acceptance evidence is the per-Execution queued Event order, not a new opaque
receipt; creation/Outcome receipt and Activation-ID families keep their existing normalization.

The original three create steps of `identity-producer-scope` remain. Nine appended steps pin the
initial input, accept `prod-a` and `prod-b` at `exec-pa` under raw key `k`, replay A exactly, reject
A's conflicting content, evaluate a subscription wait, reserve with bound 1, complete and refuse
fresh terminal ingress. The second producer is a new identity with a distinct Event; destination
and raw key stay fixed. R1-e1 rejects a plausible `(destination, requestKey)` index that omits
producer and silently drops B while all unrelated observations remain correct. R1-e2 rejects
re-appending exact replay; R1-e3 owns the conflict answer; R1-e4 owns unchanged accepted content/order
beside a correct conflict. Each moves one field; none adds an atomicity note.

The assertion-granular sweep rechecks row 1's create/ingress identity and acceptance relations;
row 5's subscription eligibility, W-2 registration and both B-6 paths; row 6's pinned input and
no-readiness ingress; and rows 2/3/7/8's input acknowledgment, receipt, cancellation and terminal
consumers. Existing owners remain at their actual boundaries. The new producer scenario's downstream
steps are interaction evidence, not duplicate row attribution. The corpus-wide ingress audit derives
fresh/replay/conflict/refusal from the full triple, checks queue order, unchanged opaque receipt and
exchange, and wait/deadline/readiness effects. Both-producer input survives W-2/B-6, B-3 acknowledgment
and B-5 disposal. All existing interaction, deadline, receipt-family and discrimination guards run.

**Current totals:** 118 obligations = 108 scenario + 4 shared + 1 corpus + 5 assigned;
108 violating transcripts; 20 atomicity notes; 13 scenarios / 108 steps. Per-row counts are
13, 11, 16, 7, 34, 5, 17, 9, 2, 4. The 114/104/98 figures in §17 describe the prior correction's
historical delta, not this revision. Both P3 live descriptions are corrected. Historical reports and
reviews are unchanged. C8 remains `BLOCKED_EXTERNAL`; K0 stays open and K1.0 stays unreleased.


## 19. Round-13 correction: the epoch oracle, and R5-c2's assertion owner

Revision 13 fixes forward from C12/H12 under [review-13.md](review-13.md). Two P1 findings, both
local, both inside subsystems earlier rounds had already corrected — so 012's reconstruction rule
applies rather than a two-line patch, and the dependent re-audit's own findings are recorded here
separately from the reviewer's.

### K02-R13-01 — `writerEpoch` over-constrained ID-4 across new Activation IDs

ID-4 fixes three relations, all of them **inside one unresolved exchange**: ordinary redelivery keeps
the epoch (ID-9 case 1), an authenticated takeover advances it under the same Activation ID (ID-9
cases 2–3), and a stale epoch for the *current* exchange is always rejected. It then leaves one thing
open in terms — "whether the counter is reset or continues across a later, genuinely new Activation
ID is an implementation choice ... either satisfies ID-3/ID-4".

The runner compared the epoch literally and recorded (§16) that this was safe because "every assertion
made of it is about advancement and supersession". The corpus disproved that. Six scenarios — `k0-trace`,
`identity-create-and-activation`, `control-stale-timer-and-lost-wake`, `control-subscription-wait-deadline`,
`wait-structure-not-satisfiability`, `control-missing-checkpoint-code` — advanced the epoch at a new
Activation ID with **no takeover anywhere**, while `identity-producer-scope` held it fixed across exactly
the same transition. A resetting implementation failed the first six; a continuing one failed the
seventh. The corpus was not merely over-constrained: no conforming implementation could pass it. C7(b)
forbids pinning a representation the protocol leaves open, and C9 records that over-constraint is the
worse of the two failures.

The correction has four parts, and deliberately makes neither permitted policy normative.

- **`EpochRelation`** (`fixture.ts`) binds the epoch **per exchange**, keyed by the Activation ID the
  step names. Inside one exchange the same expected attempt must always name the same observed epoch,
  a later attempt a strictly later epoch and an earlier attempt a strictly earlier one, and two attempts
  never collapse onto one epoch. **Across exchanges nothing is related at all**: a new Activation ID
  opens a fresh sub-relation.
- **Where no exchange is unresolved, nothing is asserted.** `Observation.writerEpoch` is the epoch *of
  the current exchange*; before the first dispatch and after an exchange resolves there is none, and
  how a candidate spells that is a representation ID-4 does not fix. The schedules still write the
  closed exchange's last ordinal as documentation, the way they write one conforming rejection reason.
- **The schedules write exchange-local attempt ordinals.** Every exchange opens at 1, and the only
  value above 1 in the whole corpus is `identity-create-and-activation`'s `act-1` after its
  authenticated takeover. The corpus can no longer state a cross-exchange epoch claim even in prose;
  `interactions.test.ts` enforces the shape and that the advance happens only at a `takeover` command.
- **Commands are adapted at the port.** A schedule naming `submit_outcome{activationId:"act-2",
  writerEpoch:1}` is using *the laboratory's* names; a candidate that mints `"A#7"` at epoch `41` would
  be handed an exchange it never opened at an epoch it never issued and would correctly reject it —
  which is how the wrong fixture policy turned a later submission into a stale-writer rejection. The
  runner now resolves both candidate-minted families through the bindings the observations already
  established, and fails the step closed if a name cannot be resolved. The Activation-ID half of this
  was the same defect at the same port, unreported: `compareRepresentations` has enforced ID-3/ID-9
  relationally since round 5 while every submitted envelope still carried the laboratory's spelling.

**Distinguishing evidence.** `blind-spot-regression.test.ts` runs four genuinely different conforming
policies through every scenario and requires all to pass: `reset-per-exchange` and
`continue-across-exchanges` (ID-4's two named options), `advance-per-exchange` (the policy the corpus
had accidentally made normative) and `opaque-ascending-fence` (§2's "integer vs. fencing token", whose
values share nothing with the schedule's ordinals and which therefore also proves the port adaptation
works). Each of these candidates mints its own Activation IDs and verifies every envelope it is handed
names an exchange it opened at an epoch it issued, so a runner that skipped adaptation is caught rather
than silently passed. Two non-conforming policies — `takeover-does-not-advance` and
`takeover-moves-backwards` — must fail, at the takeover step, naming `writerEpoch`. Ordinary redelivery
keeping the epoch and takeover advancing it keep their own single-field transcripts, and the stale
old-epoch submission keeps R10-a's rejection evidence, so all four cases the finding named are
separately evidenced.

### K02-R13-02 — R5-c2's empty-dependency clause was defended by the wrong schedule

W-8 case 1 says the mailbox check "is not skipped merely because the dependency list is empty", and
R5-c2 stated both that W-2 step 2 runs and that it is not skipped for an empty list. Its declared
evidence was `control-stale-timer-and-lost-wake` step 3 — whose `waitOnCorr1` declares a dependency
alternative for `effect.result`/`corr-1` and no subscription at all. That transcript discriminates a
candidate that skips the mailbox check *generally*; it cannot see one that runs it for dependency waits
and skips it only when `dependencies.length === 0`, which is a different line of code.

- **R5-c2** keeps the general clause on that schedule, and its transcript is renamed
  `control-stale-timer/lost-wake-at-registration` with a citation that no longer claims the
  empty-dependency case.
- **R5-c2b** is the empty-dependency clause, owned where the condition exists:
  `identity-producer-scope` step 8 registers `producerIngressWait` — `dependencies: []`, one `continue`
  subscription — after two eligible `continue` inputs were accepted and left unacknowledged, and its
  conforming answer is immediate B-6 path-A readiness. The schedule already existed for row 1, so row 5
  is attributed to it rather than duplicating it; the scenario's declared rows are updated in both
  directions, as `coverage.test.ts` requires.
- The counterexample is written **once, as a rule over the schedule** rather than as a hand-edited
  observation: `emptyDependencyShortcutCandidate` takes W-2 step 4 instead of step 2 at any
  registration whose wait has an empty dependency list and whose conforming answer was path-A
  readiness. Running one candidate across the corpus states both halves C9 asks for — it **fails** at
  `identity-producer-scope` step 8, naming `state`, `liveWaitGeneration` and `waitEndedReadiness`, and
  it is **accepted by every other scenario, including R5-c2's own**, which is what makes R5-c2b an
  independent owner rather than a restatement. A regression separately checks that the owning schedule
  really has the empty list, a well-formed subscription-only declaration, an already-accepted
  unacknowledged eligible input before registration, and a path-A conforming answer — and that R5-c2's
  schedule does not.

### Self-found in the dependent re-audit

Recorded separately from the reviewer's findings, as 012 requires. Walking W-2 step by step and W-8
case by case, plus row 1's cited decisions, found three clauses owned in neither direction.

- **R5-c2c (added, with a counterexample).** W-2 step 2 ends "**No timeout Event is created** for that
  generation", and §3 defines row 3 as "as row 1, **plus exactly one timeout Event**" — so a path-A
  retirement that also mints one has produced row 3 where row 5(c) requires row 1. Nothing owned it.
  R5-c3's transcript moves `queued` at the step-3 branch, but in the opposite direction and by a
  different writer: it withholds a timeout the deadline branch owed. The new transcript models a
  registration writer that mints the timeout when it installs the deadline, before the mailbox check
  picks the branch, and retires the generation without retracting it — single-field move on `queued` at
  `control-stale-timer-and-lost-wake` step 3, whose `waitOnCorr1` carries a deadline and is retired at
  registration.
- **R5-c6/R5-c7 (assigned to K1.3).** W-2 step 3's "one accepted-time observation taken in this
  transaction" and its non-strict due comparison ("equal instants are due") both turn on a clock this
  laboratory does not have: no K0.2 command supplies or advances an accepted-time observation, so a
  schedule can only place a deadline plainly in the past or plainly in the future. Adding a clock
  command to observe them would extend the released fixture vocabulary rather than evidence the
  contract as written, and E-6's at-limit/one-over matrix is already assigned to K1 for the same
  reason. C9 requires such an assertion to be assigned explicitly, never counted covered.
- **R1-f (assigned to K5.2).** Row 1 cites ID-1, whose clause is about identity *after deletion*; every
  other row-1 entry comes from ID-2/ID-6/ID-7 and this one had no entry at all. K0.2's vocabulary has
  no deletion or garbage-collection command, and a terminal Execution is not a deleted one — B-5 keeps
  its Events with recorded dispositions and terminal ingress refuses new input, both already observed.
  007 assigns deletion to K5.2, where a reissue could first be attempted and therefore first refused.
  This matches round 13's own disposition of the supplementary audit's ID-1 note: not a blocking
  defect, but not silently omitted either.

Three other clauses were checked and found already owned, and are named so the re-audit is reviewable:
W-2 step 2's "a timer scheduled for it is stale on arrival" (R5-f1a/f1a2/f1b/f4), W-2 step 4's durable
`WAITING` with its live generation (R5-c1's transcript, which moves that exact lifecycle group at
`k0-trace` step 4) and its accepted deadline (R5-c4), and W-2 step 3's minting of exactly one timeout
in the path-A deadline branch (inside R5-c3's declared atomicity note, whose one ordering swap produces
the whole absent transaction).

### Non-blocking wording corrected with this payload

Round 12's K02-R12-01 and round 13's two P3 notes, none of which justified a candidate of their own:
`007-work-packets.md`'s introduction no longer counts K0.2's CHANGES REQUIRED rounds in live prose;
§2's transcript count is current; and §2's claim that every failure names an observation field now
accounts for the one transcript whose discrimination is the independent ledger by design.

**Current totals:** 123 obligations = 110 scenario + 4 shared + 1 corpus + 8 assigned;
110 violating transcripts; 21 atomicity notes; 13 scenarios / 108 steps. Per-row counts are
14, 11, 16, 7, 38, 5, 17, 9, 2, 4. The 118/108 figures in §18 and the 114/104/98 figures in §17
describe prior corrections' historical deltas, not this revision. Historical reports and reviews are
unchanged. C8 remains `BLOCKED_EXTERNAL` — the benchmark's `e0-claims-ownership-and-public-controls`
branch records `ownerDecision.state: "pending"` and its `main` is still the pre-E0 revision — so K0
stays open and K1.0 stays unreleased.


## 20. Round-14 complete cited-decision reconciliation

[Round-14 reconciliation](cited-decision-reconciliation.md) audits all 51 decisions cited by the ten
K0.1 §11 rows. Its explicit executable inventory has 366 clause references, not 366 distinct tests:
repeated facts point to their existing assertion owner. Every later assignment explains the absent
port surface and the first implementing 007 packet. K02-R14-01 is offered as corrected for independent
review; neither inventory seals nor local fixture PASS are acceptance.

The new `cited-decision-edges` scenario adds 25 steps through existing commands only (rows 1/2/3/5/7):
destination-scoped input; selector equality and an early last-alternative match; retained ordinary
backlog and ordered wait-ended batches; stale base/exchange submissions; cancellation after timeout
retirement and accepted-Outcome replay. Its 12 counterexamples plus two at existing observation
points bring the violation corpus to 124. No existing counterexample, command expectation or epoch
behavior changes. The missing-code control additionally attributes its existing empty ordinary batch
to row 5. The cancellation interaction sweep recognizes accepted replay before applying the losing
Outcome fence; this is CX-6's existing rule, not a new exception.

**Current totals:** 208 obligations = 124 scenario + 4 shared + 8 corpus + 72 assigned;
124 violating transcripts; 21 atomicity notes; 14 scenarios / 133 steps. Per-row counts are
17, 15, 26, 17, 70, 5, 24, 13, 15, 6. The 123/110/108 totals in §19 describe Round 13 only.
C8 remains `BLOCKED_EXTERNAL`: the benchmark owner decision at the unchanged pinned E0 branch is
pending. No E0 acceptance, K1 implementation, merge or successor release follows from these totals.
