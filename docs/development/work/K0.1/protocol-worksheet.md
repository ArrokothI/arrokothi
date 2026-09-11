# K0.1 protocol worksheet — equality, receipts, batches, clocks, cancellation, progress, policy

**Revision:** 2 — corrects revision 1 per an independent review (CHANGES REQUIRED); see
[review-01.md](review-01.md) and [implementation-02.md](implementation-02.md) for the findings and
disposition. **Status:** produced by packet K0.1, awaiting independent review of this revision per
[006](../../006-development-process.md). **Owner of this document:** Kernel, except where a row is
explicitly marked Runtime/Driver or deployment.

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

**Decision E-6 (bounded values — semantic limits stated with units, corrected in review round 1;
[K01-REV-04](implementation-02.md)).** Every boundary value has a declared, finite bound, stated here
at the semantic level so a K1 fixture can construct an exact pass/fail boundary case without waiting
for a wire codec:

| Bound | Unit / what is counted | K0.1 limit |
|---|---|---|
| String field length | Unicode scalar values (code points), not UTF-16 code units or wire bytes — avoids surrogate-pair/byte-encoding ambiguity | ≤ 65,536 per individual string field |
| Array/object entry count | direct children of one array or one object (not a recursive total across the whole value) | ≤ 4,096 entries |
| Container nesting depth | number of array/object boundaries from the value's root to its deepest scalar, inclusive of the root | ≤ 32 levels |
| Canonical envelope size | UTF-8 byte length of the value in its canonicalized form (E-3: sorted keys, no insignificant whitespace) — this is a semantic size bound, not a claim about the actual wire encoding's byte count | ≤ 1,048,576 bytes (1 MiB) |

An over-limit value is rejected at the same "malformed envelope" boundary as a structurally invalid
one (§7), not truncated silently. The canonical-envelope-size bound is also E-6's operative definition
of "large" for the payload-reference rule below: large payloads (checkpoints, artifacts) never travel
as inline boundary values; they travel as application-owned references per kernel.md's Activation/
Outcome shape ("large payloads use application-owned references") once they would exceed it.

