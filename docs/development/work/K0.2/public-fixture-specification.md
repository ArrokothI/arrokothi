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
| `control-cancel-versus-complete` | the cancellation fence, in both orders | M-1, §11 row 7 |
| `control-completion-obligations` | a completing envelope carrying owned work is refused whole; terminal ingress refusal | §11 row 8 |
| `control-missing-checkpoint-code` | recovery hold versus fresh-restored fabrication | M-1, §11 row 9 |
| `effect-refusal-and-sink-attribution` | K1's Effect refusal, observed through the independent ledger | — |

Four of these were added after round-1 review; see §8.

[`coverage.ts`](../../../../tests/conformance/k0/coverage.ts) maps the scenarios onto §11 at
**obligation** granularity — 33 obligations across the ten rows, not ten row entries — because several
rows state several distinguishing obligations in one cell. 31 resolve to a scenario step plus a
counterexample the oracle demonstrably rejects at that step; one (R10-b) is a negative obligation
enforced by scanning the corpus; one (R8-c) is explicitly assigned to K2.4 with the reason it has no
observable K0 case. `coverage.test.ts` enforces all of that, and
`interactions.test.ts` sweeps the corpus for the cross-scenario invariants.

## 2. How the oracle is known to work

A fixture nobody can fail is worth nothing, and one that fails everything is worth no more. Both are
excluded by construction:

- a **conforming transcript** must report `PASS`. It is derived from the scenarios' own expectations,
  so it proves only that the runner can pass something — that circularity is stated in the code and is
  the limit of what this direction establishes;
- **thirty violating transcripts**, each a plausible wrong implementation, must report `FAIL` at the
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
| Duplicate/conflicting Outcome | exact duplicate returns the original receipt; conflicting duplicate is a recorded rejection | advance the revision on replay, re-publish an accepted emission, or merge conflicting content into accepted state |
| Stale timer / lost wake | an already-accepted eligible Event is found at registration; a superseded generation's timer is a no-op; a re-delivered timer is idempotent; an authenticated result is never generation-fenced | persist `WAITING` over an eligible Event already in the mailbox, wake a replacement wait from a retired generation, mint a second timeout Event, or treat a timeout as proof the awaited work did not happen |
| Cancel versus complete | both orders; CX-6 rejection for `continue` **and** `complete`; zero batch acknowledgment; unchanged progress and emissions; B-5 disposition at `CANCELLED`; the same recorded rejection on exact retry; an accepted completion staying terminal and replaying its receipt | install the loser's progress, acknowledge its reserved batch, manufacture a receipt for a rejected submission, or reopen a terminal Execution |
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
