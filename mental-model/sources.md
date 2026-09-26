# Source decisions, usability evidence and open choices

This is provenance and maintenance navigation. Current meanings are owned by [concepts and mechanisms](reference.md); historical records remain unchanged and their old paths/status describe their recorded candidate. No current rule requires reading an old architecture page.

## Ownership and precedence

Layer 1 teaches a deliberately incomplete whole-system model. Layer 2 explains major abstractions. Layer 3 defines terms once and owns precise mechanisms. Local reminders link to those owners. Higher-level summaries are consequences of those rules, not independent competing specifications.

This rewrite preserves the accepted architecture and incorporated K0.1 decisions; it does not authorize a semantic change or claim implementation. If a source actually conflicts, use the repository's accepted decision/precedence policy and provenance. If that cannot resolve it, record the affected rule as unresolved rather than choosing the wording that is easier to implement. Development status and implementation observations do not override target semantics.

## Accepted decision coverage

The [K0.1 worksheet](../tests/fixtures/k0/protocol-worksheet.md) is retained as historical decision evidence. Its accepted revision 12 is identified by [review 12](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/review-12.md) and [integration](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/integration-01.md). Current retrieval is:

| Accepted family | Current owner |
|---|---|
| E-1–E-7 | [Value model, canonical bytes and limits](concepts/values.md) |
| ID-1–ID-9 | [Core identity](concepts/core.md), [scoped identity/receipts](concepts/identity.md), [dispatch retries](mechanisms/execution-cycle.md) |
| B-1–B-8, CL-1–CL-3, W-1–W-9 | [Waits, the wait clock and batch selection](mechanisms/waits.md) (B, W, CL-3 and CL-2's timeout-versus-result race); [three clocks](concepts/operations.md#three-clocks) and [timeout Event](concepts/core.md#timeout-event) (CL-1 and what an expiry proves) |
| CX-1–CX-6 | [Lifecycle and cancellation](mechanisms/lifecycle.md) |
| OA-1–OA-6, EF-1–EF-2 | [Outcome acceptance and K1 refusal](mechanisms/execution-cycle.md#outcome-acceptance) |
| EF-3–EF-4 | [Four action dimensions](concepts/actions.md#settlement-and-reconciliation), [actions](mechanisms/actions.md) |
| PC-1–PC-5 | [Progress forms](concepts/state.md#progress), [recovery](mechanisms/recovery.md) |
| LP-1–LP-3 | [Local/remote policy and correction ordering](mechanisms/authority.md) |
| M-1, worksheet assertion mapping | [Evidence attribution](mechanisms/evidence.md), benchmark-owned gates in [roadmap](roadmap.md) |
| LC-1, MIG/LEG/REF classifications | [Implemented baseline](../docs/development/002-implemented-kernel-baseline.md), [live ownership inventory](../docs/development/kernel-ownership.md); no legacy code/data deleted by this rewrite |

K0.2's [accepted review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.2/review-17.md) and [public fixture specification](../tests/fixtures/k0/public-fixture-specification.md) are evidence of observable distinctions, not an alternative definition graph. K1.0's [final correction review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0-correction-02/review-01.md) supports the [structural evidence contract](mechanisms/evidence.md#structural-evidence). The [status ledger](../docs/development/007-work-packets.md) alone owns current release status.

The owner delegated the K1.1-correction-01 architecture decision on 2026-09-15. [Decision 01](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-correction-01/decision-01.md) replaces arbitrary Driver-returned Promise observation with the [delivery reporting boundary](mechanisms/execution-cycle.md#delivery-reporting-boundary). This authorized target change is implemented in exact H5 `52b1600f3b42e3a360fdc3395178f1d147edf304`, independently accepted by [review-08](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-correction-01/review-08.md); integration remains a separate ledger decision. It does not reinterpret historical K1.1 reviews.

On 2026-09-25 the owner authorized K1.2 to extend that in-process delivery call from `deliver(activation, settlement)` to `deliver(activation, settlement, submission)`, so that it also carries the current Runtime attempt's [submission authority](mechanisms/execution-cycle.md#submission-authority) ([K1.2 decision 01](../docs/development/work/K1.2/decision-01.md), resolving [blocker-01](../docs/development/work/K1.2/blocker-01.md)). The decision supersedes only the two-argument signature; every other KC1-ARCH-1 guarantee stands, and the historical KC1-ARCH-1 record stays sealed.

On 2026-09-26 [K1.2 decision 02](../docs/development/work/K1.2/decision-02.md) fixed the
Activation identity's place in the Outcome acceptance order: only a well-formed identity can
address replay or establish staleness; an unusable identity is a content issue after authority.
The canonical order lives in [execution-cycle](mechanisms/execution-cycle.md#outcome-acceptance).
[K1.2-correction-01](../docs/development/work/K1.2-correction-01/contract.md) records the binding's
producer-compatible identity representation under [identity](concepts/identity.md#runtime-attempt).

The [reference supplement](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-reference-01/contract.md) brings two accepted implementation decisions into their canonical owners: KC1-DEC-1's creation/ingress domain separation in [identity](concepts/identity.md#request-key-and-input-id), and K1.1 C3 plus KC1-DEC-3/6's coherent in-process capture and representation limits in [values](concepts/values.md#in-process-value-capture). Their sources are the accepted [correction contract](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1-correction-01/contract.md), original [K1.1 contract](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1/contract.md) and H5 source/tests. The supplemental prose requires its own independent review; the original implementation ACCEPT is preserved.

On 2026-09-24 the owner adopted the accepted [K1.1 contract](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.1/contract.md)'s binding of the progress codec at creation (C1, with C4 forbidding dispatch to infer it) as the sixth fact of [one atomic creation](mechanisms/creation.md#one-atomic-creation). Worksheet PC-4 and [progress](concepts/state.md#progress) already required progress to be pinned to its codec version, but no page said where the first pin comes from, before any progress exists.

The owner's 2026-09-23 rewrite of [values](concepts/values.md) stated three obligations that no worksheet decision or K1.1 record states in those words: refusing a value must cost no more than accepting one at the limits; a digest that alone decides duplicate-versus-conflict after deletion must resist deliberate collisions and cover the full canonical bytes; and each request-envelope field is read once, with that one answer used for everything the call does. [K1.1-correction-02 decision 01](../docs/development/work/K1.1-correction-02/decision-01.md) records them as owner decisions, with their relation to accepted K1.1 behavior and the implementation change the first one required.

## Misunderstandings that shaped these pages

| Evidence | Comprehension problem | Structural correction |
|---|---|---|
| [K0.1 round 1 correction](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/implementation-02.md) | Takeover was confused with a new Activation | Separate exchange, Runtime attempt and writer epoch; show retry/takeover/new-exchange table |
| [K0.1 round 3 review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/review-03.md) | “Canonical” mixed wire format, byte count and inconsistent key ordering | One value owner fixes byte rules and units; separate transport and progress codecs |
| [K0.1 round 8 review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/review-08.md), [round 9 reconstruction](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/implementation-09.md) | Correct local edits left contradictory eligibility, timeout and selection rules | One composed wait mechanism with source categories, ordered registration and shared batch selection |
| [K0.1 round 9 review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/review-09.md) | Structurally valid was confused with capable of waking | Explicit inert-but-valid example; no invented satisfiability check |
| [K0.1 round 11 review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/review-11.md), [round 12 report](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.1/implementation-12.md) | Cancellation was read as progress-only or deferred to physical handling | Name every forbidden losing-Outcome mutation and distinguish rejected replay from accepted receipt replay |
| [K0.2 round 16 review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K0.2/review-16.md) | A bound-1 wake example appeared to prove selection, eligibility and retention together | Independent small cases for earliest member, spare-capacity exclusion and mandatory timeout |
| [K1.0 round 2 review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0/review-02.md) | Matching labels/partial checks appeared to prove inventory agreement | Preserve relational source/document evidence and distinguish base versus candidate measurements |
| [K1.0 cleanup](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0/cleanup-01.md), [correction-02 review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/work/K1.0-correction-02/review-01.md) | Whole-cell meaning and collection identity were replaced by rendered fragments/strings | Define cardinality/member identity separately from formatting; preserve fail-closed inventory checks |

Repeated misunderstandings are usability evidence even when a correct rule was present elsewhere. They do not prove every code defect was caused by prose. These changes address prerequisite ordering, overloaded words, competing rules and weak examples.

## Native design evidence

The historical [architecture review](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/development/004-architecture-review.md) pins inspected sibling checkouts. These examples preserve useful prior-art navigation; inspection was not an executed test, adopted dependency or license clearance. The sibling source trees are not present in this checkout; the paths below are source locators at those pinned revisions, not broken local-file links or new inspections.

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

The rewrite follows the definition-before-composition approach in [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), the local clarity plus deeper links in [MCP architecture](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture), and the explicit connection to earlier ideas in [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps). These are writing references, not ArrokothI architecture authorities. The [Workflow and Agent](concepts/roles.md#workflow) explanation additionally borrows the first article's line between workflows and agents, three of its workflow patterns as examples, and its advice to reach for an agent only when a workflow cannot express the work; those illustrate the canonical definitions and do not replace them.
