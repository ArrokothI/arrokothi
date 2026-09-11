# Development roadmap

Adopted 2026-09-08 for the revised [architecture](../mental-model.md). This document owns milestone
scope and gates; the [work-packet ledger](007-work-packets.md) owns current implementation/review
status and dependencies. K0.1 is accepted, integrated and owner-closed; its
[receipt](work/K0.1/integration-01.md) records the separate acceptance and merge. K0.2 remains
unimplemented and unreleased pending the owner's workflow review and subsequent explicit release.
The K0/E0 gate is still open. Historical planning source starting point:
`agent-kernel a5f426f77820166368a67bf4161a548b2751a3a7`, `benchmark 04148be`.
The [baseline](002-implemented-kernel-baseline.md) describes current 0.8.x; the
[review](004-architecture-review.md) records decisions and the disposition of P1–P7/B1–B3.
The old plan is [historical](legacy/2026-09-pre-redesign-roadmap.md), not an additional checklist.

Use the [development process](006-development-process.md) for each implementation/review cycle,
the [standard report](008-implementation-report.md), and [reusable prompts](009-universal-prompts.md).
K0–S1 below remain aggregate obligations, not single coding sessions. A packet may be independently
accepted before its parent gate passes; only the mapped final gate closes that milestone. The coding
agent cannot mark its own work accepted. Integration and owner discussion/release follow acceptance.

The [detail-design review](005-detail-design-review.md) refines these gates without marking a slice
implemented. The Emission/message/human-input review additionally makes explicit capabilities that
were previously incomplete in this plan: human waits were scheduled but the request-to-authenticated-
response lifecycle was only implied across K2/K4; output replay/expired cursors appeared in K5 without
an explicit authorized child-progress observation gate. The requirements below close those gaps for
the intended 1.0 profile, not for current 0.8.x. No universal pub/sub or output-forwarding service is
scheduled. Use this design routing when implementing:

| Slice | Design to implement/test |
|---|---|
| K0/K1 | [Protocol](../detail-design/execution-protocol.md): equality/receipt scope, eligible batches, wait generations, terminal disposition |
| K2 | [Authority](../detail-design/authority-and-actions.md) + [actions](../detail-design/action-lifecycle.md): policy freshness, correction/withdrawal order, certainty versus responsibility; input-request intent/admission |
| R1/K3 | [Driver](../detail-design/runtime-integration.md) + [recovery](../detail-design/recovery-and-compatibility.md): native submit/checkpoint gaps, pin/delete races, safe takeover |
| K4 | [Composition](../detail-design/composition-and-communication.md): durable reply closure, required children, transitive revocation, nonrenewable total spawn credits; authenticated human requests and authorized output observation |
| R2 | [Runtime composition](../detail-design/runtime-composition.md), [state/memory](../detail-design/memory-and-state.md), [context](../detail-design/context-and-projections.md): typed values, barriers, freshness and scratch isolation |
| K5/D1/S1 | [Resources](../detail-design/resources-and-isolation.md) + [evidence](../detail-design/evidence-and-observability.md): cleanup/retention debt, compatibility/refusal, physical and public support claims |

## Sequence and ownership

Build a fake Runtime and one accepted asynchronous exchange before improving Agent/Workflow features.
Close the action boundary before durable dispatch. Try a real native boundary before selecting a
persistent mechanism. Then test composition and operations under real process failure.

```text
K0 contracts/public fixtures ──→ K1 asynchronous Execution ──→ K2 governed actions
  E0 ownership                       E1 acceptance              E2 attribution
                                      │                         │
                                      └─→ R1 native probe ───────┤
                                          E3 fidelity          ↓
                                                     K3 persistent profile
                                          E4 fault fixture ────┤
                                                              ↓
                                                     K4 composition/waits
                                                              ↓
                                                     K5 operable lifetime
R2 optional native Runtime improvements ────────────→ E5 application/value gate
K2 onward: packaging prototypes ───────────────────→ E6 final construction/evidence
                                                     S1 supported 1.0
K3 + demonstrated demand ──→ D1 optional isolated profile (required only if claimed)
```

E0–E6 are benchmark-owned evidence slices defined in the [benchmark roadmap](../../../benchmark/docs/roadmap.md).
Their fixtures can precede the implementation they test. Each gate below states which result is
required; a merged fixture is not a passed gate. Repository-local conformance remains runnable
without the benchmark repo, paid models, Docker or semantic judges. Benchmark pins/imports conformance
fixtures/results instead of maintaining a second Kernel oracle.

