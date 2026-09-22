# Rewrite index (internal working artifact)

Navigation for the `mental-model/` rewrite project. **Not architecture documentation, not a
second place to state a rule, not user-facing.** Every line here points at an owner; where this
file and an owner disagree, the owner is right and this file is stale.

Precedence used throughout: Layer 3 (`concepts/`, `mechanisms/`) owns rules; Layer 1/2
(`README.md`, `kernel.md`, `runtime.md`, `driver.md`, `deployment.md`) summarize and are the
defect when they disagree. `docs/development/` owns status, never semantics. Historical `work/`
records describe their candidate at their date; they are evidence of *why* a rule exists, never a
current rule. Paths below are repo-relative from the repository root.

Shorthand: **MM** = `mental-model/`, **WS** = `tests/fixtures/k0/protocol-worksheet.md`
(accepted revision 12), **LEDGER** = `docs/development/007-work-packets.md`,
**BASELINE** = `docs/development/002-implemented-kernel-baseline.md`.

Historical `work/` and retired review paths in this working index refer to the original
paths in the [verified archive](../docs/development/archive.md), not the active checkout.

---

## 1. Concept index

Where an owner page states its own grouping, this index uses it, so that a reader moving between the
two is not re-sorting terms in their head. §1.1–§1.5 follow `concepts/core.md`'s four groups — *who
is involved* (§1.1 the parties, §1.2 what they run), *one exchange* (§1.3), *what arrives* (§1.4),
*waiting for what arrives* (§1.5) — §1.8 follows `concepts/operations.md`'s three families, and §1.9
follows `concepts/roles.md`'s three groups, which predate this branch. A grouping here that its owner
page does not use is this file's defect. §1.10 and §1.11 still carry the pre-rewrite shape of pages
that have not been rewritten yet.

### 1.1 Who is involved: the four parties

**Kernel** — Owner: `MM/concepts/core.md#kernel`. Related: `MM/kernel.md`,
`MM/mechanisms/execution-cycle.md`, `concepts/operations.md#kernel-worker`.
Established: provider-neutral coordinator; accepts and records Execution state changes, addressed
observations and mediated action requests; owns lifecycle, authority enforcement **on mediated
paths only**, scheduling semantics, communication, recovery of accepted truth. Does not own the
work's algorithm.
Do not infer: that Kernel = a process, service or deployment unit (that is Kernel Worker); that
Kernel authority prevents ambient native action; that owning these semantics requires a custom
database/queue/scheduler/consensus layer (`MM/kernel.md` last paragraph says it does not).

**Execution** — Owner: `concepts/core.md#execution`. Related: `mechanisms/lifecycle.md`,
`mechanisms/creation.md#one-atomic-creation`.
Established: one independently addressable *logical lifetime* of work, with authority binding,
accepted progress and eventual result/failure/cancellation. ID never reused, even after deletion
(WS ID-1). The **application** chooses what work merits this lifetime.
Do not infer: that a session, process, user, tenant, chat turn or native run is an Execution; that
an Execution is a principal (`concepts/actions.md#principal-and-authority` denies it); a fixed
granularity — a chat session may hold several, a whole multi-agent workflow may be one.

**Execution Runtime** (short: Runtime) — Owner: `concepts/core.md#execution-runtime`. Related:
`MM/runtime.md`, `concepts/roles.md`, `mechanisms/composition.md`.
Established: code or service performing the work; owns the *meaning* of continuation data; native
algorithms and internal workers stay opaque to the Kernel.
Do not infer: that "Runtime" means the JS VM or the deployment host (explicitly denied); that
Agent/Workflow is a Kernel-visible type; that a Runtime awaiting an internal model call is
`WAITING`.

**Execution Driver** (short: Driver) — Owner: `concepts/core.md#execution-driver`. Related:
`MM/driver.md`, `mechanisms/integration.md`, `mechanisms/execution-cycle.md#delivery-reporting-boundary`.
Established: adapter from Runtime to Kernel protocol; declares which native continuation and
action guarantees it preserves. Can be an in-process function.
Do not infer: that a Driver is a second scheduler, a required service or a separate process; that
Execution↔native-run mapping is one-to-one (`MM/driver.md` states it is not); that compiling
against an interface proves fidelity.

### 1.2 Who is involved: what an Execution runs

**Definition** — Owner: `concepts/core.md#definition`. Related: `concepts/identity.md#revision`,
`mechanisms/creation.md#one-atomic-creation`.
Established: versioned executable code/configuration selected for an Execution; the Kernel holds
only the *pinned revision* and does not interpret the code; creation binds revision + authority +
initial input in one decision; a later Activation carries it. Same Creation request ID with different
Definition content is a **conflict that creates nothing**.
Do not infer: **the exact form a Definition *or its pinned revision* takes — the page carries one
`OPEN(unassigned)` marker covering both.**
Do not infer that it is a friendly name, a registry entry, or that the Kernel can validate it.

**Runtime contract** — Owner: `concepts/core.md#runtime-contract`.
Established: separate versioned agreement by which the Driver interprets Activation→native call
and native result→Outcome/progress. Kernel holds only the pinned revision. Compatibility is
decided by this pin, **never by an Agent/Workflow tag**. Distinct from the progress codec: codec
decodes bytes, contract interprets meaning; same bytes under a renaming contract must be *held*,
not resumed.

### 1.3 One exchange

**Activation** — Owner: `concepts/core.md#activation`. Related:
`mechanisms/execution-cycle.md#before-sending`, `#retry-versus-takeover`,
`concepts/identity.md#runtime-attempt`, `#dispatch-and-delivery`.
Established: one *immutable semantic exchange* asking a Runtime to advance an Execution from pinned
progress plus a fixed Event batch. Carries a finite batch and bounded values; the computation it
requests is **not** time-bounded. Dispatch does not block. Identity survives ordinary redelivery
and authorized takeover; only the writer epoch advances on takeover. New semantic input needs a
new Activation after resolution. At most one current Activation per Execution may have an Outcome
accepted.
Do not infer: that takeover mints a new Activation ID (WS ID-3; the round-1 correction); that
"Activation" = one conversation turn or one model call; that redelivery is a new attempt.

**Outcome** — Owner: `concepts/core.md#outcome`. Related:
`mechanisms/execution-cycle.md#outcome-acceptance`.
Established: the Runtime's proposal ending an Activation — progress, emissions, Effects and one
next step (`continue` | `await` | `complete` | `fail`). It is **only a proposal** until acceptance.
Heartbeats, dispatch acknowledgments and diagnostic streams are operational traffic, not Outcomes.
Do not infer: that returning from `deliver` submits an Outcome; that rejection rolls back native
mutation.

