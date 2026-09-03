# Application-builder ergonomics findings

> **Status:** engineering findings recorded while writing
> [`../guides/agent-workflow-composition.md`](../guides/agent-workflow-composition.md).
> **Role:** observations and candidate work items. **Not canonical architecture, and not a plan of
> record.** Nothing here is implemented by the change that recorded it.
> **Baseline inspected:** merged `main` at `85cd89da2a52787803bb911439d3ec2c7af159f2`.

These are the frictions a competent application builder — human or coding agent — actually hits
when asked to turn a product specification into an ArrokothI composition on the current kernel.
Each is classified as:

```text
documentation             the contract is fine; finding or understanding it is not
ergonomics / API          the correct design is unnecessarily hard to express or easy to misuse
effectiveness strategy    a replaceable quality/strategy question, not a contract question
possible semantic gap     the semantics an application needs may genuinely not exist
```

A **possible semantic gap** is a candidate architecture issue for the owning canonical document. It
is *not* licence to add a contract. Escalate through
[`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md) and the owner named in
[`../README.md`](../README.md).

---

## 1. There is no application-facing composition root — `ergonomics / API`

**Observation.** Running one real Execution requires assembling `DefinitionStore`, `RuntimeStore`,
`Scheduler`, `ControllerRegistry`, `Clock`, `IdGenerator`, an `EffectAuthorizer`, a
`CapabilityCatalog`, a `CapabilityExecutor`, a `ModelResolver`, provider registry, an
`AgentExecutor` or the Function/Adapter registries, plus the exposure and memory read/write view
resolvers. The only helpers that assemble this coherently are `createTestHarness`,
`createAgentTestHarness`, and `createWorkflowTestHarness` — all published under
`@arrokothi/core/testing`.

**Evidence.** Outside `tests/conformance/`, `tests/evals/`, and one adapter test, the only place in
the repository that builds a real Execution-kernel `Harness` for an application-shaped scenario is
`scripts/workflow-scenario-canary.ts`.

**Consequence for a builder.** A coding agent asked to build an application either copies a
conformance test's wiring (importing a `testing` surface into production code) or reconstructs the
composition root from `HarnessOptions` field by field. The first is wrong; the second is slow and
error-prone, and the deny-by-default defaults mean an incomplete assembly fails as "everything is
denied" rather than as "you forgot the authorizer".

**Not a semantic gap.** The separation of ports is deliberate and correct. What is missing is an
*application-facing* assembly convenience with the same defaults, plus a documented minimal wiring.
[`004-efficiency-and-developer-ergonomics.md`](004-efficiency-and-developer-ergonomics.md) §8 already
states the goal ("Level 1 should not require construction of Level-3 machinery"); this is evidence
that Level 1 does not exist yet for the Execution kernel.

## 2. `@arrokothi/core` publishes two overlapping surfaces with colliding names — `ergonomics / API`

**Observation.** The package root (`.`) exports the legacy Session/Flow/`AgentRuntime` API; the
current Execution kernel is at `./execution`. Both export `defineAgent` and a type named
`AgentDefinition`, and they mean different things.

**Evidence.** `packages/core/src/index.ts` and `packages/core/src/execution-api.ts`. The latter's
own docstring says the split exists "only because the root still carries the v0 Session/Flow API
during migration, and the two occupy several of the same names."

**Consequence for a builder.** An agent that imports `defineAgent` from `@arrokothi/core` writes a
legacy-runtime Agent that will not run on the Execution kernel, and the failure appears as a type or
validation error far from the import. This is the single highest-probability wrong turn available to
a builder today.

**Mitigation applied.** The builder guide and the `arrokothi-agent-builder` skill both state the
import surface explicitly. That is a documentation patch over an API-shape problem; the removal of
the legacy root surface is the real fix and is already anticipated in `execution-api.ts`.

## 3. Every current example targets the legacy surface — `documentation`

**Observation.** `examples/minimal-agent/`, `examples/estate-like/`, `examples/benchmark/p01/`, and
`examples/benchmark/p02/` all build on `AgentRuntime`, `InMemorySessionStore`, `ToolRegistry`,
`KnowledgeIndex`, and the legacy `defineAgent`. None of them exercises `Harness`, `Execution`,
Stages, Effects, Structured Memory as an Execution-local view, Working Notes, or child composition.

**Consequence for a builder.** "Read the examples" — the correct instinct, and the instruction most
builder guidance gives — currently teaches the wrong API. The nearest correct references are the
conformance suite (which is written to prove semantics, not to model applications) and the workflow
canary (which requires a live key to run).

**Candidate work.** One deterministic, offline, Execution-kernel example that exercises a Workflow
with a Function Stage, an LLM Stage, Structured Memory, and one confirmed consequential Effect
would remove most of this friction. It is an example, not a contract, so it does not require an
architecture decision.

## 4. Fork/join topology is narrower than the natural authoring instinct — `ergonomics / API`

**Observation.** A branch body is exactly one adapter-free Stage; branches transition only to their
own fork's join; the join has exactly one ordinary downstream Stage; nested forks, branch loops,
multi-Stage branch subgraphs, branch Adapters, and join reducers are rejected by validation.

**Assessment.** The narrowness is deliberate and documented, and rejecting at validation time is
much better than half-supporting. The friction is that the natural product-level requirement —
"do these three multi-step things in parallel and merge the results" — does not map onto it, and a
builder discovers this only at `defineWorkflow` time.

**Not a semantic gap.** The deferrals are explicitly recorded in
[`002-implemented-kernel-baseline.md`](002-implemented-kernel-baseline.md) §12. The guide states the
limits up front so a builder chooses a sequence, or child Executions, before designing around a fork
that will not validate.

## 5. Child results have exactly one return path, and it is easy to miss — `documentation`

**Observation.** Parent→child Working Notes handoff is explicit and supported; there is no automatic
child→parent note return, and autonomous children do not inherit the parent's Structured Memory
view. A child's contribution therefore returns as a terminal result, or through state the
application deliberately shares, or not at all.

**Assessment.** This is correct and load-bearing — `note ancestry ≠ note visibility`, and ownership
is not memory access. It is nonetheless the design decision a builder is most likely to leave
implicit, because in most other agent frameworks sub-agent state leaks upward by default.

**Documentation fix applied.** The guide's step 5 requires naming the child return path explicitly.

## 6. Structured Memory has no cross-Execution scope — `possible semantic gap`

**Observation.** Structured Memory is an Execution-local, schema-bound view configured at Execution
creation. `../memory.md` §11 defines memory **form** and memory **scope** as orthogonal, and lists
user-, tenant-, application-, and group-scoped views as coherent combinations. The implementation
provides only the Execution-local scope; a general cross-Execution scope ontology is a recorded
deferral.

**Consequence for a builder.** Requirements phrased as "remember this about the user across
sessions" or "the whole organisation shares these settings" have no kernel-level answer today. The
honest application answer is an external store reached through a capability, with Structured Memory
holding only this Execution's assertions.

**Classification rationale.** Recorded as a *possible* gap rather than a confirmed one: the
canonical document already describes the axis, and the roadmap does not currently name scope as a
tranche deliverable. Whether the gap belongs to the kernel or to application storage is exactly the
question that needs an explicit decision from [`../memory.md`](../memory.md)'s owner. **No
implementation follows from this note.**

## 7. Derived Semantic Memory retrieval cannot follow the current task — `possible semantic gap`

**Observation.** `AgentDerivedMemoryRead.query` is authored in the definition, not model-generated.
The reasoning is recorded in `agent/spec.ts`: F.3 deliberately did not solve dynamic/current-task
retrieval, and a hidden LLM-formed query would make retrieval non-deterministic.

**Consequence for a builder.** An application whose derived knowledge must be retrieved *about the
thing currently being discussed* cannot express that through `spec.derivedMemory`. The available
composition is a retrieval **capability** the model calls with its own arguments — which is a
different mechanism with different authority and determinism properties, and the guide says so.

**Classification rationale.** The constraint is explicit, reasoned, and recorded, so this may be a
permanent boundary rather than a gap. It is listed because the requirement is common and the
workaround is non-obvious. Any change is [`../memory.md`](../memory.md)'s decision.

## 8. Deny-by-default failures are correct but not self-describing — `ergonomics / API`

**Observation.** Omitting `authorizer` denies every Effect; omitting `operationAuthority` means the
Execution can expose nothing; omitting `structuralSpawnBudget` means the lineage can spawn nothing;
an unclassified catalog operation is treated as consequential.

**Assessment.** Each default is right, and the source comments say so emphatically. The friction is
diagnostic: several distinct misconfigurations converge on the same observable ("nothing happened",
"denied"), so a builder cannot tell *which* piece of wiring is missing without reading the source.
[`004`](004-efficiency-and-developer-ergonomics.md) §8 already requires that "error messages should
name the violated boundary and exact refusal"; this is a place to check that against a
from-scratch application assembly rather than a test fixture.

## 9. `docs/agent-engineering/` was unregistered in the documentation map — `documentation`

**Observation.** The directory existed and is referenced by name in task material, but
[`../README.md`](../README.md)'s supporting-material table did not list it, so a reader following
the canonical map would not find it and could not tell whether it was canonical.

**Fixed** in the same change that added the builder guide: `agent-engineering/` and the new
`guides/` directory are both registered, with their non-canonical status stated.

---

## Summary

| # | Finding | Class |
|---|---|---|
| 1 | No application-facing composition root; assembly helpers live in `testing` | ergonomics / API |
| 2 | Two overlapping `@arrokothi/core` surfaces with colliding `defineAgent` | ergonomics / API |
| 3 | All examples target the legacy surface | documentation |
| 4 | Fork/join narrower than the natural authoring instinct | ergonomics / API |
| 5 | Single explicit child return path is easy to miss | documentation |
| 6 | No cross-Execution Structured Memory scope | possible semantic gap |
| 7 | Derived Memory retrieval query cannot follow the current task | possible semantic gap |
| 8 | Deny-by-default misconfigurations are not self-describing | ergonomics / API |
| 9 | `agent-engineering/` unregistered in the doc map | documentation (fixed) |

No effectiveness-strategy findings are recorded here: replaceable Agent quality strategy belongs to
[`003-agent-effectiveness-guidance.md`](003-agent-effectiveness-guidance.md), and nothing observed
while writing the guide contradicted it.

Findings 6 and 7 are the only ones that could touch kernel semantics. Both are **candidate**
architecture issues for [`../memory.md`](../memory.md)'s owner. Neither was implemented, worked
around in core, or reflected in any contract by the change that recorded them.
