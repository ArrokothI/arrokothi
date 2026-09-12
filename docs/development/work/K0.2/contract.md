# K0.2 contract — public controls and the K0/E0 gate

**Packet:** K0.2. **Parent milestone:** K0 ([001 K0](../../001-current-status-and-roadmap.md#k0--state-the-contract-and-create-the-smallest-counterexample)).
**Packet seed:** [007 K0.2](../../007-work-packets.md#k02--public-controls-and-k0e0-gate).
**Governing process baseline:** `c079237ee7aff428481426f93e87a68b79f170d4` (integrated `main`, including the
accepted post-K0.1 [process review](../K0.1-process-review/integration-01.md)).
**Dependency:** K0.1, independently ACCEPTED at H12 `bab7bf6635781e6d2f9b0e8e333f58440ae0b047` and
integrated as `42731300266eea00a9a24d867d5e82d9887c280d` ([receipt](../K0.1/integration-01.md)).
**Owner release:** explicit owner instruction, 2026-09-11 — see *Release provenance* below.
**Base commit:** `c079237ee7aff428481426f93e87a68b79f170d4`. **Branch:** `codex/k0.2-public-controls-e0-gate`.
**Contract revision 12.** Revision 12 corrects revision 11 after round-11 review
(K02-R11-01/-02/-03), forward from C11/H11. R3-c7 now has an accepted eligible Event outside the
reserved batch, so premature W-2 step 2 / B-6 path A would actually produce the readiness leaked
beside the independent duplicate-emission rejection. Application input ingress carries the full
ID-2 triple; the same destination/raw key accepts different producers, exact replay retains its
acceptance position, and conflicting content records a conflict without changing accepted inputs.
Four new single-field transcripts own those ingress assertions. The interaction sweep covers rows
1, 5, 6 and receipt/terminal consumers. C7/C9 evidence is corrected for independent review; no
acceptance is claimed. C8 remains `BLOCKED_EXTERNAL`.

Revision 11 corrected revision 10 after round-10 review (findings K02-R10-01, K02-R10-02, K02-R10-03) as one cumulative decision-level correction: C7/C9's decision-level rule (read the governing decision a row cites, never the row's illustrative parenthetical) is now applied to rows 1–3 together rather than to one new field — OA-5's whole-envelope-validation family is completed beyond its deadline member (wait/lifecycle, readiness-only on a valid-wait schedule subsequently sharpened in revision 12, and next-state, none reusing the CX-6 fence); row 2 re-derives ID-3/ID-4/ID-9 with takeover input immutability, an honest shared owner for ID-9 case 3's stale rejection, and a new `redeliver_dispatch` command/schedule for ID-9 case 1's ordinary redelivery; and row 1 gains a producer namespace dimension with cross-producer same-raw-key evidence plus re-derived ID-6/ID-7 receipt relations (same/distinct/none at the actual create/Outcome boundaries, clarified most-recent-opaque-receipt meaning, and explicit K2.2/K2.3/K4.1 assignments for Effect/child receipt boundaries). Revision 9 corrected revision 8 after round-9 review (finding K02-R9-01): C7/C9's boundary sweep saw a rejected malformed envelope's deadline transition and declined to own it, reading §11 row 3's parenthetical as exhaustive; OA-5, which row 3 cites, states the clause directly for every rejected Outcome, so the assertion was stated at that boundary all along and a candidate whose deadline commit runs before whole-envelope validation could leak it beside a perfectly correct refusal. Revision 8 corrected revision 7 after round-8 review (finding K02-R8-01): C7/C9's re-derived deadline lifecycle owned only one of B-6's two entry boundaries. Its eligible-wake cleanup entry was evidenced by path A — an already-accepted Event found during Outcome acceptance — while path B, where a later eligible Event retires an already-parked wait at that Event's own acceptance boundary with no Outcome, had no deadline-bearing schedule anywhere in the corpus, so a candidate could clear the accepted deadline on every Outcome-acceptance path and on expiry and still leave it behind on that third writer. Revision 7 corrected revision 6 after round-7 review (finding K02-R7-01): C7's neutral deadline observation owned only three of its lifecycle transitions, leaving positive persistence and retirement cleanup to incidental structural rejection — visible but unattributed — rather than owned counterexamples. Revision 6 corrected revision 5 after round-6 review (finding K02-R6-01): C6's new deadline observation conflated the accepted logical deadline fact with the implementation-owned physical timer mechanism, pinning a timer-registration lifetime W-9 leaves open and W-3 contradicts (a retained timer for a retired generation arrives as a stale no-op). Revision 2 corrected revision 1 after round-1 review (findings K02-R1-01,
K02-R1-02, K02-R1-03), where three criteria were *understating* what they had to establish. Revision 3
corrected revision 2 after round-2 review (findings K02-R2-01, K02-R2-02), where one criterion had
begun *overstating* it — C6/C7/C9 required a rejection-reason distinction the protocol does not make —
and C3's faithfulness claim did not hold across the whole accepted key space. Revision 4 corrects
revision 3 after round-3 review (finding K02-R3-01, which reopens K02-R1-01): C9's coverage unit was
still a prose grouping rather than an independently distinguishable assertion, and C1/C6/C7 rested on
that unit, so several §11 assertions were counted covered while no candidate could be failed for
breaking them — two of them because the observation surface could not see the required fact at all.
Revision 5 corrects revision 4 after round-3 review's finding was itself only partly closed
(K02-R4-01, K02-R4-02): C4 invented a validity rule for a spelling the worksheet assigns to K1.3, and
applied its own assertion-atomicity rule to the entries it added without re-running it over the
entries it inherited. Revision 6 corrects revision 5 after round-5 review (findings K02-R5-01,
K02-R5-02): C5's relational token comparison coupled receipt and Activation-ID namespaces that the
worksheet leaves independent, and its atomicity machinery treated normative transaction coupling as
proof that partial-write bugs are implausible — leaving the duplicate-conflict partial writer without
a discriminating candidate and CX-6's zero-deadline clause without a schedule or an observation that
could see it. The base, packet scope and C8's blocked state are unchanged throughout. All the
directions of error this packet has produced — understating coverage, overstating what the protocol
fixes, counting unobservable facts as observed, applying a correct new rule only to new material,
coupling independent representation namespaces, and treating a conforming atomicity requirement as
evidence a broken writer cannot split it — are recorded below rather than quietly overwritten.

## Release provenance and predecessor disclosure

**Release.** Before this packet, the authoritative ledger recorded `next_release: none` and an explicit
owner hold on K0.2, carried in both integration receipts. 009 states that "an ambiguous or absent
release requires clarification; merely pasting Prompt A does not release K0.2 or any other successor",
so the launcher alone was treated as insufficient and the hold was reported back to the owner with the
E0 consequence stated in advance. The owner then released K0.2 explicitly, choosing implementation of
the packet as written over a scope amendment, and choosing a fresh implementation over recovering the
withdrawn attempt below. That instruction is the release this packet relies on; it is recorded in the
round-1 report and remains subject to the owner's own written record.

**Predecessor.** A withdrawn K0.2 attempt existed on a remote branch of the same conventional name,
tip `48da596`, based on `42731300`. The owner deleted that branch, and `main` carries no K0.2 record,
report or status from it; it was never reviewed and holds no acceptance. During the repository-state
survey that preceded this packet, exactly two things about it were observed: the file list and line
counts from `git diff --stat`, and the ledger row text it had written. Its payload contents were not
read, and nothing here is copied or adapted from it. Convergence on the same directory
(`tests/conformance/k0/`) follows from the existing `tests/conformance/*/*.test.ts` globs, not from
that attempt. This is independent work from base `c079237`.

## What this packet owes, and to whom

K0.1 decided the protocol. K0.2 builds the **observable fixture** those decisions are checked against,
and specifies the comparison arms and E0 records. It implements no Kernel.

Inherited requirement map:

| Source | Inherited obligation | Criterion |
|---|---|---|
| 001 K0 deliverable | "a public deterministic fixture: accept input → delayed fake Runtime → typed output → input wait → completion" | C1 |
| 001 K0 deliverable | "Add a fake operation sink with an independent ledger for later action tests" | C3 |
| 001 K0 deliverable | "The direct baseline is ordinary code plus explicit state and policy; keep validators/services identical across candidates" | C4 |
| 001 K0 exit | "each input/Outcome/Effect/wake/cancel boundary has one authoritative owner and an observable acceptance/rejection result" | C1–C6, via the §11 coverage map |
| 001 K0 exit | "E0's unsafe/lost-state controls are specified" | C6 |
| 007 K0.2 scope | "smallest public delayed-Runtime/typed-output/input-wait fixture" | C1, C2 |
| 007 K0.2 scope | "both public application shapes" | C5 |
| 007 K0.2 scope | "obtain pinned E0 evidence" | C8 |
| 007 K0.2 acceptance | "fixture preparation is explicitly distinguished from later K1 candidate success" | C7 |
| K0.1 worksheet M-1 | the four named unsafe/state-loss controls K0.2's fixture must include as negative tests | C6 |
| benchmark E0 | two public application shapes, ownership/claim records, baseline contract, planned unsafe and state-loss controls | C5, C8 |

Left to sibling packets, not weakened here:

- **K1.1–K1.3** implement the protocol this fixture describes. K0.2 ships no Kernel and no target API.
- **The concrete spelling of a declared subscription identity** is assigned to **K1.3** by the accepted
  worksheet itself. W-9's closing *Left open* note names it: "the exact spelling of a declared
  subscription identity (whether a subscription names the input label directly or an
  application-declared subscription name that resolves to one) — K1.3 owns that, and W-1 constrains
  only that it is finite, declarative and compared by equality." W-1 rule 3 likewise "fixes only that
  the entry *is* such an identity". Round-4 finding K02-R4-01: revision 4 of this contract manufactured
  a negative case by declaring the empty string an invalid identity, which is precisely the spelling
  decision K1.3 owns; a conforming candidate whose representation admits it would have been failed. The
  rule is withdrawn and the assignment recorded in `coverage.ts` as obligation R5-a4. What W-1 *does*
  fix about subscriptions independently of spelling is still observed: R5-a6 that a subscription-only
  wait is first-class, R5-b1 that application input is eligible only through one, and R5-b2/R5-b2b that
  a dependency alternative matching such input neither wakes nor acknowledges it.
- **K1.4** is the K1/E1 gate that runs a real candidate against this fixture.
- **E-6's "a K1 fixture tests exactly at and one past each bound"** is explicitly a K1 fixture
  obligation in the accepted worksheet. K0.2 records the four bounds in the vocabulary and does not
  build the value-limit boundary matrix. Assigned to K1.2 (whole-envelope validation).
- **K2** owns Effect admission, schema validation and consent. K0.2 exercises only the K0-level fact
  that a proposed Effect is refused at envelope validation with zero sink dispatch (EF-1/EF-2).
- **§11 row 8's second clause** — that a *previously owned* required Effect or child obligation is
  settled, transferred or abandoned before completion is accepted — is assigned to **K2.4**. It has no
  observable K0 case: no previously owned obligation can exist while K1 refuses Effects outright, and
  CX-3 says exactly that ("K1 without Effects satisfies this trivially ... K2 is where the check
  becomes non-trivial"). Criterion C6 observes the clause that *is* reachable now. The assignment is
  recorded in `coverage.ts` as obligation R8-c with that reason, and is checked mechanically.
- **S1** owns packaging and any published export of this fixture. K0.2 places it under
  `tests/conformance/k0/` and advertises no package surface.
- **K1.0** may relocate the fixture into the target landing zone; this packet does not create one.

## Acceptance criteria

Each criterion names its governing source, its observable boundary and where its evidence lives.

### K0.2-C1 — the 001 K0 trace is a deterministic public fixture

**Source:** 001 K0 deliverable; 007 K0.2 scope; K0.1 W-8.
**Observable:** the fixture defines the trace *accept input → delayed fake Runtime → typed output →
input wait → completion* as a declarative scenario whose every step has a stated expected observation
**and** stated forbidden mutations, including W-8's selectivity case: an unrelated application input
accepted during the wait is never eligible, never acknowledged, never dropped, and cannot displace the
subscribed wake at batch bound 1.
**Distinguishing counterexample:** a candidate that selects the older ineligible backlog into the
wait-ended batch, or that acknowledges it, must FAIL.
**Evidence:** `tests/conformance/k0/scenarios.ts` (`k0Trace`), `tests/conformance/k0/k0-trace.test.ts`.
W-8 case 6 is carried by its own control rather than by this scenario; revision 1 claimed the
stale-timer control already covered it, which was wrong and is corrected under C6.

C1 also carries, through C9's map, the inherited K0 boundary-observability obligation for this
scenario's §11 rows. Round-3 finding K02-R3-01 found three of them unevidenced here and they are now
observed: W-2 step 1's ordering, so the wait this trace registers can never be woken by the batch that
registered it; W-8's first-class subscription-only wait, which a candidate reading the dependency list
as "the wait" would refuse; and LP-3, since this trace is where unrelated input arrives after an
accepted Outcome and must not retract it.

### K0.2-C2 — delayed Runtime, and delay that does not block a second Execution

**Source:** 001 K0 ("delayed fake Runtime"); 001 K1 ("One delayed Runtime must not prevent the same
coordinator loop dispatching another Execution").
**Observable:** the fixture's Runtime delay is explicit and scheduled, not a timing race; an Execution
whose Activation is unresolved leaves a second Execution dispatchable, and the unresolved Activation
stays `RUNNING` with no Kernel-visible wait created (W-4).
**Distinguishing counterexample:** a candidate that reports the delayed Execution as `WAITING`, or
that fails to dispatch the second Execution, must FAIL.
**Evidence:** `tests/conformance/k0/scenarios.ts` (`delayedRuntimeNonBlocking`), `delayed-runtime.test.ts`.

### K0.2-C3 — independent operation sink with an independent ledger

**Source:** 001 K0 ("a fake operation sink with an independent ledger for later action tests").
**Observable:** the sink records every attempted operation **faithfully across the whole accepted E-1
object-key space** — every valid member name, `"__proto__"` included, is preserved as own data with no
key-dependent prototype semantics, and every value reachable through a stored entry is detached and
frozen (round-2 finding K02-R2-02) — in a ledger the candidate cannot read back,
edit, reorder or truncate through the sink's own surface; the ledger is readable by the fixture as an
observation independent of whatever the candidate reports about itself. **Independence must survive
retained references, not only absent methods** (round-1 finding K02-R1-02): a candidate that keeps a
reference to the input it passed in, to the result it was handed back, or to any object nested inside
either, must not be able to rewrite recorded history by mutating it after the fact. Historical evidence
editable by the party it incriminates is not evidence.
**Distinguishing counterexample:** three kinds, all required. A candidate that claims a dispatch the
ledger did not record, or claims none where the ledger recorded one, must FAIL on ledger comparison
rather than on self-report. Separately, mutating each retained reference after `attempt()` returns must
leave every later ledger read unchanged. Separately again, a valid boundary value carrying an own
`"__proto__"` member must round-trip through the ledger intact and immutable — a case that passes
trivially for ordinary keys and therefore has to be tested by name.
**Evidence:** `tests/conformance/k0/operation-sink.ts`, `operation-sink.test.ts`.

### K0.2-C4 — direct baseline specification

**Source:** 001 K0 ("The direct baseline is ordinary code plus explicit state and policy; keep
validators/services identical across candidates").
**Observable:** a written contract fixing what the direct arm is, what it shares with the Kernel arm
(validators, sink, policy, fixture inputs — identical instances, not equivalents), what it is allowed
to do differently, and which observations are comparable versus incomparable.
**Distinguishing counterexample:** a specification permitting the direct arm a private validator or a
different sink would be non-conforming, because it would let an arm win on laboratory difference.
**Evidence:** [public-fixture-specification.md](public-fixture-specification.md) §4.

### K0.2-C5 — both public application shapes

**Source:** 007 K0.2 scope; benchmark E0 ("reviewed artifact publication, and a restartable request
across two independent jobs plus human input").
**Observable:** both shapes are specified with each owner's authoritative state, attempted-action
boundary, physical controls, input acceptance and failure observations, as fresh public fixtures and
not copies of private P0X cases.
**Evidence:** [public-fixture-specification.md](public-fixture-specification.md) §5.

### K0.2-C6 — the unsafe/state-loss controls, as negative tests

**Source:** K0.1 worksheet Decision M-1; 001 K0 exit; execution-protocol.md's K0–K4 acceptance examples.
**Observable:** M-1's four controls exist as executable negative scenarios with per-assertion forbidden
mutations, namely M-1's row 3 (duplicate/conflicting Outcome), row 5 (stale timer / lost wake), row 7
(cancel-versus-complete, both orders) and row 9 (missing checkpoint/code). **M-1 is a floor, not a
ceiling**: round-1 finding K02-R1-01 added two further unsafe/state-loss controls for obligations that
were going unobserved — W-8 case 6's subscription-only wait with a deadline, including B-7's mandatory
timeout Event, and §11 row 8's completion check. A dependency-only deadline scenario is explicitly not
a substitute for W-8 case 6, because that case is sharp only when the wait has no dependency
alternatives at all. **A control may only assert distinctions the governing protocol makes
observable** (round-2 finding K02-R2-01): the completion control asserts that a completing envelope
carrying newly proposed Effects is refused whole and reaches no terminal state, and it may *not*
require a completion-specific rejection reason, because EF-1/EF-2 already mandate the whole-envelope
refusal and §11 row 4 leaves the reason text open. That rule is now enforced generally rather than
control by control: the oracle compares a rejection's **classification** exactly and its **reason
text** only where an accepted decision fixes that text, which today is CX-6 alone. **And a control may
not assert a distinction the observation surface cannot see** (round-3 finding K02-R3-01): the
stale-timer control claimed `B-8`'s no-second-readiness invariant in prose while nothing could fail a
candidate for breaking it. Wait-ended readiness and Effect-intent absence are now observed facts, so
both controls assert what they claim. **And a control that claims zero wait/deadline mutation must
submit the wait and observe the deadline** (round-5 finding K02-R5-02): inferring deadline absence
from terminal state or `liveWaitGeneration` alone is not evidence. Row 7 therefore submits a
cancellation-losing `await` carrying a wait with a deadline and observes the accepted logical
deadline fact (`acceptedDeadline`) alongside live generation and readiness — semantic state, never
scheduler mechanism (round-6 finding K02-R6-01): a physical timer retained after logical retirement
is conforming W-3 behavior fenced as stale on arrival, and retirement requires no timer cancellation
or removal. Row 7 additionally asserts,
as M-1 requires by name: CX-6 full rejection for `continue`, `complete` **and** a deadline-bearing
`await` submitted after cancellation acceptance; zero acknowledgment of the reserved batch; no change
to accepted progress/emissions; zero wait, accepted deadline fact, readiness and next-state change;
B-5 disposition at `CANCELLED`; deterministic recorded rejection on exact retry;
and the reverse order, where accepted completion remains terminal.
**Distinguishing counterexample:** M-1 names one explicitly — "suppressing only next state while
installing losing progress is a failing control, not a conforming variant." That exact variant is
shipped as a violating transcript and the oracle must reject it.
**Evidence:** `tests/conformance/k0/scenarios.ts` (`duplicateAndConflictingOutcome`, `staleTimerAndLostWake`,
`cancelVersusComplete`, `missingCheckpointCode`); `controls.test.ts`; `oracle-discrimination.test.ts`;
`blind-spot-regression.test.ts` for the readiness assertions the stale-timer control previously
claimed in prose only.

### K0.2-C7 — preparation is visibly not a pass

**Source:** 007 K0.2 acceptance; 007 preamble ("Prepared fixtures are an entry prerequisite, never a
passed gate"); 006 ("A test fixture is not a passed evidence gate").
**Observable:** four things hold simultaneously. (a) The only candidate shipped against the real
supported entry is a **refusing** candidate: every scenario reports `REFUSED`, never `PASS`. (b) The
oracle is proven in both directions by hand-authored transcripts — one conforming transcript the
oracle passes, and at least one plausible-wrong transcript per obligation that it rejects with the
specific violated assertion, at the step that obligation lives at. **Every retained counterexample
must represent behavior the governing protocol actually forbids** (round-2 finding K02-R2-01), and
must name the decision it breaks; a transcript that cannot cite one is a preference, not a
counterexample, and failing a candidate for it makes the oracle reject conforming work. Rejecting at
the right step is necessary and not sufficient: mechanical rejection cannot convert permitted
behavior into valid evidence. A citation is likewise necessary and not sufficient — round-4 finding
K02-R4-01 was a transcript that cited W-1 rule 3 truthfully and still forbade nothing, because the
rule it invoked leaves the point at issue to K1.3. **The oracle also may not pin a representation the
protocol does not fix**: a rejection's classification is canonical and its reason text is not (except
CX-6's, which the worksheet names); a recovery hold must exist and be inspectable, but its wording is
open; and receipts and Activation IDs — the two token families a candidate mints rather than receives
from the schedule — are judged by the relations ID-3/ID-6/OA-2 fix, one expected token naming one
observed token throughout a run *within each family*, never by spelling and never across families: a
receipt and an Activation ID may share one raw opaque spelling while same-family collapse still fails
(round-5 finding K02-R5-01). (c) **The oracle fails closed**
(round-1 finding K02-R1-03): a step declaring an independent-ledger expectation must never pass
because the runner was invoked without a usable observer. Omission is a type error, and an unusable
observer at runtime is a failure of the assertion rather than a reason to skip it — for a conforming
candidate as much as a violating one, or the guard would be discriminating on the candidate instead
of on whether the obligation was checked. (d) No document or test in this packet claims K0, E0 or
E1 status.
**Distinguishing counterexample:** an oracle that passes every transcript, or that rejects every
transcript, is vacuous; the discrimination test fails in both directions if either happens.
**Evidence:** `tests/conformance/k0/candidate.ts`, `refusal.test.ts`, `oracle-discrimination.test.ts`,
`blind-spot-regression.test.ts`.

### K0.2-C8 — pinned E0 evidence

**Source:** 007 K0.2 scope ("obtain pinned E0 evidence"); 007 old→new mapping ("K0.2 ACCEPTED,
including E0"); 006 ("Missing cross-repository gate evidence blocks only dependent acceptance, not
independent fixture preparation").
**Observable:** benchmark revision, E0 fixture/config identities, raw observations, evaluator version
and the actual external decision recorded here — **or** a named blocker with responsible actor and a
concrete unblock condition.
**Status entering this packet:** the benchmark repository at `98756f8c10bd806125da8318f1a129bc030aca61`
states E0–E6 are planned and not implemented. This criterion is expected to close as
**BLOCKED_EXTERNAL**, not PASS. The owner released the packet as written with that consequence stated
in advance. No E0 acceptance may be claimed, implied or self-granted, and nothing is written in the
benchmark repository by this packet.

### K0.2-C9 — the coverage machinery proves assertions, not row numbers or prose groupings

**Source:** 001 K0 exit ("an observable acceptance/rejection result" for each boundary); round-1
finding K02-R1-01 as reopened by round-3 finding K02-R3-01; K0.1 worksheet §11 row 5 ("Each of these
is **separately** observable"); [012](../../012-review-methods.md) ("a collection of individually
correct sections or unit tests does not establish a coherent packet").
**Observable:** coverage is recorded per **independently distinguishable assertion** — not per §11 row,
and not per prose grouping inside a row. The unit test is behavioural rather than editorial: two
clauses in one cell are separate assertions when a plausible implementation can get one right and the
other wrong, because that is exactly the candidate the oracle must be able to fail. A takeover that
keeps the Activation ID without advancing the epoch, a create that returns the right identity while
ingesting the input twice, a duplicate timer whose Event creation is idempotent but whose readiness
commit is not: each is one real implementation getting half a cell right.

Every assertion resolves to one of: a scenario plus a specific step plus at least one counterexample
the oracle demonstrably rejects *at that step*; a declared `shared` link to another assertion, for the
case where two §11 rows name one observable fact, with the identity justified and the target required
to carry scenario evidence of its own; a corpus-level check, for negative obligations about the
fixture as a whole; or an explicit assignment to a named packet with the reason it has no observable
K0 case. **No counterexample may defend two assertions** except through a declared `shared` link. The
map and the scenarios declare the row relationship separately and must agree in **both** directions,
and every violating transcript must defend a recorded assertion.

**What does not count as evidence**, each because a review round found it standing in for some:
`forbids` prose, which fails no candidate; a green test of the fixture's own helper predicates, which
shows the fixture agrees with the worksheet rather than that a candidate is held to it; and a
counterexample belonging to a neighbouring rule, which fails candidates for something else. Where an
assertion has no observation surface, the correct response is to add the smallest truthful observation
or to assign it explicitly — never to count it covered.
**Distinguishing counterexample:** revisions' machinery, failing in different ways.
Revision 1's passed while most of rows 1, 2, 5(c)/(e) and all of row 8's completion clause went
untested, because it only checked that each row number pointed at a scenario that existed. Revision
2's then accepted a "counterexample" that was not a protocol violation at all, because nothing
required a counterexample to name the rule it breaks. Revision 3's counted assertions covered whose
required fact the observation surface could not see — a phantom wait-ended readiness, a retained
Effect intent — and counted LP-1 covered by a cancellation-atomicity transcript from a neighbouring
rule. Revision 4's defined the right unit and then exempted the entries it had inherited from it, so
four entries kept bundling clauses a candidate can fail one at a time, and it invented a spelling rule
for declared subscription identities that W-9 assigns to K1.3. Revision 5's coupled receipt and
Activation-ID namespaces that the worksheet leaves independent, rejecting a conforming representation,
and treated normative transaction coupling as proof partial writers are implausible — leaving the
duplicate-conflict record-and-merge writer without a discriminating candidate and CX-6's zero-deadline
clause without a schedule or an observation. Revision 7's observed the deadline neutrally but owned only three of its lifecycle transitions, leaving persistence and retirement cleanup unowned. Revision 8's re-derived that lifecycle and still owned only one of B-6's two entry boundaries, evidencing eligible-wake cleanup with a path-A transcript while the corpus held no deadline-bearing path-B wake at all. Revision 9's closed that boundary and then narrowed one assertion out of existence by reading a §11 row's illustrative parenthetical instead of the decision it cites, leaving OA-5's zero-deadline clause unowned on the malformed-envelope rejection path whose schedule and observation already existed. Revision 6's observed the deadline as a physical timer
registration whose lifetime the worksheet leaves open, so R7-a6c could fail a conforming stale-timer
mechanism. **And normative coupling never counts as proof a partial
writer is impossible** (round-5 finding K02-R5-02): `COUPLED_FIELD_GROUPS` is a review heuristic, and
every retained composite names its specific writers. **And timer mechanism is never the deadline
fact** (round-6 finding K02-R6-01): the accepted deadline is observed as logical state beside the
live generation, with retirement clearing the fact while permitting late stale delivery. **And a
visible field still needs an owning transcript** (round-7 finding K02-R7-01): the deadline lifecycle
— persistence on durable registration, immediate retirement at registration, current-expiry
retirement, and fencing of stale deliveries — carries one single-field counterexample per transition,
because incidental structural rejection is not assertion-level evidence. **And alternate paths to one
state are inspected at every entry boundary** (round-8 finding K02-R8-01): B-6 reaches `READY` through
two of them, path A inside Outcome acceptance and path B at a later Event's own acceptance boundary,
and the deadline cleanup each performs is a separate assertion with its own schedule and transcript,
because a writer that exists on one path need not exist on the other. **And an assertion is read from
the decision a row cites, never from the row's illustrative list** (round-9 finding K02-R9-01, applied
cumulatively by round-10 findings K02-R10-01/-02/-03): row 3's parenthetical names progress, Effect
intent and acknowledgment, while OA-5 — which row 3 cites — forbids a rejected Outcome from creating
any wait, deadline, readiness or next-state transition, so the malformed-envelope rejection owns that
whole family too (R3-c4/c5/c6/c7), separately from the CX-6 fence that owns it at a different rejection
writer; row 2's ID-9 cases 2–3 own takeover input immutability and share the stale-writer fact with row
10 rather than leaving it neighbouring, with ID-9 case 1 redelivery representable rather than implicit;
and row 1's ID-2/ID-6/ID-7 own producer-scoped identity and per-boundary receipt relations with explicit
K2.2/K2.3/K4.1 assignments where K0 has no case, rather than one overloaded receipt field.
Under-coverage lets a wrong candidate pass; over-constraint fails a right one, and is the worse
failure of the two.
**Evidence:** `tests/conformance/k0/coverage.ts`, `coverage.test.ts`, `interactions.test.ts`.

## Selected proof methods ([012](../../012-review-methods.md))

| Method | Applied to | Why |
|---|---|---|
| **Normative decisions** | C1, C4, C5, C6, C7 | The fixture and specifications are behavioral contracts. Both orders of interacting operations, absence/inert cases, duplicate/conflicting/stale submissions and rejection are walked; every path accounts for the whole result, not only its headline state. |
| **Deterministic execution** | C1, C2, C3, C6, C7 | The oracle is mechanically decidable. Assertions are derived from the accepted worksheet rather than from any implementation, and each control ships a plausible broken behavior the oracle rejects. |
| **External evidence/gate** | C5, C8 | Distinguishes preparation from execution and execution from gate acceptance; pins subject, fixture and revision identities; verifies evidence ownership. |
| **Process/documentation** | C7, C8 | Checks successor holds, exact identity and that no unsupported claim is made. |

**Materially excluded, with reason:**

- **Race and fault.** No persistence or process-death claim is made by K0.2. The controls pin *logical*
  acceptance order as scheduled data; actual process death is E4/K3 work. Recorded as a limit, not a gap.
- **Native Runtime/Driver.** No Driver exists at K0; C6's missing-checkpoint control asserts the
  Kernel-side PC-4/PC-5 refusal contract only, never native fidelity. R1 owns the rest.
- **Packaging/release.** S1 owns it; this packet advertises no export.

## Interacting boundaries

These are the connections a per-criterion checklist would miss, and they are checked as interactions:

1. **Wait registration × batch selection × terminal disposition.** W-2's ordered registration, §3's
   wait-ended batch rule and B-5's terminal disposition all touch the same unacknowledged Events. The
   K0 trace scenario carries one Event (`billing.question`) across all three so a candidate cannot
   satisfy them separately with inconsistent bookkeeping.
2. **Cancellation fence × receipt replay.** OA-2's accepted-receipt replay and CX-6's recorded-rejection
   replay are the same submitted-identity lookup with opposite answers. The cancel control exercises
   both against one Execution so a candidate cannot pass by implementing only one rule.
3. **Generation fencing × authenticated Events.** W-3 fences wait-created timers but explicitly does
   **not** fence authenticated result Events. The stale-timer control asserts both halves; a candidate
   that over-generalizes fencing loses a result it should still observe.
4. **Envelope refusal × sink ledger.** EF-2's refusal is only meaningful if the independent ledger
   shows zero dispatch. C3 and C6 are read together, never separately.

## Command plan

| Command | Purpose | When |
|---|---|---|
| `node --test --experimental-strip-types tests/conformance/k0/*.test.ts` | targeted iteration | while implementing |
| `npm run typecheck` | whole-workspace type check | on clean payload C |
| `npm test` | full suite; proves no regression in existing conformance | on clean payload C |
| `npm run test:conformance` | conformance subset including the new `k0` directory | on clean payload C |
| `npm run check:builder-docs` | builder-docs inventory, since docs changed | on clean payload C |
| `git diff --check <base> <C>` | whitespace | on clean payload C |

`npm run test:evals` is **not** run: no Agent behavior changes. `npm run test:sdk` is covered by
`npm test`, which includes `packages/sdk/tests/*.test.ts`; no separate duplicate run.

## Evidence owners and limits

- **Kernel-local fixture and oracle:** this repository. Runnable offline with no model, network,
  container or database.
- **E0 fixtures, ownership records and the E0 decision:** benchmark repository owner. Not writable or
  grantable from here.
- **Limit:** the fixture is validated against hand-authored transcripts, not a Kernel. It proves the
  oracle discriminates; it proves nothing about any implementation, because none exists.
- **Limit:** no claim of durability, isolation, performance or application value is made.

## Routine decisions taken within this contract

Resolved by the implementer under 007's "routine coding choices" allowance, recorded for the reviewer:

1. **Location** `tests/conformance/k0/`, picked up by the existing `tests/conformance/*/*.test.ts`
   globs in `npm test` and `npm run test:conformance` with no script change.
2. **Zero `@arrokothi/*` imports** in the fixture. The fixture describes the *target* protocol, which
   the 0.8.x packages do not implement; importing their vocabulary would bake legacy shapes
   ([013](../../013-structure-and-evidence-sequencing.md)) into a K1 acceptance oracle.
3. **Transcript-driven oracle validation** rather than a reference Kernel, because implementing the
   protocol is K1.1–K1.3's responsibility and would be out of scope here.