### 1.4 What arrives

**Event** — Owner: `concepts/core.md#event`. Related: `mechanisms/waits.md#eligibility-comes-from-trusted-source-category`,
`concepts/identity.md#request-key-and-input-id`.
Established: immutable accepted observation addressed to an Execution; has identity, destination,
kind, payload, trusted ingress provenance, optional correlation. **Source category** (application
input | Kernel timeout | other trusted result/routed observation) is decided by the *ingress path*,
never by the payload or the kind string. Accepted order is per-Execution only.
Do not infer: cross-Execution ordering; that a payload claiming to be a settlement is one;
**how trusted ingress provenance is represented — the page carries an `OPEN(unassigned)` marker
for its own defining section.**

**Mailbox** — Owner: `concepts/core.md#mailbox`.
Established: the accepted Events addressed to an Execution, each with an *independent* processing
disposition. Not a transport queue, not a cursor. An early result survives until an Activation
carries it.
Do not infer: a global "everything before position N processed" marker (this is exactly finding
F20, `docs/development/003-evidence-and-findings.md`).

**Batch, reservation, acknowledgment** — Owner: `concepts/core.md#batch-reservation-and-acknowledgment`.
Related: `mechanisms/waits.md#selecting-the-batch`, `mechanisms/execution-cycle.md#before-sending`.
Established: batch = finite enumerable set of accepted Event references pinned in one Activation;
reservation fixes it as part of dispatch intent and **acknowledges nothing**; accepted Outcome
acknowledges the **whole** reserved batch. Acknowledgment ≠ obedience. Two per-Event dispositions
exist and only two: acknowledgment and terminal disposition. Implementation picks a finite bound
**≥ 1**; an ordinary continuation may still carry an empty batch.
Do not infer: a per-Event "rejected" disposition; that selected members are acknowledged and
others are not; the exact bound.

### 1.5 Waiting for what arrives

**Wait, subscription, generation** — Owner: `concepts/core.md#wait-subscription-and-generation`.
Related: `mechanisms/waits.md` (whole page).
Established: Runtime-declared need for a Kernel-visible observation, registered by an accepted
Outcome. Contains finite **dependency alternatives** + declared **input subscriptions** (two
distinct kinds, not generic pub/sub), optional deadline, and a **generation** identifying *this
registration*. The generation belongs to the wait, not to the awaited external work.
Do not infer: that the generation identifies the external dependency; that re-registering the same
need reuses a generation; a third list / local-work arm (WS W-4 denies it).

**Readiness** — Owner: `concepts/core.md#readiness`.
Established: accepted state from which a scheduler can reconstruct the need for dispatch.
**Wait-ended readiness** is one-dispatch selection information retained when a wait ends: the
retired selector, plus (for expiry) the mandatory timeout Event. A selector "retires"; it is a
property of readiness, not an addressable object.
Do not infer: that readiness is a queue, a message, or survives more than one reservation.

**Timeout Event** — Owner: `concepts/core.md#timeout-event`. Related: `mechanisms/waits.md#ending-a-wait`.
Established: Kernel-minted Event that one wait generation expired. Stable identity, destination,
distinct timeout class, exact generation correlation, trusted timer provenance. Carried as a
**mandatory next-batch member**, never selected by a dependency or subscription. At most one per
generation.
Do not infer: that it proves the external work failed (WS CL-2); that a repeated timer makes a
second one; that it is a non-Event special batch member (WS B-1 makes it an ordinary Event
precisely so every batch member is an accepted Event).

### 1.6 Identity

Owner page: `concepts/identity.md`. Its framing sentence is the index: each identity answers a
different "same as what?" — requests (request key / Input ID), efforts at one Activation (Runtime
attempt / writer epoch), sends (dispatch / delivery), accepted states (revisions), coverage
(receipts).

- **Request key / creation key / Creation request ID / Input ID** — `#request-key-and-input-id`.
  Request key is caller-chosen text reused on retry; a creation key is that text for creation.
  Creation request ID names the complete create-request identity; its in-process binding includes
  producer namespace, selected creation authority scope and creation key. Naming convention:
  `concepts/identity.md#keys-ids-and-scope`; an ID need not have a composite representation.
  No new “creation request scope” object is introduced. Request keys are **not** content hashes. Input ID is the triple
  (authenticated producer namespace, destination Execution ID, producer request key); namespace
  comes from trusted principal context, never a payload field. **Creation and later input use
  separate identity domains** — accepting the initial Event during creation does *not* consume a
  post-creation Input ID, and the same text may be reused later as a fresh ingress. (K1.1
  correction; see §3.)
  Do not infer: a global cross-tenant dedup ID; that equal content implies the same request.
- **Runtime attempt** — `#runtime-attempt`. The currently authorized effort at one unresolved
  Activation. Ordinary re-sending is still the same attempt; authorized takeover creates a
  replacement attempt **of the same exchange**. Distinct from *physical action attempt*.
- **Writer epoch** — `#writer-epoch`. Which attempt's Outcome may be accepted for the current
  Activation; monotonic within that exchange; advanced **only** by authenticated takeover. It
  fences **the entire Outcome acceptance** (batch acknowledgment, progress, emissions, Effect
  intents, wait/deadline, readiness, next state) — not progress alone. Not authentication; not a
  lock on a native session or filesystem.
  Do not infer: **whether it resets across a later Activation — that is implementation-owned**
  (WS ID-4; over-constraining it is the K0.2 round-13 defect, §5).
- **Dispatch and delivery** — `#dispatch-and-delivery`. Dispatch = Kernel preparing and sending one
  Activation through a Driver; its *dispatch intent* is the accepted record fixing exchange input,
  reserved batch and current attempt before sending. "Delivery" is an ordinary transport verb and
  must always name what and to whom. Receipt of bytes at either hop is **not** Outcome acceptance.
  Do not infer: two physical hops; that "Execution delivery" names anything.
- **Revision** — `#revision`. Seven named revision kinds with different creators (accepted
  progress, base progress, Definition/Runtime contract, progress codec, operation/schema,
  resource/state, action evidence). There is **no global "the revision"**.
  Do not infer: a shared counter, integer representation, or that progress revision 4 with epoch 2
  implies attempt 1 produced revision 5.
- **Acceptance, boundary, receipt** — `#acceptance-boundary-and-receipt`. Six receipt scopes
  (creation/input ingress, dispatch intent, Outcome acceptance, Effect admission, Effect
  settlement, child/message operation). **No single receipt per Execution.** A receipt proves only
  its named decision. Lookup authenticates and scopes before revealing content *or existence*;
  refusal shape/timing must not leak. Kernel timeout acceptance introduces no seventh caller-facing
  receipt.
  Do not infer: that an Outcome receipt says an action ran; receipt serialization or token format.

