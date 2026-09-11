# K0.1 protocol worksheet — equality, receipts, batches, clocks, cancellation, progress, policy

**Revision:** 1 (first version; no prior revision exists). **Status:** produced by packet K0.1,
awaiting independent review per [006](../../006-development-process.md). **Owner of this document:**
Kernel, except where a row is explicitly marked Runtime/Driver or deployment.

This worksheet is a **decision record**, not new architecture: every decision below already follows
from [kernel.md](../../../kernel.md), [execution-protocol.md](../../../detail-design/execution-protocol.md),
[recovery-and-compatibility.md](../../../detail-design/recovery-and-compatibility.md) and
[evidence-and-observability.md](../../../detail-design/evidence-and-observability.md). Where this
worksheet says more than those pages, it is resolving an explicit open question they left to K0
(004's "Open questions and decision points" section, K0/K1 bullet), not overriding them. If a future reader finds a conflict, the
canonical page wins and this worksheet needs a correction, not the reverse (AGENTS.md architecture
precedence). No wire codec, storage engine or scheduler algorithm is chosen here; those stay
replaceable per 001's K0 exit ("Keep the wire codec/store layout replaceable") and are explicitly
flagged "implementation-owned, not decided here" throughout.

Current-code references below are read-only evidence for the legacy classification in §12; this
packet changes no runtime file. Line numbers are as of base commit `6464be1`.

---

## 1. Equality and value limits

**Decision E-1 (canonical value model).** A boundary value (Activation/Outcome envelope field,
Effect proposal, Event payload) is one of: `null`, boolean, finite JSON number, string, or an array/
object built only from these, recursively. `NaN`, `Infinity`, `-Infinity` and any non-finite number
are rejected before identity/equality is computed — never silently coerced to `null` or a string.

**Decision E-2 (duplicate object keys).** A boundary value containing a JSON object with a duplicate
key (a raw-wire concept, not a parsed-object concept, since a parsed object cannot itself hold a
duplicate key) is rejected at decode time. The Kernel's equality/identity computation therefore always
runs on an already-decoded, already-deduplicated value; it never has to define "the meaning of" a
duplicate key itself.

**Decision E-3 (key order).** Two decoded objects with the same key/value pairs in different
insertion order are the same logical value. Content equality is computed over a canonicalized form
(keys sorted before hashing/comparison); a byte-for-byte transport comparison is not used for logical
identity, because two honest re-serializations of the same value are not guaranteed byte-identical
across codec versions.

**Decision E-4 (absent vs. null).** Where a schema declares a field optional, "the field is absent"
and "the field is present with value `null`" are different logical values and must not be normalized
into each other before comparison. A schema that wants them merged must say so explicitly per field;
the default is that they differ.

**Decision E-5 (hash is not authority).** A content hash (of a checkpoint blob, a payload, an
idempotency key) may be used to detect an *accidental* mismatch or to name a blob for storage, but
is never itself treated as proof of authenticity, consent, or permission — restates
[execution-protocol.md](../../../detail-design/execution-protocol.md#identities-and-immutable-exchanges)
("Compare the full identity/content binding; a hash alone is neither authentication nor permission").

**Decision E-6 (bounded values).** Every boundary value has a declared size/depth limit (implementation-
owned exact numbers; K1.1/K1.2 pick them), and an over-limit value is rejected at the same "malformed
envelope" boundary as a structurally invalid one (§7), not truncated silently. Large payloads
(checkpoints, artifacts) never travel as inline boundary values; they travel as application-owned
references per kernel.md's Activation/Outcome shape ("large payloads use application-owned references").

**Left open (implementation-owned):** exact wire encoding (JSON text vs. a binary envelope codec),
exact numeric size/depth ceilings, and the canonicalization algorithm used for E-3's sort. K0.1 fixes
only that these choices must exist and must be versioned (§9); it does not pick among them.

---

## 2. Identities and scoped receipts

Restates and pins [execution-protocol.md](../../../detail-design/execution-protocol.md#identities-and-immutable-exchanges)'s
identity table as binding decisions, with the "must not be used as" column treated as a refusal rule
an implementation must actively enforce, not merely avoid by convention:

| Identity | Scope | K0.1 decision |
|---|---|---|
| Execution ID | one logical lifetime, never reused after terminal deletion | **ID-1**: an Execution ID is never reissued to a new logical Execution even after the original is deleted/GC'd. A store that recycles primary keys must remap through a separate never-reused logical ID. |
| Input ID | authenticated producer namespace + destination + producer request key | **ID-2**: input identity is a triple (producer principal/namespace, destination Execution ID, producer-supplied request key), not a bare string. Two different producers may legitimately reuse the same request-key text without colliding. |
| Activation ID | one exchange against a pinned accepted progress revision + Event batch | **ID-3**: an Activation ID is minted at dispatch and is never reused for a second, logically different exchange — including a takeover, which mints a new Activation ID under a new writer epoch (§4/§6) rather than reusing the old one. |
| Writer epoch | current attempt allowed to submit progress for that exchange | **ID-4**: the epoch is a monotonically increasing integer (or equivalent total order) per Execution, bumped only by an authenticated takeover decision, never by ordinary retry of the same attempt. |
| Effect ID | one immutable logical request; proposal key bound at acceptance | **ID-5 (K2-scoped, recorded here for completeness):** not allocated by K0/K1, since K1 refuses Effects (§8). K0.1 fixes only that when K2 introduces it, it must follow this same "immutable logical request, proposal key bound at acceptance" shape — no separate physical-attempt-numbered identity at this layer. |
| Receipt / acceptance position | evidence a specific request was accepted at a specific boundary | **ID-6**: a receipt names exactly one of the six atomic boundaries in kernel.md's Acceptance/atomicity table (§7's boundary list) plus the accepted revision/position within it. A receipt is never evidence of anything past that boundary (e.g. an Outcome-acceptance receipt is not evidence any Effect in it succeeded). |

**Decision ID-7 (receipt scope is per-boundary, not per-Execution).** "The receipt" is not a single
value per Execution; each of the six boundaries (creation/input ingress, dispatch intent, Outcome
acceptance, Effect admission, Effect settlement, child/message operation) has its own receipt
identity, because they are accepted at different times by different authorities and a caller must be
able to ask "was *this specific* thing accepted" without it being confused with a different boundary
on the same Execution.

**Decision ID-8 (receipt lookup is principal-scoped).** Restates
[execution-protocol.md](../../../detail-design/execution-protocol.md#outcome-acceptance-algorithm)
step 1: a receipt lookup authenticates the caller and scopes to Executions/boundaries that caller may
see before returning anything, including a "not found" — a receipt lookup must not distinguish
"doesn't exist" from "exists but you can't see it" through response shape/timing in a way that leaks
existence to an unauthorized caller.

**Left open (implementation-owned):** exact receipt serialization (opaque token vs. structured
tuple), exact epoch representation (integer vs. fencing token), exact request-key hashing.

---

## 3. Eligible batches and input accounting

**Decision B-1 (batch is a set, not a cursor).** The batch an Activation is dispatched with is an
explicit, finite, enumerable set of Event references pinned at dispatch time — not "everything after
global position N." This directly fixes F20 (a single cursor can silently acknowledge unmatched
input): per-entry disposition, not a monotonic cursor, is the required representation.

**Decision B-2 (selection rule by lifecycle).**
- While `READY`: select a bounded batch (implementation-owned max size) from all currently
  unacknowledged Events, in acceptance order.
- While `WAITING`: select only Events eligible under the currently registered wait (its `wake` and, if
  present, `interleave` condition for the `event`/`controller_resumption` arms, or its `event`
  condition for the `dependencies` arm — see §5) — an eligible match is included ahead of any
  unrelated backlog, but unrelated backlog is not force-included merely because it is old.

**Decision B-3 (whole-batch acknowledgment).** An accepted Outcome acknowledges its *entire* pinned
batch at once. "Acknowledged" means "the Runtime is on record as having accounted for this Event",
never "the Runtime obeyed it." A Runtime that intentionally ignores one Event in an acknowledged
batch must have recorded that choice in its own progress; the Kernel does not parse the Outcome to
verify semantic compliance (restates execution-protocol.md's input-reservation section).

**Decision B-4 (unmatched retention, not disappearance).** An Event not in the current batch (arrived
during `RUNNING`, or ineligible during `WAITING`) remains queued with its own independent disposition.
It is included in a later batch when it becomes eligible; it is never silently dropped, never merged
into "the Runtime must have seen everything up to here," and never requires the Runtime to replay
history to notice it — restates B-1/F20's fix directly.

**Decision B-5 (terminal disposition of unconsumed input).** When an Execution reaches a terminal
state with Events still queued/unacknowledged, each of those Events gets an explicit recorded terminal
disposition ("Execution terminated before this Event was acknowledged") rather than being deleted
without record or silently treated as processed.

**Left open (implementation-owned):** exact bounded-batch max size and the exact per-entry
disposition storage shape (a per-Event flag vs. a set-difference against acknowledged IDs).

---

## 4. The three clocks

Restates and pins [execution-protocol.md](../../../detail-design/execution-protocol.md#wait-registration-deadlines-and-liveness)'s
three-clocks paragraph as a binding distinction, since conflating them is the concrete race F20/004
flag:

| Clock | What it bounds | Expiry means | Expiry does **not** mean |
|---|---|---|---|
| **Wait deadline** | one specific `waitingFor` registration (§5) | that dependency wait ends; the Runtime gets a timeout fact in its next eligible batch | the external action it was waiting on failed, or the Execution itself ends |
| **Execution deadline** | the whole Execution's permitted lifetime | ordered logical cancellation (§6) begins | native work is interrupted — cancellation still goes through the same Driver-mediated cancellation path as an explicit cancel |
| **Scheduler lease** | one worker's exclusive claim on a READY→RUNNING Execution | the claim is eligible for release/reassignment; a recovery inspection is triggered | that the previous holder's process is dead, that its native work stopped, or that a new attempt may write without checking accepted state |

**Decision CL-1.** These three are independent identities that must not share a single timer/field.
An implementation with one "deadline" field per Execution used for all three purposes cannot express
"the wait timed out but the Execution should keep running" or "the lease expired but the Execution's
own deadline has not," both of which are required outcomes.

**Decision CL-2 (wait timeout ≠ action failure).** A wait-deadline expiry is recorded as its own fact
alongside (not instead of) any later result for the same dependency, per execution-protocol.md's race
table ("Wait timeout versus action success: preserve both facts"). This is a K2+ concern for Effects
specifically, but the *clock* distinction is a K0/K1 boundary because `ExecutionWait` (§5) already
carries a deadline concept in the target design.

**Left open (implementation-owned):** exact deadline units/precision, and whether lease expiry uses a
heartbeat-renewal or a fixed TTL.

---

## 5. Wait registration, generations, and any-of correlation

**Decision W-1 (finite any-of set).** A wait names a finite, enumerable set of correlated
dependencies. There is no unbounded/implicit "wait for anything" and no Kernel-evaluated boolean
expression over dependencies — an all-of join is a Runtime-owned accumulation in its own progress
(restates kernel.md's Events-and-waits section), not a second Kernel wait primitive.

**Decision W-2 (atomic mailbox check at registration).** Registering a wait and checking already-
accepted-but-unacknowledged Events for a match happen in the same atomic step that transitions the
Execution to `WAITING` (or keeps it `READY` if already satisfied). This is the fix for the "result
precedes wait" race in execution-protocol.md's race table; it must not be split into "register" then
"separately notice."

**Decision W-3 (wait generation identity).** Every `waitingFor` registration has its own generation
identity, distinct from the Execution ID and from the Activation ID that created it. A timer or a
late settlement names the generation it belongs to; a wake attempt for a generation that has since
been replaced (the Execution moved on to a new wait, or resolved and re-entered `WAITING` on a
different dependency) is a no-op, never a wake of the current wait. This directly fixes the "stale
timers cannot wake a replacement wait" requirement and generalizes it to late settlements, not only timers.

**Decision W-4 (current `ExecutionWait` shapes are the K0/K1 union, unchanged in kind, reframed in
ownership).** The current code already carries a three-armed union — `event`, `controller_resumption`,
`dependencies` (`packages/core/src/execution/context.ts:102-130`) — that structurally matches "wait on
one Event, or one local dependency, or a finite any-of set." K0.1 keeps the *shape* of this
distinction (an Event-wait is categorically different from a Runtime-local-work-wait) but reclassifies
what may occupy the local-work arm: see §12 — the current `controller_resumption`/`dependencies`
arms name a **Kernel-persisted** `ControllerResumptionId`, which is legacy-only for the target Kernel
protocol (§12, ID `LEG-1`). The target K1 wait registration must express "Runtime-local work
outstanding" without the Kernel persisting a reference to live, unrecoverable process state.

**Decision W-5 (interleave is Runtime-declared, not Kernel-inferred).** Where an `interleave`-style
condition exists (current code: `ExecutionWait`'s optional `interleave` field), it remains
declarative data supplied by the Runtime's Outcome, evaluated by the Kernel exactly like the primary
wake condition — the Kernel never infers on its own that some Event is "probably safe to interleave."

**Left open (implementation-owned):** exact generation representation (integer counter vs. new random
ID per registration — either satisfies W-3 as long as it is compared, never assumed monotonic across
process restarts unless explicitly persisted as such).

---

## 6. Cancellation and terminal obligations

**Decision CX-1 (cancel is a Kernel control operation, not a mailbox message).** Restates kernel.md:
an accepted cancellation is processed at its own boundary, independent of whatever batch the current
Activation is holding. Current code already implements this shape correctly at the ordering level
(`Harness.activate`, `packages/core/src/runtime/harness.ts:747-757`, checks a pending
`cancellationRequest` before ever dispatching a controller, and `applyOutcome`,
`harness.ts:953-965`, re-checks it before committing the controller's reported next state) — see §12,
classified `MIG-1` (migratable: the *ordering rule* survives, the concrete record shape may change).

**Decision CX-2 (first accepted terminal decision wins).** Cancel-vs-complete is resolved by
acceptance order, not submission order: whichever terminal disposition (cancellation applied,
completion accepted) is *accepted* first at the Kernel wins; the other cannot reopen a terminal
Execution. Current code already encodes "terminal states have no outgoing edges"
(`packages/core/src/execution/lifecycle.ts:51-53`) as a pure transition-table invariant independent of
any store — this is directly reusable (see §12, `MIG-2`).

**Decision CX-3 (terminal completion obligations).** An Outcome proposing `complete` must have: no
newly proposed Effects in that same Outcome, and every previously-owned required Effect/child
obligation accounted for (settled, or explicitly transferred/abandoned under policy — K4-scoped
mechanism, but the *rule* "completion checks this" is a K0/K1 boundary because it gates whether
`complete` is even accepted). K1 without Effects (§8) satisfies this trivially (no Effects exist yet
to be unaccounted-for); K2 is where the check becomes non-trivial. K0.1 fixes that the *rule itself*
belongs at Outcome-acceptance time, not as a later cleanup pass.

**Decision CX-4 (uncertain work bars completion, but does not bar cancellation).** An Execution with
unresolved/unknown external work may not `complete`, but a cancel request against it is still
accepted — cancellation stops new progress and admission; it does not claim the unknown work is
resolved. The Kernel retains that evidence for reconciliation rather than deleting it with the
Execution (restates kernel.md's "Execution and lifecycle" section).

**Decision CX-5 (late external results after cancel).** A late, authenticated settlement for work
admitted before cancellation is still recorded as evidence against the original attempt/Effect record,
even though the owning Execution is terminal. It never reopens the Execution and never becomes a new
unrelated Effect.

**Left open (implementation-owned):** exact cancellation-request record shape and whether "applied"
vs. "pending" is a two-state or richer state machine (current code's two states, `packages/core/src/execution/cancellation-request.ts`
pattern implied by `markCancellationApplied` in `harness.ts`, are adequate evidence this can stay simple).

---

## 7. Outcome acceptance algorithm, duplicates and conflicts

This section pins the five-step algorithm in
[execution-protocol.md](../../../detail-design/execution-protocol.md#outcome-acceptance-algorithm) as
binding, and calls out where current code deviates (full deviation detail in §12).

**Decision OA-1 (authenticate and scope first).** Before any content is inspected, the submitter is
authenticated and access is scoped to the named Execution. Restates step 1.

**Decision OA-2 (idempotent replay before validation).** An exact duplicate of an already-accepted
Outcome (same Activation ID, same content) returns the original receipt without re-running acceptance,
Effect dispatch, or publication. A same-identity Outcome with *different* content is a conflict and is
rejected, never merged/patched. This check happens *before* full envelope validation (step 2 precedes
step 3), so a duplicate of an Outcome that would now fail validation under updated policy still
replays its original (already-accepted) receipt rather than re-validating against current rules.

**Decision OA-3 (whole-envelope validation, all-or-nothing).** Current Activation ID, writer epoch,
and base progress revision are checked together; any wait reference to a same-Outcome Effect proposal
is resolved and bound in the same pass. A failure anywhere in this step accepts nothing: no partial
progress commit, no partial Effect intent, no partial acknowledgment. This is the direct fix for F10
(`applyOutcome`'s current ordering, §12 `REF-1`, dispatches Effects in a step separate from — and
before — the transaction that commits next-state/progress, so a failure between them is not
"nothing accepted," it is "Effects already attempted, progress not yet committed").

**Decision OA-4 (atomic commit of the whole accepted set).** Acknowledgment of the batch, progress
installation, accepted emissions, all Effect *intents* (not their dispatch/settlement — see §8),
next-state and any wait/deadline are one atomic step. "All Effect intents" being committed together
with progress is what makes step 3 above enforceable — an implementation that dispatches Effects
before or outside this transaction (current code, §12 `REF-1`) cannot claim OA-3.

**Decision OA-5 (rejection is inert, never a partial mutation).** A rejected Outcome (malformed
envelope, stale epoch/revision, unresolvable wait reference) creates no Effects, acknowledges no
Events, commits no progress, and is recorded as a rejection with its reason — not silently dropped and
not retried automatically by the Kernel.

**Decision OA-6 (protocol failure is inspectable, not a hidden retry loop).** An invalid response from
the current Runtime attempt (one that cannot even be classified as reject-with-reason) ends or holds
the exchange under an explicit, inspectable recovery decision. It is never an infinite silent retry of
the same dispatch.

**Left open (implementation-owned):** exact transaction mechanism (DB transaction, append-only log
with a compaction pass, in-memory CAS) — any of these can satisfy OA-3/OA-4 as long as the atomicity is
real, not merely "usually fast enough."

---

## 8. Effect admission: explicitly deferred, not silently absent

**Decision EF-1.** K1 (and therefore K0.1) does not implement Effect admission, dispatch or
settlement — 007's design table states this exclusion explicitly for K0/K1
("K1 initially refuses Effects until K2"). K0.1's obligation is narrower: an Outcome that proposes an
Effect during K1 must be **explicitly refused** (a recorded rejection, per OA-5/OA-6), never silently
accepted-and-ignored and never silently stripped from an otherwise-accepted Outcome. Silently dropping
a proposed Effect while accepting the rest of the Outcome would let a controller believe it requested
external work that nothing recorded.

**Decision EF-2 (boundary still exists in the acceptance table).** kernel.md's Acceptance/atomicity
table already lists "Effect admission" and "Effect settlement" as their own boundaries, separate from
"Outcome acceptance." K0.1 confirms this separation is correct and that K1's refusal is a *placeholder
rejection at the Effect-admission boundary*, not evidence that boundary doesn't exist — K2 fills it in
without renegotiating where it sits.

**Non-decision (explicitly K2-owned, not resolved here):** action disposition, outcome certainty,
consent binding, policy freshness ordering for remote services. §10 addresses only the narrow "local
policy ordering" precondition 001 K0 explicitly asks for before K2 promises remote revocation; it does
not implement K2's admission/settlement contract.

---

## 9. Progress compatibility

Restates and pins [execution.md](../../../execution.md#progress-and-native-recovery) and
[recovery-and-compatibility.md](../../../detail-design/recovery-and-compatibility.md#compatibility-dimensions)'s
compatibility-dimensions table as binding for what "progress" must declare, independent of which
concrete Driver is used:

**Decision PC-1 (three progress forms, not one).** Runtime-owned continuation data is one of: (a)
inline structured data the Kernel stores and returns unchanged (current code's
`ControllerProgress`/`context.control`, `packages/core/src/execution/context.ts:57-63`, is exactly
this form and is fully compatible — see §12 `MIG-3`); (b) an immutable checkpoint reference (a blob/
pointer identifying a specific resumable state plus compatible code version); or (c) a reference to a
still-running native job. These have different recovery guarantees and must not be normalized into one
"opaque blob" type that hides which guarantee applies.

**Decision PC-2 (checkpoint publish-before-reference).** Where form (b) is used, the Driver writes the
immutable candidate checkpoint before proposing its reference in an Outcome; Kernel acceptance pins
it; rejection does not. A checkpoint is identified together with its codec/version and required
resource versions — never a bare locator with no version attached.

**Decision PC-3 (mutable session ⇒ locator, not checkpoint).** A mutable native session ID is a
locator, not a checkpoint: if the native Runtime can advance that session outside the Kernel's
accepted revision, Kernel-side compare-and-set does not protect it. Recovery over a locator requires
an explicit exclusive-ownership or reconciliation declaration from the Driver (execution.md's four
Driver questions); absent that declaration, automatic takeover over a locator is refused, not assumed
safe.

**Decision PC-4 (codec/version pinned, not inferred).** Every persisted progress value (any of the
three forms) is versioned to the exact Runtime/definition contract revision that can understand it.
Resuming an Execution when the pinned revision's code is unavailable is an explicit hold/refusal
outcome, never a silent "start over" that discards accepted progress.

**Decision PC-5 (missing-state is truthful, never a fresh-restored fabrication).** If a checkpoint,
required resource, or compatible code is unavailable at recovery time, the Kernel reports that
explicitly (an inspectable recovery-hold state) rather than presenting an empty/fresh Runtime state as
if it were the restored one.

**Left open (implementation-owned):** the concrete checkpoint storage/pinning mechanism (upload
ticket + grace period is the recovery-and-compatibility.md's suggested starting mechanism, not a
requirement), and which of forms (b)/(c) any given K1-era fake/compatibility Driver actually needs —
K1 itself only requires form (a), since it has no real native Driver yet.

---

## 10. Locally ordered policy (before promising remote freshness)

001 K0 asks specifically to "Define the local policy ordering/freshness profile before promising
remote revocation." This is deliberately narrow: it is not K2's full authority/consent contract
(authority-and-actions.md owns that), only the ordering precondition K0/K1 must not violate by
implication.

**Decision LP-1.** Any policy check the Kernel performs against **local, already-accepted, in-process
state** (e.g. "is this Execution's current epoch still current," "is this Activation ID still the live
one") is synchronous and immediately consistent with the last accepted write — there is no eventual-
consistency window for these checks, because they read the same store the acceptance algorithm just
wrote to.

**Decision LP-2.** Any policy check that depends on **external/remote state** (a revoked grant, an
updated allow-list served by another system) is *not* assumed instantaneously fresh merely because the
call to check it looks synchronous. K0/K1 makes no remote-revocation latency promise at all — it is
K2's authority-and-actions.md that must state the actual freshness contract when Effects exist to
revoke. K0.1's decision is only the negative one: nothing in K0/K1 may be built or documented in a way
that implies remote revocation is instantaneous, because K1 has no remote-mediated action to revoke
in the first place (§8).

**Decision LP-3.** Ordinary corrective input (a user or caller sending a new message) never itself
withdraws or invalidates an already-accepted Outcome, Effect intent, or admission — restates kernel.md's
"Ordinary correction input cannot itself withdraw an action" rule as a K0/K1-observable constraint:
even before K2's Effects exist, K1's Outcome-acceptance algorithm (§7) must not be built so that a
later, unrelated Event can retroactively alter an already-accepted Outcome's meaning. Explicit
withdrawal is its own K2-scoped mechanism (action-lifecycle.md), not implied by mere new input.

---

## 11. 001 K0 boundary → assertion map

Every boundary 001's K0 section names, mapped to the decisions above and to an observable pass/fail
assertion. "Owner" states which of Kernel / Runtime-Driver / deployment is accountable, per AGENTS.md's
boundary rule. This table is the direct answer to K0.1-C1.

| # | 001 K0 boundary | Owner | Decisions | Observable assertion |
|---|---|---|---|---|
| 1 | Creation/input ingress accepted IDs/receipts | Kernel | ID-1, ID-2, ID-6, ID-7 | A create request replayed with the same request key returns the same Execution ID and receipt; a create with the same key but different content is rejected as a conflict, never silently accepted as an edit. |
| 2 | Activation dispatch intent | Kernel | ID-3, ID-4, B-1, B-2 | Two dispatches for the same Execution never carry the same Activation ID; a dispatch pins one finite, enumerable Event batch that a later Outcome can be checked against exactly. |
| 3 | Outcome acceptance; duplicate/conflicting Outcome behavior | Kernel | OA-1–OA-6, ID-6 | Exact duplicate submission returns the original receipt with no re-dispatch of anything; a same-identity/different-content submission is rejected, not merged; a failure partway through acceptance leaves zero partial state (no progress, no Effect intent, no acknowledgment). |
| 4 | Effect intents (admission boundary) | Kernel | EF-1, EF-2 | An Outcome proposing an Effect during K1 is rejected with a recorded, inspectable reason; the rest of that Outcome is also rejected (whole-envelope, per OA-3), not silently split. |
| 5 | Any-of wait correlation; wait-generation identity; eligible batch accounting | Kernel | W-1–W-5, B-1–B-4 | A wait registered against a finite dependency set atomically observes any already-accepted matching Event (no lost wake); a timer/settlement naming a superseded generation is a no-op against the current wait. |
| 6 | Wake / Event acceptance during computation | Kernel | B-2, B-4, W-2 | An Event accepted while an Activation is in flight does not alter that Activation's already-pinned batch; it is visible to the next eligible batch. |
| 7 | Cancellation ordering | Kernel | CX-1, CX-2, CX-5 | A cancellation accepted before an in-flight Activation's Outcome is accepted wins: that Outcome's `complete`/`fail`/`continue` is discarded and the Execution is `CANCELLED`; a completion accepted first wins the opposite race, and neither race can be re-run by resubmitting either side. |
| 8 | Terminal obligations; completion responsibility | Kernel | CX-3, CX-4, B-5 | `complete` is rejected outright if unresolved owned work is not accounted for in the current or a previously acknowledged batch; a terminal Execution still exposes recorded disposition for any Event that was queued but never acknowledged. |
| 9 | Checkpoint forms; progress compatibility | Kernel + Runtime/Driver | PC-1–PC-5 | Resuming against unavailable compatible code/resources yields an explicit hold/refusal result, never a state that looks like normal restored computation. |
| 10 | Local policy ordering/freshness profile | Kernel | LP-1–LP-3 | A policy check against just-accepted local state reads that exact write with no staleness window; no K0/K1 document or test asserts an instantaneous remote-revocation guarantee. |

**Decision M-1 (E0's unsafe/lost-state controls, per 001's exit clause).** K0.2, not K0.1, builds the
actual fixture, but K0.1 fixes which controls that fixture must exercise, directly off this table:
row 3's duplicate/conflicting-Outcome case, row 5's stale-timer/lost-wake case, row 7's cancel-vs-
complete race, and row 9's missing-checkpoint-code case are the four **unsafe/state-loss controls**
K0.2's fixture must include as negative tests, matching execution-protocol.md's "Acceptance examples
for K0–K4" enumeration.

---

## 12. Legacy data classification: migratable / legacy-only / refused

Every current 0.8.x persisted record type the K0/K1 boundary touches, classified per 001's K0
requirement. "Current" = base commit `6464be1`, package `packages/core`. This is not an exhaustive
inventory of every field in the codebase — it covers exactly the record types the boundary table in
§11 depends on.

| ID | Record / field (current file:line) | Classification | Reasoning |
|---|---|---|---|
| MIG-1 | Cancellation-request ordering in `Harness.activate`/`applyOutcome` (`packages/core/src/runtime/harness.ts:747-757`, `:953-965`) | **Migratable** | The *rule* (check pending cancellation before dispatch, and again before committing the controller's reported next state) already matches CX-1/CX-2. The concrete `CancellationRequest` record shape can carry forward into K1's store as-is or with trivial renaming; no behavioral change is needed to satisfy §6. |
| MIG-2 | `LifecycleState` transition table (`packages/core/src/execution/lifecycle.ts:46-54`) | **Migratable** | A pure, store-independent function already enforcing "terminal states have no outgoing edges" and "only `RUNNING` reaches `COMPLETED`/`FAILED`." This is exactly the target invariant (kernel.md's lifecycle diagram) and needs no semantic change, only confirmation it stays store-independent in K1. |
| MIG-3 | `ControllerProgress` / `ExecutionContext.control` (`packages/core/src/execution/context.ts:57-63`) | **Migratable** | Matches PC-1 form (a) exactly: opaque, Kernel-stored-and-returned-unchanged, tagged by kind so a restart can tell which controller understands it. No format change needed for K1; K2+ only needs to add the codec/version pin required by PC-4 if it is not already implicit in the tagged shape. |
| MIG-4 | `revision` counter (`packages/core/src/execution/context.ts:220`, incremented in `transitionContext`/`withControllerProgress`) | **Migratable** | Directly usable as the "base progress revision" kernel.md's Activation/Outcome shape requires, and already satisfies "every persisted change increments it exactly once." |
| MIG-5 | `ExecutionWait` `event` arm (`packages/core/src/execution/context.ts:103`, `eventWait`) | **Migratable** | A Kernel-visible Event dependency with an optional declarative `interleave` condition is exactly what W-1/W-5 need; no live process-local reference is involved. |
| LEG-1 | `ExecutionWait` `controller_resumption` / `dependencies` arms naming `ControllerResumptionId` (`packages/core/src/execution/context.ts:104-130`); the port's own admission that the underlying work is ephemeral, `packages/core/src/ports/controller-resumption.ts:40-41` ("Work registered by an Activation that does not return the matching wait is abandoned and can never wake the Execution") and `:61-62` (`ControllerResumptionWork` is documented "Never persisted, never inspected, never re-created by the runtime"); and the processor's own comparison against `EffectProcessor`, `packages/core/src/runtime/resumption-processor.ts:1-56` (header), specifically `:10-16` ("has a public settlement ingress / has none, deliberately") and `:53-55` ("A registration the controller never waited on is abandoned: the promise keeps running to completion, its result is discarded, and no record ever names it") | **Legacy-only** | This is exactly F09's finding: the *durable record* (`ControllerResumptionId`, its state) is Kernel-persisted, but the actual work it names is an in-process `Promise`/thunk that is, by the port's own contract, never persisted and cannot be reconstructed after a process death. Per 001's K1 section ("Remove controller resumptions and closed Agent/Workflow progress discriminators from the new Kernel protocol") and 003's F09 disposition ("remove resumptions from the new Kernel contract; retain legacy machinery only inside a compatibility Runtime... Kernel never persists model thunks or promises"), this whole mechanism does not migrate into the K1 Kernel protocol. Its *useful behavior* — a controller doing slow local work and reporting a dependency on it — must be re-expressed in K1 as Runtime-private bookkeeping that never becomes a Kernel-persisted identity, or (if it must survive process death) as a real Effect once K2 exists. It may continue to exist unchanged **inside** a compatibility Runtime (K1.4's "bridge existing controllers... keep its live-promise resumption private", 001 K1) — legacy-only means "not part of the new Kernel contract," not "delete the file." |
| LEG-2 | `Harness.activate`'s mailbox consumption before `RUNNING`/before controller output exists (`packages/core/src/runtime/harness.ts:762`, `tx.mailboxes.consume(...)` inside the same transaction that writes `RUNNING`, prior to `runController` ever being called) | **Legacy-only** | This is F07: the current code treats "consumed from the mailbox" as equivalent to the target's "reserved in Activation," but does so as an unconditional side effect of claiming the Activation, not as part of accepting the resulting Outcome. It works today only because the same process usually completes the Activation soon after; it does not by itself satisfy B-3 (whole-batch acknowledgment tied to *Outcome acceptance*, not to dispatch). The *behavior* — Events selected at dispatch time become "reserved," `activate`, `harness.ts:762` — can inform K1.1's design, but the exact current transaction boundary does not migrate unchanged: K1 must tie acknowledgment to accepted Outcome, not to the earlier consume-on-claim step, to satisfy OA-3/OA-4 and B-3 together (also connects to REF-1 below). |
| REF-1 | Effect dispatch happening in `applyOutcome` (`packages/core/src/runtime/harness.ts:890-911`, `this.effects.processActivationEffects(...)`) *before* the progress-committing transaction (`harness.ts:938` onward, `this.options.store.transact(...)`) | **Refused** | This is F10 exactly: Effects are processed and can partially fail *before* the transaction that commits next-state/progress/acknowledgment. The in-code comment at `harness.ts:904-906` ("nothing partial was committed") is not true of the whole boundary — it is true only of the effect-dispatch call itself, not of the composite operation. This ordering is refused for the target K1/K2 boundary: OA-3/OA-4 require Effect *intents* to be part of the same atomic commit as progress, with actual dispatch/settlement happening afterward from the accepted record (kernel.md's Acceptance/atomicity table, "Effect admission" row: "Not implied: External success"). Note this is explicitly a K2 boundary (Effects don't exist in K1 at all, §8) — it is listed here because the current code's *ordering pattern* (side-effect-before-commit) must not be carried forward into K1's non-Effect Outcome-acceptance path either; K1.2 must commit progress/emissions/next-state atomically with nothing "processed" beforehand outside that transaction. |
| REF-2 | `InMemoryRuntimeStore.transact` (`packages/core/src/reference/in-memory-runtime-store.ts:455-468`): the scope parameter is named `_scope: ExecutionId` (leading underscore — declared but unused) and every transaction does `const draft = structuredClone(this.state)` (`:457`) against the *entire* store's `RuntimeState`, then installs the whole draft back (`:459`) after serializing all transactions through one `queue` (`:453,462-466`) | **Refused as a K1+ mechanism; retained only as a reference/testing store** | This is F13 exactly: the store accepts a scope argument and then ignores it, cloning and single-queuing the whole aggregate on every transaction rather than isolating by Execution. It works for an in-memory reference implementation and conformance tests, but "clone the whole aggregate and serialize all transactions globally" is not the scoped, concurrently-progressing contract the target requires (mental-model.md: "Unrelated Executions can compute concurrently"; kernel.md's "Child/message operation" row). K3's persistent profile explicitly must not inherit it (003's F13 disposition: "measure actual cost and choose bounded persistent mechanism"). K0.1 does not need this store to change — K1 may keep using it as its in-memory reference for single-Execution conformance tests — but no K0.1/K1 assertion may depend on "the store happens to globally serialize and deep-clone everything" as a substitute for a real per-Execution scope/concurrency contract; that would silently reintroduce global serialization as if it were the target mechanism. |
| REF-3 | `ExecutionWait`'s `dependencies` arm as currently defined (`packages/core/src/execution/context.ts:126-130`) treated as a **general Kernel wait primitive** | **Refused in that framing; the Event half is migratable (MIG-5), the `resumptions` half inherits LEG-1's classification** | The shape correctly keeps `event` and `resumptions` distinct (W-1), which is worth keeping structurally, but a K1 Kernel wait record must not itself carry a list of `ControllerResumptionId`s as a first-class Kernel dependency type, since those ids name LEG-1 material. If a Runtime needs "wait for any of several local jobs plus one Event" behavior in the target design, that union must be assembled Runtime-side (accumulated in opaque `control` progress, MIG-3) with only the `event` half surfacing as a real `waitingFor` registration — restating kernel.md's "a Runtime can implement an all-of join by retaining observed results in progress and waiting for the remaining set" — the same accumulation-in-progress pattern applies to this any-of union. |

**Decision LC-1 (no legacy record is deleted by this packet).** Every classification above describes
what the **new K1 Kernel contract** may depend on; it is not an instruction to remove any file. `LEG-1`
material specifically is expected to keep working, unchanged, as private machinery inside the K1.4
compatibility Runtime (001 K0's own instruction: "Bridge existing controllers inside a compatibility
Runtime where feasible; keep its live-promise resumption private").

---

## 13. Contradictions found and how resolved

Per K0.1-C5, explicit call-outs rather than silent resolution:

- **Contradiction:** `harness.ts`'s own code comment ("nothing partial was committed") versus the
  actual multi-step, non-atomic sequence in `applyOutcome` (REF-1). **Resolution:** the canonical
  contract (kernel.md's Acceptance/atomicity table) wins; the comment is inaccurate about the current
  code's actual atomicity, not evidence the target requirement is already met. This is recorded as a
  finding (F10) in 003, not invented by this worksheet.
- **Contradiction:** the current `ExecutionWait.dependencies` arm reads, at first glance, like exactly
  the Kernel-owned "finite any-of set" W-1 asks for — but it names `ControllerResumptionId`s, which
  §12 classifies legacy-only. **Resolution:** W-1's requirement (a finite, Kernel-visible dependency
  set) is satisfied by the *shape*, not by this specific field's current referent; K1 must re-anchor
  the "local work" half of that union to something that is not a Kernel-persisted live-promise
  reference (REF-3), even though the union *pattern* is worth keeping.
- **No contradiction found** between kernel.md/detail-design and 001/005/003 on any of §1–§10's
  decisions; each decision restates or narrowly resolves an explicitly-flagged open item (004's "Open
  questions and decision points" section, K0/K1 bullet), not a dispute between canonical sources.

---

## 14. Explicitly out of scope (left to K1 and later)

- Exact wire codec, database schema, or scheduler implementation (001 K0 exit: "Keep the wire codec/
  store layout replaceable"; repeated at every "Left open" note above).
- Effect admission/settlement mechanics, schema validation, consent binding (K2; §8 only fixes that
  K1 must *refuse*, not implement, Effects).
- Native Driver-specific submit/reattach mechanics (R1).
- Persistent substrate choice and real process-kill proof (K3).
- Child/message/human-response durability (K4).
- Retention windows, operating limits (K5).
- Physical isolation (D1).
- Packaging/release (S1).
- future-plan Q3 (detached/supervisory services): confirmed non-blocking for K0.1 per 010's
  assessment ("No unresolved architecture decision blocks starting K0.1"); not answered here.

---

## Revision history

- **Revision 1** (this document): initial worksheet produced by packet K0.1.
