# Runtime authoring and context vocabulary

These concepts describe optional reference Runtime facilities. Native frameworks may
use their own names and representations. They do not add Kernel lifecycle types.

## Agent

An **Agent** chooses substantial progression through a model or policy at runtime.
Planner, evaluator, router and retriever are application roles, not separate Kernel kinds.

## Workflow

A **Workflow** primarily follows an authored, allowed progression, which can include
branches and loops that models select. Agent and Workflow can share implementation
machinery and coexist within one Runtime.

## Stage and local branch

A **Stage** or local node is an authored unit of input, computation, output and
transition inside a Workflow Runtime. It has no independent Kernel mailbox, authority
or lifecycle. A **local branch** owns its intermediate progression and result within
the enclosing Runtime. [Composition](../mechanisms/composition.md) owns joins and barriers.

## Local worker

A **local/delegated worker** is internal work managed by a Runtime or native framework.
It is not automatically a child Execution or a Kernel Worker. Always qualify “worker”
with the responsibility being discussed.

## Context

**Context** is the information selected for one computation. It need not be retained.
A **context compiler** selects/retrieves/redacts/summarizes authorized information for
that request. It does not grant access or assert the truth of inferred content.

## Projection and invocation binding

An **operation projection** renders selected stable operations as provider-facing
names and schemas. A **callable alias** is the name shown to the model. An
**invocation binding** fixes the mapping from each alias to its actual operation or
local control for one invocation, with relevant contract versions and input/state.
A late reply resolves using that binding, not today's refreshed catalog.

A **local control** changes Runtime-local planner/scratch state. It retains typed
origin even if it shares provider tool syntax with a mediated operation.

## Invocation snapshot and cache

An **invocation snapshot** preserves enough of a native request and its bindings to
interpret its response or continue it. An optional **context cache** is a recomputable
optimization. A snapshot needed by in-flight work cannot be discarded as if it were
just a cache hit. Provider prompt caches remain provider-controlled optimizations.

## View and disclosure

A **view** is a selection of readable fields/objects and writable targets authorized
for the current principal. Scope labels locate information; they do not grant a view.
**Disclosure** includes content, descriptors and metadata sent to a Runtime/model or
remote retrieval service. Internal precondition tokens may leak hidden changes and
are not automatically safe to expose.

## Skill and package

A runtime **Skill** packages instructions, references, assets/scripts and optionally
a root composition. It can enrich a Runtime or invoke work without itself being an
Execution or authority grant. A **package manifest** describes source/version, entry
points, bindings and requested requirements; preflight checks these, not permission.
These runtime Skills are distinct from this repository's coding-agent workflow skills.

## Service and interaction template

A **service** exposes selected input, result and interaction contracts while keeping
its implementation private. An **interaction template** supplies parameterized
authoring/context input. An **async handle** correlates native external work.
None implies a new mandatory Kernel entity or portable descriptor hierarchy.