### 1.7 Actions and authority

Owner page: `concepts/actions.md`; its own opening paragraph gives the life of one mediated action
in order. Mechanism owners: `mechanisms/authority.md` (ordering), `mechanisms/actions.md`
(attempts/evidence).

- **Operation** — `#operation`. A named, versioned, **pre-declared** contract with five parts:
  identity, input/output schema, supported schema features, exact input meaning, result-certainty
  behavior. Identity is stable across revisions and across friendly labels. Operations and
  Activations vary independently.
  Do not infer: the validator or enforced schema subset — **`OPEN(K2.2)`; K2.2 selects it.** Do not
  infer that a Resource, Service or Skill is an Operation.
- **Effect** — `#effect`. A proposal for **one** Kernel-mediated action carried in an Outcome.
  Invoking a service and reading governed data point at an Operation; requesting human input,
  creating a child and sending a message use their own shapes and point at **no** Operation. A
  **proposal key** is the Runtime's local name; acceptance binds it to an **Effect ID**.
  Do not infer: that an Effect is output (an Emission is not an Effect); that an array of Effects
  is a transaction or an ordering (`mechanisms/actions.md#retrying-an-action`); that reads are
  excluded from Effects (`mechanisms/state.md#state-service-contract` says they are not).
- **Logical action and intent** — `#logical-action-and-intent`. Acceptance creates an immutable
  action record; an **intent** is an accepted obligation to perform work later, *not* evidence it
  ran. "Action" means mediated work unless qualified as native.
- **Admission and physical action attempt** — `#admission-and-physical-action-attempt`. Admission
  authorizes a concrete attempt under authority + current policy + required consent, and records it
  under current **dispatch ownership**, which is fenced **independently of the Runtime's writer
  epoch**. Admission can precede sending but cannot prove receipt.
  Do not infer: that a dispatcher exists as a named concept — **the page carries an
  `OPEN(unassigned)` marker saying it has not been defined.**
- **Settlement and reconciliation** — `#settlement-and-reconciliation`. Four **conceptual**
  dimensions kept apart: request disposition, attempt evidence/certainty, result validity,
  responsibility/obligation. Reconciliation queries, it does not re-execute.
  Do not infer: a mandated enum cross-product; that stopping retries changes certainty; that
  acknowledging unknown removes obligation.
- **Principal, authority, policy, grant, delegation** — `#principal-and-authority`. Principal is an
  authenticated *application* identity; an Execution is not one. Authority is an upper bound;
  policy narrows it. Delegation gives a child the **intersection** of requested power, the parent's
  delegable bound, and current policy. Ancestry is responsibility, not permission.
- **Exact consent** — `#exact-consent`. One human's yes to one unchangeable action, binding the
  specific action, the exact validated arguments under a pinned operation version, the real-world
  targets, and the approval itself. Ordinary feedback and standing intent are not it.
- **Exposure and mediation** — `#exposure-and-mediation`. Exposure = filtered visibility, not a
  grant. Mediation = the path goes through Kernel admission and settlement. Ambient/native action
  uses host powers directly; telemetry observes but does not prevent.
- **Withdrawal and compensation** — `#withdrawal-and-compensation`. Withdrawal prevents future
  admission of a named request; a correction message is not withdrawal. Compensation is a *new*
  authorized action, not rollback of external history.
- **Emission, result, provisional output, output obligation** — `#emission-result-and-output-obligation`.
  Output obligation = make accepted output available for authorized, retention-bounded
  observation/replay. External delivery is separate
  adapter work (`mechanisms/output.md#external-delivery`).

### 1.8 Operational vocabulary

Owner page: `concepts/operations.md`. Three independent families, in the page's own order and under
its own names. The page says outright that they do not build on one another and can be read in any
order — so do not look for a rule that spans them.

*Where code runs and what it may touch* (`#kernel-worker` … `#operating-profile-and-durability`):

- **Kernel Worker / Execution Host** — process roles, not required standalone services; one process
  may be both.
- **Trusted vs Isolated Execution** — Trusted intentionally permits ambient host powers; Isolated
  physically contains access under a *tested* threat model. **Isolation is independent of
  mediation** in both directions.
- **Operating/support profile; durable** — profile states tested storage/Runtime/host versions,
  failure assumptions, recovery modes, limits, retention. "Durable" = specified facts survive
  specified failures for the promised period. The first persistent profile covers **process failure
  with surviving storage** only.
*Time*:

- **Three clocks** — `#three-clocks`: wait deadline, Execution deadline, scheduler lease. Different
  purposes, different expiry consequences, must never share one timer/field. Lease expiry proves
  neither process death nor action failure. Units/precision/renewal implementation-owned.
*Executions talking to each other and to observers*:

- **Child and ownership; call/spawn/detachment/supervision** — `#child-and-ownership`. Ownership is
  responsibility for required work, not universal access. Required work stays an obligation until
  accounted for or explicitly transferred/abandoned. Detachment needs a **named durable owner**;
  may be refused in the minimum release.
- **Message, request/reply record, correlation, human input request** — `#message-request-and-correlation`.
  Send success = destination-**mailbox acceptance**, not processing. Knowing a correlation ID is not
  permission to reply or settle. A reply is an observation, not consent or settlement.
- **Observation, output cursor, routing obligation** — `#observation-cursor-and-routing`. A cursor
  is a position, not authority. A routing obligation is a duty to deliver later; it is not
  destination acceptance.
- **Backpressure, cleanup debt** — `#backpressure-and-cleanup-debt`. Terminal Execution state does
  not imply debt or remote work disappeared.

### 1.9 Runtime roles (all optional; none adds a Kernel type)

Owner page: `concepts/roles.md`. Shared rule under every definition: a Runtime-internal structure
has **no Kernel mailbox, authority or lifecycle**. Three groups, in the page's own order and under
its own names.

*How a Runtime is shaped*: Agent (model directs control flow) · Workflow (predefined control flow,
may include model-selected branches) · Stage and local branch · local/delegated worker (not
automatically a child Execution or a Kernel Worker).

*What a Runtime shows a model and how it reads the reply*: Context and context compiler (selection,
not access grant) · **projection / callable alias / invocation binding** (a late reply resolves
through the binding it saw, never today's catalog) · local control (typed origin preserved even
under shared provider tool syntax) · invocation snapshot vs context cache (a snapshot in-flight work
needs is not discardable as a cache).

*What a Runtime is allowed to see and to package*: view and disclosure (scope labels locate, they do
not grant) · Skill and package manifest (a request, never a grant; distinct from this repo's
`.agents/skills/`) · service and interaction template and async handle.

