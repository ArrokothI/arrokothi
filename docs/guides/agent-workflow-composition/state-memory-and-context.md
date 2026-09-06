# State, memory, and context

[Guide home](README.md). Canonical owner: [memory](../../memory.md). Read this to choose storage;
use [the wiring reference](current-authoring-surface.md#structured-memory-wiring) to implement it.

## Choose by ownership and meaning

| Information | Current implementation choice | Important limit |
|---|---|---|
| Business record already owned by a database/API | Leave it in that system; use a capability | Do not create an unsynchronized shadow source of truth |
| Accepted fact this Execution needs across turns | Structured Memory field with a precise schema | Execution-local, unset at creation, in-memory reference store |
| A candidate interpretation | Local value, Stage input/progress, or explicitly marked candidate data | Schema validity does not establish factual acceptance |
| Current Stage's computation across an Effect wait | Return serializable `progress`; inspect it on re-entry | Local to that Stage visit; not next-Stage data |
| Small Stage-to-Stage value | `result: string \| null` | Routing uses a separate transition label |
| Agent scratch plan, hypotheses, next steps | `spec.workingNotes: { read: true, write: true }` | Local `working_notes_set`, not an Effect, approval, or shared state |
| Inferred reusable claim | Derived Semantic Memory with provenance | May be stale/conflicting; no supersession field |
| Large document, report, shared task state | Application storage; pass a reference | Canonical Artifact/File has no executable mechanism |
| Material for the next model invocation | Information compiler / bounded Stage prompt | Context is a selection, not storage |

A Structured Memory field declaration does not require it to have a value. Test completeness in code
with `view.values[key]?.value`. Each write validates its value and increments the **whole-view**
revision. There is no multi-key transaction: if two fields must update atomically, consider one
schema-bound object field, with the broader write/read visibility that entails. Do not infer accepted
facts from a fluent response. Decide which fields may be model asserted and which require parsing,
source-of-record verification, or a confirmed exact write.

## Reading and writing

An Agent needs a binding, authored keys, and application-supplied read/write view resolvers. A write
also needs a fresh Effect authorization. The [complete chain](current-authoring-surface.md#structured-memory-wiring)
and [compiled example](../../../examples/execution-kernel-minimal/patterns.ts) show each independent
configuration. Read access does not imply write access, and exposing a write callable does not allow
its proposed write.

Host code can inspect the full committed view with `Harness.structuredMemoryOf(id)`; a replacement
`AgentInformationCompiler` receives only the authorized read snapshot. Ordinary Stage code,
capability executors, and `ExecutionView` have no direct memory handle. A deterministic Stage can
validate its **own input or observations**, but cannot fetch arbitrary committed memory through its
context. Do not give it the store through a closure to bypass that boundary.

A host-supplied `EffectAuthorizer` can consult trusted application data/current committed state when
checking the exact proposal. The example checks the current title every time it authorizes a publish,
including after approval. A boolean computed only between chat turns can become stale during the next
model/tool loop. External record races still require conditional writes or transactional checks at
the system of record; a policy read is not a cross-system lock.

There is no public host `setMemory` or initial-values field. Use an authorized Agent/Function Stage
write, a tested application controller if necessary, or leave host-owned state in the application
store. `/testing` seeding helpers bypass the teaching path and are not runtime write APIs.

## Concurrent updates

`expectedRevision` is an optional nonnegative whole-view revision on programmatic writes. A stale
write settles `conflicted` without changing state; the application decides whether to retry after a
fresh read, merge, or fail. No automatic retry, field-level versions, locks, or CRDTs are provided.
Parallel Workflow branch writes require a revision. Prefer branch results combined by the join's
Function Stage rather than concurrent writes to shared memory.

The Agent's projected memory-write callable takes `{ value }`, not a model-authored key or
`expectedRevision`. Do not add invented revision arguments. A custom compiler cannot recover a view
revision that the authorized read snapshot intentionally omits. See
[optimistic-write tests](../../../tests/conformance/memory/structured-memory-optimistic-write.test.ts).

## Notes, derived information, and promotion

Working Notes read/write flags are independent. Notes have entry/byte limits and live in Agent
controller progress. A generic child proposal can explicitly hand off selected notes, but the stock
Agent/Workflow Stages offer no note handoff option. Children never automatically return notes or
inherit Structured Memory bindings. Use a terminal result or an explicit application storage route.

Derived claims have the closed shape `{ claimId, statement, provenance }`; provenance carries
`sourceRefs`, `derivedAt`, and `derivation`. Unknown metadata is rejected. Contradictory claims coexist;
currentness is application/retrieval policy. The model's default view includes claim IDs and sources,
not all provider metadata. Derived retrieval is deny-before-provider and bounded by count and bytes.

`promoteDerivedClaim` constructs an ordinary authorized `WriteMemory` proposal with provenance; it is
not a new Effect and not an automatic pipeline. This helper belongs in controller/host integration
that can propose Effects, not directly in an LLM Stage. There is no stock model “promote” callable.

## Context and continuity

The default Agent information compiler takes recent messages up to `maxContextMessages`, plus enabled
and authorized memory/notes/derived blocks. It does no automatic summarization. **The message window
bounds what reaches the model, not the retained transcript in controller progress.** Each message
can also be large: count limits are not token/byte limits for arbitrary tool output or memory values.
Bound schemas and capability results, and replace the compiler when a measured context strategy needs
it. Do not put hidden policy authority into a context block.

An LLM Stage uses its `system`, prompt template, incoming Stage text, and in-Stage operation
observations. It has no Agent transcript, memory read, notes, or automatic derived retrieval. Shape
its preceding Stage output or use explicit retrieval callables. Operation exposure is configured
separately from information selection.

Structured Memory and Working Notes can survive Activations and context-window changes in the same
runtime. They do **not** survive a process crash with the reference store. For long-lived applications,
keep authoritative durable business state and external action IDs in your database. Reconstructing a
new Execution requires explicit application recovery, including uncertain-outcome reconciliation;
replaying all earlier prompts/actions is not safe recovery.
