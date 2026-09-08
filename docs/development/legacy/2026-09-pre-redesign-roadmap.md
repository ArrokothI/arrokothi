> **Historical P1–P7/B1–B3 plan. Superseded by the [active roadmap](../001-current-status-and-roadmap.md) on 2026-09-08.**

# Development roadmap

> **Active plan adopted 2026-09-07.** Replaces H–N and the older slice sequences.
> Planning authority only: this adopts the work and its gates, not proposed semantic/API changes.
> Implementation starting point: `agent-kernel` commit `e96e513`; benchmark commit `04148be`.

Read the [implemented baseline](../002-implemented-kernel-baseline.md) for shipped behavior and the
[evidence and findings register](../003-evidence-and-findings.md) for source links, benchmark status,
known defects and disposition. [Canonical ownership](../../README.md) continues to decide meaning.
The [architecture strategy study](../../architecture-strategy-study/README.md) remains research.
Its R1–R11 findings inform this plan; its stage sequence and numerical experiment margins are not
adopted wholesale. No comparative advantage or production recovery is established today.

## What 1.0.0 means

**A small, supported execution foundation for trusted application code that composes Agents and
Workflows, mediates concrete actions, and recovers long-lived work truthfully on one declared
persistent deployment profile.** A release must include:

- a usable, versioned public SDK and installable packages; typed local/child results and an explicit
  application-owned artifact path; supported stock Agent/Workflow behavior documented accurately;
- consistent concrete-operation validation, current authorization, exact consent and honest
  `success / failure / unknown` handling across supported entry paths;
- a selected durable execution implementation with real process-death tests, recoverable input,
  progress, action and local-invocation attempts, wakes, human waits, child/peer obligations and
  bounded state; migration and unsupported-checkpoint behavior;
- two public application proofs, one native-engine integration experiment, independent builder
  evidence for the final public surface, and a small attributable comparison campaign;
- explicit failure, security, performance and compatibility limits with reproducible release evidence.

The default production claim is **single administrative trust domain, trusted/cooperative code,
one persistent store and a fenced active writer per Execution**. A stale process must be rejected
after takeover even on a single host. Host/storage destruction, distributed availability,
multi-tenant hostile code and arbitrary external exactly-once effects are outside that claim.
Persisted state alone is not recovery; a reference store alone is not a production profile.

The in-memory profile remains supported for tests and embedded work with its own limits. Basic
child/peer composition, existing Gemini/Strands paths and synchronous MCP Tools remain supported;
1.0 does not require filling every concept in the canonical architecture inventory. The native
integration may remain experimental or an application-owned external job if that is the honest
boundary. We will not stabilize a universal adapter API from one consumer.

If the application and substrate gates show that a normal database/queue or mature runtime is
simpler at equal assurance, narrow ArrokothI to the useful facade/action boundary. That branch
requires an explicit revised release boundary before calling the smaller product 1.0; it is not
permission to skip failed gates while retaining the original claims.

## Decision basis and scope

The current semantics already separate identity, semantic control, authority, information and
external reality usefully. Preserve those distinctions. Current text-only Stage edges, closed
Agent/Workflow progress, schema enforcement asymmetry and live-promise recovery mechanics are
implementation/contract choices to evaluate, not reasons to discard the entire kernel.

Choose these public synthetic applications as the initial acceptance fixtures, independent of
private benchmark cases:

1. **Reviewed artifact publication:** structured extraction → deterministic validation → child
   computed result → exact human-approved publication → independently stored receipt. A native
   specialist later supplies the artifact, retaining its own context and tool workflow.
2. **Restartable service request:** corrections to asserted state, two separately owned service
   jobs, duplicate/out-of-order callbacks, a human wait across worker death, cancellation and a
   terminal result. Start with deterministic services; models are not needed to establish recovery.

For each, record a direct application baseline with the same validator, policy, fake services and
fault model. Measure duplicated ownership, implementation/repair effort, verified outcomes and
operating cost. These are engineering proofs, not evidence of customer demand. Actual repeated
adoption gates Studio/Cloud investment after 1.0.

## Dependency order

Every slice below is **planned, not started**. P1 is next. B slices are owned in `benchmark` but
belong to this same sequence. Dependency means the preceding gate passed, not merely code merged.