## K0 — State the contract and create the smallest counterexample

**Owner:** Kernel + evidence. **Entry:** this architecture review.

Write a small protocol schema/state-transition decision and a public deterministic fixture:
accept input → delayed fake Runtime → typed output → input wait → completion. Add a fake operation
sink with an independent ledger for later action tests. The direct baseline is ordinary code plus
explicit state and policy; keep validators/services identical across candidates. E0 records owners,
claim boundaries and expected fault observations before candidate implementation.

Resolve exact accepted IDs/receipts, any-of wait correlation, duplicate/conflicting Outcome behavior,
terminal obligations, cancellation ordering and checkpoint forms. Classify 0.8.x persisted data as
migratable, legacy-only or refused; do not require compatibility with a live closure. Document the
atomic boundaries in Kernel terms and map each to an assertion. Distinguish wait deadlines, Execution
deadlines and leases; fix wait-generation identity and eligible
batch accounting. Separate action disposition, outcome certainty and completion responsibility. Define
the local policy ordering/freshness profile before promising remote revocation. No database or model is needed.

**Exit:** each input/Outcome/Effect/wake/cancel boundary has one authoritative owner and an observable
acceptance/rejection result; E0's unsafe/lost-state controls are specified. If explaining the contract
requires model or Stage concepts, subtract them before K1. Keep the wire codec/store layout replaceable.

## K1 — One asynchronous Execution with opaque progress

