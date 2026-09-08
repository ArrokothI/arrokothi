# Detail design

This directory preserves useful **current detailed design** below the small canonical architecture.

The canonical owners remain:

- [`../kernel.md`](../kernel.md) for Kernel/Execution semantics;
- [`../execution.md`](../execution.md) for Execution Runtime/Driver semantics;
- [`../deployment.md`](../deployment.md) for process, trust, containment, and deployment semantics.

Files here do not create a second architecture or restore the previous mental-model ontology. They expand concrete designs that are useful when implementing ArrokothI, especially designs that previously lived in the old authority, memory, composition, and interoperability documents.

When a detail here conflicts with a canonical owner, the canonical owner wins.

## Why this layer exists

The redesign intentionally removed many concepts from the Kernel. Some of those concepts are still useful for ArrokothI's own Runtime, SDK, integrations, or advanced applications.

Without a detail-design layer there are two bad choices:

1. put all of that material back into the small top-level architecture and make the Kernel look larger than it is; or
2. leave useful design knowledge only in `mental-model-legacy/`, where future engineers cannot tell what is still intended.

This directory is the middle layer.

```text
canonical architecture
  mental-model / kernel / execution / deployment
        ↓
detail-design
  accepted concrete designs and optional ArrokothI-native facilities
        ↓
development
  implemented baseline, migration roadmap, findings
        ↓
guides
  current application-facing usage
```

## Topics

| Document | Preserves |
|---|---|
| [`authority-and-actions.md`](authority-and-actions.md) | principals, authority, exposure, delegation, exact consent, dispatch, revocation, native/ambient actions |
| [`memory-and-state.md`](memory-and-state.md) | Kernel History vs Runtime memory/context, Structured/Derived/Working Notes, artifacts, provenance, views, concurrency |
| [`composition-and-communication.md`](composition-and-communication.md) | local work vs child Execution, Agent/Workflow composition, messages, waits, joins, ownership, cancellation, Skills |
| [`interoperability.md`](interoperability.md) | Driver fidelity, operation/resource boundaries, MCP/A2A/HTTP mapping, schemas, external async handles and Skills |

Each topic is split into **Kernel side** and **Execution side** so that a useful Runtime facility does not accidentally become a Kernel requirement.

## Status categories

A detail may be one of three things:

- **Kernel detail** — required to preserve a canonical Kernel guarantee;
- **ArrokothI Runtime design** — useful design for ArrokothI's own Agent/Workflow Runtime, optional for foreign Runtimes;
- **Integration design** — a boundary/mapping rule whose exact API is allowed to vary by Driver or protocol.

Implementation names and current package locations belong in [`../development/`](../development/README.md), not here.

Unresolved or evidence-gated ideas belong in [`../future-plan.md`](../future-plan.md). Historical designs, including concepts intentionally removed from the target, remain in [`../mental-model-legacy/`](../mental-model-legacy/).
