# Building context and preserving callable meaning

[Context and projection](../concepts/roles.md#context) are two selection tasks that
can share one Runtime module. Neither grants authority. Native frameworks may own
both without recompilation into an ArrokothI format.

```text
authorized information → select/retrieve/redact/summarize → information context
permitted operations  → narrow/rank/project              → callable bindings
enabled local controls → typed local bindings
                         ↓ one native model request
```

**Status:** Optional Runtime design, R2. Its disclosure and binding limits are required at
K2/R1/K5. This is target specification, not shipped behavior.

## Fix bindings for each invocation

Retain: invocation identity, relevant Runtime input/state version, selected information
or references, exact alias→stable-target mapping, local-control origin, operation
versions, and provider/model configuration. Pin rendering version when controlled.
Resolve a delayed `search_docs` reply through the map it saw, never the latest catalog.
Refuse ambiguous aliases or assign collision-safe names before sending.

All callable kinds can share provider syntax while preserving typed origin. Note-update
controls cannot masquerade as mediated operations; discovered tools cannot mint local
controls. Dynamic hydration retains the actual callable bindings. If the adapter cannot
reconstruct them, refuse portability rather than guessing.

An in-flight binding snapshot has a continuation lifetime; a discardable optimization
does not. Retransmission retains the pinned request subject to native retry safety
and current disclosure permission. Fresh computation may create a new snapshot but
must not be called replay of the old one.

## Select information without changing its status

Select authorized Events, transcript, state, notes, inferred claims, artifact excerpts
and instructions. Preserve source/inference distinctions, scope, versions and truncation
markers. Summaries retain useful references/caveats; missing evidence stays unavailable,
not proof of absence. Relevance is not source trust.

Selection identity can be separate from provider rendering for experiments, but
formatting cannot change meaning or conceal omissions. A universal context IR is an
experiment. If provider scaffolding/tokenization is hidden, record the observable API
request and limitation instead of claiming exact final prompt reconstruction.

Request-only selection leaves the native transcript intact; destructive compaction
changes retained state and follows native checkpoint publication. Preserve active
call/result bindings and recovery-critical state. Kernel History cannot replace a
lost native continuation; authorized historical observation can instead be an input source.

## Cache dependencies

| Item | Lifetime / check |
|---|---|
| Catalog index | Recomputable; source version, scope and disclosure |
| Authorized read view | Fresh read decision, fields/resources and principal |
| Selected context cache | Recomputable unless pinned; sources, strategy, audience/redaction |
| Invocation binding | Retain while response depends on exact versions |
| Provider prompt cache | Provider optimization; permitted disclosure, never authority |
| Accepted checkpoint | Retain while recovery requires compatible code/resources |

Global revisions, cache hits and ranking statistics can leak hidden changes. Keep
internal metadata out of model content unless authorized. Revoked content cannot
enter a new request just because it was cached. Already disclosed data follows the
provider/application retention contract, not retroactive forgetting.

## Discovery and observations

Small catalogs can use an eager list. Larger ones should compare deterministic
search/describe/call with native deferred tools before adding categories or scouts.
Keep essential controls discoverable. Categories are views over stable identities,
not new permissions. Discovery stays within authorized metadata scope.

Result presentation may be raw typed value, concise explanation, bounded excerpt or
reference plus follow-up read. Preserve trusted raw action evidence independently.
A hook changing “failed” into friendly text cannot change certainty. Prefer meaningful
domain names to exposing Kernel storage vocabulary to model users.

R2 tests stale aliases, local/mediated collisions, hidden fields, revoked cache,
truncation, corrections during calls, unresolved calls during compaction and raw
evidence preservation. Quality comparisons hold Kernel fixed and measure verified
outcomes, wrong-tool rate, missing evidence, turns, cost/latency and caching. Token
savings with poorer results do not pass.
