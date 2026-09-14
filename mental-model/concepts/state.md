# Continuation, retained information and resources

These are canonical meanings, not a mandatory memory taxonomy for foreign Runtimes.
[State services](../mechanisms/state.md) and [recovery](../mechanisms/recovery.md) own
their interactions.

## Progress

**Progress** is Runtime-owned continuation information accepted by the Kernel and
returned to the Runtime unchanged. Its meaning belongs to the Runtime; the Kernel
owns its accepted version and retention binding. There are three forms:

- Inline structured continuation, such as `{phase: "validate", draftRef}`.
- An immutable checkpoint reference identifying resumable native state.
- A locator for a still-running native job.

Do not collapse these into an undifferentiated blob that conceals their different
recovery guarantees. Every persisted form pins the Runtime/Definition contract and
progress codec that can interpret it. K1's fake Runtime requires only inline progress.

## Checkpoint and locator

A **checkpoint** identifies a specific resumable native state plus compatible code
and required resources. A **locator** merely finds a mutable session or existing job.
A session ID is not a checkpoint if its contents can advance independently of the
accepted progress. The Runtime creates native state; Kernel acceptance pins only the
proposed continuation. [Publication and recovery](../mechanisms/recovery.md#checkpoint-publication)
handle the gap between those stores.

## Recovery and re-execution

**Recovery** reconstructs accepted truth and, when the supported native contract
permits, continues the same logical work. **Reattachment** reconnects to an existing
native job. **Replay** repeats the same immutable exchange only when its phase-specific
contract proves that safe. **Restart-from-input** is an explicitly authorized new
Execution, with causation linking it to the original. A terminal lifetime never reopens.

**Recovery-held** is an inspectable operational condition: an Activation remains
unresolved but cannot safely continue. Its lifecycle is still `RUNNING`; it is not
a Runtime-declared `WAITING` state.

## Execution History

**Execution History** is the evidence of Kernel decisions and observations: accepted
input, dispatch, Outcome acceptance/rejection, progress, action evidence, routing,
lifecycle and recovery. It is not an Agent transcript, business database or automatic
deterministic replay engine. Native traces can be linked without becoming accepted truth.

## Structured state

**Structured state** means deliberately asserted, schema-bound application values.
“Structured Memory” is the older name for the same role; prefer structured state.
A model inference in valid JSON is not an application assertion merely because it has
a schema. The application/resource service owns validation, revisions and retention.

## Derived Semantic Memory

**Derived Semantic Memory** is retained inferred content: claims that may be wrong,
stale or contradictory. Its Runtime/provider owns source provenance and correction.
**Promotion** is the application's explicit validated decision to assert such a claim
as application state. Neither inference nor promotion automatically grants authority.

## Working Notes

**Working Notes** are bounded Runtime-local scratch plans, hypotheses and continuity
notes. A branch can have a separate writable **scratch frame**, with explicitly selected
inherited information. Notes are optional and are not required private reasoning transcripts.
If recovery depends on them, their Runtime checkpoint contract must retain them.

## Artifact reference

An **artifact** is source material or work product held by an application/native store.
An **artifact reference** crosses the protocol by naming its store/namespace, object,
required immutable version/digest, media/schema hint, size, access owner and retention
responsibility. This is a contract, not a universal Kernel Artifact class.
A URL or hash alone supplies neither access nor availability.

## Resource binding and attachment

A **resource binding** associates a workload/principal with a specific workspace,
native session, database view or other backing resource. It records intended owner,
identity/version, permitted sharing and cleanup/retention responsibility.
An **attachment** is temporary access through a host client or lease. Releasing it
does not destroy the backing resource. A serialized client is not a durable binding.

## Retention, pin and tombstone

**Retention** is the declared period/condition under which data remains available.
A **pin** prevents deletion while an accepted or in-use reference still requires it
under that contract. A **deduplication tombstone** retains permitted identity/content
binding after full payload deletion. Neither term implies unlimited retention, replay
or anonymity of hashes. [Evidence retention](../mechanisms/evidence.md#retention-and-deletion)
and [resource cleanup](../mechanisms/resources.md) own those consequences.
