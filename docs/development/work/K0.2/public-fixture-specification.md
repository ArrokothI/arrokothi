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
| `k0-trace` | 001's K0 trace end to end, as W-8's cases 1–5 | — |
| `delayed-runtime-non-blocking` | a delayed Runtime does not block another Execution; W-4 | — |
| `identity-create-and-activation` | create-key conflict; distinct Activation IDs; takeover under the same ID | — |
| `control-whole-envelope-validation` | a valid prefix earns nothing; a structurally empty wait is refused | — |
| `control-duplicate-conflicting-outcome` | receipt replay versus conflict | M-1, §11 row 3 |
| `control-stale-timer-and-lost-wake` | lost wake at registration; generation fencing; timer idempotency | M-1, §11 row 5 |
| `control-subscription-wait-deadline` | W-8 case 6: B-7's mandatory timeout member, both paths | §11 row 5 |
| `wait-structure-not-satisfiability` | a valid-but-inert alternative registers and counts; the eligibility category rule's two negative arms; no per-alternative satisfied flag | §11 row 5 |
| `control-cancel-versus-complete` | the cancellation fence, in both orders | M-1, §11 row 7 |
| `control-completion-obligations` | a completing envelope carrying owned work is refused whole; terminal ingress refusal | §11 row 8 |
| `control-missing-checkpoint-code` | recovery hold versus fresh-restored fabrication | M-1, §11 row 9 |
| `effect-refusal-and-sink-attribution` | K1's Effect refusal, observed through the independent ledger | — |

Four of these were added after round-1 review and one after round-3 review; see §8.

[`coverage.ts`](../../../../tests/conformance/k0/coverage.ts) maps the scenarios onto §11 at the
granularity of the **independently distinguishable assertion** — 92 entries across the ten rows, not
ten row entries and not the 33 prose-level obligations of two revisions ago. The unit is
behavioural rather than editorial: two clauses in one cell are separate assertions when a plausible
implementation can get one right and the other wrong, because that is the candidate the oracle has to
be able to fail. §11 row 5 states the standard itself — "Each of these is **separately** observable".

Of the 92, **86** resolve to a scenario step plus at least one counterexample the oracle demonstrably
rejects at that step; **three** (R3-c3, R6-a1, R8-b2) are marked `shared`, meaning two §11 rows name
one observable fact and one transcript is the honest evidence for both, with the identity written down
and checked; **one** (R10-b) is a negative obligation enforced by scanning the corpus; **two** are
explicitly assigned with the governing source that permits the deferral — R8-c to K2.4, and R5-a4 to
K1.3, which W-9's *Left open* note names as the owner of a declared subscription identity's concrete
spelling. Twenty entries carry an `atomicity` note, required whenever an entry's counterexamples
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
- **eighty-six violating transcripts**, each a plausible wrong implementation, must report `FAIL` at the
  exact step, and the failure detail must name the exact observation field at issue. Failing for an
  unrelated reason would be an accident rather than discrimination, so the field names are asserted.
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
| Stale timer / lost wake | an already-accepted eligible Event is found at registration; a superseded generation's timer is a no-op; a re-delivered timer is idempotent; an authenticated result is never generation-fenced; registration and both retirement species clear the accepted deadline fact while a stale delivery clears nothing | persist `WAITING` over an eligible Event already in the mailbox, wake a replacement wait from a retired generation, mint a second timeout Event, treat a timeout as proof the awaited work did not happen, leave a retired deadline fact live, or wipe the live deadline on a fenced stale delivery |
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
  same, different means different" amounts to, and rejects every counterexample in the corpus. The
  epoch is deliberately left as an integer and the reason recorded: ID-4 permits that representation
  in terms, and every assertion made of it is about advancement and supersession.

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