### 1.10 Continuation, retained information, resources

Owner page: `concepts/state.md`. Its framing rule: *where information is kept never by itself says
what it proves.*

- **Progress** — `#progress`. Runtime-owned continuation accepted by the Kernel and returned
  unchanged. Three forms with **different recovery guarantees**: inline structured, immutable
  checkpoint reference, locator for a running native job. Never collapse them. Every persisted form
  pins Runtime/Definition contract and progress codec.
  Do not infer: which forms any packet's Runtime actually uses — that is build status, it lives in
  LEDGER and BASELINE, and a sentence like "K1's fake Runtime needs only inline" was removed from
  `concepts/state.md` on 2026-09-21 for exactly that reason (`MM/README.md#how-these-pages-are-organized`).
- **Checkpoint vs locator** — `#checkpoint-and-locator`. A checkpoint identifies a specific
  resumable state plus compatible code and required resources; a locator merely finds a mutable
  session. A session ID is **not** a checkpoint if its contents can advance independently of
  accepted progress (WS PC-3).
- **Recovery and re-execution** — `#recovery-and-re-execution`. Recovery, reattachment, replay
  (only when the phase-specific contract proves it safe), restart-from-input (an explicitly
  authorized **new** Execution with causation). **Recovery-held** is an inspectable operational
  condition whose lifecycle is still `RUNNING` — not a Runtime-declared `WAITING`.
- **Execution History** — `#execution-history`. Evidence of Kernel decisions and observations. Not
  an Agent transcript, business database or deterministic replay engine.
- **Structured state / Derived Semantic Memory / Working Notes** — ordered by trust, not by
  storage. A model inference in valid JSON is not an assertion. **Promotion** is an explicit
  validated application decision and grants no authority.
- **Artifact reference** — `#artifact-reference`. A bundle of facts crossing the protocol (store,
  object, required immutable version/digest, media hint, size, access owner, retention
  responsibility). A URL or hash supplies neither access nor availability.
- **Resource binding vs attachment** — `#resource-binding-and-attachment`. **Release is not
  destruction.** A serialized client is not a durable binding.
- **Retention, pin, tombstone** — `#retention-pin-and-tombstone`. None implies unlimited retention,
  replay, or anonymity of hashes.

### 1.11 Values

Owner page: `concepts/values.md`; preserves accepted K0.1 E-1–E-7.

- **Codec** — `#codec`. Three distinct jobs: transport codec (adapter), progress codec
  (Runtime/Driver), canonical value encoding (Kernel protocol). Conflating any two breaks a
  different guarantee; the page states which.
- **Boundary value and root** — `#boundary-value-and-root`. `null`, boolean, finite binary64,
  well-formed Unicode string, arrays/objects of these. Each governed field/payload is its **own
  root**; the envelope is not an extra aggregate root. Reject non-finite numbers, unsupported
  values, lone surrogates and duplicate object keys — **reject, never repair**.
- **In-process value capture** — `#in-process-value-capture`. One coherent immutable snapshot;
  validation, canonical bytes, size, retained content, inspection and Activation input all derive
  from that same snapshot. Accessors, missing/extra array positions, symbol keys, non-enumerable
  members, cycles, present `undefined`, and inconsistent/uninspectable structure are **refused**.
  Canonicalization uses the unmodified approved JCS implementation on snapshot-derived data. These
  are value-acceptance guarantees, **not containment of same-process code**.
- **Canonical form** — `#canonical-form`. RFC 8785/JCS, six byte-level rules. Equality is
  canonical-byte equality. Key order is not semantic; **array order is**. Absent ≠ explicit null.
  Key ordering compares UTF-16 code units; the string-length bound counts Unicode scalar values —
  deliberately different units. No transport is required to emit canonical bytes.
- **Fixed semantic limits** — `#fixed-semantic-limits`. String/name ≤ 65,536 scalar values;
  container entries ≤ 4,096; depth ≤ 32; canonical size ≤ 1,048,576 bytes **per root
  independently**. All four apply together; at-limit passes, one over is rejected. Two 700 KiB
  sibling roots are not rejected for exceeding 1 MiB together. Changing a limit needs an explicit
  versioned protocol amendment.
- **What these rules do not cover** — `#what-these-rules-do-not-cover`. Set-valued schema fields
  compare by membership; that is a schema property, not a second equality rule. Comparing a set by
  printed text is a known defect (`docs/development/015-structural-evidence-rules.md`).

---

## 2. Mechanism index

Navigational only. Every page carries a **Status line** (required Kernel contract / per-Driver
obligation / optional Runtime design) plus the gate that introduces it — first thing after the
title on most pages, after a short framing paragraph on `lifecycle.md`, `context.md` and
`communication.md`. **A named gate is that
gate's contract, not a shipped claim.**