```text
P1 concrete action contract ──→ P2 typed composition ──→ P3 recovery protocol
  │                                                       │
  └──→ B1 attribution diagnostics                          ↓
                                                    P4 durable substrate
                                                          ↓
                                                    P5 long-lived operation
                                                          ↓
                                                    P6 application/native proof
                                                          │
                      B1 + P5 + P6 ──→ B2 sealed construction/readiness
                                              ↓
                                    B3 comparative campaign
                                              ↓
                                    P7 distribution and release
```

B1's cheap diagnostic work can run alongside P2–P5 after P1. Read-only comparator review and Linux
host preparation need not wait for P6; final candidate freezing and comparative claims do. P7
packaging prototypes can begin after P2, but release acceptance waits for every mandatory gate.
Maintain one main implementation line; use disposable comparisons only to decide a live question.
Do not add calendar estimates or complete every research experiment before proceeding.

## P1 — Close the concrete action contract

**Purpose/dependency:** first slice; prevent bypasses of declared schema expectations before adding
new data paths or foreign callers. Uses the current implementation only.

**Work:** create the two small public acceptance fixtures above, initially with current APIs and
explicitly recorded limitations. Reproduce valid/invalid `UseCapability` inputs through a custom
controller, Function Stage, stock Agent/provider, Strands and MCP boundary. Record an ownership
and contract decision for validation at actual dispatch: accepted dialect/subset, unsupported
keywords, no implicit coercion/default mutation, operation revision, output validation and
unknown-catalog operations. Unknown operations are not universally forbidden today; select an
explicit registration/validator rule and compatibility policy rather than silently changing them.
Reuse a mature validator behind the selected contract if its acceptance set is suitable.

Implement the accepted validation boundary and synchronize `authority.md`, `interoperability.md`
and runtime semantics/tests only where the accepted decision changes them. Final policy still
checks the concrete request; validation is not permission. Bind consent to the validated exact
payload and contract revision, with a clear result for schema changes during a wait. Decide the
reference allow-list overlap rule (reject ambiguous rules or documented precedence); do not union
constraints into wider authority. Keep current fail-closed alias collision behavior; improve
allocation only if needed, preserving immutable invocation bindings.

**Touchpoints:** `runtime/effect-processor.ts`, `ports/capability-catalog.ts`, `schema/`,
`reference/allow-list-authorizer.ts`, operation projection, SDK preflight; conformance for Effects,
confirmation, action binding and MCP schema fidelity. See register F01–F03.

**Exit:** malformed inputs reach no executor through any supported path; unknown-operation and
unsupported-schema outcomes are explicit; malformed outputs never become validated business facts;
a bad response payload does not turn a possibly successful external action into definite failure or
automatically permit redispatch;
revocation and consent mismatch still deny; overlapping grants cannot accidentally widen permission;
existing confirmation replay and identity regressions pass. Publish the decision, compatibility
examples and test commands so P2 can consume a settled payload contract.

**Do not build:** a universal service/resource/Skill descriptor hierarchy, every JSON Schema feature,
new protocol support, or an authorization product. If central validation cannot preserve a necessary
legacy path, explicitly version/narrow that path before proceeding.

## P2 — Make ordinary composition carry values

**Purpose/dependency:** P1. Settle the data contract before persisting new checkpoints.

**Work:** test the canonical text/none hypothesis against the public extraction → validation → child
result path and a bounded fork → deterministic join. Implement the smallest typed JSON result and
computed-terminal selection surface that passes. Keep Stage result distinct from terminal commitment.
Determine whether SDK/controller changes suffice; change core Stage/result semantics explicitly if
required. Validate child, join and final values; specify old-definition/progress compatibility.

Provide an explicit authorized initialization/read-view path for asserted state needed by these
applications. Children do not inherit a parent's memory binding automatically. Local values should
not require a memory write just to cross an edge. Use application-owned artifact storage with a
versioned reference, owner/access check, retention responsibility and missing/stale result behavior;
a first-class universal Artifact store is not required. Keep large payloads outside model context
and small runtime progress. Add only stock action authoring actually needed by the two fixtures;
record remaining custom-controller/host paths in the public authoring matrix.

**Touchpoints:** `ports/stage.ts`, `workflow/{stage-result,spec,observations,validation}.ts`, both
controllers, terminal validation, SDK and examples; canonical `composition.md` §4 and `memory.md`.
Register F04–F06.