These four numbers are K0.1's semantic decision — a K1 fixture tests exactly at and one past each
bound — not placeholders; they are revisable only through an explicit versioned amendment to this
worksheet (recovery-and-compatibility.md's compatibility-dimensions table: "Protocol/codec | Supported
envelope fields and equality rules; refuse unknown required semantics"), the same way any other
protocol/codec compatibility dimension changes. What stays implementation-owned is different in kind,
not degree: **the wire encoding that carries these same semantic values** (JSON text vs. a binary
envelope codec) and **the canonicalization algorithm's concrete implementation** (any sort that is
total and deterministic over the value's keys satisfies E-3) — those may vary by transport/storage
choice without touching the four numbers above, because the numbers bound the *logical* value, not
its bytes on a particular wire.

**Left open (implementation-owned):** exact wire encoding, and the canonicalization algorithm's
concrete implementation (both distinguished from the four semantic limits above, which are decided,
not open).

---

## 2. Identities and scoped receipts

Restates and pins [execution-protocol.md](../../../detail-design/execution-protocol.md#identities-and-immutable-exchanges)'s
identity table as binding decisions, with the "must not be used as" column treated as a refusal rule
an implementation must actively enforce, not merely avoid by convention:

| Identity | Scope | K0.1 decision |
|---|---|---|
| Execution ID | one logical lifetime, never reused after terminal deletion | **ID-1**: an Execution ID is never reissued to a new logical Execution even after the original is deleted/GC'd. A store that recycles primary keys must remap through a separate never-reused logical ID. |
| Input ID | authenticated producer namespace + destination + producer request key | **ID-2**: input identity is a triple (producer principal/namespace, destination Execution ID, producer-supplied request key), not a bare string. Two different producers may legitimately reuse the same request-key text without colliding. |
| Activation ID | one exchange against a pinned accepted progress revision + Event batch | **ID-3** (corrected in K0.1 review round 1 — see [implementation-02.md](implementation-02.md), K01-REV-01): an Activation ID identifies **one immutable semantic exchange** — its pinned accepted progress revision, Event batch and input — for as long as that exchange remains unresolved. Ordinary Driver redelivery of the same dispatch preserves **both** the Activation ID **and** the writer epoch: it is not a new attempt. An authorized takeover (recovery has decided the prior attempt may no longer commit) preserves the **same** Activation ID and the **same** immutable exchange input — it does not invent new mailbox content under it — but **advances the writer epoch**: this is a new attempt at the same exchange, not a new exchange. A **new** Activation ID is minted only when a genuinely new semantic exchange begins, i.e. after the preceding exchange is resolved (an Outcome was accepted for it, or the Execution reached a terminal state) and a fresh dispatch is created. Restates [execution-protocol.md](../../../detail-design/execution-protocol.md#identities-and-immutable-exchanges)'s "A takeover changes only the attempt envelope/epoch after recovery permission has been established; it cannot replace input with new mailbox content under the old Activation ID" precisely: the Activation ID does *not* change on takeover, only the epoch does. |
| Writer epoch | current attempt allowed to submit progress for that exchange | **ID-4**: the epoch is a monotonically increasing integer (or equivalent total order), bumped only by an authenticated takeover decision — including a takeover **within** the current unresolved Activation ID/exchange (ID-3) — never by ordinary retry of the same attempt. Whether the counter is reset or continues across a later, genuinely new Activation ID is an implementation choice (see this section's "Left open" note); either satisfies ID-3/ID-4 as long as a stale epoch for the *current* exchange is always rejected. |
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

**Decision ID-9 (Activation-identity counterexamples, added in review round 1).** Deterministic
schedules ID-3/ID-4 must satisfy, coherent with the duplicate/conflicting-Outcome rules in §7 and the
stale-writer rule kernel.md states directly ("An epoch is not a credential and host liveness is not
proof of ownership; authenticated ingress and the authoritative store decide"):

1. **Ordinary redelivery.** The Driver resends the same dispatch (network retry, no takeover decided).
   Same Activation ID, same writer epoch. The Kernel treats it as the identical in-flight exchange —
   an Outcome later submitted for it is evaluated normally; no stale-writer rejection applies merely
   because delivery repeated.
2. **Lost-host takeover.** The scheduler/lease layer decides the original host may no longer commit
   (§4's scheduler-lease clock, not the wait/Execution deadlines) and authorizes a replacement attempt.
   Same Activation ID, same pinned input — the writer epoch advances. The replacement attempt may now
   submit an Outcome for that Activation ID at the new epoch.
3. **Stale old-epoch Outcome after takeover.** The original (now-superseded) host later submits an
   Outcome for that same Activation ID at its old epoch. It is rejected as a stale-writer conflict
   (OA-3/OA-5) *because the epoch no longer matches*, not because the Activation ID is wrong — the
   Activation ID is still correct; only that writer's authority to commit under it has lapsed. This is
   the case ID-3/ID-4's earlier (round-1) drafting got backwards by minting a new Activation ID on
   takeover instead of advancing the epoch under the same one.
4. **Next semantic Activation.** The prior exchange resolves (an Outcome is accepted, e.g. `continue`
   or a satisfied wait) and the Kernel dispatches again. This dispatch — pinning the newly accepted
   progress revision and a new Event batch — gets a **new** Activation ID. An Outcome submitted against
   the old Activation ID is now stale for a different reason (superseded exchange, not superseded
   epoch) and is rejected the same way: no partial acceptance, no silent revival of the old exchange.

**Left open (implementation-owned):** exact receipt serialization (opaque token vs. structured
tuple), exact epoch representation (integer vs. fencing token), exact request-key hashing.

---

## 3. Eligible batches and input accounting

**Decision B-1 (batch is a set, not a cursor).** The batch an Activation is dispatched with is an
explicit, finite, enumerable set of Event references pinned at dispatch time — not "everything after
global position N." This directly fixes F20 (a single cursor can silently acknowledge unmatched
input): per-entry disposition, not a monotonic cursor, is the required representation.

**Decision B-2 (selection rule by lifecycle; corrected in review round 1 — [K01-REV-02](implementation-02.md)).**
- While `READY`: select a bounded batch (implementation-owned max size) from all currently
  unacknowledged Events, in acceptance order.
- While `WAITING`: select only Events eligible under the currently registered wait's `wake` condition
  and, if present, its declarative `interleave` condition (§5) — both are conditions over **Kernel
  Events only**. An eligible match is included ahead of any unrelated backlog, but unrelated backlog is
  not force-included merely because it is old. §5 fixes that a K1 `waitingFor` registration never names
  Runtime-local work as a thing this selection rule can be "eligible under" — there is only the
  Event-based condition.

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

**Decision W-3 (wait-generation identity is scoped to wait-*created artifacts*, corrected in review
round 1 — [K01-REV-02](implementation-02.md)).** Every `waitingFor` registration has its own generation
identity, distinct from the Execution ID and from the Activation ID that created it. **Generation
fencing applies to artifacts the wait registration itself created for its own bookkeeping — concretely,
a timer scheduled against that specific registration.** A timer naming a generation that has since been
replaced (the Execution moved on to a new wait, or resolved and re-entered `WAITING` on a different
dependency) is a no-op, never a wake of the current wait: this is exactly kernel.md's "stale timers
cannot wake a replacement wait." **Generation fencing does *not* apply to authenticated Kernel Events.**
An accepted result/settlement Event is a durable mailbox fact the instant it is accepted, independent
of which wait generation happened to be live at that moment (execution-protocol.md's atomic-mailbox-
check applies at *whatever* wait is current when the check runs, per W-2) — it is never discarded or
treated as belonging to an obsolete generation merely because an intervening wait replaced the one that
was active when the Event arrived. Round 1 wrongly generalized generation-fencing from "stale timers"
to "a timer or a late settlement," which would have let a currently-registered, explicitly correlated
wait miss an Event it should be able to observe (see W-6's counterexamples 3–4).

**Decision W-4 (the target Kernel `waitingFor` record has no Runtime-local-work arm at all;
corrected in review round 1 — replaces round 1's W-4 entirely).** Round 1 proposed keeping the current
three-armed `ExecutionWait` union's *shape* — `event` / a Runtime-local-work arm / `dependencies` — and
reclassifying only what occupies the local-work arm. That framing is wrong and is withdrawn: the
target Kernel wait record is defined **only** in terms of a finite, enumerable set of correlated
**Kernel Events**, with an optional explicit input subscription (kernel.md's Events-and-waits section:
"Start with a wait on any of a finite set of correlated Events... An explicit input subscription can
allow corrections/peer questions while waiting"). There is no second arm for "Runtime-local work" in
this record at all — not a Kernel-visible one, not a legacy-classified one, not a placeholder. Runtime-
local promises/jobs that have not crossed a Kernel dependency boundary (i.e. were never proposed as a
Kernel-mediated Effect) are **entirely Runtime/Driver-private**: the Kernel never learns their identity
and never fences a wait generation against them, because no `waitingFor` registration is created for
them in the first place.

The consequence for an Activation whose only outstanding work is such local work: it simply **does not
yet submit an Outcome**. From the Kernel's side that Activation remains `RUNNING` — "an Activation
remains unresolved, not that a process is currently making progress" (mental-model.md) — because
"Dispatch does not synchronously await native work in the coordinator loop. The Driver eventually
submits an Outcome" (kernel.md). There is no third lifecycle state and no Kernel-visible dependency
record for this case; it is exactly the same `RUNNING`-is-unresolved concept K3/recovery already uses
for a lost/slow attempt, applied here to an attempt that is merely slow rather than lost.

This is why the current `ExecutionWait` `controller_resumption`/`dependencies` arms and the backing
`ControllerResumption` record (§12, `LEG-1`) do not inform the target wait record's *shape* at all —
not even as a withdrawn/legacy-labeled arm. They may continue to exist, privately and unchanged, as
K1.4 compatibility-Runtime-internal bookkeeping that a legacy controller bridge uses to decide when it
has enough to finally produce an Outcome — but nothing about that bookkeeping is reflected in, or
constrains the shape of, the new Kernel `waitingFor` record.

**Decision W-5 (interleave is a declarative condition over Events, Runtime-declared, not
Kernel-inferred).** An `interleave` condition, where present, is a second, separate `WakeCondition`
over Kernel Events (`packages/core/src/interaction/event-envelope.ts:74-80`) — declarative data
supplied by the Runtime's Outcome, evaluated by the Kernel exactly like the primary wake condition. It
is not a per-arm concept tied to a Runtime-local-work case (there is no such case per W-4): both the
primary `wake` and the optional `interleave` name only Kernel Events. The Kernel never infers on its
own that some Event is "probably safe to interleave."

**Decision W-6 (deterministic counterexamples, added in review round 1).**

1. **Local work alone creates no `WAITING`.** A controller has only Runtime-local (native/model)
   work outstanding and no Kernel-visible dependency to report. Its Activation stays unresolved
   (`RUNNING`); the Kernel never creates a `waitingFor` record, and no wait generation is ever
   allocated for it. Only once the Runtime produces an actual Outcome (`continue`, `await_event`,
   `complete`, or `fail`) does the Kernel see anything.
2. **Stale timer G1 cannot wake G2.** A wait is registered with generation G1 and a persisted timer.
   Before G1's deadline, the wait resolves and the Execution re-enters `WAITING` on a different
   dependency under generation G2. G1's timer later fires; it is a no-op against G2 (W-3).
3. **Timeout/replacement, then a late result, retains the result.** G1 times out (or is replaced by
   G2 as in case 2) and *afterward* an authenticated result Event correlated to G1's original
   dependency is accepted. That Event is retained as a durable mailbox fact (kernel.md: "Wait timeout
   versus action success: preserve both facts") — it is not deleted or invalidated merely because the
   wait that originally asked for it moved on.
4. **A later, explicitly correlated wait can consume an already-accepted eligible result.** Continuing
   case 3: if the Execution's *current* wait (G2, or a still-later G3) explicitly correlates to that
   already-accepted Event (same correlation ID/kind), the atomic mailbox check at that wait's
   registration (W-2) finds and consumes it — generation fencing (W-3) never blocks this, because the
   Event itself was never generation-scoped; only the now-superseded G1 timer was.

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
Effect during K1 must be **explicitly refused**, never silently accepted-and-ignored and never
silently stripped from an otherwise-accepted Outcome. Silently dropping a proposed Effect while
accepting the rest of the Outcome would let a controller believe it requested external work that
nothing recorded.

**Decision EF-2 (corrected in review round 1 — [K01-REV-04](implementation-02.md): K1's refusal is
envelope validation, not an admission decision).** Round 1 called K1's refusal "a placeholder rejection
*at the Effect-admission boundary*." That is wrong and is withdrawn: **there is no Effect-admission
boundary in K1 at all**, because admission (kernel.md's Acceptance/atomicity table) is something that
happens to an *already-accepted immutable Effect intent* — and in K1 no Effect intent is ever created,
because the whole Outcome containing it is rejected one step earlier, during whole-envelope validation
(§7, OA-3), precisely because K1's schema does not yet recognize Effect proposals as an acceptable
Outcome field. Concretely: an Outcome proposing an Effect fails OA-3's "valid next step"/structural
check before step 4 (OA-4's atomic commit) ever runs, so no Effect ID is minted, no proposal key is
bound, and nothing exists for a later admission decision to apply to. This is the same "envelope/
reference errors reject the entire proposal" path kernel.md already describes for any other malformed
Outcome field — proposing an Effect in K1 is treated as exactly that kind of malformed field, not as a
new kind of boundary event. The Effect-admission and Effect-settlement boundaries kernel.md's table
names remain real, but they are **K2-introduced** boundaries that do not exist yet, not boundaries K1
visits and declines.

**Decision EF-3 (naming the four action dimensions at K0 level, without deciding their mechanics —
added in review round 1, [K01-REV-04](implementation-02.md)).**
[action-lifecycle.md](../../../detail-design/action-lifecycle.md#one-request-several-kinds-of-fact)
already owns four distinct dimensions of an accepted action and warns against compressing them into
one ambiguous `status`:

| Dimension | Facts to distinguish (action-lifecycle.md's own wording) |
|---|---|
| Request disposition | Proposed/accepted; waiting for consent; eligible; denied/refused/declined/expired/withdrawn; no further attempts |
| Attempt evidence | No attempt admitted; admitted and may have run; observed success; definite failure; unknown |
| Result contract | Validated value; invalid/missing value; partial evidence |
| Responsibility | Still required by Execution; transferred to a named durable owner; deliberately abandoned under policy |

K0.1 does **not** decide how K2 represents or transitions these — that remains K2's admission/
settlement contract, unchanged as a non-goal here. What K0.1 fixes at the conceptual level, so K1's
design does not quietly foreclose them, is only this: **nothing in K1's Outcome-acceptance algorithm
(§7) may conflate these four dimensions into a single accepted/rejected boolean once Effects exist**,
and K1 itself produces none of these four facts (§8 has no Effects yet) — so K0/K1 correctly has
*nothing* to say about their mechanics, only an obligation not to build a boundary shape in K1 that
would make representing all four impossible in K2.

**Decision EF-4 (K0-level negative cases, named from action-lifecycle.md, not newly decided —
added in review round 1).** These restate action-lifecycle.md's own text; K0.1 does not implement or
test them (K2 does) — it records them so K1's Outcome/envelope boundary is not accidentally built in a
way that would contradict them later:

- Denial/refusal of an action **without a physical attempt** is not evidence of external failure —
  "Waiting for consent consumes no physical attempt" and a denial can happen before any attempt exists
  (action-lifecycle.md).
- Work that was **admitted but not yet confirmed one way or the other** is `unknown`, not a guess at
  success or failure — "Until proved otherwise, a lost admitted attempt may have executed"
  (action-lifecycle.md).
- An acknowledged `unknown` Event does **not** discharge the Execution's completion obligation for
  that work — restates action-lifecycle.md's "Evidence revisions and reconciliation" section directly.
- An operator or Runtime **choosing to stop retrying** is a responsibility/disposition decision, not
  proof that the external action failed — "An operator choosing 'stop trying' changes responsibility/
  disposition, not proof of external failure" (action-lifecycle.md).
- **K1-specific case, actually decided here:** an Outcome containing K1-unsupported Effect content
  causes whole-Outcome refusal at envelope validation (EF-2); it never creates an Effect intent, so
  none of the four dimensions above are ever instantiated for it — there is no "denied" or "unknown"
  action record for a K1-refused Effect, because no action record exists at all.

**Non-decision (explicitly K2-owned, not resolved here):** the concrete mechanics of consent binding
and policy freshness ordering for remote services. §10 addresses only the narrow "local policy
ordering" precondition 001 K0 explicitly asks for before K2 promises remote revocation; it does not
implement K2's admission/settlement contract, and EF-3/EF-4 above name dimensions/cases without
deciding their K2 representation.

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
| 2 | Activation dispatch intent | Kernel | ID-3, ID-4, ID-9, B-1, B-2 | Two *semantically different* dispatches (a new exchange after the prior one resolved) never carry the same Activation ID; a dispatch pins one finite, enumerable Event batch that a later Outcome can be checked against exactly; an authorized takeover of a *still-unresolved* exchange advances the writer epoch under the **same** Activation ID rather than minting a new one (ID-9 cases 2–3). |
| 3 | Outcome acceptance; duplicate/conflicting Outcome behavior | Kernel | OA-1–OA-6, ID-6 | Exact duplicate submission returns the original receipt with no re-dispatch of anything; a same-identity/different-content submission is rejected, not merged; a failure partway through acceptance leaves zero partial state (no progress, no Effect intent, no acknowledgment). |
| 4 | Effect intents | Kernel | EF-1–EF-4 | An Outcome proposing an Effect during K1 is rejected at whole-envelope validation (OA-3) with a recorded, inspectable reason, before any Effect intent, ID or proposal-key binding ever exists; the rest of that Outcome is also rejected, not silently split; this is envelope validation, not a K1 visit to the (K2-introduced) Effect-admission boundary. |
| 5 | Any-of wait correlation; wait-generation identity; eligible batch accounting | Kernel | W-1–W-6, B-1–B-4 | A wait registered against a finite set of correlated Kernel Events atomically observes any already-accepted matching Event (no lost wake); a stale wait-*timer* naming a superseded generation is a no-op against the current wait, but an authenticated result Event is never generation-fenced and remains observable by a later wait that explicitly correlates to it (W-6); an Activation with only Runtime-local work outstanding creates no `waitingFor` record at all and simply stays `RUNNING`. |
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
§11 depends on, **plus every record family review round 1 named as required** (`ExecutionContext.control`
and its `kind` discriminator; `ExecutionWait`; the actual `ControllerResumption` record; the mailbox/
Event delivery representation; lifecycle transitions including `CREATED`; `PendingOperation`;
`CancellationRequest`; the `revision` counter versus the target's progress revision — corrected/
completed in review round 1, [K01-REV-03](implementation-02.md)). A record is **split** into more than
one row below wherever a single migratable/legacy-only/refused label would misrepresent part of it.

| ID | Record / field (current file:line) | Classification | Reasoning |
|---|---|---|---|
| MIG-1 | Cancellation-request ordering in `Harness.activate`/`applyOutcome` (`packages/core/src/runtime/harness.ts:747-757`, `:953-965`), backed by the actual `CancellationRequest` record (`packages/core/src/execution/cancellation-request.ts:26-33`, states `"pending" \| "applied"`) | **Migratable** | The *rule* (check pending cancellation before dispatch, and again before committing the controller's reported next state) already matches CX-1/CX-2. The record's own docstring already states the target-compatible reasoning directly: a `RUNNING` Execution "cannot be interrupted mid-Activation without racing an uncontrolled context mutation, so the request is persisted here instead and the current Activation reaches a safe boundary" (`cancellation-request.ts:5-7`). The two-state shape can carry forward into K1's store as-is; no behavioral change is needed to satisfy §6. |
| MIG-2 | `LifecycleState` transition table (`packages/core/src/execution/lifecycle.ts:46-54`), **excluding** `CREATED` (see `LEG-3` below) | **Migratable** | A pure, store-independent function already enforcing "terminal states have no outgoing edges" and "only `RUNNING` reaches `COMPLETED`/`FAILED`." This is exactly the target invariant (kernel.md's lifecycle diagram) and needs no semantic change for the `READY`/`RUNNING`/`WAITING`/`COMPLETED`/`FAILED`/`CANCELLED` states — only confirmation it stays store-independent in K1, and that `CREATED` is dropped from the state list it operates over. |
| MIG-3 | The **opaque progress payload** pattern: `ControllerProgress.progress: JsonObject`, Kernel-stored-and-returned-unchanged (`packages/core/src/execution/context.ts:57-63`) | **Migratable** | Matches PC-1 form (a) exactly: opaque data the Kernel never interprets. No format change needed for K1 beyond adding the codec/version pin PC-4 requires (see `LEG-4` immediately below for what does *not* migrate as-is). |
| MIG-4 | `revision` counter (`packages/core/src/execution/context.ts:220`) — **corrected in review round 1** ([K01-REV-03](implementation-02.md)): previously classified plainly "Migratable ... directly usable as the base progress revision," which is wrong | **Migratable as an optimistic-concurrency mechanism; NOT equivalent to the target's semantic `base_progress_revision` without redefinition** | The current field bumps on *every* persisted context change, including pure lifecycle bookkeeping that has nothing to do with an accepted Outcome's progress content: `Harness.activate` bumps it at dispatch-claim (`READY`→`RUNNING`, `harness.ts:759`, `transitionContext(context, "RUNNING", startedAt)`) and again for a pre-Activation cancellation (`harness.ts:751`, `transitionContext(context, "CANCELLED", ...)`) — neither is an Outcome being accepted. `execution/resumption.ts`'s own docstring admits exactly this conflation in its own words: "`observedRevision` records the `ExecutionContext.revision` the suspending Activation read... the runtime deliberately does **not** use a naive `current.revision !== observedRevision` equality to detect staleness: `ExecutionContext.revision` also advances for ordinary lifecycle bookkeeping (`READY -> RUNNING`, `RUNNING -> WAITING`, `WAITING -> READY`), so that comparison would classify a normal suspension as an intervening semantic mutation" (`packages/core/src/execution/resumption.ts:23-27`). kernel.md's Activation/Outcome shape needs a `base_progress_revision` that identifies *the progress an Activation was dispatched against* and advances only when an accepted Outcome installs new progress (execution-protocol.md's Outcome-acceptance algorithm step 4: "install opaque progress and its revision"). K1 may reuse a monotonic-counter *mechanism* like this one, but must not assume the *existing field*, unmodified, already carries that exact semantic — either define a separate progress-specific revision, or prove (not merely assert) that every non-progress bump this field currently takes is harmless to the target's staleness check, the way `resumption.ts` already had to prove it for its own unrelated purpose. |
| MIG-5 | `ExecutionWait` `event` arm (`packages/core/src/execution/context.ts:103`, `eventWait`), and the `WakeCondition` it carries (`packages/core/src/interaction/event-envelope.ts:74-80`) | **Migratable** | A Kernel-visible Event dependency (`eventKinds`, `correlationId`) with an optional declarative `interleave` condition is exactly what W-1/W-5 need; no live process-local reference is involved, and matching is already declarative data, not a callback (`event-envelope.ts:66-72`'s own docstring: "a wake condition must stay declarative, serializable runtime data, not a callback or a query language"). |
| LEG-1 | The actual `ControllerResumption` record (`packages/core/src/execution/resumption.ts:72-101`) and the `ExecutionWait` `controller_resumption`/`dependencies` arms that name its ID (`packages/core/src/execution/context.ts:104-130`); the port's own admission that the underlying work is ephemeral, `packages/core/src/ports/controller-resumption.ts:40-41` ("Work registered by an Activation that does not return the matching wait is abandoned and can never wake the Execution") and `:61-62` (`ControllerResumptionWork` is documented "Never persisted, never inspected, never re-created by the runtime"); and the processor's own comparison against `EffectProcessor`, `packages/core/src/runtime/resumption-processor.ts:1-56` (header), specifically `:10-16` ("has a public settlement ingress / has none, deliberately") | **Legacy-only — corrected framing in review round 1** ([K01-REV-02](implementation-02.md)) | This is exactly F09's finding: the *durable record* (`ControllerResumptionId`, its state, its `observedRevision` provenance field) is Kernel-persisted, but the actual work it names is an in-process `Promise`/thunk that is, by the port's own contract, never persisted and cannot be reconstructed after a process death. Per 001's K1 section ("Remove controller resumptions and closed Agent/Workflow progress discriminators from the new Kernel protocol") and 003's F09 disposition, this whole mechanism does not migrate into the K1 Kernel protocol. **Correction:** round 1 said this record's *shape* (a Kernel-visible "local work" wait arm) was worth preserving with only its referent reclassified. That is withdrawn (§5, W-4): the target Kernel `waitingFor` record has **no** arm analogous to this at all, Kernel-visible or otherwise — this record and its `ExecutionWait` arms are legacy-only in the stronger sense that *neither the data nor the shape* informs the new Kernel wait protocol. It may continue to exist unchanged **inside** a compatibility Runtime (K1.4's "bridge existing controllers... keep its live-promise resumption private", 001 K1) as purely Runtime-private bookkeeping — legacy-only means "not part of the new Kernel contract, in data or in shape," not "delete the file." |
| LEG-2 | `Harness.activate`'s mailbox consumption before `RUNNING`/before controller output exists (`packages/core/src/runtime/harness.ts:762`, `tx.mailboxes.consume(...)` inside the same transaction that writes `RUNNING`, prior to `runController` ever being called) | **Legacy-only** | This is F07: the current code treats "consumed from the mailbox" as equivalent to the target's "reserved in Activation," but does so as an unconditional side effect of claiming the Activation, not as part of accepting the resulting Outcome. It does not by itself satisfy B-3 (whole-batch acknowledgment tied to *Outcome acceptance*, not to dispatch). K1 must tie acknowledgment to accepted Outcome, not to the earlier consume-on-claim step, to satisfy OA-3/OA-4 and B-3 together (also connects to `REF-1`/`REF-4`). |
| LEG-3 | The `CREATED` lifecycle state (`packages/core/src/execution/lifecycle.ts:16`, `:24-32` `LIFECYCLE_STATES`/enumeration, `:47` `CREATED: ["READY", "CANCELLED"]`), and `CancellationRequest`'s own docstring naming it as a real current phase: "For a `CREATED`, `READY`, or `WAITING` Execution the runtime transitions straight to `CANCELLED`" (`cancellation-request.ts:4-6`) — **added in review round 1** ([K01-REV-03](implementation-02.md)) | **Legacy-only** | 004's architecture review explicitly retires this as a mandatory Kernel state: its decisions table names the decision "Remove separate CREATED state from target," reasoning "Create, initial input and readiness can be accepted together; partial allocation is an operation attempt." The target lifecycle (kernel.md's diagram) starts directly at `READY` from one atomic `create + initial input` decision (execution-protocol.md's "Identities and immutable exchanges": "Creation binds the Runtime contract and executable definition revision, authority context and initial input in one atomic decision"). Current code's separate, externally observable `CREATED` phase — with its own transition edges and its own cancellation handling — does not migrate as a distinct target phase; K1 folds it into the atomic creation boundary (§11 row 1). The transition-table *pattern* (`MIG-2`) still applies to whatever shorter state list K1 actually uses. |
| LEG-4 | `ControllerProgress`'s closed `kind: "agent" \| "workflow"` discriminator (`packages/core/src/execution/context.ts:57-59`), backed by the closed `DefinitionKind` union (`packages/core/src/definitions/types.ts:22`, `export type DefinitionKind = "agent" \| "workflow";`) — **added in review round 1** ([K01-REV-03](implementation-02.md)) | **Legacy-only** | 004's vocabulary-disposition table explicitly lists "closed Agent/Workflow union" under "Remove from mandatory Kernel model." A two-literal closed union cannot express a third Runtime kind without editing this type, which is exactly the closure 004 rejects as a Kernel concept — the opaque progress payload (`MIG-3`) is fine to keep opaque, but *tagging* it with this specific closed enum is not the target's compatibility mechanism. PC-4 already names the actual target mechanism: "versioned to the exact Runtime/definition contract revision that can understand it" — which `ExecutionContext.definition: ExecutionDefinitionRef` already tracks per Execution, kind-agnostically. K1's generic progress record should identify compatibility through that pinned Runtime/definition revision, not through a hardcoded two-value literal type; a compatibility-Runtime bridge may keep using `"agent"`/`"workflow"` as its own *internal* tag without that tag being part of the new Kernel protocol's progress-compatibility contract. |
| REF-1 | Effect dispatch happening in `applyOutcome` (`packages/core/src/runtime/harness.ts:890-911`, `this.effects.processActivationEffects(...)`) *before* the progress-committing transaction (`harness.ts:938` onward, `this.options.store.transact(...)`) | **Refused** | This is F10 exactly: Effects are processed and can partially fail *before* the transaction that commits next-state/progress/acknowledgment. The in-code comment at `harness.ts:904-906` ("nothing partial was committed") is not true of the whole boundary — it is true only of the effect-dispatch call itself. This ordering is refused for the target K1/K2 boundary: OA-3/OA-4 require Effect *intents* to be part of the same atomic commit as progress, with actual dispatch/settlement happening afterward from the accepted record. This is explicitly a K2-boundary pattern (Effects don't exist in K1 at all, §8) — it is listed here because the current code's *ordering pattern* (side-effect-before-commit) must not be carried forward into K1's non-Effect Outcome-acceptance path either. |
| REF-2 | `InMemoryRuntimeStore.transact` (`packages/core/src/reference/in-memory-runtime-store.ts:455-468`): the scope parameter is named `_scope: ExecutionId` (leading underscore — declared but unused) and every transaction does `const draft = structuredClone(this.state)` (`:457`) against the *entire* store's `RuntimeState`, then installs the whole draft back (`:459`) after serializing all transactions through one `queue` (`:453,462-466`) | **Refused as a K1+ mechanism; retained only as a reference/testing store** | This is F13 exactly, and stronger than F13's own wording: the store accepts a scope argument and then ignores it entirely, cloning and single-queuing the whole aggregate on every transaction rather than isolating by Execution — no two Executions can compute concurrently against this store (contradicting mental-model.md's "Unrelated Executions can compute concurrently") regardless of clone cost. K0.1 does not need this store to change — K1 may keep using it as its in-memory reference for single-Execution conformance tests — but no K0.1/K1 assertion may depend on "the store happens to globally serialize and deep-clone everything" as a substitute for a real per-Execution scope/concurrency contract. |
| REF-3 | `ExecutionWait`'s `dependencies` arm as currently defined (`packages/core/src/execution/context.ts:126-130`) treated as a **Kernel wait primitive at all** — **corrected framing in review round 1** ([K01-REV-02](implementation-02.md)) | **Refused outright as a target Kernel record shape; the Event half is separately migratable as `MIG-5`, the `resumptions` half is `LEG-1`** | Round 1 framed this as "the shape is worth keeping, only the referent needs reclassifying." That is withdrawn (§5, W-4): the target Kernel `waitingFor` record is not a union with an `event`-or-`resumptions` shape at all — it is Event-only. A K1 Kernel wait record must not itself carry any field naming a `ControllerResumptionId` or equivalent local-work identifier, full stop; there is no partial-credit "shape" to preserve. If a Runtime needs "wait for any of several local jobs plus one Event," that union is assembled **entirely Runtime-side**, privately, with only the Event surfacing to the Kernel as a real `waitingFor` registration once (and only once) something is actually ready to report (§5, W-4's "does not yet submit an Outcome" resolution) — restating kernel.md's "a Runtime can implement an all-of join by retaining observed results in progress and waiting for the remaining set," generalized to this any-of case. |
| REF-4 | The reference mailbox's single monotonic `consumed` cursor (`packages/core/src/reference/in-memory-runtime-store.ts:45-50`, `MailboxState.consumed: number`, doc-commented "How many of `events` an Activation has already consumed"; `consume()` at `:161-167` does `box.events.slice(box.consumed)` then unconditionally `box.consumed = box.events.length`) — **added in review round 1** ([K01-REV-03](implementation-02.md)) | **Refused as a K1+ mechanism; retained only as a reference/testing store** | This is F20's flagged problem embodied directly in the reference store: a single global cursor, not a per-entry disposition set, so it cannot represent B-4's "unmatched retention" (an Event not selected into the current batch must remain independently queryable, not just "before the cursor" versus "after it") or B-5's "terminal disposition per unconsumed Event." It also does not implement B-2's WAITING-time eligibility filter at all: `consume()` unconditionally takes *everything* past the cursor regardless of the currently registered wait's `wake`/`interleave` condition — there is no mechanism here to select only eligible Events during `WAITING`. K1's mailbox representation needs an explicit per-Event disposition (consumed-in-which-batch, or an equivalent set-membership structure), not a single advancing count. |
| OOS-1 | `PendingOperation` (`packages/core/src/effects/pending.ts:73-106`) — **added in review round 1** ([K01-REV-03](implementation-02.md)), inventoried to confirm exclusion, not to pre-decide its shape | **Out of K0/K1 scope — no migratable/legacy-only/refused label applies** | This record is Effect-admission/settlement bookkeeping (`PendingOperationStatus`, `PendingDispatchState`, and a `PendingOutcomeState` that already includes confirmation/authorization-specific values — `denied`, `declined`, `conflicted` — that only make sense once K2's consent/policy machinery exists). Since K1 refuses all Effects outright (§8, `EF-1`/`EF-2`), no `PendingOperation` is ever created in K1's boundary, so K0.1 has nothing to classify here as migratable, legacy-only, or refused — those labels describe a K0/K1-boundary disposition, and this record's boundary is K2's. Recording it here satisfies K0.1-C3's completeness requirement without deciding K2's admission/settlement contract (a stated non-goal). |

**Decision LC-1 (no legacy record is deleted by this packet).** Every classification above describes
what the **new K1 Kernel contract** may depend on; it is not an instruction to remove any file. `LEG-1`
material specifically is expected to keep working, unchanged, as private machinery inside the K1.4
compatibility Runtime (001 K0's own instruction: "Bridge existing controllers inside a compatibility
Runtime where feasible; keep its live-promise resumption private"). `LEG-3`/`LEG-4` similarly describe
what the *target Kernel protocol* does not need, not files to delete — a compatibility Runtime may keep
using an internal `CREATED`-like phase or an internal `"agent"`/`"workflow"` tag for its own bridging
purposes.

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
  §12 classifies legacy-only. **Resolution, corrected in review round 1** ([K01-REV-02](implementation-02.md)):
  round 1 resolved this by keeping the union *shape* and reclassifying only the referent, i.e. "W-1's
  requirement is satisfied by the shape, not by this field's current referent." That resolution was
  itself wrong and is withdrawn: W-1's finite-any-of-set requirement is satisfied entirely by Kernel
  Events (kernel.md's Events-and-waits section), with no local-work arm in the target record at all
  (§5, W-4). The target Kernel `waitingFor` record simply does not have a shape for "local work" to
  occupy, reclassified or otherwise; any such union is assembled Runtime-side, privately (`REF-3`).
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

- **Revision 1**: initial worksheet produced by packet K0.1 (candidate H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`).
- **Revision 2** (this document): corrects revision 1 per [review-01.md](review-01.md)'s CHANGES
  REQUIRED findings K01-REV-01 through K01-REV-05, disposed in
  [implementation-02.md](implementation-02.md):
  - **K01-REV-01** — §2 ID-3/ID-4 rewritten: a takeover advances the writer epoch under the *same*
    Activation ID rather than minting a new one; a new Activation ID is minted only for a genuinely
    new semantic exchange. Added §2 Decision ID-9's four counterexamples. Updated §11 row 2.
  - **K01-REV-02** — §5 rewritten: withdrew the "Kernel-visible Runtime-local-work wait" framing
    (old W-4) entirely; the target `waitingFor` record is Event-only. Corrected W-3's generation
    scope to wait-created artifacts (timers), not authenticated result Events. Added W-6's four
    counterexamples. Rewrote §12's `REF-3` and §13's second contradiction to match. Updated §3 B-2
    and §11 row 5.
  - **K01-REV-03** — §12 rebuilt: added `LEG-3` (`CREATED`), `LEG-4` (closed `kind` discriminator),
    `REF-4` (mailbox monotonic-cursor consumption), `OOS-1` (`PendingOperation`, out of K0/K1 scope);
    corrected `MIG-4` (the `revision` counter is not equivalent to the target `base_progress_revision`
    without redefinition); split `MIG-3`; strengthened `LEG-1`'s citations with the actual
    `ControllerResumption` record. Updated `contract.md`'s K0.1-C3.
  - **K01-REV-04** — §1 E-6 rewritten with concrete semantic limits (units/counting rules stated,
    wire/storage still open); §8 EF-2 corrected (K1's refusal is envelope validation, not a visit to
    a K2-introduced Effect-admission boundary); added EF-3 (naming action-lifecycle.md's four
    dimensions) and EF-4 (named negative cases). Updated `contract.md`'s K0.1-C2/C4 and source table.
    Updated §11 row 4.
  - **K01-REV-05** — this revision's validation evidence is in
    [implementation-02.md](implementation-02.md), run fresh against the corrected payload commit.
