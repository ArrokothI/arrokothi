# Source decisions, usability evidence and open choices

This is provenance and maintenance navigation. Current meanings are owned by [concepts and mechanisms](reference.md); historical records remain unchanged and their old paths/status describe their recorded candidate. No current rule requires reading an old architecture page.

## Ownership and precedence

Layer 1 teaches a deliberately incomplete whole-system model. Layer 2 explains major abstractions. Layer 3 defines terms once and owns precise mechanisms. Local reminders link to those owners. Higher-level summaries are consequences of those rules, not independent competing specifications.

This rewrite preserves the accepted architecture and incorporated K0.1 decisions; it does not authorize a semantic change or claim implementation. If a source actually conflicts, use the repository's accepted decision/precedence policy and provenance. If that cannot resolve it, record the affected rule as unresolved rather than choosing the wording that is easier to implement. Development status and implementation observations do not override target semantics.

## Accepted decision coverage

The [K0.1 worksheet](../docs/development/work/K0.1/protocol-worksheet.md) is retained as historical decision evidence. Its accepted revision 12 is identified by [review 12](../docs/development/work/K0.1/review-12.md) and [integration](../docs/development/work/K0.1/integration-01.md). Current retrieval is:

| Accepted family | Current owner |
|---|---|
| E-1–E-7 | [Value model, canonical bytes and limits](concepts/values.md) |
| ID-1–ID-9 | [Core identity](concepts/core.md), [scoped identity/receipts](concepts/identity.md), [dispatch retries](mechanisms/execution-cycle.md) |
| B-1–B-8, CL-1–CL-3, W-1–W-9 | [Waits, clocks and batch selection](mechanisms/waits.md) |
| CX-1–CX-6 | [Lifecycle and cancellation](mechanisms/lifecycle.md) |
| OA-1–OA-6, EF-1–EF-2 | [Outcome acceptance and K1 refusal](mechanisms/execution-cycle.md#outcome-acceptance) |
| EF-3–EF-4 | [Four action dimensions](concepts/actions.md#settlement-and-reconciliation), [actions](mechanisms/actions.md) |
| PC-1–PC-5 | [Progress forms](concepts/state.md#progress), [recovery](mechanisms/recovery.md) |
| LP-1–LP-3 | [Local/remote policy and correction ordering](mechanisms/authority.md) |
| M-1, worksheet assertion mapping | [Evidence attribution](mechanisms/evidence.md), benchmark-owned gates in [roadmap](roadmap.md) |
| LC-1, MIG/LEG/REF classifications | [Implemented baseline](../docs/development/002-implemented-kernel-baseline.md), [live ownership inventory](../docs/development/work/K1.0/ownership-inventory.md); no legacy code/data deleted by this rewrite |

K0.2's [accepted review](../docs/development/work/K0.2/review-17.md) and [public fixture specification](../docs/development/work/K0.2/public-fixture-specification.md) are evidence of observable distinctions, not an alternative definition graph. K1.0's [final correction review](../docs/development/work/K1.0-correction-02/review-01.md) supports the [structural evidence contract](mechanisms/evidence.md#structural-evidence). The [status ledger](../docs/development/007-work-packets.md) alone owns current release status.

The owner delegated the K1.1-correction-01 architecture decision on 2026-09-15. [Decision 01](../docs/development/work/K1.1-correction-01/decision-01.md) replaces arbitrary Driver-returned Promise observation with the [delivery reporting boundary](mechanisms/execution-cycle.md#delivery-reporting-boundary). This is an authorized target change, implemented by the correction candidate with independent acceptance/integration pending; it does not reinterpret historical K1.1 reviews.

## Misunderstandings that shaped these pages

| Evidence | Comprehension problem | Structural correction |
|---|---|---|
| [K0.1 round 1 correction](../docs/development/work/K0.1/implementation-02.md) | Takeover was confused with a new Activation | Separate exchange, Runtime attempt and writer epoch; show retry/takeover/new-exchange table |
| [K0.1 round 3 review](../docs/development/work/K0.1/review-03.md) | “Canonical” mixed wire format, byte count and inconsistent key ordering | One value owner fixes byte rules and units; separate transport and progress codecs |
| [K0.1 round 8 review](../docs/development/work/K0.1/review-08.md), [round 9 reconstruction](../docs/development/work/K0.1/implementation-09.md) | Correct local edits left contradictory eligibility, timeout and selection rules | One composed wait mechanism with source categories, ordered registration and shared batch selection |
| [K0.1 round 9 review](../docs/development/work/K0.1/review-09.md) | Structurally valid was confused with capable of waking | Explicit inert-but-valid example; no invented satisfiability check |
| [K0.1 round 11 review](../docs/development/work/K0.1/review-11.md), [round 12 report](../docs/development/work/K0.1/implementation-12.md) | Cancellation was read as progress-only or deferred to physical handling | Name every forbidden losing-Outcome mutation and distinguish rejected replay from accepted receipt replay |
| [K0.2 round 16 review](../docs/development/work/K0.2/review-16.md) | A bound-1 wake example appeared to prove selection, eligibility and retention together | Independent small cases for earliest member, spare-capacity exclusion and mandatory timeout |
| [K1.0 round 2 review](../docs/development/work/K1.0/review-02.md) | Matching labels/partial checks appeared to prove inventory agreement | Preserve relational source/document evidence and distinguish base versus candidate measurements |
| [K1.0 cleanup](../docs/development/work/K1.0/cleanup-01.md), [correction-02 review](../docs/development/work/K1.0-correction-02/review-01.md) | Whole-cell meaning and collection identity were replaced by rendered fragments/strings | Define cardinality/member identity separately from formatting; preserve fail-closed inventory checks |

Repeated misunderstandings are usability evidence even when a correct rule was present elsewhere. They do not prove every code defect was caused by prose. These changes address prerequisite ordering, overloaded words, competing rules and weak examples.

## Scope of the replaced architecture

| Former topic | Current home |
|---|---|
| Whole-system overview | [Layer 1](README.md) |
| Kernel detailed page | [Kernel](kernel.md), [cycle](mechanisms/execution-cycle.md), [waits](mechanisms/waits.md), [lifecycle](mechanisms/lifecycle.md), [authority](mechanisms/authority.md) |
| Execution detailed page | [Runtime](runtime.md), [Driver](driver.md), [integration](mechanisms/integration.md), [recovery](mechanisms/recovery.md) |
| Deployment detailed page | [Deployment](deployment.md), [resources](mechanisms/resources.md), [external protocols](mechanisms/external-protocols.md) |
| Execution protocol | [Identity](concepts/identity.md), [values](concepts/values.md), [creation](mechanisms/creation.md), cycle/waits/lifecycle above |
| Authority and action lifecycle | [Action concepts](concepts/actions.md), [authority](mechanisms/authority.md), [actions](mechanisms/actions.md), [output](mechanisms/output.md) |
| Children and communication | [Communication](mechanisms/communication.md) |
| Runtime composition | [Local composition](mechanisms/composition.md) |
| Memory/state | [State concepts](concepts/state.md), [state mechanisms](mechanisms/state.md) |
| Context/projections | [Roles and context concepts](concepts/roles.md), [context construction](mechanisms/context.md) |
| Recovery/compatibility and Driver fidelity | [Recovery](mechanisms/recovery.md), [integration](mechanisms/integration.md) |
| Resource/isolation and evidence | [Operational terms](concepts/operations.md), [resources](mechanisms/resources.md), [evidence](mechanisms/evidence.md) |

## Native design evidence

The historical [architecture review](../docs/development/004-architecture-review.md) pins inspected sibling checkouts. These examples preserve useful prior-art navigation; inspection was not an executed test, adopted dependency or license clearance. The sibling source trees are not present in this checkout; the paths below are source locators at those pinned revisions, not broken local-file links or new inspections.

| Source | Specific lesson |
|---|---|
| CrewAI `crewAI/lib/crewai/src/crewai/experimental/agent_executor.py` and `crewAI/lib/crewai/src/crewai/flow/runtime/__init__.py` | Agent and Workflow can share machinery without a universal Kernel graph |
| CrewAI `crewAI/lib/crewai/src/crewai/flow/persistence/sqlite.py`, `crewAI/lib/crewai/src/crewai/state/runtime.py`, `crewAI/lib/crewai/src/crewai/memory/memory_scope.py` | Retain feedback with state and rebind live associations/resources on restore |
| CrewAI `crewAI/lib/crewai/src/crewai/hooks/tool_hooks.py` | Argument mutation precedes admission; raw results differ from presentation |
| OpenClaw `openclaw/src/agents/harness/types.ts`, `openclaw/src/agents/harness/host-capability-types.ts` | Preserve native model/auth ownership and scoped host tool/approval controls |
| OpenClaw `openclaw/src/tasks/task-owner-access.ts`, `openclaw/src/tasks/task-registry.types.ts` | Principal namespace, ownership, run status and delivery status are separate |
| OpenClaw `openclaw/src/infra/outbound/delivery-queue-recovery.ts`, `openclaw/src/infra/outbound/delivery-queue-reconciliation.ts` | Exact prepared payload/account and send evidence make uncertainty meaningful |
| Hermes `hermes-agent/agent/context_engine.py`, `hermes-agent/model_tools.py`, `hermes-agent/tools/tool_search.py` | Request-only selection and underlying bridge resolution have distinct native owners |
| Hermes `hermes-agent/tools/async_delegation.py`, `hermes-agent/tests/tools/test_restored_delegation_ownership.py` | Partial results survive owner loss without pretending all child work completed |
| Hermes `hermes-agent/tools/environments/base.py`, `hermes-agent/tools/checkpoint_manager.py`, `hermes-agent/tools/memory_tool.py` | Host lifecycle, file undo and session-start memory snapshots are different guarantees |
| Dify `dify/api/core/app/layers/pause_state_persist_layer.py`, `dify/api/services/human_input_service.py` | Graph/output-filter state and form resumption belong together |
| Dify `dify/dify-agent/src/dify_agent/runtime/runner.py`, `dify/dify-agent/src/dify_agent/runtime_backend/protocols.py` | Deferred human work can accompany native success; release differs from destroy |

## Intentionally unselected choices

Exact wire encoding, receipt serialization, epoch representation across new exchanges, batch maximum (at least one), wait-generation/subscription spelling, clock units, storage schema and timer machinery remain implementation-owned within their fixed semantics. K1.1/K1.3 are expected to populate those choices when accepted work defines them.

K2 owns concrete policy/consent representation and remote freshness. R1 owns actual Driver-specific phase guarantees. K3 selects a persistent substrate; D1 selects any claimed isolation backend; S1 states supported versions/protocol subsets. No universal artifact service, memory ontology, Skill schema, policy backend or native checkpoint migration is silently invented to fill the directory. Optional concepts are usable design guidance, not automatic release commitments.

## Writing references

The rewrite follows the definition-before-composition approach in [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), the local clarity plus deeper links in [MCP architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture), and the explicit connection to earlier ideas in [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps). These are writing references, not ArrokothI architecture authorities.
