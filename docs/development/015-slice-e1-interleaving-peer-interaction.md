# Slice E.1 — Controlled Interleaving, Peer Interaction, and Child Cancellation

> **Status: implemented checkpoint on `slice-e-composition`. Not merged to `main`.**
>
> E.1 is the second checkpoint of Slice E. It lifts v0.4's exclusive `ControllerResumption`
> suspension with a minimal, serializable interleaving opt-in and the minimal stale-continuation
> rule that must ship with it; it makes `SendMessage` operational as `send` / `ask` / `reply`; it
> adds observable cross-Execution wait-for diagnostics; and it adds the basic child-cancellation
> runtime hook. It does **not** implement E.2 (`RequestUserInput`, mechanical confirmation, Agent
> Stage / Workflow Stage, broad model-facing peer/child discovery).
>
> **Baseline:** `slice-e-composition` at `b26de1e` (E.0 + E.0.1 accepted checkpoint). E.1 lands at
> `npm test` 737, `npm run test:evals` 12, `npm run test:benchmark-subjects` 8, `npm run typecheck`
> clean.
>
> Canonical architecture documents remain authoritative. E.1 required **no** canonical-doc change:
> every mechanism here is an implementation of semantics `docs/execution-runtime.md` and
> `docs/composition.md` already own (controlled interleaving between Activations, the
> stale-continuation warning in §10, `send`/`ask` in §5, wait-for diagnostics in §12, cancellation
> in §15). §17 below records why.

---

## 1. Baseline

`b26de1e095cb3a1c8a006adff225329edcea6498` on branch `slice-e-composition`. No new branch; not
merged.

---

## 2. Controlled interleaving

### Persisted representation

`ExecutionWait` (`execution/context.ts`) gains one optional field on both arms:

```ts
type ExecutionWait =
  | { kind: "event"; wake: WakeCondition; interleave?: WakeCondition }
  | { kind: "controller_resumption"; resumptionId: ControllerResumptionId; interleave?: WakeCondition };
```

`interleave` is plain declarative runtime data - the same shape as `wake`. **No callback, no
predicate, no function** enters `ExecutionWait`. A controller reports it through
`ControllerNext.await_event` / `await_resumption`, which gained the same optional field;
`runtime/activation.ts` validates it exactly like the primary `wake` (a malformed interleave
condition is a rejected outcome, not a silently dropped field).

### Default / no-interleave behaviour

Absent `interleave`, behaviour is byte-identical to v0.4:

```text
event arm          only a matching primary `wake` Event makes the Execution READY
resumption arm     suspends EXCLUSIVELY - Events reach the mailbox, none produces an
                   intervening Activation while the continuation is outstanding
```