**Exit:** public imports express computed child results without JSON-as-text conventions, gratuitous
LLM transforms or a shared-memory detour; invalid and cross-owner values fail at the declared
boundary; literal/none behavior has an explicit compatibility story; offline examples and builder
docs pass. If the proposal adds more machinery than it removes, reduce it to the demonstrated values
and selectors. General graph languages and nested fork expansion wait.

## P3 — Specify accepted work and recovery before choosing storage

**Purpose/dependency:** P2. A database adapter cannot repair an incomplete acceptance protocol.

**Work:** write and test a state-transition/linearization decision over accepted ingress identity,
input reservation/acknowledgment, activation identity and writer epoch, progress revision, all action
intents, local invocation attempts, terminal state, durable wake intent and acknowledgment. Specify
which records commit together, including SDK start/root creation and initial-input acceptance.
Include parent/child creation plus root budget, peer send/request,
confirmation and memory settlement; an Execution scope is not automatically a shard boundary.

Reproduce failure between two Effects and correct the misleading `applyOutcome` rollback comment
when implementing this slice. Prior dispatches do not roll back with a later Effect. Decide how
partial activation outcomes are recorded and resumed without losing effects or fabricating success.
For controller-local model work, specify pinned input/projection and code/provider identity,
retry/reconcile rules, duplicated billable-attempt accounting and stale completion. It remains
semantically distinct from a public Effect even if private attempt mechanics are shared.

**Touchpoints:** `runtime/harness.ts`, `effect-processor.ts`, `resumption-processor.ts`,
`ports/{runtime-store,scheduler,controller-resumption}.ts`; execution-runtime owner. F07–F10.

**Exit:** a fault table gives a unique recovery action or explicit manual/unknown state for every
commit/dispatch boundary; deterministic failure injection covers partial Effects, lost wakes and
stale writers. Define stable IDs, checkpoint/runner versions and old-data refusal or migration.
Do not promise recovery yet. If this cannot map coherently onto one owner, stop P4 and narrow the
contract; do not add an adapter to hide duplicate lifecycle/retry ownership.

## P4 — Select and prove the durable substrate

**Purpose/dependency:** P3. Establish recovery before long human waits, hosted claims or protocol expansion.

**Work:** implement one minimal transactional persistent path and compare the same public fault
fixture with one mature durable-runtime facade. Choose the comparator for the required semantics
and manageable deployment, not popularity; the study's Temporal/Restate suggestions and the older
DBOS candidate are research inputs, not accepted dependencies. Use supported upstream interfaces;
do not modify upstream projects or build a database/consensus engine.

Kill an actual worker and start a new process after input acceptance/reservation, during local model
work, after intent, after external success before receipt, after settlement before enqueue, and
during progress/terminal commit. Keep the external service's durable action ledger independent.
Exercise takeover while the old worker completes, duplicate/late callbacks, revoked authority,
missing code and incompatible/corrupt checkpoint versions. Recover readiness from durable truth.
Cover child links/root budget, peer correlation, confirmation and user-input waits, Structured Memory,
parallel branches and invocation snapshots for every mode claimed durable. An unsupported mode
must fail preflight explicitly and cannot be used in a release proof.

**Exit:** no lost accepted input, no accepted stale writer, no invented outcome, no blind retry of
an unresolved consequential effect, no orphan wake; unknown work remains inspectable/reconcilable.
Record raw process-kill traces, scripts, failure model and repeated-cost accounting. Select the
backend on correctness, maintenance/deployment burden and measured transition cost. If the mature
substrate is simpler, use it and retire custom scheduler/storage expansion. Zero observed faults
in this matrix is a bounded claim, not arbitrary exactly-once or host-loss assurance.

## P5 — Make the durable profile operable over time

**Purpose/dependency:** P4. A restart proof with unbounded histories, expired authority or stuck waits
is insufficient for long-lived work.

**Work:** define per-wait deadlines, expiry wakeups, cancellation/child ownership and late-result
handling. Preserve the distinction between cancelling a waiter, preventing new actions, stopping
physical work and undoing an external action. Provide inspection and explicit reconcile/resume
operations for unknown/stuck work with trusted ingress checks. Verify principal restoration,
revocation before dispatch and reads, credential rotation and resource loss; no secrets in checkpoints.

