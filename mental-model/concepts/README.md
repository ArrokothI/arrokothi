# Concepts: the canonical vocabulary

Every term ArrokothI uses is defined exactly once, and this directory is where. A page here answers **what is this thing**; a page under [mechanisms](../mechanisms/README.md) answers **how do several of them interact**. Where a subject appears in both directories — `actions`, `state` — the concept page is the sole definition of the terms and the mechanism page is the sole specification of how they behave together. The shared filename is deliberate; the directory tells you which half you are in.

Concept pages carry **no Status line**, because naming a term commits nothing to building it. Everything here is target specification: see [Target, not shipped](../README.md#target-not-shipped), and the [status ledger](../../docs/development/007-work-packets.md) for what actually exists today.

To look one term up rather than read through, use the [reference index](../reference.md) — it names the owning section of every definition.

## Reading path

Seven pages in dependency order. This is not alphabetical, and not the order a file browser shows.

1. **[core.md](core.md)** — The pieces every other page assumes: the Kernel, an Execution, the Runtime that does the work and the Driver that adapts it, and the protocol objects that carry one exchange — Activation, Outcome, Event, and the mailbox and batch that Events travel in. Read first; little else parses without it.

2. **[actions.md](actions.md)** — What an Execution can ask the world to do, from the Effect it proposes through admission and settlement to the evidence that comes back, plus the authority and consent that gate it. Read directly after `core.md`: its first term, Effect, is defined in terms of Outcome.

3. **[identity.md](identity.md)** — The identifiers that make "is this the same request?" answerable: request keys and Input IDs, Runtime attempts and writer epochs, the several kinds of revision, and what a receipt does and does not prove. Read when you need to tell a retry from a new intention.

4. **[operations.md](operations.md)** — Operational vocabulary: who runs what (Kernel Worker, Execution Host), the two trust modes, the three clocks that must never share a timer, and the child, message and correlation terms.

5. **[roles.md](roles.md)** — Optional Runtime-side vocabulary: Agent, Workflow, Stage, Context and Skill, plus the projection and invocation-binding terms that keep a model-facing name distinct from the operation it resolves to. None of it adds a Kernel type.

6. **[state.md](state.md)** — The information roles and their separate owners: Runtime progress and checkpoints, Execution History, asserted application state, inferred memory, working notes, artifacts, resource bindings and retention.

7. **[values.md](values.md)** — The exact encoding and equality rules the other pages assume: codecs, boundary values, canonical form and the fixed semantic limits. Read last — it is needed when exactness matters, not to follow the shape of the system.

Steps 1–3 are the spine. A reader who only wants to follow how work is coordinated can stop after them and return to 4–7 when a specific question makes one relevant.