**Owner:** Kernel. **Entry:** K0; E1 fixture specifications begin before behavioral implementation.
The planned sequence is **K0.2 → K1.0 structural preparation → K1.1 asynchronous implementation**.
K1.0 establishes a narrow target-code boundary and quarantines the working legacy implementation,
with import guards and preserved consumer regressions; it does not implement the new protocol or
pass E1. K1.4 retains the full K1/E1 gate, including these structural obligations. See the
[structure/evidence assessment](013-structure-and-evidence-sequencing.md) and
[packet contract seed](007-work-packets.md#k10--target-boundary-and-legacy-quarantine).
This is a planned dependency amendment, not a release of K0.2 or K1.0.

Implement create+initial-input, dispatch intent, asynchronous Driver delivery, Outcome validation and
acceptance, Event reservation/acknowledgment, typed progress/result, continue/wait/complete/fail and
out-of-band cancellation in an in-memory reference. One delayed Runtime must not prevent the same
coordinator loop dispatching another Execution. Reject stale/repeated conflicting Outcomes; exact
redelivery returns the receipt. Check mailbox state atomically when accepting a wait.

Keep a fake Runtime free of Agent/Workflow types. Bridge existing controllers inside a compatibility
Runtime where feasible; keep its live-promise resumption private. Remove controller resumptions and
closed Agent/Workflow progress discriminators from the new Kernel protocol. No nested loop of Kernel
Activations pretending to be native recovery. Package moves happen only to enforce dependency direction.

**Touchpoints:** `runtime/harness.ts`, `execution/context.ts`, `ports/controller.ts`,
`ports/{runtime-store,scheduler}.ts`, stock controller boundary, SDK host driving.

**Exit / E1:** deterministic delayed/duplicate/out-of-order/cancel/early-event traces satisfy the
protocol, one accepted progress writer and no lost input; existing useful conformance is retained or
explicitly ported. This is ephemeral semantics, not durability. Useful Runtime/Driver probes can
start now; production integration claims cannot. Refuse extra generalized hosting layers if a small
function Driver passes the tests.

## K2 — Accept action intents before dispatch

**Owner:** Kernel. **Entry:** K1; E2 controls specified before the action implementation.

Implement atomic Outcome acceptance of progress, input acknowledgment, emissions and all Effect
intents. Dispatch from those records. Define a narrow schema subset using a mature validator;
validate concrete inputs through custom Runtime, stock Runtime and supported MCP paths. Set explicit
unknown-operation/refusal behavior, current dispatch policy, consent binding and stable action IDs.
Decide overlapping allow-list rules without widening grants. Keep operation alias binding Runtime-side.

Record physical attempts and success/failure/unknown independently of progress. Deny stale dispatch
ownership, recheck authority after approval, and refuse automatic retry of unresolved non-idempotent
work. Validate response data without converting possible external success to definite failure.
Reject completion with required unresolved work. Test explicit withdrawal/consent invalidation against
admission; queued correction text alone does not
stop dispatch. Unknown evidence can be refined by new immutable observations but cannot discharge
ownership merely by being acknowledged. No external action rollback claim.

Include the narrow human input-request operation in governed Effects: immutable request/schema and
eligible-responder binding, stable identity, same-Outcome wait reference, admission/disclosure policy,
and correlated denial/refusal. Opening/displaying a request cannot settle its dependency or count as
exact action consent. K2 proves these semantics with deterministic records; K4 completes the durable
response/restart path on K3's substrate.

**Touchpoints:** `runtime/{harness,effect-processor}.ts`, catalog/schema/policy ports,
`tests/conformance/effects/`, confirmation, reauthorization and MCP boundary regressions.

**Exit / E2:** failure between two Effects preserves the first attempt and the second intent;
invalid/stale Outcome causes zero dispatch; malformed input reaches zero executors; correction,
revocation, duplicate approval and payload/version mismatch cannot bypass admission. Safe and unsafe
subjects produce different native-safety verdicts even when the laboratory keeps both worlds safe.
If a shared action gateway captures all demonstrated benefit, keep that smaller product branch open.

## R1 — Native boundary probe before durable investment

**Owner:** Driver/Execution Runtime. **Entry:** K1 for trusted native jobs; K2 for mediated actions.

Use Hermes as the first context/environment stress probe unless the public application requires a
specific other system. Keep its native loop/tools/session and govern the enclosing result/action
handoff. Map stable submit identity, session/run identity, native pause, output, cancellation,
workspace ownership and lost-acknowledgment recovery. A same-process-only result is acceptable as a
probe, with unsupported durability explicit. Never force live native tool callbacks into a fake
serializable continuation. Use CrewAI or a published Dify application for a second, bounded portability
probe before freezing a generic Driver extension. OpenClaw is the reference when channel delivery is
required; do not build four maintained integrations by default.

**Exit / E3, before K3 design freezes:** a real native boundary can express useful work without
normalizing native context or graph internals; every recovery gap is declared and constrains K3.
Compare native-only and thin Driver input/output/pause behavior with fake model/services where possible.
If the protocol requires invasive interception, narrow to a trusted external job or revise K1/K2.
Delete deep mediation if an outer governed handoff suffices. Before 1.0 support, add representative live
fidelity, cancellation/restart evidence and one supported upstream-version change. Pin model/config
and quality/cost margins before comparison; do not treat interface acceptance as native quality proof.

## K3 — Survive process death; choose a substrate

**Owner:** Kernel + deployment. **Entry:** K2 and R1/E3 boundary findings. E4 builds the fault driver
before K3 and runs against each prototype; paid agents and sealed construction are not prerequisites.

Implement one narrow transactional persistent path and compare it with one mature durable substrate
facade using the same public fault fixture. Select the comparator after a small API/operating review
(Temporal or Restate are candidates, not mandated dependencies). Implement only enough of the second
path to make correctness/maintenance costs comparable; do not build two production backends.

Kill actual worker/host processes at accepted input, reserved dispatch, native submit before handle,
checkpoint before Outcome, accepted Outcome before Effect dispatch, external success before receipt,
settlement before wake and terminal output before delivery. Include lease expiry with the old host
still alive, duplicate callbacks, corrupted/missing checkpoints and unavailable code. Keep the store
and external ledger outside the killed process. Include delayed checkpoint acceptance racing deletion,
revoked disclosure on replay and resource
allocation success before handle persistence. No exception-injection substitute for this gate.

**Exit / E4 core matrix:** zero lost accepted inputs, accepted stale writers, fabricated outcomes,
blind unsafe redispatch or lost wakes in the declared matrix. Unknown work has an explicit inspect/
reconcile path. Native-session contention either excludes the obsolete writer or refuses takeover.
Record fault triggers, raw traces, repeats, recovery latency, transition cost and duplicated native
cost/unknown usage. Scope the claim to process failure with surviving storage.

Choose the substrate by correct behavior, implementation/operating burden and measured cost. If an
existing runtime is simpler, use it and retire custom scheduler/journal expansion. If neither can
map safely, narrow the contract before K4. Serialization and a working database adapter do not pass.

## K4 — Addressed interaction and independent children

**Owner:** Kernel, with Runtime joins. **Entry:** K3; extend E1/E4 fixtures first.

Prove child creation+result correlation+delegated authority+structural budget as an idempotent
operation, including crash between parent intent and child creation. Add addressed peer input/reply
only for the two public applications through mediated Effects. Send success means durable destination
mailbox acceptance; retry preserves input identity, and processing/reply is a separate observation.
Persist the complete human request path: input-request Effect → authorized durable request → wait →
authenticated eligible/schema-valid correlated response → atomic closure/settlement/Event/readiness
→ later Activation, including restart while waiting. Distinguish request expiry from wait timeout.
A parent waiting for a child can explicitly subscribe to addressed clarification input without a second writer;
the Runtime owns multi-result joins and conflict handling. Specify child cancellation/late delivery,
required versus independently owned work and terminal input disposition. Default children remain
required; arbitrary detachment can be refused. Total lineage credits do not renew on child completion;
active slots release exactly once. Test durable reply closure and transitive delegation revocation.

Support authorized application observers subscribing to any permitted Execution's accepted output,
including child progress, through the bounded read/cursor boundary in
[action lifecycle](../detail-design/action-lifecycle.md#authorized-output-subscriptions). Reuse K2
accepted-output records and K3 persistence. Stable IDs/cursors, reconnect without a replay/live gap,
and draining retained progress through child completion are required. Observation alone creates no
parent Event or Activation; reacting requires explicit message/input routing. This adds an output
read/resume surface, not a Kernel subscriber actor or automatic forwarding service. Declare a finite
retention profile now; K5 hardens expiry, slow consumers and operating limits.

Add these repository-local deterministic fixtures to E1, and repeat their relevant commit/receipt/
notification boundaries with actual process death in E4 using surviving storage:

- P creates C; C accepts E1; an authorized observer reads E1 and disconnects; C accepts E2;
  reconnect with the saved cursor replays retained output without silent loss. P receives no
  Activation solely from either Emission. C explicitly sends M1 to P; one stable input is
  mailbox-accepted and selected in a later eligible P Activation. C completes; its terminal result
  has a separate durable routing obligation and one logical parent input identity. Crash before/after
  output commit, between replay and live reads, after mailbox acceptance before send receipt, and
  after child completion before result routing. Assert no duplicate accepted output/inputs, no
  progress-to-parent conversion and no lost retained output; allow identity-preserving redelivery.
- Q1 is admitted and durably visible while its Execution waits; restart; authenticated eligible user
  submits schema-valid R1. Closure, response receipt, Event and recoverable wake survive crashes
  before/after response acceptance and before Activation. Exact retry returns the original disposition;
  conflicting, wrong-responder, invalid and new late responses are refused. The correct eligible
  wait resumes and the Runtime receives R1 later; display alone settles nothing. Include early reply,
  replaced wait generation, request expiry versus wait timeout, and terminal cancellation races.
- Denied output reads/reconnects disclose no protected output; observation does not grant send, and
  send does not grant observation. Any application forwarding fixture must independently authorize
  source disclosure and destination input and retain its own forwarding identity/checkpoint.

**Exit / E4 composition matrix:** restart with human wait, early/duplicate/out-of-order callbacks,
parent/child death, authority revocation, cancellation and late results preserves ownership and
correlation. No orphan child, duplicate spawn-budget consumption or unauthorized restored delivery.
Compare the same fixture to direct composition; reuse native forms and channel delivery rather than
mirroring them. If peer request sugar is unnecessary, keep addressed Events and correlation only.

## R2 — Only the native Runtime facilities applications need

**Owner:** Execution Runtime/SDK. **Entry:** K2; final child proof after K4.

Port existing Agent and Workflow behavior behind the boundary, then fix typed local/child values and
computed terminal results with extraction → deterministic validation → child → join. Use explicit
application state/artifact services and authorized bindings; no universal memory system. Preserve
existing Agent quality tests with Kernel fixed and add Workflow value/branch tests independently.
Improve native loops/context only when E3/E5 reveals a need. This work is not a prerequisite for
K3 or for integrating an external Runtime.

**Exit:** public imports express the selected application without JSON-as-text or shared-memory
transport detours. Keep unsupported legacy features documented. If a mature Workflow runtime already
provides the desired authoring/recovery behavior more simply, use it; 1.0 does not require a new graph
engine, model loop or feature parity with foreign frameworks.

## K5 — Operable lifetime and application value

**Owner:** Kernel/deployment plus application evidence. **Entry:** K4; R1 and any R2 surface used
by the public applications. E5 follows E2 attribution and E4 fault evidence.

Bound mailbox/output/history/deduplication retention, active-host admission and dormant-state cost.
Expose current wait, unresolved attempts, recovery holds and explicit authenticated reconciliation.
Test principal restoration, resource loss, secret rotation, code/checkpoint upgrades, retention expiry
and cancellation. Exercise slow/disconnected output subscribers, bounded buffers/disconnection,
replay/live handoff, expired or view-mismatched cursors, revoked access during delivery, and output
capacity exhaustion before Outcome acceptance. Verify retained output through terminal completion,
explicit gaps after expiry, no subscriber-induced Runtime blocking or unbounded retention, and
separate data pinning for pending routing/delivery obligations. Add cleanup debt and privacy deletion that explicitly
invalidates recovery; inspect unknown obligations after terminal cancellation. Keep model budgets in
the Runtime or metered provider boundary; retain uncertain
usage rather than silently resetting it after restart.

Complete two public synthetic applications: (1) specialist artifact → validation → exact approval →
publication receipt; (2) a service request spanning two independent jobs, corrections, human wait,
restart and cancellation. Use competent direct implementations with the same business policy and
services plus one mature alternative. E5 compares attributable verified outcomes, coordination/repair
burden, quality, total cost and operating effort. Set margins and repeat plan before confirmatory runs.

**Exit / E5:** operating envelope, upgrade/refusal and retention guarantees are reproducible; no critical
semantic breach remains. Both application shapes demonstrate a recurring obligation removed or made
more reliable at acceptable overhead. An inconclusive value result is not a pass. If only policy/
action evidence helps, narrow to that facade and rewrite the release contract. If direct composition
wins on the intended value, stop broader Kernel investment rather than add features.

## D1 — Optional physical isolation

**Owner:** deployment/isolation. **Entry:** K3 plus a real containment requirement.

Reuse an existing sandbox/backend; define credentials, egress, filesystem, processes, resource quotas,
workspace loss and cleanup for one profile. E4-style physical adversarial fixtures must distinguish
Kernel denial, native policy and containment. E5 may compare useful-work cost at equal powers.

**Exit:** actual advertised host/profile blocks its declared bypass paths across restart and cleanup;
limits are measured. Interface mocks or the benchmark's builder container do not count. If unsupported,
ship trusted-only; isolation is not a condition for learning from trusted native jobs.

## S1 — Credible 1.0, not architecture completeness

**Owner:** distribution/support + evidence. **Entry:** K1–K5 gates, supported R1 boundary, R2 only
where shipped, and E6 construction/publication. D1 is required only for an isolation claim.

Begin packed-consumer prototypes after K2. Final release requires compiled JS/types, stable supported
exports, clean install without workspace-only links/loaders, public SDK examples, conformance and
Runtime/Driver tests, live canaries for claimed providers, and one documented persistent deployment.
Migrate or explicitly refuse 0.8.x checkpoints; do not promise to serialize legacy resumptions.
Update baseline, guides, skills and supported feature matrix as implementation changes, not merely
when architecture prose changes. Review actual dependencies/terms when choosing integrations.

E6 freezes the exact final framework/builder surface and runs a fresh public construction canary;
the old core-only 0.8.1 freeze cannot validate this SDK. It reuses benchmark construction machinery,
checks leakage and independently re-evaluates immutable evidence. Public recovery/value reports,
limits and reproducibility scripts are required; a leaderboard, all 112 conversational cases, four
production Drivers, broad protocol parity and a new Agent/Workflow engine are not.

1.0 means a small supported boundary whose advertised acceptance/action/recovery properties survive
the tested faults, whose public API is usable, and whose extra coordination has a demonstrated purpose.
A smaller action-only release needs a separately stated contract; it cannot inherit durable Kernel claims.

## After the evidence

Keep stores, scheduling mechanics, policy engines, schema validators, native cognition, artifact
storage, transports and isolation backends replaceable. Promote extensions only for repeated use.
Discovery/scouts, richer graphs, multi-Agent strategies and context/memory optimization need separate
fixed-Kernel experiments. A universal Program IR, graph importer, environment hierarchy, consensus
engine, sandbox platform, channel product, Studio and Cloud are not scheduled obligations.

At each gate record: claim, exact source/config/fault identities, observed result, strongest
counterexample, decision, unsupported scope and work deleted. Failed gates stop dependent claims;
they do not stop independent fixtures or narrowly useful Runtime work.
