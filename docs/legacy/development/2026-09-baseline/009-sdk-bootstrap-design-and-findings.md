# Application SDK bootstrap: design and findings

> **Historical snapshot, retired 2026-09-07.** Its status and next-step language describe the earlier checkpoint. Use the [active development plan](../../../development/001-current-status-and-roadmap.md) and [findings register](../../../development/003-evidence-and-findings.md) for current decisions.

Implementation evidence for `@arrokothi/sdk` 0.8.1. This note owns the rationale and scoped findings,
not kernel semantics or a second builder procedure. Use the [builder guide](../../../guides/execution/native/README.md)
for applications and [canonical ownership](../../../README.md) for meaning.

## Chosen boundary

`packages/sdk` depends only on public `@arrokothi/core` surfaces. Core and adapters do not depend on it.
The SDK composes existing ports and stock controllers; no new Execution kind, Stage type, Effect,
permission, memory form or terminal-result coercion was introduced. A convenience constructor inside
Harness would have coupled the kernel to application choices (reference stores, provider registry,
view policies and host driving), while an example-only helper would not be a supported contract.

`createApplication` owns one shared runtime and the correspondence between its store and controller
view resolvers. Applications supply domain handlers, models and explicit policy. Registration and
preflighted start make definition pinning and initial-input order ordinary operations. The host runner
surfaces lifecycle/human boundaries and returns pending status on finite limits. Full Harness evidence
and ingress remain available; there is no opaque chat session or alternate execution engine.

The [API and exact defaults](../../../guides/deployment/quick-start.md) are documented in the
builder guide. SDK diagnostics do not probe authorization, invoke models, or synthesize missing grants.
Overrides are explicit trusted ports; dynamic behavior remains runtime-checked. No persistent worker,
implicit provider fallback, universal tool registry, automatic retry, permissive preset, or fluent
Workflow graph language is required for this composition.

## External reference and workflow patterns

Anthropic's [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
was read as an external usability reference. Its distinction between predefined workflow paths and
model-directed agents supports keeping control ownership visible; its advice about small composable
patterns supports using the existing Stage/transition language rather than adding pattern classes.
It does not specify ArrokothI semantics.

| Pattern | Current ArrokothI expression / judgment |
|---|---|
| Prompt chaining | Sequential Function/LLM Stages; explicit validation gates and transitions |
| Routing | Labeled transitions; an LLM selects only declared labels |
| Parallelization (sectioning/voting) | Existing single-Stage fork branches and Function join; aggregation is application code |
| Orchestrator-workers | Fixed workers can be child Stages; arbitrary model-directed child delegation is absent from the stock Agent and must not be advertised by a helper |
| Evaluator-optimizer | Declared evaluate/revise loop with explicit bounds; output acceptance belongs in code/application evaluation |
| Agent | Stock model-directed operation loop, explicit exposure/permissions and cumulative budgets |

The SDK does not copy Anthropic's terminology where the kernel's ownership rules are more precise.
For example, an LLM choosing a transition remains a Workflow, and a Function handler doesn't become
an Execution because it is complex. The source-backed examples demonstrate conversation, guarded
publication, child Agents and routing; SDK tests also exercise adapters, recursion and fork/join.

## Bounded bugs repaired

### DefinitionStore constructor discarded validation failures

The in-memory constructor called `void this.save(definition)`. Since `save` is async, invalid or
duplicate seed definitions rejected a discarded promise rather than throwing at construction.
Construction now shares a synchronous private insertion routine with `save`: constructor failures
throw synchronously, while the public async save contract remains unchanged. Regression evidence:
[constructor tests](../../../../packages/core/tests/definition-store-constructor.test.ts).

### Colon-delimited operation indexes merged distinct identities

Both name components permit colons, so `(a:b, c)` and `(a, b:c)` shared the old key `a:b:c`.
`createCapabilityCatalog` could overwrite one descriptor or classify an unregistered operation using
another's non-consequential descriptor. Authority creation/delegation and Active View candidate
selection could silently drop one of two valid operations.

These internal indexes now encode the full tuple as JSON. Operation identity remains the original
pair, grant records/projection records keep their formats, and human display `formatOperationRef`
remains unchanged (explicitly documented as unsuitable for unique indexing). Coverage:
[catalog conformance](../../../../tests/conformance/agent/operation-catalog.test.ts) and
[SDK authority/view integration](../../../../packages/sdk/tests/operation-identity.test.ts).