| Mechanism | Owner | Status / gate | Principal participants | Prerequisite concepts | Neighbours | K0.1–K1.1 evidence | Boundary to hold |
|---|---|---|---|---|---|---|---|
| Creation & input ingress | `mechanisms/creation.md` | Kernel, K1.1 | application, Kernel | Creation request ID, Input ID, Definition, mailbox, readiness | execution-cycle, lifecycle, evidence(retention) | WS ID-1/ID-2/ID-7; K1.1-C1/C2; KC1-DEC-1 | Creation and post-creation ingress are **separate identity domains**; different content under one key is a conflict, never an update |
| Execution cycle | `mechanisms/execution-cycle.md` | Kernel, K1.1–K1.2 (Effect intents K2.1) | Kernel, Driver, Runtime | Activation, Outcome, batch, epoch, revisions, view | waits (input selection), lifecycle (cancellation), recovery | WS ID-3/ID-4/ID-9, OA-1–OA-6, EF-1/EF-2; K1.1-C4/C5; KC1-ARCH-1 | Dispatch pins before sending; acceptance is one atomic step; **delivery reporting is not an exchange** |
| — Delivery reporting boundary | `execution-cycle.md#delivery-reporting-boundary` | Kernel, K1.1-correction-01 | Kernel (owns attempt evidence), Driver (owns its promises) | dispatch intent, attempt | integration.md (adapter obligation) | decision-01 `KC1-ARCH-1`; review-08 | `deliver(...): undefined`; first report wins; report changes **no** accepted state; late report settles only its own retained attempt |
| Waits & batch selection | `mechanisms/waits.md` | Kernel, K1.3 | Kernel, Runtime | wait, generation, source category, readiness, timeout Event | execution-cycle, lifecycle, communication | WS B-1–B-8, CL-1–CL-3, W-1–W-9; K0.2 round 16 | Eligibility by **trusted source category first**; any eligible wake retires the **whole** registration; mandatory member cannot be displaced by older backlog at any bound |
| Lifecycle & cancellation | `mechanisms/lifecycle.md` | Kernel, K1.2–K1.3 (completion accounting from K2.3) | Kernel, application control path | five states, Activation, batch, epoch | execution-cycle, waits, communication, actions | WS CX-1–CX-6 | Five states; every transition caused by one accepted Kernel decision; cancellation ordered against **Outcome acceptance**, not submission or physical stop |
| Authority & consent | `mechanisms/authority.md` | Kernel, K2.2 (+K4, K5) | principal, policy, approver, Kernel | principal, authority, policy, grant, consent, revision | actions, context, communication, resources | WS LP-1–LP-3; F22 | Four ordered questions + one guard; **content is never authority**; revocation vs admission is decided by which the Kernel accepted first |
| Actions | `mechanisms/actions.md` | Kernel, K2.1–K2.3 (**K1 refuses Effects**) | Kernel, trusted adapter, external service | intent, admission, attempt, settlement, certainty | authority, lifecycle(completion), recovery, evidence | WS EF-1–EF-4; F21 | The Kernel records what it knows; **unknown is a disposition, not a failure**; retry only with provider-enforced idempotency or proof of non-execution |
| Output | `mechanisms/output.md` | Kernel, K4.4 (retention K5.1) | Kernel, application output layer, channel adapter | Emission, result, obligation, cursor, view | actions, communication, evidence, resources | detail-design review; F26 | Available-to-read and sent-somewhere are different questions; **observation does not send input** |
| Communication | `mechanisms/communication.md` | Kernel, K4.1–K4.3 | parent, child, peer, human, Kernel | child/ownership, message, correlation, request record, budget | waits, authority, output, lifecycle | F23, F25 | Ownership, communication and waiting are three independent axes; send success = destination mailbox acceptance |
| Recovery | `mechanisms/recovery.md` | Kernel contract **plus per-Driver obligation**, K3 (R1 supplies Driver evidence) | Kernel, Driver, native store | progress forms, checkpoint/locator, epoch, lease, codec | execution-cycle, integration, resources, evidence | WS PC-1–PC-5; F24 | Two duties in order: reconstruct accepted records, **then** establish native continuation permission; hold visibly when it cannot be established |
| Integration (Driver fidelity) | `mechanisms/integration.md` | **Per-Driver obligation, not Kernel semantics**, R1 (versions frozen S1); K1.4's legacy bridge uses only the reference-Runtime shape and earns **no** support record | Driver, native runtime | Activation/Outcome, Effect, pause, cancellation, resources | recovery, external-protocols, execution-cycle | architecture review prior art; `MM/sources.md#native-design-evidence` | Choose the shallowest integration that works; **unsupported is a legitimate support-record value**; evidence before support |
| Composition | `mechanisms/composition.md` | **Optional Runtime design, R2** | Runtime-internal stages/branches | Stage, local branch, scratch frame, progress | state, context, communication | detail-design review | Kernel single-writer acceptance does **not** serialize native shared mutation |
| State & memory | `mechanisms/state.md` | **Optional Runtime/service design, R2** (limits required K2/K3/K5) | state service, Runtime, application | structured state, inferred claim, notes, artifact | authority, context, recovery, resources | memory disposition in 005 | Four owners, not one store; promotion is an explicit act; retrieval is an access-control boundary |
| Context | `mechanisms/context.md` | **Optional Runtime design, R2** (disclosure/binding limits required K2/R1/K5) | Runtime, model provider | context, projection, invocation binding, snapshot, view | state, authority, integration | K1.1 n/a | Two selection problems feeding one request; selection may shorten but **may not change status** |
| External protocols | `mechanisms/external-protocols.md` | **Adapter obligation, demand-gated**; no parity before S1 | protocol adapter | operation, Effect, Event, mailbox, value limits | integration, authority, communication | Q11 in `docs/future-plan.md` | Do not adopt foreign vocabulary wholesale; HTTP success is transport evidence, not semantic completion |
| Resources & enforcement | `mechanisms/resources.md` | Deployment/resource-service obligation; R1/K3/K5, **physical containment only at D1** | deployment, resource service, host | binding vs attachment, trust modes, cleanup debt | recovery, deployment, evidence | F24 | A Kernel decision is not an enforcement mechanism; release ≠ destroy; containment needs tests, not design review |
| Evidence & inspection | `mechanisms/evidence.md` | Inspection/attribution obligation; minimum K1, depth K5 | Kernel, operator, benchmark | History, receipts, retention, gates | every mechanism | K1.0 structural work; `015-structural-evidence-rules.md` | A record is evidence of the decision it names and nothing further; **moving code is not migrating it** |

Cross-mechanism tables worth reusing rather than restating: the **atomic decisions** table
(`execution-cycle.md#atomic-decisions-across-the-system`), the **four ways a wait ends**
(`waits.md#ending-a-wait`), the **crash windows** table (`recovery.md#crash-windows`), the
**compatibility checks** table (`recovery.md#compatibility-and-migration`), the **what evidence
proves** table (`evidence.md#what-evidence-proves`), and the **support record** dimensions
(`integration.md#support-record`).

---

## 3. Decision / provenance index

Where to verify a rule. Current meaning always sits in the owner column; the evidence column is
for "why does this say that", not for quoting as a rule. `MM/sources.md` is the maintained
provenance page and should be updated with, not duplicated by, this table.