Bound transcript/progress, events, invocation snapshots, handoffs, artifacts and deduplication
retention. Document when deletion/tombstones cease replay guarantees; preserve snapshots necessary
for pending invocations and first child activation. Choose bounded conversation continuation/budget
renewal or a documented new-execution handoff; do not silently reset `maxModelCalls` or grant spend.
Measure actual cloned bytes, transaction cost, dormant state, wake delay, queue/backpressure and
optional-feature overhead. Replace or restrict global whole-store copying for the selected profile;
keep the in-memory reference explicitly small if optimization is unwarranted.

**Exit:** both public applications survive a human wait/restart/correction/cancellation cycle;
selected operating limits and retention policy are reproducible; old checkpoints migrate or fail
clearly, including an upgrade/restart drill; disabled features add no external calls. Run bounded
history/load tests with fake dependencies, not a heavyweight model campaign. F11–F14 apply.

**Do not build:** multi-region scheduling, multi-tenant identity infrastructure, arbitrary hostile-code
hosting or a full operator UI. Trusted host ingress must still be documented and exercised.

## P6 — Prove useful applications and an honest native boundary

**Purpose/dependency:** P5 (a disposable trusted external-job probe can start after P2). Determine
whether heterogeneity adds value without prematurely rewriting the core around a generic runner.

**Work:** finish both applications against their competent direct baselines. Select one independently
valuable specialist engine and integrate as an external task/service first. It owns native model,
context, tools and internal checkpointing; ArrokothI owns only the enclosing obligations declared in
an ownership table. Test artifact/result acceptance, human action, cancellation, late completion,
principal restoration and recovery. Keep the existing Strands step bridge accurately labeled.

Record an assurance vector: identity, native resume mode, context/model ownership, mediated and
ambient action paths, credentials, cancellation/termination, usage and artifacts. Compare native-only,
direct composition and the thin ArrokothI bridge. Test one upstream-version change. Introduce an
opaque versioned runner envelope or revise the Agent/Workflow discriminator only if an actual
consumer cannot be represented honestly; that is a separate explicit semantic/migration decision
inside this gate. Two independent consumers are required before a generic adapter contract is stable.

**Exit:** a recurring correctness/integration obligation is reduced in both application shapes;
every advertised assurance is tested, native useful behavior is retained within predeclared quality
and cost margins, and maintenance is credible. Record counterexamples and failures. If black-box
jobs suffice, retain them and delete deep-adapter work. If only action governance adds value, take
the smaller product branch explicitly. An external job with ambient access provides no all-tools
mediation claim; containment would be a separately gated deployment investment.

## B1 — Make evidence attributable before comparing frameworks

**Purpose/dependency:** P1; implemented in benchmark. The current harness supplies some confirmation,
authorization, deduplication and checkpoint protection itself.

**Work:** define protection ownership per claim and capture separately raw subject proposals,
framework/application-native validation/authorization/consent decisions, laboratory interventions,
attempted dispatch and observed external outcome. Identify the actual store read by `inspect`;
self-reported state is not independently verified persistence. Keep current normalized evidence
valid for what it measures. Add a separately versioned native-boundary diagnostic track where a
controlled sink records an unsafe attempted action as failure even when the lab prevents real harm.

Use deliberately unsafe and safe subjects as controls: both may leave the final world safe because
of the lab, but their subject-native assurance verdicts must differ. Separate application-supplied
policy/validator credit from framework enforcement credit. Do the analogous negative control for a
subject that loses state while the harness checkpoint survives. Do not change private cases to
teach ArrokothI how to pass. Construction and runtime identities must include relevant protocol and
harness changes; pinned canaries are never silently repurposed.

**Exit:** attribution controls distinguish native behavior from lab repair, required evidence comes
from the actual boundary, future outcomes remain hidden until dispatch, and subject attempts are
preserved even on harness denial. P1/P3/P4 deterministic tests can proceed without this infrastructure;
framework safety/recovery comparison claims cannot.

## B2 — Complete only the construction and execution path the campaign needs

