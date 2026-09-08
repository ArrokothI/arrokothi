# Efficiency and developer ergonomics

> **Historical snapshot, retired 2026-09-07.** Its status and next-step language describe the earlier checkpoint. Use the [active development plan](../../001-current-status-and-roadmap.md) and [findings register](../../003-evidence-and-findings.md) for current decisions.

> **Status:** active cross-cutting engineering guidance for the ArrokothI 0.8.x line.
> **Role:** performance, cost, and authoring validation; not canonical architecture.

The kernel is intentionally semantically richer than a minimal model loop. The engineering target
is not to erase that structure, but to make its physical cost proportional to the guarantees a
workload actually enables.

## 1. Governing principles

```text
pay only for enabled guarantees
semantic retention != hot-path transport
measure before redesigning for hypothetical distributed cost
disabled paths should be zero/low cost where the architecture permits
optimize mechanisms without erasing semantic distinctions
semantic conformance != behavioral quality != performance measurement
```

An optimization is valid only if it preserves the same externally meaningful lifecycle,
authorization, Event/Effect, memory, waiting, conflict, and recovery behavior.

## 2. Separate semantic and physical cost

Important distinctions may require semantic state without requiring synchronous work on every
Activation:

| Semantic requirement | Mechanisms that may vary by profile |
|---|---|
| durable waiting/recovery | in-memory vs transactional persistent store/scheduler |
| authority and exposure narrowing | local allowlist vs remote policy service; cached immutable views |
| memory retention | inline bounded data vs cold/blob/reference-backed storage |
| model information snapshot | eager compilation vs safe cache of deterministic derived output |
| hosted isolation | trusted in-process vs isolated worker/backend |
| trace/evaluation evidence | minimal, sampled, redacted, or full diagnostic trace |

Trace is optional observability, not semantic state. A fast path may use cheaper mechanisms but
must not bypass Effect authorization or weaken outcome certainty merely because it is local.

## 3. Disabled-path expectations

When a feature is absent, verify rather than assume:

- no Structured Memory request: zero read/write exposure resolution and zero memory provider work;
- no Working Notes: no note rendering/callable and only bounded constant control-state shape cost;
- no Derived Semantic Memory: zero resolver, provider, extractor, embedding, or extra model calls;
- no parallel fork: no branch traversal/dependency-set setup beyond trivial shape checks;
- no protocol adapter: no protocol SDK loaded by core;
- trusted-local profile: no sandbox/remote-policy round trip;
- minimal trace: no evaluation-only payload retention.

“Approximately zero” may include a constant null/empty field needed for a stable serializable state
shape. Measure external calls, scans, serialization, allocations, and writes—not only wall clock.

## 4. Working Notes retention and hot-path transport

The current child-handoff semantics retain two artifacts:

```text
ExecutionContext.workingNotesHandoff   immutable inherited snapshot
AgentControlState.workingNotes         child-owned writable frame, seeded once
```

`seed once` does not mean the inherited snapshot ceases to exist. The Agent's ordinary context uses
the child-local frame; it does not re-overlay or render the inherited snapshot.

Semantic retention does not require serializing that snapshot across every future controller
boundary. In the current in-process runtime the bounded object is already resident and projection
is cheap. If a future IPC/remote-worker boundary makes repeated transport measurable, prefer an
initialization-only controller projection or lazy reference while preserving:

- restart before first Activation;
- the two-artifact model;
- no dependency on trace;
- no Agent-specific knowledge in generic spawn mediation;
- no repeated re-overlay;
- no new authority meaning.

Do not clear the snapshot or reconstruct it only from the Effect journal without specifying the
transaction/recovery protocol. The journal records what was proposed; the child context is the
materialized initialization fact.

## 5. Measurement layers

Measure separately:

1. **Kernel-only overhead** with fake/instant providers and capabilities.
2. **External latency and token cost** with representative real providers.
3. **Scale shape** across runnable/dormant Executions, mailbox/history size, and catalog size.
4. **Durability/recovery cost** including write amplification and restart time.
5. **Optional-feature deltas** for memory, discovery, tracing, policy, and isolation.
6. **Developer ergonomics**: concepts/configuration required for minimal Agent and Workflow paths.

Useful metrics:

```text
wall-clock p50/p95        CPU time / allocations        context and serialized bytes
model/tool calls          provider round trips          store reads/writes/transactions
policy/view resolutions   schemas hydrated              dormant memory per Execution
requeue/wake counts       duplicate dispatches          recovery time
```

Prefer operation counts and broad regression envelopes over brittle CI millisecond thresholds.

## 6. Orchestration benchmark

Use deterministic fake/instant dependencies so model latency cannot hide kernel cost. Suggested
matrix:

| Case | Configuration |
|---|---|
| A | Minimal Agent, no operations or memory features |
| B | ~10 and ~100 authorized/exposed operations |
| C | Structured Memory read/write exposure, ~10 fields, ~3 selected |
| D | Working Notes empty, representative, and near bounded maximum |
| E | Derived retrieval disabled, retrieval-only, and extraction pipeline measured separately |
| F | Combined operation + Structured + Working Notes + Derived workload |
| G | Suspended invocation re-entry; verify snapshots are not rebuilt |
| H | Parallel Workflow Effects/resumptions and Structured Memory conflict enabled vs linear path |
| I | Child no handoff, small handoff, and near-envelope handoff on first and later Activation |

For Derived Memory, record resolver/provider/extractor call counts separately; extraction is not an
Agent hot-path obligation. For Working Notes handoff, distinguish in-process object projection from
actual serialized IPC bytes.

The decision question for a simple/local workload is whether ArrokothI orchestration is small
relative to one model inference and whether disabled guarantees add approximately zero external
work.

## 7. Deployment profiles

Use the same semantics with different mechanisms:

```text
lightweight embedded   in-memory/local store, local authority, minimal trace,
                       static/small catalog, no derived provider or sandbox unless enabled

durable reference      transactional store/scheduler, restart evidence, measured write cost

governed hosted        remote policy/discovery where required, bounded projections

isolated hosted        explicit containment backend, resource limits, no silent local fallback
```

Do not create a weakened “light kernel.”

## 8. Progressive developer experience

Aim for:

```text
Level 1 — common authoring
  define Agent/Workflow, choose model, expose operations, run/call/send input

Level 2 — application control
  authority requests, memory, durability, context/observation policy, lifecycle inspection

Level 3 — infrastructure integration
  custom policy, RuntimeStore/scheduler, isolation, protocol adapters, advanced tracing/recovery
```

Level 1 should not require construction of Level-3 machinery. Error messages should name the
violated boundary and exact refusal without requiring the user to reconstruct the whole runtime.

## 9. Review triggers

Measure and inspect when:

- one Execution wake scans all Executions;
- dormant Executions retain live provider/sandbox clients;
- every optional feature initializes on the simple path;
- context or full-catalog schemas grow without bounds;
- a fast path bypasses Harness authorization;
- an Active View optimization can widen authority;
- trace becomes required for correctness;
- isolation silently falls back to trusted local;
- performance work changes Event/Effect or memory meaning;
- ordinary users must manipulate PendingOperation/ControllerResumption internals.