| Decision family | Current owner | Historical evidence |
|---|---|---|
| E-1–E-7 value model, canonical bytes, limits | `concepts/values.md` | WS §1; E-7 rule 4 corrected in round 3 (`work/K0.1/review-03.md`, `implementation-04.md`) |
| ID-1–ID-9 identities, receipts, takeover | `concepts/core.md`, `concepts/identity.md`, `mechanisms/execution-cycle.md#retry-versus-takeover` | WS §2; ID-3 corrected in round 1 (`work/K0.1/implementation-02.md`) |
| B-1–B-8, CL-1–CL-3, W-1–W-9 waits, clocks, batch | `mechanisms/waits.md` (sole owner), `concepts/operations.md#three-clocks` | WS §3–§5; reconstruction in round 9 (`review-08.md`, `implementation-09.md`); satisfiability correction round 9/10 (`review-09.md`) |
| CX-1–CX-6 cancellation and terminal obligations | `mechanisms/lifecycle.md#cancellation-order`, `#completion-is-an-accounting-check` | WS §6; CX-6 added round 11/12 (`review-11.md`, `implementation-12.md`) |
| OA-1–OA-6 Outcome acceptance; EF-1/EF-2 K1 refusal | `mechanisms/execution-cycle.md#outcome-acceptance` | WS §7–§8 |
| EF-3/EF-4 four action dimensions | `concepts/actions.md#settlement-and-reconciliation`, `mechanisms/actions.md` | WS §8 |
| PC-1–PC-5 progress forms and compatibility | `concepts/state.md#progress`, `#checkpoint-and-locator`, `mechanisms/recovery.md` | WS §9 |
| LP-1–LP-3 local vs remote policy ordering | `mechanisms/authority.md#order-revocation-against-admission` | WS §10 |
| M-1 unsafe/state-loss controls | `mechanisms/evidence.md#attribution-and-gates`, `MM/roadmap.md` | WS §11; K0.2 `public-fixture-specification.md` |
| LC-1 / MIG-LEG-REF legacy classification | BASELINE, `work/K1.0/ownership-inventory.md` | WS §12; nothing deleted by these packets |
| K0.2 observable distinctions; epoch not pinnable across exchanges | `concepts/identity.md#writer-epoch` | `work/K0.2/public-fixture-specification.md` §19 (`K02-R13-01`), accepted by `review-17.md` |
| K0.2 five distinguishing wait examples | `mechanisms/waits.md#small-distinguishing-examples` | `work/K0.2/public-fixture-specification.md` §22 (`K02-R16-01`), `review-16.md` |
| K1.0 structural boundary; inventory agreement; fail-closed reading | `mechanisms/evidence.md#structural-evidence`, `docs/development/015-structural-evidence-rules.md` | `work/K1.0/*`, `K1.0-correction-01`, `K1.0-correction-02/review-01.md` |
| K1.0-corr-02 set identity in comparison | `015-structural-evidence-rules.md` ("Comparing a set is not comparing a string"), `concepts/values.md#what-these-rules-do-not-cover` | `work/K1.0-correction-02/contract.md` |
| K1.1 creation/ingress domain separation (`KC1-DEC-1`) | `concepts/identity.md#request-key-and-input-id`, `mechanisms/creation.md#later-input-has-a-destination` | `work/K1.1/review-15.md` `K11-R15-ID-01`; `K1.1-correction-01/contract.md`; supplement `K1.1-reference-01` REF-1 |
| K1.1 in-process value capture (C3, `KC1-DEC-3/6`) | `concepts/values.md#in-process-value-capture` | `work/K1.1/contract.md` C3; `K1.1-correction-01` review-08 C3; supplement REF-2 |
| K1.1 delivery reporting (`KC1-ARCH-1`) | `mechanisms/execution-cycle.md#delivery-reporting-boundary` (+ link from `mechanisms/integration.md`) | `work/K1.1-correction-01/decision-01.md` incl. its superseding note; `review-08.md`; roadmap §K1.1-correction-01 |
| Status ownership moved off specification pages | `MM/README.md#how-these-pages-are-organized`, `#target-not-shipped` | `K1.1-reference-01` REF-3, `review-02.md` `REF1-R1-CONV-01` |
| Architecture-level decisions and their counterexamples | `docs/development/004-architecture-review.md` (decisions table) | same; refined by `005-detail-design-review.md` |
| Packet status / accepted / integrated / released | LEDGER only | `006-development-process.md#status-transitions`; `014-owner-progress-summary.md` is the readable account |