An initial broader concern included idempotency keys. Investigation found that
[duplicate comparison](../../../../packages/core/src/effects/duplicate-detection.ts) and the
[dispatch guard](../../../../packages/core/src/runtime/effect-processor.ts) compare the full persisted
request after key lookup. A key collision there only broadens candidate search; it does not establish
identity or cause false replay. That format was deliberately left unchanged.

## Remaining correctness and architectural concerns

1. **Composition data flow is the highest-value design issue.** Canonical
   [composition §4](https://github.com/ArrokothI/Agent_SDK/blob/9fc2b4472d41e35402bfbfb24f7a62ee21c2e2f3/docs/composition.md#4-stage-transition-contract) recommends Structured Memory for
   later Stages, but the [Stage port](../../../../packages/core/src/ports/stage.ts) has no committed-memory
   reader. Edges carry only string/null, and [terminal proposals](../../../../packages/core/src/workflow/spec.ts)
   can only be literals/none. A computed child Workflow result cannot be returned directly. Consider
   an explicit validated terminal selector together with bounded structured Stage values or authorized
   Stage resource/memory views. These need a coordinated contract decision; the SDK preserves today's
   behavior and does not smuggle stores into Stage closures.
2. **Capability schemas are not a universal dispatch validator.** The provider path validates
   projected callable inputs, while Function/custom-controller Effects can reach executors without
   catalog input-schema validation. See the [existing evidence and ownership question](007-application-builder-ergonomics-findings.md#capability-schema-validation-boundary).
   Executors must enforce domain contracts. Central mandatory validation should be designed with
   unknown-catalog behavior and all entry paths; it was not added as an ergonomic side effect.
3. **Stock model aliases can collide.** The newly preserved colon-bearing operations may correctly
   hit the existing `agent_projection_ambiguous` refusal rather than silently losing one. Preflight
   warns about potential requested alias collisions. A future alias allocator should preserve exact
   invocation binding and portability; generated aliases must never be application policy identities.
4. **Allow-list overlap semantics remain surprising.** The reference policy uses the first matching
   capability grant; multiple operation-specific rules for the same capability can shadow later
   grants. Consolidate one rule or supply explicit policy. Combining constraints needs a deliberate
   policy-helper decision, not a silent permission widening.
5. **Long-lived state and liveness need further work.** Agent call budgets are cumulative, retained
   history is not compacted by the context window, child deadlines/cancellation do not provide
   automatic cascading supervision, and stock Agents lack child/message/typed-input action authoring.
   These are existing limitations, not solved by bootstrap.
6. **Deployment/distribution scope stays explicit.** Runtime stores are in memory, trusted-local code
   is not contained, and no crash recovery is implied by port substitution. Source-only TypeScript
   exports mirror the workspace; packed npm consumers need a TypeScript build/bundler rather than
   relying on stock Node stripping inside node_modules. A compiled JS distribution across core and
   adapters deserves a coordinated release change.

No large kernel rewrite or semantic change was needed for the SDK. The above concerns remain open,
with supporting implementation details in [builder findings](007-application-builder-ergonomics-findings.md).

## Validation ownership

`npm run test:sdk` covers composition, diagnostics, defaults, registration, permission independence,
memory denial, confirmation/child waits, concurrency, slow work, host limits and operation identity.
The migrated application examples retain their existing behavior tests, including fake-HTTP Gemini
and both reference/Strands executors. Standard package/conformance suites, typechecking, behavioral
evals, offline CLIs and builder checks validate the integrated change. Package dry-runs check the
publishable workspace contents; no live-provider quality or production-readiness claim follows.

Integrated verification: `npm test` passed 965 tests, `test:sdk` passed 22,
`test:example:execution-kernel` passed 18, and `test:evals` passed 12. Typechecking, both offline
example CLIs, workspace dependency resolution, builder documentation checks, and all workspace
package dry-runs passed. A separate consumer typechecked and executed the actual packed SDK/core
contents with an explicit TypeScript loader; this does not imply stock Node can execute TypeScript
dependencies without a build or loader. Temporarily restoring the previous implementations made
three new regression tests fail; all nine targeted constructor/catalog/identity tests passed after
restoring the fixes.
