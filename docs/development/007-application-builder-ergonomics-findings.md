# Application-builder ergonomics findings

> **Status:** engineering findings recorded while writing
> [`../guides/agent-workflow-composition.md`](../guides/agent-workflow-composition.md) and
> corrected after an independent audit of it.
> **Role:** observations and candidate work items. **Not canonical architecture, and not a plan of
> record.** Nothing here is implemented by the change that recorded it.
> **Baseline inspected:** merged `main` at `85cd89da2a52787803bb911439d3ec2c7af159f2`.

These are the frictions a competent application builder — human or coding agent — actually hits
when asked to turn a product specification into an ArrokothI composition on the current kernel.
Each is classified as:

```text
documentation             the contract is fine; finding or understanding it is not
ergonomics / API          the correct design is unnecessarily hard to express or easy to misuse
effectiveness strategy    a replaceable quality/strategy or API tradeoff, not a contract question
possible semantic gap     the semantics an application needs may genuinely not exist
```

A **possible semantic gap** is a candidate architecture issue for the owning canonical document. It
is *not* licence to add a contract. Escalate through
[`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md) and the owner named in
[`../README.md`](../README.md).

Note the classification bar. A capability that is *architecturally defined but not implemented*, or
*deliberately scoped narrower than the architecture permits*, is an implementation or API finding —
**not** a missing semantic contract. Findings 6 and 7 were originally filed as possible semantic
gaps and are reclassified below on exactly that ground.

---

## 1. There is no application-facing composition root — `ergonomics / API`

**Observation.** Running one real Execution requires assembling `DefinitionStore`, `RuntimeStore`,
`Scheduler`, `ControllerRegistry`, `Clock`, `IdGenerator`, an `EffectAuthorizer`, a
`CapabilityCatalog`, a `CapabilityExecutor`, a `ModelResolver`, provider registry, an
`AgentExecutor` or the Function/Adapter registries, plus the exposure and memory view resolvers.
The only helpers that assemble this coherently — `createTestHarness`, `createAgentTestHarness`,
`createWorkflowTestHarness` — are published under `@arrokothi/core/testing`.

**Evidence.** Outside `tests/conformance/`, `tests/evals/`, and one adapter test, the only place
that built a real Execution-kernel `Harness` for an application-shaped scenario was
`scripts/workflow-scenario-canary.ts`, which needs a live key.

**Consequence for a builder.** A coding agent either copies a conformance test's wiring (importing a
`testing` surface into production code) or reconstructs the composition root from `HarnessOptions`
field by field. See also finding 8: an incomplete assembly fails as "everything is denied" rather
than as "you forgot the authorizer".

**Partially addressed.** `examples/execution-kernel-minimal/` now provides a deterministic, offline,
production-surface assembly to copy from. That is a documentation/example fix; the underlying
ergonomics finding stands.

**Not a semantic gap.** The separation of ports is deliberate and correct. What is missing is an
*application-facing* assembly convenience with the same fail-closed defaults.
[`004-efficiency-and-developer-ergonomics.md`](004-efficiency-and-developer-ergonomics.md) §8
already states the goal ("Level 1 should not require construction of Level-3 machinery"); this is
evidence that Level 1 does not yet exist for the Execution kernel.

## 2. `@arrokothi/core` publishes two overlapping surfaces with colliding names — `ergonomics / API`

**Observation.** The package root (`.`) exports the legacy Session/Flow/`AgentRuntime` API; the
current Execution kernel is at `./execution`. Both export `defineAgent` and a type named
`AgentDefinition`, meaning different things.

**Evidence.** `packages/core/src/index.ts` and `packages/core/src/execution-api.ts`, whose own
docstring says the split exists "only because the root still carries the v0 Session/Flow API during
migration, and the two occupy several of the same names."

**Consequence for a builder.** An agent importing `defineAgent` from `@arrokothi/core` writes a
legacy-runtime Agent that will not run on the Execution kernel, and the failure appears far from the
import. This remains the highest-probability wrong turn available.

**Mitigation applied.** The builder guide, the skill, and the new example all state the import
surface explicitly. That is a documentation patch over an API-shape problem; removing the legacy
root surface is the real fix, and `execution-api.ts` already anticipates it.

## 3. Every other example targets the legacy surface — `documentation`

**Observation.** `examples/minimal-agent/`, `examples/estate-like/`, and both
`examples/benchmark/` subjects build on `AgentRuntime`, `InMemorySessionStore`, `ToolRegistry`,
`KnowledgeIndex`, and the legacy `defineAgent`. None exercises `Harness`, `Execution`, Stages,
Effects, Structured Memory as an Execution-local view, Working Notes, or child composition.

**Consequence for a builder.** "Read the examples" — the correct instinct, and the instruction most
builder guidance gives — taught the wrong API.

**Addressed.** `examples/execution-kernel-minimal/` is a deterministic offline example on the
current surfaces, with one authorized path and one deny-by-default path, registered as
`npm run example:execution-kernel` / `npm run test:example:execution-kernel`. The legacy examples
were deliberately left alone; migrating or retiring them is separate work.

## 4. The kernel Effect vocabulary is much wider than any stock authoring surface — `ergonomics / API`

**Observation.** The kernel understands five Effect kinds, but no stock authoring surface can emit
all five. Verified against current source:

```text
reference Agent controller   imports only useCapability and writeMemory
                             (controllers/agent/controller.ts) — no spawn, message, or user input
reference Workflow controller imports only callExecution, useCapability, writeMemory
Function Stage               StageEffectRequest = StageCapabilityRequest | StageMemoryWriteRequest
LLM Stage                    ModelCallableDeclaration resolves to a capability/operation only
Agent / Workflow Stage       one child `call`, built from the Stage definition alone
SendMessage / RequestUserInput / detached spawn
                             exercised only through the scripted controller in
                             @arrokothi/core/testing, or a custom ExecutionController
```

Two related narrowings with the same cause: a stock Workflow consumes `external.input` **only
once**, before its first Activation (`startInput` in the Workflow controller; later application
input is explicitly not consumed), so it cannot host a multi-turn conversation; and no
controller-side code can *read* Structured Memory — `StageExecutionContext` has no memory handle and
`CapabilityExecutor` is given no store or ExecutionContext, leaving `Harness.structuredMemoryOf` as
the only programmatic read.

**Consequence for a builder.** A design derived from the kernel vocabulary looks correct until
`defineWorkflow` rejects it or the controller simply never proposes the Effect. This was the single
largest source of unbuildable guidance in the first draft of the builder guide.

**Documentation fix applied.** The guide's §2.4 is now an explicit per-surface emission matrix, with
§2.5 giving the ladder — another existing composition, host orchestration, an application-supplied
port, and only then a custom controller.

**Not a semantic gap.** Every one of these narrowings is a deliberate scope decision, and the
generic `ExecutionController` port remains open. This is an authoring-surface coverage question.

## 5. Fork/join topology is narrower than the natural authoring instinct — `ergonomics / API`

**Observation.** A branch body is exactly one adapter-free Stage; branches transition only to their
own fork's join; **the join successor must be a `function` Stage** — validation says so explicitly,
because the join snapshot is delivered to Function Stage code via `StageExecutionContext.join` and a
non-Function successor could not consume it. Nested forks, branch loops, multi-Stage branch
subgraphs, branch Adapters, and join reducers are rejected.

**Assessment.** The narrowness is deliberate, documented, and rejected at validation time rather
than half-supported. The friction is that the natural product-level requirement — "do these three
multi-step things in parallel and merge the results" — does not map onto it, and a builder discovers
this at `defineWorkflow` time.

**Correction applied.** The guide previously said the join successor was "one ordinary downstream
Stage". It now states the Function-Stage requirement and why.

## 6. Structured Memory has only the Execution-local scope — `ergonomics / API`

**Reclassified** from "possible semantic gap".

**Observation.** [`../memory.md`](../memory.md) §11 already defines memory **form** and memory
**scope** as orthogonal axes and names user-, tenant-, application-, and group-scoped views as
coherent combinations. The canonical vocabulary is therefore present and adequate. What is absent is
an *implementation* of any scope beyond Execution-local, together with an application-facing API for
one.

**Why the reclassification.** A semantic gap means the architecture cannot express the requirement.
Here the architecture expresses it and the implementation has not exposed it — which is an
implementation/API limitation plus an explicit application-storage boundary, not missing semantic
vocabulary. Escalating it as a semantic gap would invite adding ontology that
[`../memory.md`](../memory.md) already has.

**Consequence for a builder.** "Remember this about the user across sessions" and "the whole
organisation shares these settings" have no kernel-level answer today. The honest current answer,
now stated in the guide, is application-owned storage reached through a capability, with Structured
Memory holding this Execution's own assertions. A related, easily-missed consequence: an
autonomously spawned or called child receives **no** Structured Memory view at all — only
`Harness.createExecution` binds one.

**Open question for the owner, not a proposal.** Whether a broader scope belongs in the kernel or
stays application storage is a decision for [`../memory.md`](../memory.md)'s owner. **No
implementation follows from this note.**

## 7. Derived Semantic Memory retrieval is authored, not task-following — `effectiveness strategy`

**Reclassified** from "possible semantic gap".

**Observation.** `AgentDerivedMemoryRead.query` is authored in the definition. The reasoning is
recorded in `agent/spec.ts`: F.3 deliberately did not solve dynamic/current-task retrieval, and a
hidden LLM-formed query would make retrieval non-deterministic.

**Why the reclassification.** Dynamic, task-dependent lookup is already supported — as a model-selected
**retrieval capability**, which is the architecturally intended mechanism for "the model decides what
to look up" and carries the correct authority and determinism properties. Two mechanisms exist with
different tradeoffs, and choosing between them is an effectiveness/API-tradeoff question rather than
a missing contract:

```text
spec.derivedMemory.read.query     authored, deterministic, no extra model call, provenance-bearing
retrieval capability operation    model-selected, task-following, authority-governed, costs a call
```

**Consequence for a builder.** The workaround is non-obvious but fully supported, and the guide now
states both options and the tradeoff. **No dynamic Derived-query semantics were created.**

## 8. Deny-by-default failures are correct but not self-describing — `ergonomics / API`

**Observation.** Omitting `authorizer` denies every Effect; omitting `operationAuthority` means the
Execution can expose nothing; omitting `structuralSpawnBudget` means the lineage can spawn nothing;
an unclassified catalog operation is treated as consequential.

**Assessment.** Each default is right, and the source says so emphatically. The friction is
diagnostic: several distinct misconfigurations converge on the same observable ("nothing happened",
"denied"). [`004`](004-efficiency-and-developer-ergonomics.md) §8 already requires that error
messages "name the violated boundary and exact refusal"; this is a place to check that against a
from-scratch application assembly rather than a test fixture.

## 9. `Artifact / File` is canonical vocabulary with no executable mechanism — `possible semantic gap`

**Observation.** `Artifact / File` is one of the four memory forms in
[`../memory.md`](../memory.md). It has **no** implementation: no port, no store, no Effect, no API,
no conformance coverage. The only occurrence of the word in `packages/core/src` is a comment in
`workflow/stage-result.ts` noting that Structured Memory, Artifacts, and bound resources are the
places structured cross-Stage information belongs — "none of which exist yet".

**Consequence for a builder.** Guidance that routes large durable work products, child returns, or
long-running progress artifacts to "an Artifact" is unbuildable. The first draft of the builder
guide did exactly that in five places.

**Correction applied.** The guide now marks Artifact/File as canonical-but-unimplemented in one
place (§4.5) and routes every current recommendation to application-owned durable storage reached
through a capability, with only a reference travelling through the kernel.

**Why this one keeps the `possible semantic gap` label.** Unlike findings 6 and 7, there is no
kernel-side mechanism at all and no roadmap tranche in
[`001`](001-current-status-and-roadmap.md) that names it. Whether the kernel should own an Artifact
contract, or whether application storage is the permanent answer, is genuinely open and belongs to
[`../memory.md`](../memory.md)'s owner. **Nothing was implemented.**

## 10. Derived claims cannot express supersession or currentness — `ergonomics / API`

**Observation.** The accepted claim record is closed:

```text
DerivedSemanticClaim = { claimId, statement, provenance }
provenance           = { sourceRefs, derivedAt, derivation }
```

`CLAIM_KEYS` and `PROVENANCE_KEYS` reject unknown properties, and the reference provider implements
no semantic supersession. [`../memory.md`](../memory.md) §10 describes supersession/contradiction
relations as *potential* metadata and explicitly declines to freeze one universal claim schema.

**Consequence for a builder.** Advice to "record the newer claim and its supersession relation" —
present in the guide's first draft — cannot be followed: there is no field for it and the record is
rejected. Contradictory and superseded claims simply coexist.

**Correction applied.** The guide now states the closed shape, says claims coexist, and routes
currentness policy to application policy, the replaceable provider/retrieval strategy, or promotion
into Structured Memory.

**Classification rationale.** Not a semantic gap: the canonical document deliberately left the claim
schema unfrozen, so this is the implementation choosing the smallest shape, consistent with its
owner. **No Derived Memory fields were added.**

## 11. Lifecycle controls are narrower than they read — `documentation`

**Observation.** Verified in `effects/types.ts` and `runtime/effect-processor.ts`:

```text
deadlineMs / EffectIdempotencyScope   fields of UseCapabilityProposal only.
                                      ProposalBase carries requestKey + authorizationEvidence.
defaultEffectDeadlineMs               applied only in deadlineFor(proposal: UseCapabilityProposal…)
child call result                     PendingOperation deadline: null, with a source comment that
                                      no child-result deadline/cancellation policy is implemented
ask / peer reply, RequestUserInput,
pending confirmation                  deadline: null
cancellation                          "Cancellation does not propagate: the parent is not cancelled,
                                      siblings are not cancelled, and descendants are not cancelled"
                                      (harness.ts), with conformance coverage
duplicate detection                   sameLogicalCapabilityRequest(a, b: UseCapabilityProposal),
                                      against the in-memory Effect journal
```

**Consequence for a builder.** Treating deadlines, idempotency, or cancellation as uniform kernel-wide
properties produces a liveness bug or a double-execution bug that testing rarely catches. In
particular, in-memory journal duplicate recognition is not external idempotency and is not
crash-safe deduplication — the reference store is in memory and durable restart is roadmap tranche
M.

**Correction applied.** The guide's §7.4 now separates the three meanings of "idempotency", states
which waits have no configured deadline, and says cancellation must be cascaded by the application.

## 12. Agent/Workflow Stages expose no Working Notes handoff — `ergonomics / API`

**Observation.** The generic mechanism exists: a controller may build a `spawn`/`call` proposal
carrying `workingNotes`, the Harness envelope-checks it, and policy may deny the concrete transfer
(covered by `tests/conformance/memory/working-notes-handoff.test.ts`). But that test drives it from
a **scripted** Workflow controller. `AgentStageDefinition` / `WorkflowStageDefinition` carry only
`child` and `requestedOperations`, and the real Workflow controller builds `callExecution({...})`
from those alone — no `workingNotes`, no deadline.

**Consequence for a builder.** For a stock Agent Stage or Workflow Stage the **terminal result is
the only built-in child return path**: no note handoff in, no note return out, no shared Structured
Memory view, and no Artifact mechanism (finding 9). Anything else requires an application-defined
external mechanism.

**Correction applied.** The guide's §8.3 now separates the generic controller capability from what
the Stage definitions expose, and states the return path exactly.

## 13. `requestedOperations` is one narrowing lever, not the child security envelope — `documentation`

**Observation.** An absent `requestedOperations` means the child receives no *capability-operation*
authority through that attenuation path. It does not mean the child is inert: it still has its own
lifecycle, controller, local computation, and mailbox, and other powers are governed by the
`EffectAuthorizer` evaluating that child's Effects.

**Correction applied.** The guide's §2.3 and §8.2 now say "no capability-operation authority through
this attenuation path" rather than "the child gets nothing", while preserving
`requested ≠ granted` and parent-current-authority attenuation.

## 14. Stage result and transition label were conflated — `documentation`

**Observation.** `StageResult = string | null` is the data edge; a transition label is a separate
declared control selection, returned independently by a Function Stage and resolved against the
declared graph. `stage-result.ts` is explicit that `null` means *none*, not empty and not unknown.

**Consequence.** The guide's first draft listed "small text handoff or a transition label" as one
row, which invites encoding control into the data string and turns a declared graph edge into a
string convention.

**Correction applied.** The guide's §8.5 now separates them and says not to pack routing into the
result text.

## 15. `docs/agent-engineering/` was unregistered in the documentation map — `documentation`

**Observation.** The directory existed and is referenced by name in task material, but
[`../README.md`](../README.md)'s supporting-material table did not list it, so a reader following the
canonical map could not find it or tell whether it was canonical.

**Fixed** alongside the builder guide: `agent-engineering/` and `guides/` are both registered, with
their non-canonical status stated.

---

## Summary

| # | Finding | Class |
|---|---|---|
| 1 | No application-facing composition root; assembly helpers live in `testing` | ergonomics / API |
| 2 | Two overlapping `@arrokothi/core` surfaces with colliding `defineAgent` | ergonomics / API |
| 3 | Every other example targets the legacy surface | documentation (example added) |
| 4 | Kernel Effect vocabulary ≫ any stock authoring surface | ergonomics / API |
| 5 | Fork/join narrower than instinct; join successor must be a Function Stage | ergonomics / API |
| 6 | Structured Memory has only the Execution-local scope | ergonomics / API *(was: semantic gap)* |
| 7 | Derived retrieval query is authored, not task-following | effectiveness strategy *(was: semantic gap)* |
| 8 | Deny-by-default misconfigurations are not self-describing | ergonomics / API |
| 9 | `Artifact/File` is canonical with no executable mechanism | possible semantic gap |
| 10 | Derived claims cannot express supersession or currentness | ergonomics / API |
| 11 | Deadline / idempotency / cancellation are narrower than they read | documentation |
| 12 | Agent/Workflow Stages expose no Working Notes handoff | ergonomics / API |
| 13 | `requestedOperations` is not the whole child security envelope | documentation |
| 14 | Stage result and transition label were conflated | documentation |
| 15 | `agent-engineering/` unregistered in the doc map | documentation (fixed) |

Finding 9 is the only remaining **possible semantic gap**, and it is a candidate architecture issue
for [`../memory.md`](../memory.md)'s owner. Finding 6 raises an open scope question for the same
owner without claiming missing vocabulary. Nothing in this document was implemented, worked around
in core, or reflected in any contract by the changes that recorded it.
