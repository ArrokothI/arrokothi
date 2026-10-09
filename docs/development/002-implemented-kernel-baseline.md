# Implemented kernel baseline

This page maps the implemented surface; [007](007-work-packets.md) owns acceptance, integration
and release. Package version `0.8.1` is not an exact experimental identity or a durability verdict.
Canonical meanings remain with the [reference index](../../mental-model/reference.md).

The supported application SDK still uses `@arrokothi/core`: Harness, Agent/Workflow controllers,
Effects, waits and process-local resumptions. The numbered capability sections below describe that
legacy implementation and its useful regressions. [Kernel ownership](kernel-ownership.md) records
current source boundaries and the owners of deferred extraction. Historical inspection/test counts
and incremental migration notes are preserved in the [archive](archive.md).

The private `@arrokothi/kernel` package separately implements an in-memory `ExecutionCoordinator`:
atomic creation with initial input, post-creation ingress under the Input ID triple, separate
receipts, batch reservation, asynchronous Driver dispatch, ordinary redelivery and scoped inspection;
and Outcome acceptance with replay and conflict, whole-batch acknowledgment, progress, Emissions,
`continue`/`complete`/`fail`, terminal disposition of unprocessed input, authorized takeover and
inspectable recovery holds ([Outcome acceptance API](#outcome-acceptance-api)). It refuses new
ordinary input to a terminal destination. Boundary validation, limits and sealing are local; canonical bytes use the
approved unmodified `canonicalize@3.0.0`. In-process capture keeps each root's canonical byte count
while it reads and stops once that count passes the 1 MiB limit, so a live object that repeats one
shared member is refused without being expanded in full. Within one visit, a string or member name
is read only until one scalar value past the length limit, and a container's own-names listing is
classified only until it exceeds what an accepted container owns (K1.1-correction-02).
Each root also carries a work meter and stops once it passes the budget every acceptable value fits
within. Capture refuses every Proxy before observing it, and refuses built-ins that keep content in
internal slots before listing their keys (K1.1-correction-03).
[Value refusal diagnostics](#value-refusal-diagnostics) also bound diagnostic retention and work during capture. `ExecutionDriver.deliver(activation, settlement, submission)` returns only `undefined` and
reports delivery through the per-delivery Kernel-owned `DeliverySettlement` capability while carrying the per-attempt `SubmissionGrant`; the Kernel never observes a Driver-returned
Promise. The settlement lifetime is one physical delivery; the submission lifetime is one Runtime attempt, as [execution-cycle](../../mental-model/mechanisms/execution-cycle.md) owns.

Out-of-band cancellation and its terminal disposition, waits and deadlines belong to K1.3; Effects to
K2. Those unimplemented surfaces refuse by name, and an Outcome proposing an Effect or a wait is
refused whole. No supported SDK consumer is routed through the private target package yet; K1.4 owns
that bridge.

## Value refusal diagnostics

`values.ts` preserves its exact accepted-value capture, canonical bytes, four limits, single
observations and byte-budget stopping rules. For each refused root it retains at most eight details
with relative paths of at most 128 printable ASCII units (otherwise `<omitted>`) and messages of at
most 1,024 printable ASCII units (otherwise `<message omitted>`). Paths are bounded before member
names are concatenated, including phantom properties and paths below long ancestors. The remaining
issues contribute exact `occurrences` counts per code, ordered by first remaining occurrence, with
no individual locations. Thus a root retains at most 19 diagnostic records (8 details + 11 codes),
not one object per invalid position. Only diagnostics are compressed; all originally observable
positions up to the byte stop are still observed, including sibling roots before Outcome authority.
Diagnostic type labels use only null/typeof classification. They do not inspect constructor, name,
message, array shape or a thrown value's properties. This removes the diagnostic prototype-chain
walk on every refused foreign object and structural-observation failure.

`canonicalize`, `boundaryValueIssues`, creation/ingress and Outcome/control consumers preserve these
counts. Creation/ingress render suffix multiplicity explicitly; Outcome/control rendering composes
the weighted roots into DEC-5's first eight details and exact remaining counts without expansion.
No aggregate semantic size cap is introduced. This records the in-process choice at
[values' diagnostic-storage marker](../../mental-model/concepts/values.md#fixed-semantic-limits).

**Work meter (K1.1-correction-03).** V-D1 is a metered-work bound for this binding
([decision-05](work/K1.2/decision-05.md); the meaning is stated once in
[values](../../mental-model/concepts/values.md#fixed-semantic-limits)). Each `accept` call creates one
capture state, so every root has its own meter. Units, each charged before its work except a listing,
which is charged as soon as it returns:

| Unit | Charged for | Units |
|---|---|---|
| visit | one value: typeof classification; for an object, the Proxy test, cycle and depth tests, `IsArray`, prototype observation, the internal-slot tests and an array's `length` | 1 |
| listing | one own-names or own-symbols listing | 1 + its length |
| element | one array position: its own descriptor and its one ordinary read | 1 |
| descriptor | one object member's own descriptor | 1 |
| read | one object member's ordinary read | 1 |
| string | scanning one string value or member name of at most 131,072 UTF-16 units; a longer one is refused by its length and costs no string units | its length |
| diagnostic | recording one issue | 1 |

The budget is `CAPTURE_WORK_BUDGET` = B = 3 × 1,048,576 = 3,145,728. Derivation: the canonical form
of an accepted value splits into disjoint parts per node, and each node's own units are at most three
times its own bytes. An array of n ≥ 1 entries costs 2n + 4 units for n + 1 bytes, which is at most
3n + 3. An object of n members with name lengths ℓᵢ costs 3n + 3 + Σℓᵢ units for at least
4n + 1 + Σℓᵢ bytes. A string of ℓ units costs 1 + ℓ for at least ℓ + 2 bytes, and every other scalar
costs 1 for at least 1. Units only grow during a capture, so an accepted value is within B at every
point and the meter never refuses one. B is a proven upper bound, not an attained maximum. The
costliest acceptance found is a root array of four mid arrays of 4,096 chains, each chain 30 singleton
arrays around `0`, plus a partial mid array of 528 chains. It is 1,048,555 bytes and costs exactly
3,094,930 units, 98.4% of B. The 50,798-unit gap is open; the exact maximum is a large integer
optimization. `capture-work.test.ts` asserts this witness and the other at-limit families exactly.
`encode` runs only on an accepted, Kernel-owned snapshot and is outside the meter. It adds the same
work to every acceptance and none to any refusal.

A charge that passes B stops reading the root and records one root-located issue, which is not
charged: code `too_much_work`, message "reading this value passed the work budget of 3145728 units
that bounds every acceptable value; the rest of the value was not read". The meter stop and the byte
stop (`too_many_bytes`) are exclusive; whichever comes first ends reading, and diagnostics describe
the positions examined up to it. `too_much_work` is an addition to the exported `ValueIssueCode`
type, which `index.ts` re-exports as a type from the private `@arrokothi/kernel` package. Review 08's
family (`K12C1-R8-VALUE-DEPTH-01`: 4,096 × 256 foreign objects at nesting depth) now stops at B + 1
units, after 786,025 refused positions at depth 2 and 785,967 at depth 31 (owner design check Q1,
under decision-05 item 2). Per refused position it charges the same units at every depth, because
cycle detection uses a Kernel-created `Set` reached through load-time methods. That set never holds
more than 32 entries. `captureWithWork` in `values.ts` returns the result with its per-kind counts.
Tests use it, and `index.ts` does not re-export it.

**Proxy and internal-slot refusal.** Every Proxy, including revoked and callable ones, is refused at
every depth before any other observation, by `util.types.isProxy` read at load: `unsupported_form`,
"value is a Proxy; capture refuses every Proxy before observing it". No trap runs. A non-array object
whose prototype is `Object.prototype` or `null` is then tested for internal slots before any own-key
listing. The tests are `util.types.isMap`, `isSet`, `isWeakMap`, `isWeakSet`, `isDate`, `isRegExp`,
`isAnyArrayBuffer`, `isArrayBufferView`, `isBoxedPrimitive`, `isNativeError`, `isPromise`,
`isGeneratorObject`, `isMapIterator`, `isSetIterator`, `isArgumentsObject`,
`isModuleNamespaceObject`, `isKeyObject`, `isCryptoKey` and `isExternal`, plus `JSON.isRawJSON`, all
read at load. A match is refused with `unsupported_form`, "expected a plain object, received a
built-in object whose content is kept in internal slots". A built-in with its own non-plain
prototype is still refused by the prototype check, unchanged. Arguments objects, module namespaces
and raw JSON objects are refused even with their natural prototypes (design check Q4). This closes
`SELF-K113-RAWJSON-01`: `JSON.rawJSON("1")` was accepted at base as `{"rawJSON":"1"}`. Detection
never uses prototype identity, constructor names or `Symbol.toStringTag`.

**Declared limits.** The meter's per-unit constants rest on capture running no caller-defined
internal method of a value. Three residuals are outside them: (R1) one own-key listing per root,
whose length is unknown until it returns and whose charge then stops the root, with at most a
logarithmic sorting factor per name for a listing within B; (R2) host objects with interceptors;
(R3) hash-table member lookups, which are expected constant. Kinds with no side-effect-free
internal-slot test stay accepted as their own data when given a plain prototype, usually as `{}`,
under the cooperative contract (design check Q6). These kinds are WeakRef, FinalizationRegistry,
the Temporal types, Intl objects, DisposableStack, AsyncDisposableStack, Array, String and
RegExp-string iterators, iterator helpers, WebAssembly objects and private-field platform classes.
This narrows the claim to detectable kinds. Request envelopes stay under the envelope rule, so an
envelope accessor or Proxy can still run caller code in the Kernel between root captures.
BINDING-01 owns that gap. Protection against hostile in-process code requires isolation or
transport containment, not V-D1, and this binding provides neither CPU preemption nor physical
containment. Decision-03/04 item 5's prohibition on Proxy refusal and decision-04 item 1's live-Proxy
exclusion are superseded for capture by [DESIGN-AUDIT-01 decision-01](work/DESIGN-AUDIT-01/decision-01.md)
items 2–3. [Blocker-01](work/K1.2-correction-01/blocker-01.md) and
[blocker-02](work/K1.2-correction-01/blocker-02.md) keep their counterexamples, which are now refused
with zero trap calls.

The byte stop and its exact charges, the four limits, exact accepted values and DEC-7 weights are
unchanged. `capture-metering.test.ts` checks statically that capture observes caller values only
through metered helpers. `capture-work.test.ts` compares wrapped engine operations with the units
charged, and `capture-corpus.test.ts` runs the declared generated corpus. Timing is an observation
only. The V-D1 claim stays held under [invalidation-02](work/K1.2/invalidation-02.md) until this
packet is accepted, and the classification hold of [invalidation-01](work/K1.2/invalidation-01.md)
likewise. 007 records acceptance status and both holds; V-ENV ("ambient safety") stays held by
[invalidation-03](work/DESIGN-AUDIT-01/invalidation-03.md) for BINDING-01.

Plain strings first receive a UTF-16 length precheck. More than twice the 65,536-scalar limit
cannot fit even if every scalar uses a surrogate pair; refusing there avoids an engine flattening
the entire oversized string on its first character access. Such inputs report `string_too_long`,
including those that are also malformed Unicode. Shorter strings keep the existing bounded scalar
scan. Exact accepted values, scalar limits, read-count upper bounds and full refusal byte charges
are unchanged. [String closure](work/K1.2-correction-01/string-closure-04.md) records this additional
implementer-found dependency and its distinguishing evidence.

## Request identity API

The target Kernel accepts caller-chosen creation-key text in
`CreateExecutionRequest.creationKey`. Its complete `CreationRequestId` contains
`{ producerNamespace, scope, requestKey }`; `scope` is the selected creation authority scope.
`creationRequestIdKey(...)` produces the packed lookup key. Post-creation input uses
`InputId { producerNamespace, destination, requestKey }` and `inputIdKey(...)`.

The host supplies `AuthenticatedCaller.namespace` through authentication. Creation selects one
authority scope that the caller may reach; `AuthenticatedCaller.scopes` is the separate permission
list, not the creation identity's scope value. The creation key becomes `CreationRequestId.requestKey`.
`packages/kernel/tests/creation.test.ts` covers separation both between producers and between two
authority scopes of one producer. Identity components, their encoding and retry behavior are unchanged
by the symbol cleanup.

`inputIdKey(...)` and `creationRequestIdKey(...)` pack their parts with `packIdentity`, which
length-prefixes each part rather than hashing it, so no choice of caller text makes two identities
collide. A `Receipt` is a frozen in-memory record `{ boundary, token, position }`. `boundary` is one of
the four implemented `ReceiptBoundary` values: `creation`, `input_ingress`, `dispatch_intent` or
`outcome_acceptance`.
`token` is opaque to callers and derives only from the owning Execution and its position, so it reveals
no coordinator-wide order. `position` is that Execution's own acceptance index, and creation is 1.
Exact replay returns the same receipt object. Receipts have no serialized form yet. These are this
implementation's choices for the representations `concepts/identity.md` leaves open.

Retention, as the in-memory coordinator publishes it: no creation key and no Input ID ever expires
while the coordinator lives, and nothing survives it. Deduplication is therefore exact for the
coordinator's lifetime, and no expired-key case exists. A profile that expires keys must publish
its own expired-key policy before enabling expiry (`mechanisms/evidence.md#retention-and-deletion`).

## Outcome acceptance API

`ExecutionCoordinator.submitOutcome(caller, envelope, submission)` takes an `OutcomeEnvelope`:
`executionId`, `activationId`, `writerEpoch`, `baseProgressRevision`, `progress`, optional
`emissions` (each `{ emissionKey, value }`), optional `effects` and `next` (`{ step: "continue" }`,
`{ step: "complete", result }`, `{ step: "fail", error }`; `{ step: "await", wait }` is refused until
K1.3), plus the attempt-bound `SubmissionGrant` the Kernel handed to the Driver with the current
attempt. The envelope names the exchange and the attempt it answers; nothing is defaulted from the
current exchange. Every field is read once from the envelope's own data, and each value root
(progress, each Emission value, the result or error) is captured once and measured on its own. An own
field the binding does not know is refused rather than ignored, as is any non-empty `effects`.

The Activation field is an opaque primitive JavaScript string, compared unchanged by exact UTF-16
code-unit equality. Empty text, lone surrogates and strings over 65,536 scalars are structurally
well formed; a different string names a different exchange, not malformed content. No coercion,
normalization, truncation, Unicode check or boundary-value size limit is applied to this ID.
Missing, non-string (including boxed-string) and unobservable fields remain unusable. The same rule
is used by Outcome replay/currency/content and `requestTakeover`, `recoverExecution`, and
`reportProtocolFailure`. [Identity](../../mental-model/concepts/identity.md#runtime-attempt) owns the
producer/consumer requirement. Creation and Execution-ID behavior are unchanged: the ID combines
bounded caller scope/key with an unbounded trusted namespace, then dispatch adds its exchange
suffix. The binding adds no semantic identity-length limit; JavaScript string-allocation limits
still apply to both individual IDs and their compositions. At a trusted namespace above half the
engine maximum, creation, dispatch and `continue` can succeed while Emission/result ID construction
throws before acceptance mutates state; input ingress can likewise exceed allocation limits while
packing the same namespace twice, before mutation. This binding does not claim producer/consumer closure
beyond those allocation limits. Caller keys,
Emission keys and the value roots keep their existing Unicode and size checks.

Unknown-field diagnostic names on the Outcome, `next` and Emission envelopes retain at most 128
printable ASCII code units per name; longer or other names are replaced by a fixed omission marker.
The field is still refused whole and its value is never read. Outcome/control identity fragments,
including matched Activation IDs, Execution IDs, duplicate Emission keys and missing-code pins,
likewise retain at most 128 printable ASCII units or become `<identity omitted>` before
concatenation. Identity-only refusals are at most 1,024 units and missing-code reasons at most 600.
Structured IDs and actor attribution stay exact; no proposed content is repaired or accepted.

Outcome/control content diagnostics follow [correction DEC-5](work/K1.2-correction-01/contract.md):
the first eight captured issues retain ordered details; remaining issues contribute exact counts
for every code, in first remaining occurrence order. Value paths are bounded during capture and again at rendering to
128 printable ASCII units or `<omitted>` before adding their root label; messages use 1,024 units
or `<message omitted>`. The complete content reason is at most 16,384 UTF-16 units regardless of
issue count or configured Emission capacity. Classification still uses the complete captured
result. Capture remains eager; value diagnostics are stored under [DEC-7](work/K1.2-correction-01/contract.md)
and envelope diagnostics are projected at rendering. DEC-5 owns the whole-reason bound and its
derivation; the value collector preserves its counts without a per-position retained list.

A hold's permitted actions describe operations the hold itself does not refuse. Takeover still
requires the Driver's safe-replacement declaration; an absent or denying callback can refuse it as
`unsafe_replacement`. This list is not a promise that all other preconditions are met.

The K1.2-added redelivery recovery-held refusal also bounds its Activation fragment under DEC-4.
Explicit delivery/protocol diagnostic payloads keep their separate first-1,024-UTF-16-unit rule;
hold/history and redelivery explanations add fixed text.

The order is `execution-cycle.md`'s: the caller is scoped to the named Execution before anything else
is read; an already accepted Outcome under the same Activation ID is looked up next, and an exact
duplicate (equal captured content) returns the original receipt and decision while anything else is
refused as `duplicate_conflict` (only a well-formed Activation ID is looked up; a missing, malformed
or unobservable one addresses no accepted Outcome); then terminal state, then the exchange's current Activation ID, writer
epoch and base progress revision (`stale_exchange`), then the submission grant: only a proposal
presenting the exchange's current grant — by reference identity, never by fields — is the current
attempt answering, and anything else is refused as `unauthorized_submission` with no accepted-state
mutation beyond the recorded refusal; then content (`malformed_envelope`, or
`capacity_exhausted` above the declared Emission limit). Exchange currency is per-coordinate, and the
Activation ID is one of the coordinates: no unresolved exchange, or a well-formed Activation ID,
writer epoch or base progress revision that does not match the unresolved exchange, refuses as
`stale_exchange` whatever the other coordinates or the grant present, while a missing, malformed or
unobservable coordinate alone never establishes staleness and is a content-group refusal after
authority, reported with the other content issues (K12-R11-ORDER-01, K1.2 decision-02). Capture is
eager and may compute content diagnostics, but a refusal before authority neither is decided by them
nor returns or retains them, and its reason does not render a malformed coordinate's value. The in-process representation carries both halves
separately (`epochForCurrency`/`baseForCurrency`, each the well-formed value or `null`) alongside the
atomic full claim used for the accepted-content identity. Scope is still required alongside the grant;
replay and conflict precede authority because they answer from retained evidence without accepting
anything. An accepted Outcome acknowledges the whole
reserved batch, installs the progress under revision base + 1, records each Emission, records the
typed result (`kind: "completed"` or `"failed"`) for `complete`/`fail`, resolves the exchange and moves
the Execution to `READY`, `COMPLETED` or `FAILED`; at `complete`/`fail`, every Event still
unacknowledged receives a terminal disposition in the same decision. The answer, `OutcomeAccepted`,
carries the `outcome_acceptance` receipt and the decision's lists; inspection adds `acknowledged`,
`terminalDispositions`, `emissions`, `result`, `exchanges` (resolved exchanges with their delivery
attempts, each naming its `activationId`/`writerEpoch`), `recoveryHolds` (each with its reason and
`permittedNextActions`) and `recoveryHistory` (accepted recovery/control decisions retained after the
hold changes or disappears).

`requestTakeover(caller, executionId, { activationId, writerEpoch })` advances the named current epoch
by one within the same exchange and delivers the same Activation at the new epoch, but only for a
control-authorized caller (`AuthenticatedCaller.controlScopes` contains the Execution's scope;
otherwise `unauthorized_control` with no state change) and only when the Driver's
`isSafeToReplace(currentActivation)` returns exactly `true` (otherwise `unsafe_replacement`).
Because that callback can synchronously reenter the coordinator, the Kernel revalidates the same
unresolved exchange, current epoch, and hold state after it returns and before committing, with no
further reentrant code in between; a nested takeover, resolving Outcome, terminal end, or newly
established code hold makes the outer request refuse (`stale_exchange`, `no_unresolved_exchange`,
`terminal_destination`, or `recovery_held`) with no orphan receipt, extra delivery, or overwritten
evidence. At most one takeover commits per request.
Kernel fencing rejects later writes from the superseded attempt but does not itself stop or exclude
superseded native work; the Driver's exclusion or refusal is what establishes that precondition
(`identity.md#writer-epoch`, `recovery.md`, `driver.md`, `kernel.md`).
`recoverExecution(caller, executionId, { activationId, available })` compares the exchange's pinned
Definition revision, Runtime contract revision and progress codec with the declared
`available.definitionRevisions`, `runtimeContractRevisions` and `progressCodecs`, and holds the
exchange (`RUNNING`, `recoveryHolds` naming what is missing and what may be done next) or clears that
hold; it requires control authority (`unauthorized_control` otherwise). Each accepted decision that
enters, updates, or clears a hold appends one frozen `RecoveryHistoryRecord` (actor, authority,
exchange/epoch causation) to `recoveryHistory`.
`reportProtocolFailure(caller, executionId, { activationId, writerEpoch, diagnostic? })` holds the
current attempt's exchange because its response could not be classified; it requires control authority
and appends to `recoveryHistory` on entry. Redelivery is refused while
any hold stands, takeover while a code hold stands; a takeover clears a protocol-failure hold (recorded
as `cleared_by_takeover`), and an
accepted Outcome of the current attempt resolves the exchange and ends its holds (recorded as
`ended_by_outcome`). Idempotent duplicates (`changed:false`) append no history. Each history record
owns exactly its fields; only a `cleared_by_takeover` record owns `resultingEpoch`, and no record
holds a caller-owned object. Each of the three controls builds its whole decision (hold, history
record, takeover receipt/Activation/grant, answer) from Kernel data before changing anything, then
applies it ([correction DEC-9](work/K1.2-correction-01/contract.md)).

These are this in-process binding's choices where the architecture leaves the representation open
(`mental-model/rewrite-index.md` §4):

- **Writer epoch** (`concepts/identity.md#writer-epoch`): an integer, 1 at each new exchange, advanced
  by exactly 1 per accepted takeover. Epochs are not comparable across Activation IDs.
- **Outcome-acceptance transaction** (`mechanisms/execution-cycle.md#atomic-decisions-across-the-system`):
  one synchronous call on the single-threaded coordinator. Every caller-owned field is observed first,
  every retained decision record the acceptance needs — receipt, Emissions, result, dispositions,
  resolved exchange, Outcome decision, hold-ending history records, and the retained accepted-Outcome
  wrapper binding the captured identity to the decision for replay — is then built from Kernel data
  only, and only then is accepted state mutated by inserting those prebuilt records — the
  Outcome-acceptance receipt's position is read while building and committed with the rest of the
  decision, so no acceptance index advances before the records are complete — through
  load-time primitives with no caller code between first check and last mutation; the apply phase
  constructs no retained record, and the only post-mutation construction is the returned answer
  projection, which is not retained state. A
  getter that reenters the Kernel is ordered before the decision's checks. Atomic within the process,
  not durable.
- **Recovery-control transaction** (same owner; [correction DEC-9](work/K1.2-correction-01/contract.md)):
  `recoverExecution`, `reportProtocolFailure` and `requestTakeover` observe the request, check
  accepted state, then build every record and the answer from Kernel data. The apply phase appends
  the prebuilt records first, then performs plain writes of Kernel-owned fields; nothing is built,
  read from the caller or run between the first and last mutation. For hold entry, update and
  declaration clear the only call in the apply phase is the history append, which comes first, so no
  fault separates a hold change from its record. A takeover's receipt position is read while
  building and committed with the rest; its two appends carry the Outcome transaction's narrower
  claim (no caller code or read between them). Every refusal record is built and appended before its
  Execution's refusal index advances. Evidence (contract revision 10): a fault-injection sweep throws
  at each call of a built-in method the zone captured at load, one call per run, in the 66 scenarios
  the contract lists (14 of `recoverExecution`, 12 of `reportProtocolFailure`, 17 of `requestTakeover`,
  five of them after a Driver safety callback that decides first, and 23 of Outcome acceptance). Each
  run must equal one permitted complete decision: its returned value, whole view, next refusal and
  acceptance positions, and what the setup attempt's grant can still do. The delivery and apply-window
  exceptions are admitted only for a fault its own stack locates at the declared statements. The
  uninjected decision is itself checked: a refusal, an idempotent answer or an exact replay against the
  no-call state (after a safety callback, the state its decision leaves), and an accepted answer
  against the state it leaves. Each of the 57 exits the sweep finds in the
  source (every `return` of the four methods, and every refusal `return` of the helpers they call) is
  taken by a scenario. The scope is those scenarios and the operations the sweep intercepts; faults
  inside a safety callback and engine faults in allocation or property access stay outside the claim.
  `fault-oracle.test.ts` holds the sweep checker's negative controls, and a mutant of each of its
  comparisons shows that comparison is needed. `control-commits.test.ts` is a static
  regression guard for accidental reordering, with known gaps (a default parameter that supplies a
  Kernel object, a local named `undefined`); it is not a proof.
- **Ambient reads** ([correction DEC-8](work/K1.2-correction-01/contract.md)): the zone reads no
  member its object may not own. Kernel records own every declared field; caller envelopes are read
  own-only; an optional member of a trusted host object (`controlScopes`, `mailboxCapacity`,
  `emissionsPerOutcome`, `isSafeToReplace`) is resolved on the host object or its own prototype
  chain and never answered by `Object.prototype` or `Function.prototype`. Evidence (contract revision
  9): a poisoned-prototype sweep installs every member name the zone uses as an accessor on
  `Object.prototype`, `Function.prototype`, `Array.prototype` and `String.prototype` during every
  boundary call of the maintained Kernel suite and of a catalog that calls every public boundary with
  accepted, idempotent and refused exits, and requires
  that no zone frame reaches one and that every result equals an unpoisoned run. Its scope is the
  paths those scenarios reach (every zone line but two defensive ones) and reads that run an
  accessor; `in` and other built-in prototypes are outside it. `ambient-reads.test.ts` is a static
  regression guard for accidental forms (an allowlisted syntax and a reasoned inventory of accesses),
  with known gaps (a member introduced through a partially declared or nested type assertion or
  predicate); it is not a proof.
- **Per-entry disposition storage** (WS §3 "Left open"): each mailbox entry holds its own frozen
  disposition, `queued`, `acknowledged` (naming the acknowledging Activation) or `terminal` (with its
  reason).
- **Takeover evidence**: a takeover re-records the dispatch intent's current attempt and mints a
  `dispatch_intent` receipt; it introduces no new receipt boundary. It also mints the new attempt's
  submission grant and retires the old one.
- **Submission authority** (`execution-cycle.md`, `identity.md`, `evidence.md`): one frozen
  `SubmissionGrant` per writer-epoch attempt, handed to the Driver with the Activation and required
  back by reference identity on `submitOutcome` (`unauthorized_submission` otherwise); never
  inspected; redelivery preserves it, takeover replaces it. Not K2 policy — one unforgeable
  reference per attempt.
- **Emission and result identity**: `emission-…` and `result-…` IDs are packed from the Execution ID,
  the Activation ID and, for an Emission, its key, so a replay cannot mint another and no identity
  reflects activity elsewhere. Output positions, reads and cursors are K4.4's.
- **Declared limit**: `CoordinatorOptions.emissionsPerOutcome`, default 256, an operational bound
  checked before any Emission is read, not a semantic value limit. An omitted limit takes its default
  even when ambient state carries one (correction DEC-8).
- **Control authority** (`evidence.md`, `authority.md`): `AuthenticatedCaller.controlScopes` is the
  separate control power; the three exchange controls require it (`unauthorized_control` otherwise).
  A fresh Outcome requires visibility plus the separate current-attempt grant; `controlScopes`
  is not required and cannot substitute for that grant. A visible grant holder without general
  control authority can submit an accepted Outcome that resolves the exchange and ends its holds.
  Replay/conflict retain the ordering described above. A `controlScopes` only a built-in prototype
  would supply is absent (correction DEC-8).
- **Driver safe replacement** (`identity.md#writer-epoch`, `recovery.md`, `driver.md`): takeover
  advances only on `isSafeToReplace() === true` (`unsafe_replacement` otherwise); Kernel fencing does
  not stop native work. The method comes from the Driver or its own prototype chain, never from a
  built-in prototype, so ambient state cannot establish safety a Driver did not declare (correction DEC-8).
- **Delivery attribution** (`identity.md#dispatch-and-delivery`): each delivery row names its
  `activationId`/`writerEpoch`.
- **Permitted actions** (`evidence.md`): each hold exposes `permittedNextActions` from the same rules
  that refuse the controls (`declare_code_availability`/`request_takeover`/`submit_outcome`).
- **Recovery history** (`state.md#execution-history`, `evidence.md`): `recoveryHistory` retains
  entered/updated/cleared_by_declaration/cleared_by_takeover/ended_by_outcome with an explicit
  `authority` (`control` for checked control power, `attempt_submission` for a grant-authorized
  Runtime proposal that claims no general control power), actor, and exchange/epoch causation;
  duplicates append nothing; no seventh receipt.
- **Retention**: accepted-Outcome records, resolved exchanges, Emissions and results are kept for the
  coordinator's lifetime, so an exact Outcome replay is answered for as long as the coordinator lives.

## 1. Execution and Harness

**Implemented capability.** Independent Execution identities; lifecycle transitions; serialized
controller Activations; mailbox and cursor; explicit waits; FIFO reference scheduling; terminal
results; cancellation; transactional runtime-store operations; deterministic test clocks/ids.

**Non-obvious invariant.** Definition, Execution, Workflow, Agent, Stage, and function call are
distinct. Only independent runtime identity creates an Execution boundary. One Execution has one
active controller-state writer even when independent work is in flight.

**Target owner.** [Kernel](../../mental-model/kernel.md).

**Representative source.** `packages/core/src/execution/context.ts`, `execution/lifecycle.ts`,
`runtime/harness.ts`, `runtime/activation.ts`, `ports/runtime-store.ts`,
`reference/in-memory-runtime-store.ts`, `reference/fifo-scheduler.ts`.

**Representative tests.** `tests/conformance/execution/lifecycle.test.ts`,
`scheduler-exclusion.test.ts`, `wait-wake-resume.test.ts`, `serialization.test.ts`,
`terminal-result.test.ts`, `tests/conformance/contracts/runtime-store.test.ts`.

**Major deferrals.** Production durable store/scheduler, process-crash restart, distributed worker
coordination, hosted isolation.

## 2. Events, Effects, PendingOperations, and ControllerResumptions

**Implemented capability.** Closed Event and five-Effect vocabularies; controller proposals;
Harness authorization/coordination; Effect journal; idempotency; externally delivered input only
through the public ingress; runtime result Events; optional exact-payload confirmation;
PendingOperations; ControllerResumptions for slow controller-local provider work; controlled
interleaving; dependency-set waits over Events plus multiple resumptions.

**Non-obvious invariant.** Event ≠ Effect; request ≠ authorization ≠ dispatch ≠ completion;
PendingOperation ≠ ControllerResumption. A model call does not become an Effect merely because it
is slow. A dependency wait keeps Event and resumption members typed and separate.

**Target owner.** [Kernel](../../mental-model/kernel.md), with confirmation and
authority consequences in [Kernel](../../mental-model/kernel.md).

**Representative source.** `interaction/events.ts`, `effects/types.ts`, `effects/pending.ts`,
`effects/journal.ts`, `execution/resumption.ts`, `runtime/effect-processor.ts`,
`runtime/event-router.ts`, `runtime/resumption-processor.ts`.

**Representative tests.** `tests/conformance/effects/effect-gateway.test.ts`,
`pending-operations.test.ts`, `fast-slow-equivalence.test.ts`,
`tests/conformance/execution/controller-resumption.test.ts`, `controlled-interleaving.test.ts`,
`multi-dependency-wait.test.ts`, `tests/conformance/interaction/event-vocabulary.test.ts`.

**Major deferrals.** Durable recovery of in-flight unknown outcomes and production external
dispatch/idempotency guarantees.

## 3. Authority, Active View, and model projection

**Implemented capability.** Capability Catalog; deny-by-default reference Effective Authority;
operation refs and attenuation; active operation resolution; heterogeneous authority-governed
model-action view for capability operations and Structured Memory writes; identity-only narrowing;
immutable persisted projection/bindings; fresh Harness reauthorization before each Effect;
separate controller-local Working Notes controls.

**Non-obvious invariant.** Discovery and exposure do not grant permission:

```text
Model projection ⊆ Active View ⊆ Effective Authority ⊆ Catalog
```

Controller-local model controls do not cross an Execution/runtime boundary and are deliberately
outside this authority-governed action chain; their origin remains explicit when provider callables
are merged.

**Target owner.** [Kernel](../../mental-model/kernel.md).

**Representative source.** `operations/authority.ts`, `operations/active-view.ts`,
`operations/model-action-view.ts`, `operations/projection.ts`,
`operations/local-model-control.ts`, `operations/model-invocation-interface.ts`,
`reference/operation-authority.ts`, `reference/active-operation-view-resolver.ts`.

**Representative tests.** `tests/conformance/agent/effective-authority.test.ts`,
`active-view.test.ts`, `projection.test.ts`, `action-binding.test.ts`,
`harness-reauthorization.test.ts`, `tests/conformance/architecture/agent-boundaries.test.ts`.

**Major deferrals.** Policy-engine backend, progressive heterogeneous discovery, lazy descriptor
hydration, hosted identity/policy service.

## 4. Provider abstraction

**Implemented capability.** Provider-neutral model requirements, resolver, invocation request,
outcome/error normalization, deterministic scripted/deferred providers, Gemini adapter, and Strands
Agent-executor integration outside core.

**Non-obvious invariant.** Controllers depend on ArrokothI ports and portable features, never a
vendor client. Provider-native tools/errors/caching do not define kernel semantics.

**Target owner.** [Runtime](../../mental-model/runtime.md) and
[Deployment](../../mental-model/deployment.md).

**Representative source.** `packages/core/src/ports/model-provider.ts`, `model-resolver.ts`,
`reference/static-model-resolver.ts`, `packages/models/gemini/src/index.ts`,
`packages/agents/strands/src/agent-executor.ts`.

**Representative tests.** `tests/conformance/models/model-provider.test.ts`,
`model-resolution.test.ts`, `model-portability.test.ts`,
`packages/models/gemini/tests/gemini-model-provider.test.ts`,
`packages/agents/strands/tests/strands-agent-executor.test.ts`.

**Major deferrals.** Additional providers, production registry/service discovery, provider-neutral
cache contract only where evidence requires it.

## 5. Agent

**Implemented capability.** Serializable Agent Definition/spec; controller progress; bounded model
invocations; information compilation; immutable callable interface; action correlation and
observation projection; provider resumption/re-entry; model trace; capability and Structured
Memory actions; local Working Notes control; recursive composition through runtime Effects.

**Non-obvious invariant.** Agent is a controller type, not every Execution and not a privileged
authority source. Information compilation is separate from action exposure. Re-entry uses the
persisted invocation snapshot rather than rebuilding views or context.

**Target owner.** [Runtime](../../mental-model/runtime.md), with runtime, authority, and memory
details owned by their respective canonical documents.

**Representative source.** `agent/spec.ts`, `agent/control-state.ts`,
`controllers/agent/controller.ts`, `controllers/agent/information.ts`,
`controllers/agent/model-access.ts`, `ports/agent-executor.ts`, `reference/agent-executor.ts`.

**Representative tests.** `tests/conformance/agent/agent-definition.test.ts`,
`agent-controller.test.ts`, `agent-resumption.test.ts`, `information-compiler.test.ts`,
`model-trace.test.ts`, `observation-projection.test.ts`.

**Major deferrals.** ACI/retrieval strategy optimization, additional reference Agent policies,
behavioral quality tuning, dynamic progressive action discovery.

## 6. Workflow and Stage

**Implemented capability.** Serializable Workflow topology; Function, LLM, Agent, and Workflow
Stages; conditional/labelled transitions; input/output adapters; stage-local progress; effect
barriers; provider resumptions; child calls; terminal results; bounded topology/transition limits.

**Non-obvious invariant.** Workflow ≠ Agent; Stage ≠ Execution. Stage progress and a child
Execution's progress are different artifacts. Effects remain Harness-mediated regardless of Stage
kind.

**Target owner.** [Runtime](../../mental-model/runtime.md), with execution mechanics in
[Kernel](../../mental-model/kernel.md).

**Representative source.** `workflow/spec.ts`, `workflow/control-state.ts`,
`controllers/workflow/controller.ts`, `controllers/workflow/llm-stage.ts`,
`workflow/adapters.ts`, `ports/stage.ts`.

**Representative tests.** `tests/conformance/workflow/workflow-topology.test.ts`,
`stage-semantics.test.ts`, `stage-barrier.test.ts`, `model-resumption.test.ts`, `agent-stage.test.ts`,
`workflow-stage.test.ts`, `adapters.test.ts`.

**Major deferrals.** General multi-Stage branch subgraphs, nested/concurrent forks, branch adapters
or emissions, join reducers/synthesis.

## 7. Recursive child composition

**Implemented capability.** `SpawnExecution` spawn/call modes; child links; parent/child result
correlation; recursive Agent/Workflow graphs; authority attenuation; structural lineage budgets;
child cancellation settlement (without cascading cancellation or configured child-result deadlines);
terminal-dependency abandonment; explicit Working Notes handoff.

**Non-obvious invariant.** A child is a real Execution. Authority and note visibility do not flow
merely from ancestry; the child receives only explicit attenuation/transfer. A Stage remains
same-Execution composition unless it explicitly calls a child.

**Target owner.** [Runtime](../../mental-model/runtime.md) and
[Kernel](../../mental-model/kernel.md).

**Representative source.** `effects/types.ts`, `execution/child-link.ts`,
`execution/structural-budget.ts`, `runtime/effect-processor.ts`,
`execution/working-notes.ts`.

**Representative tests.** `tests/conformance/composition/recursive-composition.test.ts`,
`spawn-vs-call.test.ts`, `authority-attenuation.test.ts`, `structural-budget.test.ts`,
`child-cancellation.test.ts`, `terminal-dependency-abandonment.test.ts`,
`tests/conformance/memory/working-notes-handoff.test.ts`.

**Major deferrals.** General service/protocol projection, durable recovery of child links,
automatic child-note return (intentionally absent).

## 8. Peer and user interaction; mechanical confirmation

**Implemented capability.** `SendMessage` notify/ask/reply semantics; peer request links; user-input
requests with schema validation; exact request correlation; mechanical confirmation policies and
resolution; safe decline/deny/reject settlement across Agent and Workflow controllers.

**Non-obvious invariant.** Communication is not ownership and a message does not grant authority.
Confirmation verifies consent to one exact proposal; it is not authorization and does not widen
authority. User input, peer reply, and child result remain distinct interactions.

**Target owner.** [Runtime](../../mental-model/runtime.md),
[Kernel](../../mental-model/kernel.md), and [Deployment](../../mental-model/deployment.md).

**Representative source.** `execution/peer-request-link.ts`, `execution/user-input-request.ts`,
`execution/confirmation-request.ts`, `confirmation/resolver.ts`, `runtime/effect-processor.ts`.

**Representative tests.** `tests/conformance/interaction/send-message.test.ts`,
`user-input.test.ts`, `mechanical-confirmation.test.ts`, `confirmation-settlement.test.ts`,
`messaging-authority.test.ts`, `tests/conformance/composition/peer-liveness.test.ts`.

**Major deferrals.** Durable external channels, protocol-specific elicitation mapping, production
identity/authentication and notification delivery.

## 9. Structured Memory

**Implemented capability.** Execution-local schema-bound view; deny-by-default read and write
exposure seams; authorized `WriteMemory`; atomic commit with revision/history/provenance;
model-facing read context and write action; exact-payload confirmation; whole-view optimistic
`expectedRevision`; explicit `memory.write_conflict`; explicit promotion provenance from Derived
Semantic Memory.

**Non-obvious invariant.** Memory ≠ context. Read authority, write exposure, and final write
authorization are independent. Whole-view revision is runtime/concurrency data and is not exposed
to a field-limited model reader. A stale versioned write conflicts; it never silently overwrites.

**Target owner.** [Runtime](../../mental-model/runtime.md), with Effect/authorization rules in
[Kernel](../../mental-model/kernel.md).

**Representative source.** `execution/structured-memory.ts`,
`execution/structured-memory-read.ts`, `execution/structured-memory-write-view.ts`,
`ports/structured-memory-read-view.ts`, `runtime/effect-processor.ts`.

**Representative tests.** `tests/conformance/memory/structured-memory-write.test.ts`,
`structured-memory-read.test.ts`, `structured-memory-model-write.test.ts`,
`structured-memory-optimistic-write.test.ts`.

**Major deferrals.** Field-level versions, multi-key transactions, reducers/CRDTs/locks, general
cross-Execution scope ontology, durable backend.

## 10. Working Notes

**Implemented capability.** Bounded controller-owned Agent scratch frame; separate read/write
enablement; `working_notes_set` controller-local model control; snapshot/re-entry; explicit selected
parent→child handoff; immutable inherited handoff plus independent child-owned writable frame.

**Non-obvious invariant.** Working Notes are temporary epistemic state, not Structured Memory,
authority evidence, or ambient shared memory. Semantic retention of the inherited handoff does not
require it to be rendered or transported on every hot-path step.

**Target owner.** [Runtime](../../mental-model/runtime.md).

**Representative source.** `execution/working-notes.ts`, `agent/control-state.ts`,
`operations/local-model-control.ts`, `operations/model-invocation-interface.ts`,
`controllers/agent/controller.ts`.

**Representative tests.** `tests/conformance/memory/working-notes.test.ts`,
`working-notes-handoff.test.ts`, `tests/conformance/architecture/agent-boundaries.test.ts`.

**Major deferrals.** Sequential Stage handoff policy, parallel-branch Working Notes sharing/merge,
retention/redaction policy and evidence-driven hot-path optimization.

## 11. Derived Semantic Memory

**Implemented capability.** Plain provenance-bearing claims and source material; explicit
extraction seam; deterministic reference extractor/provider; deny-before-provider retrieval;
bounded Agent information view; persisted invocation snapshot; explicit promotion through ordinary
`WriteMemory` with provenance.

**Non-obvious invariant.** Derived claims are inferred and may be wrong, stale, or contradictory.
They are not authority evidence and never promote automatically. Reference lexical ranking and the
claim shape are implementation evidence, not universal semantics.

**Target owner.** [Runtime](../../mental-model/runtime.md) and
[Kernel](../../mental-model/kernel.md).

**Representative source.** `execution/derived-semantic-memory.ts`,
`ports/derived-memory-extractor.ts`, `ports/derived-semantic-memory-provider.ts`,
`ports/derived-semantic-memory-read-view.ts`,
`reference/in-memory-derived-semantic-memory.ts`.

**Representative tests.** `tests/conformance/memory/derived-semantic-memory.test.ts`,
`tests/conformance/agent/information-compiler.test.ts`.

**Major deferrals.** Universal claim/entity/time/confidence schema, production vector/graph
provider, automatic extraction/promotion, contradiction resolution.

## 12. Parallel Workflow structured concurrency

**Implemented capability.** System-defined fork topology with two or more one-Stage branches;
branch-local progress/visit/barrier; overlapping Function work; LLM/Agent/Workflow branch
dependencies; branch-qualified Effect and resumption correlation; explicit join in authored order;
dependency-set Event/resumption waits; version-required branch Structured Memory writes with
observable whole-view conflict handling.

**Non-obvious invariant.** Branch ≠ Execution. Controller-state mutation stays serialized while
independent work overlaps. Fork, branch completion, join, and downstream Stage execution are
distinct. An unversioned branch memory write fails before the Harness; a conflict is an observation
for the branch, not an automatic retry or merge.

**Target owner.** [Runtime](../../mental-model/runtime.md) with boundary acceptance in [Kernel](../../mental-model/kernel.md).

**Representative source.** `workflow/control-state.ts`, `workflow/resumption-keys.ts`,
`controllers/workflow/controller.ts`, `runtime/harness.ts`, `runtime/resumption-processor.ts`.

**Representative tests.** `tests/conformance/workflow/parallel-fork-join.test.ts`,
`parallel-branch-effects.test.ts`, `parallel-branch-resumptions.test.ts`,
`parallel-branch-structured-memory.test.ts`,
`tests/conformance/execution/multi-dependency-wait.test.ts`.

**Major deferrals.** Multi-Stage/nested/concurrent forks, branch adapters/emissions, failure-driven
sibling cancellation, join reducers/automatic merge/retry, branch Working Notes semantics.

## 13. Current MCP proof

**Implemented capability.** MCP SDK v2 boundary package; import/list/call of synchronous Tools as
portable/native capability operations; explicit allowlisted export of selected capability
operations as Tools; strict local identity mapping; schema subset translation; any-JSON result
normalization; consequential outcome-certainty protection.

**Non-obvious invariant.** MCP objects do not become kernel semantics. MCP metadata does not grant
authority. Import/export must preserve the accepted input set and honest `success | failure |
unknown` certainty.

**Target owner.** [Deployment](../../mental-model/deployment.md), with retained proof
constraints in [`005`](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/legacy/development/2026-09-baseline/005-interoperability-baseline-and-next-constraints.md).

**Representative source.** `packages/interoperability/mcp/src/import/importer.ts`,
`import/identity.ts`, `import/result.ts`, `schema/from-json-schema.ts`, `export/tools.ts`.

**Representative tests.** `packages/interoperability/mcp/tests/mcp-protocol.test.ts`,
`schema-translation.test.ts`, `tests/conformance/mcp/imported-operation-authority.test.ts`,
`imported-operation-outcome-certainty.test.ts`, `exported-operation.test.ts`.

**Major deferrals.** Resources, Prompts/templates, Tasks/handles, elicitation, notifications,
sessions/auth/hosting, A2A/service projection.

## 14. Reference stores, providers, and retrieval

**Implemented capability.** In-memory Definition/Runtime stores, FIFO scheduler, scripted and
deferred providers/executors, local lexical/resource retrieval, Gemini model provider, and Strands
integration.

**Non-obvious invariant.** Reference implementations demonstrate ports; they do not make their
mechanisms canonical. No durable implementation of the complete Execution-kernel `RuntimeStore`
ships in this repository.

**Target owner.** The port's relevant concept owner in the [reference index](../../mental-model/reference.md).

**Representative source.** `packages/core/src/reference/`, `packages/retrieval/local/src/`,
`packages/models/gemini/src/`, `packages/agents/strands/src/`.

**Representative tests.** `tests/conformance/contracts/`, package-local tests under
`packages/*/tests/`, and `tests/conformance/models/`.

**Major deferrals.** Full durable RuntimeStore/scheduler, provider/service registry, production
policy and isolation backends.

## 15. Conformance, eval, and benchmark surfaces

**Implemented capability.** Offline semantic conformance across packages and
`tests/conformance/`; package contracts; behavioral Agent evals under `tests/evals/`; opt-in live
canaries. Cross-framework benchmark subjects and their evaluation live in the standalone
`ArrokothI/benchmark` repository, not in this repository.

**Non-obvious invariant.** Semantic conformance ≠ behavioral quality evaluation ≠ performance
measurement ≠ live integration health. A passing category cannot substitute for another.

**Target owner.** No architecture concept is created here; the owning docs define the
invariants being tested. Historical engineering guidance is in [`003`](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/legacy/development/2026-09-baseline/003-agent-effectiveness-guidance.md)
and [`004`](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/legacy/development/2026-09-baseline/004-efficiency-and-developer-ergonomics.md).

**Representative commands.** `npm test`, `npm run test:conformance`, `npm run test:mcp`,
`npm run test:evals`, `npm run typecheck`.

**Major deferrals.** Orchestration-overhead reporting, durable/hosted benchmarks, and the
whole-architecture release-readiness campaign in [`001`](001-current-status-and-roadmap.md).


## 16. Application SDK above core

**Implemented capability.** `@arrokothi/sdk` creates one shared Harness, stock Agent/Workflow
controllers, reference runtime services, shared model services, store-backed operation/memory views,
implementation registries, idempotent definition registration, preflighted initial creation/input,
and bounded host driving with explicit lifecycle/wait reasons. No authority is inferred from authored
requirements or catalogs. Core remains directly available.

**Evidence.** `packages/sdk/src/`, `packages/sdk/tests/`, the SDK-backed
`examples/execution-kernel-minimal/`, and `scripts/check-builder-docs.ts`.
The [SDK design/findings note](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/legacy/development/2026-09-baseline/009-sdk-bootstrap-design-and-findings.md) records defaults, limits,
constructor-validation and operation-index bug repairs, and unresolved architectural concerns.

**Boundaries.** This is application composition, not new kernel semantics. Preflight is advisory for
permissions and dynamic services; runtime remains authoritative. Default stores are in memory;
host waiting limits do not interrupt arbitrary trusted code or supply provider cancellation/durability.

## Current gaps and next work

The [active roadmap](001-current-status-and-roadmap.md) replaces P1–P7/B1–B3. Begin with K0 contract fixtures, then K1 asynchronous acceptance and K2 actions; R1 challenges native fidelity before K3 persistence. [F01–F19](003-evidence-and-findings.md)
record schema enforcement asymmetry, text/literal result limits, live-promise and activation recovery
gaps, scheduler fencing, physical store cost, long-lived state and distribution concerns. They are
not implemented fixes. The benchmark canary predates SDK HEAD and does not establish durability.
