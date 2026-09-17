# Mechanisms: how the pieces interact

Each page here specifies one interaction exactly once. Where a page needs a term it does not own, it links the [concept](../concepts/README.md) that defines it rather than restating the definition — so if two pages seem to state the same rule, one of them is a defect.

Every page opens with a **Status line** saying whether it is a required Kernel contract, a per-Driver obligation or an optional Runtime design, and which development gate introduces it. **A gate named on a page is that gate's contract, not a claim that it has shipped.** What exists today is owned by the [status ledger](../../docs/development/007-work-packets.md) and the [implemented baseline](../../docs/development/002-implemented-kernel-baseline.md); see [Target, not shipped](../README.md#target-not-shipped).

To find the page that owns a particular question rather than read through, use the [reference index](../reference.md).

## Reading path

Sixteen pages in six groups. Reading alphabetically is actively wrong: `ls` puts `actions.md` before `execution-cycle.md` and `authority.md`, both of which it depends on.

### The protocol loop — how one Execution runs

1. **[creation.md](creation.md)** — How an Execution comes into being and how later input reaches it, including what happens when the caller never hears back and retries.
2. **[execution-cycle.md](execution-cycle.md)** — The central loop: what the Kernel pins before dispatch, how the Driver reports that delivery happened, and the exact order in which an Outcome is validated and accepted.
3. **[waits.md](waits.md)** — What a Runtime may declare it is waiting for, which Events are eligible to wake it, and exactly which Events travel in the next batch.
4. **[lifecycle.md](lifecycle.md)** — The five states and every transition between them, how cancellation is ordered against an in-flight Outcome, and why completion is an accounting check rather than a declaration.

### Acting on the world outside

5. **[authority.md](authority.md)** — Who is asking, what they may do, when a person must approve this exact action, and what happens when permission changes while a request is already in flight.
6. **[actions.md](actions.md)** — From an accepted intent to external evidence: admission, sending, when a retry is safe (rarely), settlement, and the responsibility that outlives a request nobody wants any more.
7. **[output.md](output.md)** — What makes accepted output readable, how a reader resumes without gaps or duplicates, how long it is kept, and why reading output is not sending input.

### Working with others

8. **[communication.md](communication.md)** — Children this Execution owns and must account for, messages to peers it does not own, and durable questions put to people who may answer next week or never.

### When things break

9. **[recovery.md](recovery.md)** — Reconstructing accepted Kernel state after a crash, then the separate and harder question of whether the native work behind it may safely continue.
10. **[integration.md](integration.md)** — What a Driver must preserve to claim it adapted a native Runtime faithfully, and what evidence backs that claim rather than asserting it.

### Optional Runtime-side design

11. **[composition.md](composition.md)** — Breaking work into stages and branches inside one Execution, running them concurrently, and joining the results.
12. **[state.md](state.md)** — Shared state services, inferred claims and the promotion that makes one an assertion, retrieval, scratch notes and artifacts.
13. **[context.md](context.md)** — Building one model request: what may be seen, what may be called, and what may be reused between requests.

These three are optional Runtime design (R2), not Kernel guarantees. A reader who only needs Kernel semantics can skip them.

### Edges and proof

14. **[external-protocols.md](external-protocols.md)** — Mapping MCP, A2A and ordinary transports inward and outward without adopting their vocabulary wholesale.
15. **[resources.md](resources.md)** — Who owns workspaces, sessions and sandboxes, what a containment claim has to be backed by, and where cost and cleanup quietly accumulate.
16. **[evidence.md](evidence.md)** — What each kind of record actually proves, what inspection must expose at each gate, and which layer a benchmark result should be credited to.