Conformance: `controlled-interleaving.test.ts` R5 ("a controller with no interleave declaration
keeps the exact v0.4 exclusive-resumption behaviour"). The reference Agent and Workflow controllers
were **not** globally opted into anything - E.1's runtime proof uses purpose-built scripted
controllers (`testing/scripted-controllers.ts` gained `interleave` on `await` / `local_work` and
`send` / `ask` / `ask_sender` / `reply` steps).

### Interleaving eligibility ≠ mandatory immediate execution

An `interleave` condition means **"this Event is semantically eligible to overtake the current
wait"**, not **"every matching Event must force an immediate expensive local/model restart"**.
Concretely:

- `runtime/event-router.ts` only acts on the interleave path when the Execution is `WAITING` **and**
  `wait.interleave` matches. It makes the Execution `READY`; it starts no controller work.
- After an interleave wake, `transitionContext` clears `waitingFor` to `null`. Further Events that
  arrive before the next Activation take the ordinary mailbox-only path - there is no live wait to
  overtake, so they cause no second wake decision and no resumption is touched.
- `EFFECT delivery -> provider/model` has no path. `routeEvent` appends to a mailbox and, at most,
  flips `WAITING -> READY`. The controller decides in its next Activation whether fresh expensive
  work is needed.

No debounce framework, timer, batching service, speculative Event merge, or new scheduler
abstraction was added. The mechanism is exactly: **mailbox persistence + serialized Activations +
the controller deciding when new expensive local work is actually required.**

---

## 3. Stale-continuation rule

### Why `ExecutionContext.revision` equality was not used

`ControllerResumption.observedRevision` records the `ExecutionContext.revision` the suspending
Activation read. E.1 deliberately does **not** implement `if (current.revision !==
resumption.observedRevision) stale()`: `ExecutionContext.revision` also advances for ordinary
lifecycle bookkeeping (`READY -> RUNNING`, `RUNNING -> WAITING`, `WAITING -> READY`), so that
comparison would classify a normal suspension as an intervening semantic mutation. `observedRevision`
is retained as provenance only.

### The rule

`ControllerResumptionState` gains `"invalidated"` alongside `"pending"` / `"settled"`, plus
provenance (`invalidatedAt`, `invalidatedByEventId`, `invalidatedAtRevision`).

```text
Execution WAITING on ControllerResumption R, with a configured interleave condition
matching configured interleave Event E arrives
        ↓  ONE transaction (runtime/event-router.ts):
   persist E in the mailbox
   invalidate R                    (pending -> invalidated; idempotent; a no-op if already
                                    settled or already invalidated)
   WAITING -> READY
        ↓  later:
   R's underlying promise may finish, but resumption-processor's settle() acts only on a
   `pending` record: an invalidated one does not settle, does not wake, does not become an Event
        ↓  next Activation:
   the controller re-runs its `run(key)`; findControllerResumptionByKey skips invalidated
   records, so a re-derived key starts FRESH work rather than recovering an obsolete outcome
```

This is deliberately simpler than merging a stale model continuation, and it may fire slightly
earlier than "a semantic commit occurred" - which is acceptable because only an explicitly
opted-in interleave Event can trigger it. Merge-safe / rebase semantics remain future work; no
merge-safe escape hatch was added.

### Cost optimisation did not weaken stale safety

The desire to avoid wasting model tokens does **not** permit an obsolete result to commit. The
invalidated record's late value is dropped, not merged. Conversely, an obsolete result being
invalidated does **not** trigger an automatic replacement model call - `routeEvent` invalidates and
sets `READY`; nothing more. The next Activation processes accumulated Events first, and only then
does the controller decide whether one fresh invocation is needed
(`controlled-interleaving.test.ts` R2, R6, R7).

### `findControllerResumptionByKey` contract change

The lookup previously assumed one reusable record per stable key. E.1 may leave historical
`invalidated` records alongside a fresh one. The contract (`ports/runtime-store.ts`) and the
reference implementation now return the **reusable** record - a `pending` one (recover as a
suspension) or the most recent `settled` one - and **never** an `invalidated` one. If only
invalidated records exist, it returns `undefined` and the resumed Activation dispatches fresh work.

---

## 4. Resumption race proof

`controlled-interleaving.test.ts` proves both orderings deterministically (barriers, no sleeps):

**R1 — resumption settles first.** `settle()` transitions `WAITING -> READY` on the resumption
path. A later Event is then mailbox-only (the Execution is `READY`, not `WAITING`), so the
already-settled reusable result is **not** invalidated. The next Activation observes both the
settled local result (via `findByKey`) and the queued Event - the Event is not lost.

**R2 — interleave Event wins.** `E` arrives while `R` is pending; `R` is atomically invalidated in
the same transaction that queues `E` and sets `READY`. The late `R` result cannot wake the
Execution and is not returned by `findByKey`. A fresh resumption is started from the consolidated
state.

**E2 / E3 after E1 invalidated R, before replacement work begins** (R6, R7):

```text
one old-resumption invalidation (from E1 only)
+  zero provider/model invocations caused merely by E1/E2/E3 delivery
+  one Activation consumes E1+E2+E3 together
+  then, if the controller still needs it, at most one fresh invocation
```

**R8 — a deliberately started R2 may itself be invalidated** if a *separate* scheduled Activation
started it and a *later* configured Event overtakes it. This is distinct from repeated delivery
invalidating a no-longer-live R1.

Neither ordering produces a duplicate Activation, two controller writers, stale result reuse, a
lost Event, an Event fabricated for a model result, a permanently WAITING Execution, or one
replacement model invocation per arriving Event.

---

## 5. SendMessage runtime path

`send_message` is now in `DISPATCHABLE_EFFECT_KINDS`. `EffectProcessor.dispatchSendMessage`:

```text
controller  --SendMessage proposal (send / ask / reply)-->  EffectProcessor
  ↓ decide()  (EffectAuthorizer)                deny            -> effect.denied
  ↓ (reply) resolve the open PeerRequestLink    missing/settled/not-addressee -> effect.rejected
  ↓ resolve the destination Execution           missing/terminal -> effect.rejected
  ↓ ONE transaction:
      journal authorized + dispatch_started
      sender PendingOperation (effectKind send_message, deadline null)
      routeEvent(peer.message) to the recipient   fromExecutionId is runtime-owned
      reply:  settle the asker's exact original PendingOperation, close the link
      ask:    leave the sender PendingOperation pending, insert the PeerRequestLink
      send/reply: settle the sender PendingOperation now, routeEvent(message.sent) to the sender
  ↓ post-commit: scheduler.enqueue(recipient) if the peer.message woke it
```

The sender never writes another Execution's mailbox: the only route is `routeEvent`, called inside
the gateway transaction. A controller never receives a mailbox handle. Architecture assertions
(`composition-boundaries.test.ts`): `dispatchSendMessage(` appears only in
`runtime/effect-processor.ts`; `kind: "peer.message"` is minted only there; no `controllers/`
module names the peer-link, cancellation, `routeEvent`, or `cancelExecution` machinery.

---

## 6. Send vs ask vs reply

Same Effect kind. There is no `AskMessage` or `ReplyMessage`.

| | sender PendingOperation | acknowledgement | link |
|---|---|---|---|
| `send` | settled `success` immediately | `message.sent` (admitted, **not** processed) | none |
| `ask` | stays `pending` until the peer replies | none | `PeerRequestLink { state: open }` |
| `reply` | settled `success` immediately (`message.sent`) | + settles the **asker's** exact original PendingOperation, closes the link | closes the ask's link |

"sent" means the runtime successfully admitted/persisted the message for that destination.
`ask` is **not** a child call - the destination need not terminate, and its terminal result is
never the dependency; the correlated reply is. `send-message.test.ts` covers all three plus
duplicate-reply, third-party-reply, and unknown/terminal-destination.

---

## 7. Peer correlation integrity

`PeerRequestLink` (`execution/peer-request-link.ts`) is runtime state, keyed by a runtime-minted
`messageId`. It records the requester, the **expected** responder, the requester's effect / pending
operation / correlation, and `state: open | settled`.

`dispatchSendMessage` for a `reply` checks, inside the transaction:

- an open link named by `inReplyToMessageId` exists (`reply_no_such_request` otherwise);
- its `state` is `open` (`reply_already_settled` otherwise - a duplicate reply settles nothing twice);
- `link.responderExecutionId === senderId` (`reply_not_addressee` otherwise - a third Execution
  holding the id cannot answer).

The reply `peer.message` carries `correlationId = link.requestCorrelationId`, so it settles the
asker's **exact** original PendingOperation and no other. A guessed message/correlation id, an
`ExecutionId`, or request metadata is not a credential - the runtime checks the responder identity
against the link, not the id (`send-message.test.ts` "a third Execution cannot settle someone
else's ask, even holding the message id").

---

## 8. Messaging authority

`SendMessage` is authorized by the `EffectAuthorizer`, deny-by-default. The reference allow-list
policy gains `message?: boolean | { destinations: string[] }` (omitted = every send denied).

**Order.** `decide()` runs **before** any destination lookup. A policy `deny` returns
`effect.denied` and reads no destination Execution at all (`messaging-authority.test.ts` counts
`readExecution` calls: a denied send to a real target and to a guessed target both produce the same
`message_not_authorized` denial and zero destination reads). Destination existence /
terminal-state checks (`message_destination_not_found`, `message_destination_terminal`,
`reply_no_such_request`, `reply_not_addressee`) happen only **after** authorization, as
`effect.rejected`.

**A reply is an outbound send** and passes the responder's current policy
(`send-message.test.ts` "a responder whose current policy denies messaging cannot reply, despite
holding the request metadata"). Message body/content is an input to policy at most; it cannot
influence the grant, and the `peer.message` source identity comes from runtime context, never a
controller-provided `from` field.

**Documented limitation.** Peer destinations are deliberately **not** modelled as capability
operations (they are not operations) and are not forced into `EffectiveOperationAuthority`. In this
first peer-messaging runtime the policy boundary itself is the policy-backed effective decision for
peer sends. A richer per-destination grant model is future work.

---

## 9. A↔B liveness proof

`composition/peer-liveness.test.ts`, scripted controllers, deterministic:

```text
A: ask B ("need value B")   requestKey "AB", interleave peer.message   -> WAITING on AB
B: (woken by A's ask) ask_sender A ("need clarification")   requestKey "BA", interleave  -> WAITING on BA
A: (interleave-woken by B's ask, original AB still pending) reply to B  -> A back to WAITING on AB
B: (woken by A's reply, its BA ask settled) reply to A's original ask   -> A's AB ask settles
A: (woken) complete            B: complete
```

Proven:

- both Executions reach `COMPLETED`;
- both original `send_message` PendingOperations settle `success`, each with a **distinct** reply
  Event;
- **no concurrent controller writer**: every `RUNNING` transition for A and for B is closed by a
  non-`RUNNING` transition before the next `RUNNING` (asserted from the transition log);
- one blocked continuation never closed either mailbox (both processed multiple Events across
  multiple Activations);
- neither ask was rejected for being cyclic; the wait cycle was never treated as a deadlock;
- both `PeerRequestLink`s close, so the wait cycle is gone once the dependencies settle.

A second case drives A↔B where neither replies, and asserts the wait graph contains
`A -> B` and `B -> A` while both remain `WAITING` (not `FAILED`, not terminated).

---

## 10. Wait-for diagnostics

`execution/wait-for.ts` defines `WaitForEdge { sourceExecutionId, targetExecutionId, kind:
child_call | peer_ask, pendingOperationId, correlationId }`. `Harness.waitForEdgesFrom(executionId)`
**derives** it from the existing links - no third stored graph:

```text
child_call   ChildExecutionLink, state "active", pendingOperationId != null   parent -> child
peer_ask     PeerRequestLink,    state "open"                                 asker  -> expected responder
```

Once a dependency settles, its link moves to `settled` and the edge disappears from the view. A
cycle in this view is a **deadlock candidate for diagnostics only** - `Harness` has no code that
terminates a cycle. There is no graph library.

---

## 11. Child cancellation

`Harness.cancelExecution({ executionId, reason? })` is a **trusted runtime-control entry point** at
the same trust level as `settleEffect` / `deliverExternalInput`. It is not a model action and not
an Effect (no sixth Effect kind was added).

```text
CREATED / READY / WAITING child   -> straight to CANCELLED now, in one transaction
RUNNING child                     -> a CancellationRequest { state: pending } is recorded in its
                                     OWN facet (no ExecutionContext write, so the in-flight
                                     Activation's revision CAS is untouched). The current
                                     Activation finishes; applyOutcome sees the pending request and
                                     applies CANCELLED instead of the controller's reported `next`
                                     - UNLESS the controller's report was itself terminal
                                     (complete / fail), in which case that race is the controller's.
already terminal                   -> idempotent no-op (`already_terminal`)
```

Also handled: a pending cancellation claims a `READY` Execution on the scheduler path before it
ever runs an Activation; a queued scheduler claim for a now-`CANCELLED` Execution is dropped by the
existing `activate` "not READY -> return null" path; a late resumption/Effect settlement against a
`CANCELLED` Execution does not wake it (the existing terminal-lifecycle checks).

**Parent settlement.** `settleOwnerOnChildTerminal` was generalised to `COMPLETED | FAILED |
CANCELLED`. A `call` parent's **exact** PendingOperation settles with outcome `"cancelled"` (new
`PendingOutcomeState` value - **not** `"failure"`), one correlated **`child.cancelled`** Event
(distinct kind from `child.failed`), the `ChildExecutionLink` closes. `EffectJournalPhase` gains
`"cancelled"` for the same honesty.

**No propagation.** Cancelling a child does not cancel the parent, siblings, or descendants. A
detached `spawn` has no terminal-result dependency, so nothing is delivered to its parent. E.1
establishes only the hook and correct terminal settlement; supervision / restart / cascade policy
remains later work.

`composition/child-cancellation.test.ts` covers READY / WAITING / RUNNING / already-terminal /
idempotent / detached / sibling.

### RUNNING cancellation behaviour

The current Activation may already have dispatched work that cannot be undone. Cancellation means:
stop future semantic progression; do not claim rollback of already-dispatched external effects. The
`CancellationRequest` record is the narrow persisted seam that lets the current Activation reach a
safe boundary rather than racing an uncontrolled context mutation. This did **not** require a
broader runtime-control redesign - §32.10 stop condition was checked and not hit.

---

## 12. Boundary preservation

Confirmed by `composition-boundaries.test.ts` (E.1 section), `mcp-boundaries.test.ts`,
`event-vocabulary.test.ts`, and manual diff review:

- **No new Effect kind.** The union is still `use_capability | write_memory | spawn_execution |
  send_message | request_user_input`. `send` / `ask` / `reply` are all `SendMessage`; cancellation
  is not an Effect.
- **No model-result Event.** No `controller_resumption.invalidated` Event kind. Invalidation is
  runtime state with provenance; the record still imports nothing.
- **No direct peer mailbox access.** `dispatchSendMessage` appears only in the Effect gateway;
  `peer.message` is minted only there, always via `routeEvent`.
- **No global reference-Agent `peer.message` opt-in.** The Agent controller is untouched; the
  runtime proof uses scripted controllers. The full model-facing Agent peer surface is deferred to
  E.2.
- **No Event-delivery-to-model-call shortcut.** `routeEvent` appends to a mailbox and at most flips
  `WAITING -> READY`.
- **No debounce / batching framework.**
- Controller modules import neither `RuntimeStore`, `Harness`, `runtime/effect-processor.ts`,
  `execution/peer-request-link.ts`, `execution/cancellation-request.ts`, nor `execution/wait-for.ts`.
- `ControllerResumption` remains non-Event; its invalidation remains runtime state.
- The wait graph is diagnostics, not authority.
- Event vocabulary: `child.cancelled`, `message.sent`, `peer.message` were added, all as
  implementations of already-canonical semantics (child terminal outcome, peer message,
  Effect-result acknowledgement).

---

## 13. `014` simple-path and interleaving cost

### Simple-path cost

`execution/interleaving-cost.test.ts` "an ordinary Agent step touches no peer, wait-graph,
invalidation, or cancellation machinery": an Agent whose whole program is `emit` + a capability
call + `await`, run under a facet-counting store, touches **zero** of:

```text
peerRequestLinks.{insert,get,update,listByRequester,listByResponder}
readPeerRequestLink / listPeerRequestLinksBy{Requester,Responder}
cancellationRequests.{insert,update}
controllerResumptions.update:invalidated
```

The **only** always-on new cost on the simple path is a single-record `cancellationRequests.get`
branch check on the claim path and in `applyOutcome` - `O(Activations)`, never a scan. `014` §
"a small constant branch/check inside normal runtime code is acceptable" covers this. No
no-message / no-interleave workload gains an invisible replacement model call: `routeEvent` starts
no controller work, and the resumption path is unchanged when no interleave condition is present.

### Interleaving observation (observations for `014`, NOT a kernel budget)

For the accumulation fixture (`interleaving-cost.test.ts` "accumulation fixture"):

```text
R1 pending
E1 interleaves and invalidates R1
E2, E3 arrive before replacement work starts
```

produced, in the focused test:

```text
invalidated controller resumptions:                              1
fresh controller-local invocations after interleaving:           1   (the one deliberate R2 the
                                                                      controller started after
                                                                      semantic re-evaluation)
Events processed by the relevant Activation:                     3   (E1 + E2 + E3, one Activation)
```

and specifically:

```text
one old-resumption invalidation
+  0 provider/model invocations caused merely by E1/E2/E3 delivery
+  at most 1 fresh invocation after consolidated semantic processing
```

These numbers are measurements for `014`, not kernel semantics. No permanent numeric
interleaving-cost budget was placed in the runtime's correctness contract.

---

## 14. Tests

| command | count | result |
|---|---|---|
| `npm test` | 737 | pass (was 691 at E.0, 705 at E.0.1; +16 baseline pre-E.1 → +32 in E.1) |
| `npm run typecheck` | — | clean |
| `npm run test:evals` | 12 | pass |
| `npm run test:benchmark-subjects` | 8 | pass |

New conformance files:

- `tests/conformance/execution/controlled-interleaving.test.ts` (9 cases) — R1-R8 + default
  compatibility + `await_event` interleave.
- `tests/conformance/execution/interleaving-cost.test.ts` (2 cases) — `014` simple-path cost +
  accumulation-fixture observations.
- `tests/conformance/interaction/send-message.test.ts` (8 cases) — send / ask / reply / correlation
  integrity / authorization.
- `tests/conformance/interaction/messaging-authority.test.ts` (4 cases) — deny-by-default, policy
  order, existence-disclosure, content-cannot-grant.
- `tests/conformance/composition/peer-liveness.test.ts` (2 cases) — A↔B liveness proof + wait-cycle
  diagnostics.
- `tests/conformance/composition/child-cancellation.test.ts` (6 cases) — READY / WAITING / RUNNING
  / idempotent / detached / sibling.

Updated: `controller-resumption.test.ts` (record key set + invalidation provenance),
`event-vocabulary.test.ts` / `mcp-boundaries.test.ts` (the three new Event kinds),
`effect-gateway.test.ts` (`write_memory` is now the unimplemented-kind example, since `send_message`
is implemented), `composition-boundaries.test.ts` (E.1 boundary section), the RuntimeStore contract
suite (peer-request-link + cancellation-request facets), and the four in-test `RuntimeStore`
wrappers (`BreakableStore`, `CountingRuntimeStore`, `SingleConflictStore`, `NarrowingStore` — the
four new read methods).

---

## 15. Docs / config

- **Created:** this document.
- **Updated:** `docs/development/README.md` (Slice E sequence: E.1 → accepted-pending-review, E.2 →
  next).
- Canonical docs: **no change** (see §17).
- `AGENTS.md`, `CLAUDE.md`, `.agents/skills/`: **no change** — nothing became materially false.
- `013`: **no change** — its E.1 forward note (a `call` parent whose child reaches `CANCELLED` must
  settle the exact parent PendingOperation as cancellation with one correlated Event) was
  *fulfilled* exactly, not proven wrong.

---

## 16. Deferred to E.2

- `RequestUserInput` implementation and user-input continuation.
- Mechanical confirmation / exact-payload confirmation baseline.
- Agent Stage / Workflow Stage authoring surfaces (`controllers/workflow` still returns
  `stage_kind_unsupported`).
- Full model-facing child/peer discovery; `ModelActionTarget` child/peer extensions.
- Adapting the **reference Agent** to interleave on `peer.message` (discard/rebuild the in-flight
  `invocation` snapshot from consolidated state before another model call). E.1's runtime proof is
  deterministic-controller only.
- Workflow model resumptions remain exclusive (no concrete Workflow peer/interleave handler).
- Broad Agent multi-progression UX, Workflow parallel branches, memory / `WriteMemory` / Working
  Notes.
- Supervision / restart / cascade / sibling cancellation policy; child authority redesign.
- Universal deadlock detection / killing; general distributed leases; timers / deadline scheduler.
- Richer per-destination messaging grant model; a generic conversation/session ontology.
- A merge-safe / rebase escape hatch for stale continuations.

---

## 17. Blockers

**None.** Every §32 stop condition was checked and none was hit:

1. Interleaving needs no concurrent controller-state writers — it is interleaving *between*
   serialized Activations; `peer-liveness.test.ts` asserts single-writer from the transition log.
2. Stale safety needs no model-result-to-Event conversion — the invalidated record's late value is
   dropped, not delivered.
3. The stale test is not naive `ExecutionContext.revision` equality — §3 explains why, and the
   tests use `state === "invalidated"` provenance.
4. A stale resumption result cannot be returned by stable-key recovery — `findControllerResumptionByKey`
   skips `invalidated` records (contract + reference + R2 test).
5. `ask` does not need correlation IDs as bearer credentials — the runtime checks the responder
   identity against the `PeerRequestLink`.
6. Peer reply settlement proves the responder is the intended peer — `responderExecutionId ===
   senderId` check, `reply_not_addressee` otherwise.
7. `SendMessage` does not bypass the `EffectAuthorizer` — `dispatchSendMessage` calls `decide()`
   first, deny-by-default.
8. Message policy does not pretend peer destinations are capability operations — a separate
   `message?` grant rule; documented limitation in §8.
9. Child `CANCELLED` settlement does not call it `FAILED` — new `PendingOutcomeState "cancelled"`,
   new `child.cancelled` Event, new `"cancelled"` journal phase.
10. RUNNING cancellation is coherent without a broader runtime-control seam — the narrow
    `CancellationRequest` record.
11. A↔B liveness needs no hidden host locks across WAITING — proven by the deterministic scripted
    run.
12. No wait cycle is auto-classified as a deadlock — the wait graph has no termination code.
13. No E.2 authoring/model-surface work was necessary.
14. The reference Agent was not globally opted into every `peer.message`.
15. Event delivery does not directly trigger provider/model invocation.
16. No mechanical one-invalidate-per-Event cycle — R7 asserts it.
17. Avoiding model-call thrashing did not require letting a stale result commit — §3.
18. Interleaving cost is controlled by mailbox persistence + serialized Activations, not a
    debounce/timer/batching subsystem.

### Acceptance answers

- **Can an unrelated / non-approved Event wake an Execution suspended on a `ControllerResumption`?**
  No. Only a matching primary dependency, a matching configured `interleave` condition, or the
  resumption settling. (`controlled-interleaving.test.ts` R4, R5.)
- **Can a configured interleaving Event allow another serialized Activation before the old local
  work finishes?** Yes. (R2.)
- **Can the old controller-local result then silently commit stale assumptions?** No — it is
  invalidated and its late value is dropped; a re-derived key starts fresh work. (R2, R3.)
- **Does interleaving create concurrent controller writers?** No. (`peer-liveness.test.ts`
  single-writer assertion.)
- **Does every eligible Event require an immediate replacement model call?** No. (R6, R7,
  `interleaving-cost.test.ts`.)
- **Can several eligible Events that accumulate before the next Activation be processed before
  deciding whether another model call is needed?** Yes — per the existing mailbox/controller
  semantics; one Activation consumes E1+E2+E3. (R6, accumulation fixture.)
- **After R1 is invalidated, can E2/E3 repeatedly invalidate R1 when no fresh resumption exists?**
  No — the Execution is `READY` with `waitingFor: null`, so `routeEvent` takes the mailbox-only
  path. (R7.)
- **May a genuinely fresh R2 later be invalidated if a later configured Event overtakes it after a
  separate Activation deliberately started R2?** Yes. (R8.)
- **Is stale safety weakened to save model cost?** No. (§3.)
- **Is `ask` a new Effect kind?** No — `SendMessage` plus a required reply dependency.
- **Can knowledge of a message/correlation id authorize a reply or settle someone else's ask?**
  No. (`send-message.test.ts`.)
- **Is an A↔B wait cycle automatically a deadlock?** No. (`peer-liveness.test.ts`.)
- **Does child cancellation settle a `call` as failure?** No — `outcome: "cancelled"`,
  `child.cancelled`. (`child-cancellation.test.ts`.)
- **Did E.1 implement `RequestUserInput`, confirmation, Agent Stage, or Workflow Stage?** No.
