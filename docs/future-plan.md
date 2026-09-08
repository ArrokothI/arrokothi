# Future plan

> **Status:** unresolved or evidence-gated work only. This is not the active implementation roadmap.
>
> Current architecture is owned by [`mental-model.md`](mental-model.md), [`kernel.md`](kernel.md), [`execution.md`](execution.md), and [`deployment.md`](deployment.md). The active sequence is [`development/001-current-status-and-roadmap.md`](development/001-current-status-and-roadmap.md). Detailed accepted designs live in [`detail-design/`](detail-design/).

This file records questions that should **not** be frozen into the current Kernel merely because they were part of the previous architecture or are attractive future features.

## 1. Kernel extensions after current roadmap evidence

### Richer waits and supervision

The current target starts with finite correlated any-of waits plus deadlines. Revisit only if real applications require:

- bounded all-of optimizations;
- richer peer request/reply helpers;
- supervision/restart policy;
- wait-for graph diagnostics;
- deadlock-candidate reporting;
- fairness/admission sophistication.

General Workflow graph semantics remain Runtime-owned.

### Shared-resource concurrency

Applications may eventually justify portable support for:

- fine-grained preconditions/versions;
- reducers or commutative updates;
- leases/permits/fencing;
- transactional multi-resource operations;
- conflict observations.

Prefer resource-specific mechanisms first. Do not add one universal shared-state model without repeated consumers.

### Policy and discovery scale

Current authority/action semantics do not require a specific policy engine or discovery product.

Future evidence may justify:

- Cedar/OpenFGA/application-policy adapters;
- efficient filter/enumerate APIs for large authorized catalogs;
- deterministic lexical/embedding/hybrid discovery;
- provider-native deferred tool loading;
- lazy schema hydration;
- model-visible search/describe flows.

Discovery can narrow what is visible; it must not create authority.

### Distributed Kernel profiles

After one persistent single-domain profile is proven, evaluate demand for:

- multiple Kernel Workers;
- remote Execution Hosts;
- partitions and takeover across machines;
- stronger fencing/leases;
- backup/restore and storage-disaster profiles;
- multi-region availability;
- federation across administrative domains.

Do not turn these into 1.0 obligations without deployment evidence.

## 2. Execution Runtime experiments

### ArrokothI-native Agent and Workflow facilities

The Kernel does not require a new Agent loop or graph engine. ArrokothI may still improve its optional Runtime when applications need it:

- typed local/child results;
- richer Workflow branches/joins;
- provider-native tool discovery;
- Agent planning/delegation policies;
- model/context optimization;
- reusable Skills/packages;
- clearer Runtime-level budgets and usage reporting.

Compare against mature runtimes before expanding a custom engine.

### Memory/context systems

The optional Runtime designs in [`detail-design/memory-and-state.md`](detail-design/memory-and-state.md) may evolve through experiments with:

- production retrieval backends;
- claim confidence/temporal validity/supersession;
- promotion policy;
- field/key-level conflicts and merge;
- explicit handoff between branches/children;
- context caching and compression.

Do not make one memory taxonomy or vector/graph backend a Kernel requirement.

### Native recovery

Driver-specific questions remain open until real providers are tested:

- safe reattachment after lost submit acknowledgment;
- immutable checkpoint versus mutable session behavior;
- stale native-writer exclusion;
- provider job idempotency/query semantics;
- upgrade/checkpoint compatibility;
- repeated native model/tool cost under retry.

Unsupported recovery modes should remain explicit rather than hidden behind generic retry.

## 3. Interoperability

Demand may justify additional Driver/protocol work for:

- MCP Resources/Tasks/elicitation/subscriptions beyond current Tool proof;
- A2A client/server boundaries;
- external Agent/service catalogs;
- richer portable operation/resource descriptors;
- package/Skill import/export;
- protocol-neutral long-running service handles.

Promote a portable abstraction only after at least two independently designed integrations need the same semantics. Prefer native provider APIs and existing protocol SDKs first.

## 4. Deployment and isolation

The active roadmap keeps physical isolation optional unless claimed. Future profiles may explore:

- container/sandbox/microVM backends;
- controlled egress/filesystem/secret bridges;
- resource quotas and process-tree termination;
- persistent workspace lifecycle;
- hostile multi-tenant hosting.

Reuse mature isolation infrastructure. ArrokothI does not need to become a sandbox, browser, database, or hosting platform.

## 5. Agent effectiveness and evaluation

Keep effectiveness work separate from Kernel correctness:

- context/tool interface design;
- retrieval and memory policies;
- planning/delegation strategies;
- multi-Agent coordination;
- prompt/program techniques;
- provider/model selection;
- cost/latency/quality tradeoffs.

These belong in Runtime experiments and benchmark/evaluation work with the Kernel held fixed where possible.

## 6. Conditional research only

The following remain research hypotheses, not scheduled architecture:

- universal Program/Machine/ABI;
- compilation/import of arbitrary foreign graphs;
- one shared execution IR for every Agent framework;
- capability hierarchy/context scouts as Kernel primitives;
- broad information-flow/federation models;
- Studio/Cloud/marketplace/channel product;
- custom consensus/database/sandbox platform.

Reopen one only when a concrete problem survives simpler Runtime, Driver, application-service, or mature-substrate solutions.

## Decision rule

Future work should answer a concrete question and name what happens if the answer is negative.

Useful outcomes include:

```text
adopt     evidence supports the abstraction/mechanism
narrow    only a smaller boundary is useful
defer     real demand/evidence is missing
reuse     an existing runtime/substrate is better
delete    the hypothesis adds cost without demonstrated value
```

Failed evidence gates should simplify ArrokothI rather than automatically generate more architecture.

The complete previous future plan is preserved unchanged in [`mental-model-legacy/future-plan.md`](mental-model-legacy/future-plan.md).
