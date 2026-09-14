# Context compilation and model-facing projections

> **Superseded architecture, retired 2026-09-14.** The current architecture is the [mental model](../../../../mental-model/README.md) and its [reference index](../../../../mental-model/reference.md). Phrases below such as "target contract", "current design" or "this page owns" describe this document as it stood then, not current authority; some rules here were later corrected. [What replaced it](../../README.md).

**Owner:** Execution Runtime and provider adapters. **Status:** optional reference design R2; admission
and disclosure constraints apply in K2/R1/K5. [Memory/state](memory-and-state.md) owns retained data;
[authority](authority-and-actions.md) owns permissions. These are two selection branches sharing a
context budget, not a requirement for separate services.

## Information and action branches

```text
authorized information → select/retrieve/redact/summarize → information context
permitted operations  → narrow/rank/project              → callable bindings
local scratch controls → explicit enablement             → typed local bindings
                                      ↓
                          one native model request
```

The compiler selects information, not permission. The projector selects names/schemas, not content
sources or grants. A Runtime can implement both in one module while preserving their provenance and
failure boundaries. Provider-native context/tool handling may own both; a foreign Driver need not
recompile them in ArrokothI.

## Invocation snapshot and binding integrity

For a model invocation, preserve enough native state to interpret its reply: invocation identity,
Runtime input/state revision, selected information or references, exact callable alias→stable-target
mapping, local-control origin, operation contract revisions, provider/model config and rendering version
when controlled. A delayed `search_docs` response resolves through the binding it saw, never today's
catalog. Ambiguous aliases refuse or receive collision-safe names before the request is sent.

All callable kinds share a provider namespace but retain typed origin. An enabled note-update control
cannot masquerade as an authorized operation; a discovered tool cannot mint a new control. Dynamic
provider hydration must retain stable bindings for anything actually made callable. If the adapter
cannot reconstruct them, refuse the portability claim instead of guessing at the latest catalog.

A snapshot can be required for native continuation; an optional cache can always be discarded. Keep
those lifetimes distinct. Pin the original request for retransmission, but check whether retransmission
is safe under the native contract and current disclosure policy. Fresh semantic computation may build
a new snapshot; it must not be mislabeled as replay of the original.

## Selection, rendering and transcript mutation

Select from authorized Events, transcript, asserted state, notes, derived claims, artifact excerpts and
instructions. Preserve source versus inference, scope, revision and truncation markers. Relevance
ranking does not establish source trust; summarization can lose caveats and must retain useful source
references. Present unavailable evidence as unavailable, not absence of a fact.

Information selection identity can be distinct from provider rendering identity when experiments need
to compare representations. Reordering/formatting must preserve the selected meaning and declared
omissions. A universal context IR is an experiment, not the default. Hosted provider scaffolding or
hidden tokenization may be unobservable; record the actual API request/config and that limitation
rather than claiming exact final prompt reconstruction.

Request-only context selection differs from destructive transcript compaction. Hermes'
[ContextEngine.select_context](../../../../../hermes-agent/agent/context_engine.py) explicitly returns a
request-only replacement, leaves session history untouched and runs before cache-control/sanitizers.
Its session hooks occur at real session boundaries, not every turn. Preserve those native semantics
when wrapping Hermes; do not infer session end from an ArrokothI Activation ending.

Compaction must not discard active call/result bindings or recovery-critical state. If a native
summary changes retained transcript state, publish it through the Runtime's checkpoint discipline.
Kernel History is not a convenient substitute for the lost native continuation. A read-only authorized
historical-observation view can feed context without making raw journals the Agent's memory API.

## Cache and freshness rules

| Item | Can be recomputed/discarded? | Required dependency check |
|---|---|---|
| Catalog/discovery index | Yes | Source revision, scope and disclosure policy |
| Authorized read view | Only with a fresh read decision | Principal, field/resource revision, permission freshness |
| Selected context cache | Yes unless pinned for continuation | Source versions, selection strategy, redaction and audience |
| Invocation binding snapshot | Not while needed to interpret an in-flight response | Exact invocation and contract versions |
| Provider prompt cache | Provider-controlled optimization | Provider/cache identity and permitted disclosure; never authorization |
| Accepted native checkpoint | No while recovery depends on it | Retention pins and compatible code/resources |

Hidden global revisions, hit/miss diagnostics or ranking statistics can disclose information outside
the authorized view. Keep internal cache metadata out of model-visible content unless the disclosure
contract allows it. Revoked content must not be sent in a new request because its cached selection is
convenient. Data already disclosed is subject to the provider/application retention policy, not a
promise of retroactive forgetting.

## Discovery and observation interfaces

For small catalogs, an eager explicit list is often enough. For larger catalogs, compare deterministic
search/describe/call with native deferred tools before adding a hierarchy or a scout. Keep essential
controls discoverable. Category paths are views over stable target identities, not a new identity or
permission scheme. Search itself must stay within permitted metadata and scope.

Hermes [tool search](../../../../../hermes-agent/tools/tool_search.py) rebuilds its catalog from live tool
definitions and bounds bridge queries. [Dispatch](../../../../../hermes-agent/model_tools.py),
`handle_function_call`, resolves the bridge to the underlying tool before middleware. Reuse the native
mechanism when it meets the workload; verify indirect paths before claiming mediation.

Result presentation is also a replaceable strategy: raw typed value, concise explanation, bounded
excerpt or reference + follow-up read. Preserve raw trusted action evidence outside presentation.
A provider hook that rewrites “failed” into friendly prose cannot alter the action's certainty. Domain
operation names can differ from Kernel type names; model users need meaningful operations, not
`UseCapability` or storage revision boilerplate.

## R2 / evidence gates

Tests: stale alias after catalog refresh; local/mediated name collision; hidden-field update; revoked
cached source; truncated source with missing qualifier; corrected input while a native model is running;
compaction with unresolved tool call; provider output shaping with preserved raw evidence. Runtime
owns stale-result policy: re-evaluate, reject or merge under a stated contract.

Quality experiments hold Kernel fixed and compare task success, wrong-tool rate, omitted evidence,
extra turns, cost, latency and warm/cold caching. Trace what was actually sent without requiring raw
prompt retention in production. A token reduction with poorer outcomes does not pass. Detailed research
questions and deletion branches are in [future plan](../../../future-plan.md).