**Purpose/dependency:** B1, P5, P6 for final freeze; read-only comparator review and host preparation
may proceed earlier. Detailed current status is in the [benchmark register](../003-evidence-and-findings.md#benchmark-current-state).

**Work:** obtain the canonical Linux/AppArmor rerun of the exact v3 canary if retaining that claim.
Its non-canonical success is already real; do not repeat Desktop runs to seek a stronger label.
Changed construction bytes require a new generation. Freeze the final SDK/kernel by exact commit
and builder-visible tree under a new framework identity; v3's old core-only freeze cannot validate
new SDK ergonomics. Use a new predeclared public canary for the final candidate.

Choose one strong comparator plus the direct baseline from the public application evidence.
Declare identical public construction requirements, BuildValidationSpecs, budgets and supported
runtime features. Build/review/freeze subjects through the existing isolated machinery. Keep a
bounded coding-agent build track distinct from an expert-reviewed native-runtime track. No private
rubric enters builder material. Re-review the framework builder-surface policy: this roadmap, the
findings register, historical plans and strategy study contain benchmark-informed material and must
be excluded or explicitly sanitized, including routes from public guidance. Validate the resulting
builder-visible link graph; do not reuse the old all-files policy by version label. Revalidate installed/packed public imports and classify framework,
builder, task, sandbox, provider and judge failures separately.

Wire the existing generation-unit, subject-process, quota/gateway and checkpoint primitives to the
actual `run/smoke/suite` commands; implement evaluation/re-evaluation orchestration and durable
artifact inspection for the selected scope. The current CLI stubs are not solved by flipping task
readiness. Record an explicit versioned readiness transition referencing the frozen corpus without
editing old evidence in place. Calibrate semantic/hybrid judgments and missing-evidence behavior;
freeze model/prompt/rubric before scoring. Prefer per-requirement verdicts; aggregate weights are
necessary only if publishing an aggregate and must be predeclared.

**Exit:** offline end-to-end controls, isolation and leakage checks pass; exact build identities,
real transport/state evidence, independent re-evaluation and budget-safe interrupted runs work;
canonical claims have physical enforcement on the selected host. No missing host/provider access
blocks cheap local kernel diagnosis, but it blocks the corresponding sealed claim.

## B3 — Run the minimum credible comparative campaign

**Purpose/dependency:** B2 and release-candidate contracts. Decide whether the supported foundation
is useful and whether a release claim survives a fair comparison.

**Work:** pilot the two public application shapes with the direct baseline and one strong alternative;
freeze quality, cost and recovery margins and a repeat/sample plan before confirmatory results.
Use matched model/resources where meaningful, label native capability differences, retain failed
builds and all exclusions, report uncertainty and severity. Execute the B1 native-boundary controls
alongside runtime comparison and retain deterministic P4/P5 fault evidence separately.

Use a predeclared relevant subset of the existing P01–P04 corpus only for supported conversational
behavior/DX questions; choose at requirement/task level before observing scores. P01 computation/
answering and a justified state/action task may suffice. Run all 112 only for a stated all-P01–P04
claim. Corpus quantity is not a recovery or architectural validation gate. Preserve all excluded
families and evidence residuals from the review register. No leaderboard is required.

**Exit:** ordinary builders can construct the supported applications; no unresolved critical semantic
failure or unsupported safety/recovery claim remains; any claimed benefit has attributable evidence
and acceptable cost. An inconclusive comparison narrows the published claim or triggers another
focused experiment; a failed value proposition reopens P6's product branch. Release does not require
winning every quality score, but does require a demonstrated reason to use the extra foundation.

## P7 — Stabilize distribution, documentation and release evidence

**Purpose/dependency:** P1–P6 and B1–B3. Packaging prototypes may start after P2 to expose problems early.

**Work:** publishable compiled JS/types and supported exports across SDK/core/adapters; clean packed
consumer install, typecheck and execution on supported Node versions without workspace symlink or
TypeScript stripping assumptions. Review dependency pins, notices and actual integration terms at
release time. Review terminology/public imports once using observed builder confusion; any accepted
rename includes code/schema/definition migration and explicit compatibility notes.

Synchronize canonical owners only for changes accepted in completed slices. Update baseline,
quick starts, skills, package docs and unsupported-profile matrix; keep completed decisions/evidence
in legacy and this roadmap current. Bundle repeatable install, fault/upgrade, provider/MCP canary,
builder and benchmark evidence with exact source/config identities. Offline provider fakes do not
replace live adapter evidence when compatibility is claimed. Revalidate current release terms and
branding; do not infer partnership from technical compatibility.

**Exit:** package/conformance/typecheck, SDK/examples/evals, builder/link checks, packed consumer,
selected profile recovery/migration/security/load checks and the scoped benchmark campaign pass.
Every active finding is closed, explicitly excluded with an honest supported-surface restriction,
or assigned to a later horizon without undermining 1.0. Fresh contributors can find the current API,
next work, evidence and history. Publish the supported boundary, not “architecture complete.”

## Between 1.0.0 and 2.0.0

A credible 1.0 allows a few major investments, selected by repeated application evidence:

| Investment | Entry evidence and decision branch |
|---|---|
| Deeper heterogeneous integration | P6 value, two independent consumers and upgrade cost. Retain native cognition and a single lifecycle owner. Keep opaque jobs when sufficient; prefer supported upstream APIs over extracted runtimes. |
| Portable services and selected MCP/A2A/Skill bindings | A real consumer needs resources, async handles, input-required or service export. Design only the portable subset required; prove identity, schema, consent, cancellation and outcome mapping. Full protocol parity is not a milestone. |
| Environment boundary and progressive discovery | Demonstrated shared operation/resource needs or catalog cost. Compare eager projection, deterministic retrieval and native search/describe/call before hierarchy or scouts. Test metadata non-disclosure, freshness and all added model cost. |
| Bounded suspendable Program / Machine / ABI experiments | P2/P4 stable value/attempt contracts and measured model-turn overhead. Compare functions, batching and native code tools first. Environment, discovery, program execution and shared IR are independent hypotheses; only promote winning parts. |
| Selected deployment profiles | Actual need for remote workers, stronger isolation or multiple tenants. Reuse managed storage, sandboxes and auth; prove credential/egress/resource containment, identity restoration, leases, cleanup and economics in the real deployment. |
| Multi-Agent composition and richer workflows | Equal-total-budget experiments beat a single strong agent and ordinary fan-out. Only then extend branch subgraphs, supervision, shared resources or join policies demanded by the workload. |
| Context/memory/provider strategies | Compare simple retrieval/windowing against version-aware caches, context IR, queryable history and native compaction; preserve provenance, currentness and revocation. No compulsory extra inference on the minimal path. |
| Operator/product surface | Repeated application adoption and incident needs. Start with read-oriented execution/authority inspection and delivery correlation. Studio authoring/Cloud require demonstrated recurring use and supportable operations. |

2.0 is a compatibility/architecture decision after these experiments, not a promise to ship a
Machine. A mature upstream runtime may increasingly own mechanics while ArrokothI owns the useful
contract. A successful external-task product may need no universal runner at all.

## After 2.0.0: optionality, not scheduled backlog

| Classification | Preserved direction | Evidence required or retirement reason |
|---|---|---|
| Plausible future | Cross-runtime environment portability; broader service federation; richer resource/provenance and delivery projections | Repeated independent integrations and a concrete trust/lifecycle ownership problem. Federation requires an explicit trust model. |
| Conditional hypothesis | Shared Agent/Workflow Program substrate, logical machine with application mounts and alternate ACIs | Bounded-program and environment experiments must reduce total complexity; native engines may remain opaque forever. No automatic IR migration. |
| Conditional hypothesis | Hierarchical knowledge/capability namespaces, read-only Context Scouts and automatic model-tier routing | Flat retrieval and simple routing must lose on verified quality/cost; measure omissions, provenance loss and scout cost. |
| Speculative, worth preserving | Formal information-flow/declassification, portable shared-state semantics, richer inferred-memory currentness/contradiction handling, learned/dynamic composition | Needs earlier authority, data, deployment and evaluation evidence. General claim/entity ontologies and federated autonomous teams remain research. |
| Retired as product obligations | POSIX clone, universal graph importer, mandatory all-engine IR, custom sandbox/browser/database platform, feature parity with mature suites, broad marketplace/Studio/Cloud by default | No demonstrated need; high permanent maintenance and ownership duplication. Reopening requires a new decision with evidence, not an old roadmap checkbox. |

The [future questions](../../future-plan.md), [research notes](../../research/README.md) and
[product vision](../../product-vision.md) preserve the arguments. Their historical experiment sequences
are not additional active plans. New research should identify what could falsify it and what work
would be deleted if it fails.