**Current status at time of writing** (verify in LEDGER, never here): K0.1, K0.1-process-review,
K0.2 accepted+integrated, **K0 closed**; K1.0 with corrections 01–02 accepted+integrated; K1.1 with
correction-01 and reference-01 accepted, cleanup-complete, integrated (PR #28), owner-closed; K1.2
**released 2026-09-16** but PLANNED with no candidate; K1.3 onward PLANNED. No E1 result; K1 open.

---

## 4. Explicitly undecided / implementation-owned

The rewrite must not resolve any of these by making prose sound definite. Each line names where the
non-decision is recorded.

**In-page marker convention.** Where a page has to leave one of these visibly open, it carries an
HTML comment shaped `OPEN(<who settles it>): <what is undecided>. <what to do here when it closes>.
rewrite-index.md §4`. The point is that whoever eventually settles the item can grep `OPEN(`, find
the exact prose it affects, and update these pages in the same pass — which a bare `TODO` does not
tell them. Three values, because the three closings are different work:

- **`OPEN(<gate>)`**, such as `OPEN(K2.2)` — a named roadmap gate owns the choice. When that gate
  lands, it states the rule in the prose and deletes the marker.
- **`OPEN(implementation)`** — the architecture deliberately fixes no answer and never will; an
  implementation settles it for itself. A conforming implementation that makes such a choice comes
  back here and records it *as that implementation's choice*, with a pointer to where it is written
  down (usually BASELINE), leaving the marker in place. Only a later architectural decision to fix
  the representation deletes it. Removing the marker merely because one implementation chose would
  turn an implementation detail into a protocol rule — §5.3.
- **`OPEN(unassigned)`** — nobody owns it yet. The marker goes when an owner is assigned and states
  the rule here.

Two rules across all three: a comment does not render, so any openness a *reader* needs must also be
stated in the prose, and one open item gets one marker — a second marker for the same item rots
independently of the first. Every marker's subject has a line in the lists below; a marker with no
line here, or a line here describing a marker that no page carries, is this file's defect.

**Representations and formats**
- Transport wire codec, framing, compression — `concepts/values.md#codec`, WS §1 "Left open".
- Receipt serialization / token representation; request-key hashing — `OPEN(implementation)` in
  `concepts/identity.md#acceptance-boundary-and-receipt`; WS §2.
- **How a Creation request ID carries the caller's context** — as one component or two, and under
  what names — `OPEN(implementation)` in `concepts/identity.md#request-key-and-input-id`. The in-process binding uses producer
  namespace plus the selected creation authority scope; that spelling introduces no "creation request
  scope" object and fixes no wire representation. What the architecture fixes is only that the ID
  combines caller context with the creation key and covers the complete creation content. The
  implementation records its own answer in BASELINE `#request-identity-api`.
- Writer-epoch representation, and **whether it resets across a later Activation** —
  `OPEN(implementation)` in `concepts/identity.md#writer-epoch`; WS ID-4, K0.2 `K02-R13-01`. (K1.1-DEC-2 chose one epoch per
  exchange starting at 1 — an *implementation* choice, not architecture.)
- Wait generation representation; declared-input-subscription spelling — `mechanisms/waits.md#declare-what-can-wake-the-execution`, WS W-9/§5.
- Timeout Event wire kind token / discriminant — WS W-9 "Left open".
- Storage schema, timer machinery, cancellation-request storage, rejection encoding — WS §5–§7.
- Clock units, precision, instant source, lease renewal mechanism — `OPEN(implementation)` in
  `concepts/operations.md#three-clocks`.
- Batch maximum (only "finite, ≥ 1" is fixed) — `concepts/core.md#batch-reservation-and-acknowledgment`.
- **The exact form a Definition and its pinned revision take** — one `OPEN(unassigned)` covering both,
  in `concepts/core.md#definition`.
- **A defining section for trusted ingress provenance** — `OPEN(unassigned)` in `concepts/core.md#event`.
- API spelling generally: `concepts/identity.md` states its names are conceptual and do not freeze
  API or wire spelling.

**Unassigned or deferred ownership**
- **Driver-to-Execution cardinality.** No `mental-model/` page fixes how many Executions one Driver
  serves; `concepts/core.md#execution-driver` carries an `OPEN(unassigned)` marker for it. `MM/kernel.md` "What it owns" lists no Driver among an Execution's accepted records — what is
  pinned is the Runtime contract revision — and `integration.md#support-record` makes the
  Execution/Activation ↔ native run/session mapping a per-Driver declaration. K1.1's coordinator takes a
  single `driver` in `CoordinatorOptions`, which is an implementation choice of the in-memory profile,
  not a protocol rule.
- Whether an **action dispatcher** is its own concept — `OPEN(unassigned)` in
  `concepts/actions.md#admission-and-physical-action-attempt`.
- Validator and enforced schema subset for operations — `OPEN(K2.2)`, **K2.2 selects it**.
- Concrete policy/consent representation, grant language, remote policy backend, actual remote
  freshness — K2 (`mechanisms/authority.md` preamble; K0/K1 promise none).
- Driver-specific phase recovery guarantees — R1 (`mechanisms/recovery.md`, `integration.md`).
- Persistent substrate selection (Temporal/Restate are *references, not selected dependencies*) —
  K3 (`MM/deployment.md#check-what-a-durable-substrate-retries-on-its-own`).
- Isolation backend — D1. Supported versions and tested protocol subsets — S1.
- Multi-approver policy; `reply_and_ask`; arbitrary detachment; richer joins; context IR — optional
  or refusable in the minimum profile (`mechanisms/authority.md`, `communication.md`,
  `composition.md`, `concepts/operations.md#child-and-ownership`).
- Whether **richer supervision, or detached and supervisory services, are needed at all** —
  `docs/future-plan.md` Q3, unanswered; WS §14 records it as "not answered here" and puts
  child/message/human-response durability outside K0.1 entirely. Q3's trigger is a K4 example
  exposing a missing pattern, not a decision already taken. Owner-decided 2026-09-21 to carry **no
  in-page marker** for this: the minimum the pages describe — authored failure policy, required
  owned children, arbitrary detachment refusable — is the current answer stated in ordinary prose at
  `concepts/operations.md#child-and-ownership`, not a placeholder awaiting one. The standing
  constraint stays: prose must not imply that a supervision framework or a general detachment
  facility already exists to be implemented.

**Deliberately not invented**
- No universal artifact service, memory ontology, Skill schema/registry/signing, policy backend,
  claim graph, capability hierarchy, or native checkpoint migration — `MM/sources.md#intentionally-unselected-choices`.
- No exactly-once external action, no cross-shard atomicity, no automatic native migration,
  no multi-region failover, no mutually-distrusting-tenant safety —
  `mechanisms/execution-cycle.md#atomic-decisions-across-the-system`, `MM/deployment.md`.
- No general deadlock/satisfiability guarantee for waits — WS W-1; `mechanisms/waits.md`.
- Longer-horizon questions are held in `docs/future-plan.md` Q1–Q13 and
  `docs/development/003-evidence-and-findings.md` "Later horizons and deliberate retirements" — not
  in `mental-model/`.

**K1-scoped gaps recorded against the current implementation** (BASELINE + `work/K1.1/contract.md`
"Unresolved obligations"): accepted progress is trivial (K1.2 installs it); an empty batch is
unreachable; no key ever expires in the in-memory profile, so **no bounded-retention profile may be
claimed from K1.1**; the delivery-attempt log is unbounded; no durability, isolation or
Driver-fidelity claim.

---

## 5. Dangerous inference index

Recurring reasoning mistakes, each with the counterexample that establishes it. These are the
failure modes a rewrite most easily reintroduces.

1. **Takeover mints a new Activation ID.** It does not: same Activation ID, same pinned input,
   advanced writer epoch. Owner: `execution-cycle.md#retry-versus-takeover`. Evidence: WS ID-3/ID-9,
   corrected in K0.1 round 1. The three-row table exists because retry, takeover and a new exchange
   look identical from outside.
2. **The writer epoch protects progress.** It fences the *entire* Outcome acceptance — batch
   acknowledgment, progress, emissions, Effect intents, wait/deadline, readiness, next state.
   Owner: `identity.md#writer-epoch`.
3. **Pinning a representation the protocol left open.** Comparing `writerEpoch` literally across new
   Activation IDs made *no* conforming implementation passable. Evidence: K0.2 `K02-R13-01`. General
   form: an example or fixture accidentally becomes normative.
4. **Atomicity implies durability.** Accepting atomically guarantees a coherent accepted state *if
   the storage profile preserves it*; atomicity by itself stores nothing, and crash survival belongs
   to a persistent deployment. Owners: `MM/kernel.md` "Why acceptance matters", `MM/README.md`
   "What this arrangement guarantees", `MM/deployment.md`. Evidence: `work/K1.1/review-16.md`
   `K11-R16-DOC-01`. **Repaired in this rewrite project:** `MM/kernel.md` previously read "there is
   always a well-defined, durable state to reconstruct after a crash" with no storage condition,
   while `MM/README.md` already conditioned the same claim correctly; the Layer-2 sentence now names
   the deployment's storage as what decides survival. Watch for the same slip in any page that
   motivates atomic acceptance.
5. **`RUNNING` means healthy / `WAITING` means a Runtime is blocked.** `RUNNING` means an Activation
   is unresolved, including recovery-held. `WAITING` exists only for an accepted Runtime-declared
   Kernel-visible dependency; a Runtime awaiting its own model call stays `RUNNING`. Owners:
   `MM/kernel.md`, `lifecycle.md`, `state.md#recovery-and-re-execution`.
6. **An object and its revision are the same thing.** There is no global "the revision"; seven
   revision kinds have different creators and change points. Progress revision 4 with epoch 2 says
   nothing about an accepted revision 5. Owner: `identity.md#revision`.
7. **Acknowledgment means obedience.** Accepted Outcome acknowledges the whole batch; whether the
   Runtime did what an Event asked lives only in its own progress, and the Kernel never infers it
   from output text. Owners: `core.md#batch-reservation-and-acknowledgment`, `MM/runtime.md`,
   `waits.md#accounting-and-limits`.
8. **A kind string decides eligibility.** Source category comes from the trusted ingress path.
   A dependency alternative naming an application-input kind is structurally valid and **inert**.
   Owner: `waits.md#eligibility-comes-from-trusted-source-category`; WS W-1/W-7.
9. **Structurally valid means capable of waking.** K0.1 promises structure, never satisfiability; a
   well-formed wait may never be woken. Evidence: `work/K0.1/review-09.md`.
10. **A timeout proves the external work failed.** It proves one wait generation expired. Owner:
    `core.md#timeout-event`; WS CL-2.
11. **Spare batch capacity promotes ineligible backlog.** It never does, at any bound. One bound-1
    example cannot prove mandatory retention, earliest-member selection, candidate exclusion, late
    eligibility and presentation order — five separate examples exist for that reason. Evidence:
    K0.2 `K02-R16-01`.
12. **A correction message retracts an action.** Ordinary input is not withdrawal, not consent
    invalidation, and may not be read for another second. Owners:
    `actions.md(concepts)#withdrawal-and-compensation`, `authority.md#order-revocation-against-admission`;
    WS LP-3, F22.
13. **Absence of a receipt is proof of failure.** Absent evidence is *unknown*; unknown is a
    disposition. Owners: `mechanisms/actions.md#admission-and-sending`, `#settlement-and-refinement`;
    WS EF-3/EF-4, F21.
14. **A Kernel idempotency key prevents double external execution.** It stops this Kernel sending
    twice; it cannot stop a provider acting twice. Owner: `actions.md#retrying-an-action`.
15. **Inferring API parameters from an atomic semantic binding.** Creation binding Execution ID,
    Definition revision, authority and initial input in one accepted decision fixes *atomicity*, not
    a signature, a field list or a wire shape. Owner: `creation.md#one-atomic-creation`.
16. **Creation request ID and Input ID are one domain.** They are separate; the initial Event keeps creation
    provenance and a creation receipt, and later ingress with the same key text is a new request.
    Evidence: `K11-R15-ID-01`.
17. **Logical responsibility implies physical deployment.** The Layer-1 diagram describes
    responsibilities, not machines; one process may host Kernel, Driver and Runtime. Moving a box to
    another process does not make its state durable or its actions safe to retry. Owners:
    `MM/README.md#logical-pieces-and-physical-deployment`, `MM/deployment.md`.
18. **Carrying an identifier implies resolving or executing it.** The Kernel records a Definition
    revision but does not interpret the code; a cursor is a position, not authority; a correlation ID
    is not permission to reply or settle; a handle or trace ID is not a bearer permission. Owners:
    `core.md#definition`, `operations.md#observation-cursor-and-routing`, `#message-request-and-correlation`,
    `external-protocols.md#import-and-export`.
19. **Single-writer acceptance is concurrency control.** It fences which attempt may write accepted
    progress — not which branch writes a file, not another Execution's shared-state writes, not a
    native session. Owners: `resources.md#shared-mutation`, `composition.md#forks-joins-and-corrections`,
    `state.md#state-service-contract`.
20. **Treating Runtime internals as Kernel concepts.** Model loops, graph nodes, compaction, native
    memory, provider checkpoints, local branches and local controls stay behind the Driver unless
    Kernel correctness depends on the contract. Owners: `MM/runtime.md`; WS W-4/W-5.
21. **A provider example is a portable contract.** A second independently designed Runtime is
    required before an integration-specific extension becomes portable. Owner: `MM/driver.md`,
    `integration.md#evidence-before-support`.
22. **Isolation and mediation substitute for each other.** A well-isolated Execution can still make
    an unmediated native call; a well-mediated one may have no isolation. Telemetry is neither.
    Owner of the independence itself: `concepts/operations.md#isolated-execution`, which
    `actions.md(concepts)#exposure-and-mediation` names as the owner. Related:
    `actions.md(concepts)#exposure-and-mediation` (exposure is not permission, mediation is a path),
    `resources.md#containment-claims` (what evidence an isolation claim needs),
    `MM/deployment.md#trust-and-containment` (the Layer-2 summary).
    Watch this one for duplication rather than for drift: `operations.md:75` and `actions.md:168`
    each write the both-directions counterexample out in full, and `actions.md` names
    `operations.md` as its owner in the same paragraph. `MM/deployment.md` states the rule as a
    Layer-2 summary and delegates the counterexample, which is the shape the other two should have.
23. **Exposure or discovery is permission.** Showing a model that an operation exists authorizes
    nothing; a Skill manifest's requests are not grants; retrieved text, notes and inferred memory
    are never authority. Owners: `#exposure-and-mediation`, `authority.md#content-is-not-authority`,
    `roles.md#skill-and-package`.
24. **Release deletes the resource; a lost handle is a failed allocation.** Release closes a client;
    destroy is a separate operation; allocation may have succeeded with its handle lost. Owners:
    `state.md#resource-binding-and-attachment`, `resources.md#resource-operations`.
25. **A session ID is a checkpoint.** Only if its contents cannot advance independently of accepted
    progress. Owner: `state.md#checkpoint-and-locator`; WS PC-3.
26. **Target specification is implementation status.** Every Layer-3 mechanism page names a gate; a
    gate is a contract, not a ship date. Status lives only in LEDGER and BASELINE, and **accepted,
    integrated and released are three different facts**. Owners: `MM/README.md#target-not-shipped`,
    `006-development-process.md#status-transitions`.
27. **Moving code is migrating it.** A new directory or package name decides where future work
    lands and changes nothing about behavior; a structural pass earns no gate credit. Owner:
    `evidence.md#structural-evidence`.
28. **Absence of a decision permits the obvious implementation.** Every item in §4 is an unmade
    decision with a named future owner; prose that quietly picks one converts an open choice into a
    contract. `MM/sources.md` states the rule: if a conflict cannot be resolved by precedence,
    record the rule as unresolved rather than choosing the wording that is easier to implement.
29. **A benchmark or fixture result credits the layer that ran it.** Kernel, Agent Runtime, Workflow
    Runtime, Driver, application, isolation, laboratory, provider and evaluator are separate failure
    domains; a laboratory denial protects the world, not the subject. Owners:
    `evidence.md#attribution-and-gates`, `AGENTS.md` "Benchmark attribution".
30. **A rendered string stands in for a structure.** Comparing a set by its joined text, or a cell
    by its formatting, reports agreement between things that disagree; a check that cannot read part
    of its input must fail, not skip. Owners: `015-structural-evidence-rules.md`,
    `evidence.md#structural-evidence`, `values.md#what-these-rules-do-not-cover`.
