# Development

This directory describes **current implementation and migration work**. It does not define architecture.

Current architecture is owned by:

- [`../mental-model.md`](../mental-model.md)
- [`../kernel.md`](../kernel.md)
- [`../execution.md`](../execution.md)
- [`../deployment.md`](../deployment.md)

## Current implementation documents

| Document | Purpose |
|---|---|
| [`002-implemented-kernel-baseline.md`](002-implemented-kernel-baseline.md) | What the current 0.8.x code actually implements |
| [`003-evidence-and-findings.md`](003-evidence-and-findings.md) | Active defects, evidence, benchmark findings, and migration-relevant observations |
| [`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md) | Pre-redesign P1–P7/B1–B3 roadmap and gates; useful planning input, but **must be reconciled with the new Kernel/Execution boundary before being treated as the next architecture migration sequence** |
| [`legacy/`](legacy/) | Older completed/historical development plans |

## Architecture migration note — 2026-09-08

The canonical architecture has changed from the previous synchronous `Harness -> ExecutionController.activate(...)` model to an asynchronous **Kernel -> ExecutionActivation -> Execution Runtime -> ExecutionOutcome -> Kernel** boundary.

This changes the ownership of several existing implementation concepts:

| Current implementation | Target ownership |
|---|---|
| `Harness` coordinator | Kernel implementation; new architecture uses the noun **Kernel** |
| `ExecutionController` | Predecessor of the generic Execution Driver/Runtime boundary |
| `ControllerResumption` | Remove from Kernel semantics; internal Runtime async work should stay inside the Runtime |
| stock Agent/Workflow controllers in core | Execution-side Runtime implementations above Kernel contracts |
| model calls / Workflow local async waits | Runtime-internal work, not Kernel-visible waits |
| scheduler exclusion per Execution | Preserve; evolve to durable writer epoch/fencing where claimed |
| Events / Effects / authority / lifecycle / history | Preserve as Kernel semantics, adjusted to the async Activation/Outcome protocol |

The existing P1–P7/B1–B3 roadmap still contains valuable requirements: concrete action validation, typed values, accepted-work/recovery linearization, process-death proof, long-lived operability, provider-native application proof, benchmark attribution, and release evidence. However, the new architecture may **subtract or move** work that assumed Kernel-owned Agent/Workflow/controller internals.

Do not start broad protocol, Machine/ABI, multi-Agent, Studio/Cloud, or new Agent/Workflow feature expansion merely because the architecture changed. The immediate planning task after this documentation redesign is to derive the smallest migration sequence that proves the new Kernel boundary with deterministic fake Executions before rebuilding execution-side features.

## Development rule

When code and current architecture differ:

1. describe the code honestly using `002`/`003`;
2. treat the canonical docs as the target semantic contract;
3. classify the change as **preserve**, **move above Kernel**, **replace**, or **delete**;
4. add conformance at the new Kernel boundary before depending on Agent/Workflow behavior;
5. keep behavioral Agent/Workflow evaluation separate from Kernel correctness.
