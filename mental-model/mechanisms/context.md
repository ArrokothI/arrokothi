# Building context and preserving callable meaning

[Context and projection](../concepts/roles.md#context) are two selection tasks that can share one Runtime module. Neither grants authority. Native frameworks may own both without recompilation into an ArrokothI format.

```text
authorized information → select/retrieve/redact/summarize → information context
permitted operations  → narrow/rank/project              → callable bindings
enabled local controls → typed local bindings
                         ↓ one native model request
```

**Status:** Optional Runtime design, R2. Its disclosure and binding limits are required at K2/R1/K5. This is target specification, not shipped behavior.

The diagram above is two selection problems feeding one request, and the page keeps them apart because they fail differently. Choosing **what the model may call** goes wrong when a name resolves to the wrong target later; that is the binding problem, and it comes first. Choosing **what the model may see** goes wrong when selection quietly changes an item's status — a summary that reads as a source, a missing record that reads as an absent fact. The last two sections cover what may be reused between requests, and how a catalog is made discoverable without becoming a permission.

## Fix bindings for each invocation

Retain: invocation identity, relevant Runtime input/state version, selected information or references, exact alias→stable-target mapping, local-control origin, operation versions, and provider/model configuration. Pin rendering version when controlled. Resolve a delayed `search_docs` reply through the map it saw, never the latest catalog: the model chose a name from one catalog, and resolving its reply against a newer one can silently point the same word at a different operation. Refuse ambiguous aliases or assign collision-safe names before sending.

All callable kinds can share provider syntax while preserving typed origin. Note-update controls cannot masquerade as mediated operations; discovered tools cannot mint local controls. Dynamic hydration retains the actual callable bindings. If the adapter cannot reconstruct them, refuse portability rather than guessing.

An in-flight [binding snapshot](../concepts/roles.md#invocation-snapshot-and-cache) has a continuation lifetime; a discardable optimization does not. Retransmission retains the pinned request subject to native retry safety and current disclosure permission. Fresh computation may create a new snapshot but must not be called replay of the old one.

## Select information without changing its status

Selection is allowed to shorten, reorder and redact. It is not allowed to change what something is: an inference must not arrive looking like an assertion, and a truncation must not arrive looking like the whole.

Select authorized [Events](../concepts/core.md#event), transcript, state, [notes](../concepts/state.md#working-notes), [inferred claims](../concepts/state.md#derived-semantic-memory), [artifact](../concepts/state.md#artifact-reference) excerpts and instructions. Preserve source/inference distinctions, scope, versions and truncation markers. Summaries retain useful references/caveats; missing evidence stays unavailable, not proof of absence. Those two are opposite instructions to a model, and a context that drops the distinction will get confident answers built on the gap. Relevance is not source trust.

Selection identity can be separate from provider rendering for experiments, but formatting cannot change meaning or conceal omissions. A universal context IR is an experiment. If provider scaffolding/tokenization is hidden, record the observable API request and limitation instead of claiming exact final prompt reconstruction.

Request-only selection leaves the native transcript intact; destructive compaction changes retained state and follows native [checkpoint publication](recovery.md#checkpoint-publication). Preserve active call/result bindings and recovery-critical state. [Execution History](../concepts/state.md#execution-history) cannot replace a lost native continuation; authorized historical observation can instead be an input source.

## Cache dependencies

Everything in this table is a copy of something that had a reason to be allowed at the moment it was made. The right-hand column is what has to be rechecked before the copy is used again, because permission and freshness do not travel with the copy.

| Item | Lifetime / check |
|---|---|
| Catalog index | Recomputable; source version, scope and disclosure |
| Authorized read view | Fresh read decision, fields/resources and principal |
| Selected context cache | Recomputable unless pinned; sources, strategy, audience/redaction |
| Invocation binding | Retain while response depends on exact versions |
| Provider prompt cache | Provider optimization; permitted disclosure, never authority |
| Accepted [checkpoint](../concepts/state.md#checkpoint-and-locator) | Retain while [recovery](recovery.md) requires compatible code/resources |

Global revisions, cache hits and ranking statistics can leak hidden changes. Keep internal metadata out of model content unless authorized. Revoked content cannot enter a new request just because it was cached. Already disclosed data follows the provider/application [retention](../concepts/state.md#retention-pin-and-tombstone) contract, not retroactive forgetting.

## Discovery and observations

A model cannot call what it cannot find, so a catalog has to be discoverable. It also must not become a way to reach things the Execution was never permitted to reach, which is why visibility and permission stay separate here.

Small catalogs can use an eager list. Larger ones should compare deterministic search/describe/call with native deferred tools before adding categories or scouts. Keep essential controls discoverable. Categories are views over stable identities, not new permissions. Discovery stays within authorized metadata scope.

Result presentation may be raw typed value, concise explanation, bounded excerpt or reference plus follow-up read. Preserve trusted raw action evidence independently. A hook changing “failed” into friendly text cannot change certainty. Prefer meaningful domain names to exposing Kernel storage vocabulary to model users.

R2 tests stale aliases, local/mediated collisions, hidden fields, revoked cache, truncation, corrections during calls, unresolved calls during compaction and raw evidence preservation. Quality comparisons hold Kernel fixed and measure verified outcomes, wrong-tool rate, missing evidence, turns, cost/latency and caching. Token savings with poorer results do not pass.
