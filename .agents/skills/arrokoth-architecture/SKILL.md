---
name: arrokoth-architecture
description: >-
  Use when a task changes or reasons about ArrokothI architectural semantics or core abstractions —
  Execution/Definition, Event/Effect, Harness, authority vs exposure, memory vs context,
  composition (spawn/call/send/ask), Workflow vs Agent, Stage, Adapter, provider boundaries, or
  interoperability projections. Applies to editing kernel contracts in packages/core, changing a
  canonical doc under docs/, or answering "how does ArrokothI model X". Not for routine bug fixes,
  formatting, or adapter-only work that preserves the core contract (use arrokoth-provider-integration
  for the latter).
---

# ArrokothI architecture changes

ArrokothI is a provider-neutral execution kernel. Its value is a small set of protected
distinctions; treat them as load-bearing, not stylistic. `docs/README.md` is the canonical map and
assigns each concept a single owning document.

## Procedure

1. **Identify the affected abstraction and contracts.** Name the concept(s) in play (Execution,
   Event, Effect, authority/Active View, memory form, Stage, composition primitive, portable
   Operation/Resource, security profile) and the code contracts that encode them.
2. **Find and read the normative doc that owns the concept.** Use the ownership table in
   `docs/README.md`. Read the whole relevant section, plus `docs/mental-model.md` for the
   system-wide invariants. Then check `docs/development/` (start at its `README.md`) for accepted
   decisions and history on this area.
3. **Inspect the implementation and its tests.** The contract lives in `packages/core/src/`;
   conformance lives in `tests/conformance/` and `packages/*/tests/`. Read the tests that currently
   pin the behavior.
4. **State the existing invariant before editing it.** Write down what is guaranteed today and
   where that guarantee is asserted. If docs, code, and tests disagree, report the ambiguity rather
   than silently choosing one. When the task authorizes an architectural change, record unresolved
   ambiguity in the relevant `docs/development/` note or `docs/future-plan.md`.
5. **Classify the change.** Separate a genuine semantic/API change from an implementation-only,
   naming, packaging, or backend change. Genuine semantic changes require the owning canonical doc
   and conformance coverage to move together. Implementation fixes may add regression coverage
   while preserving the existing documented contract.
6. **Check provider-neutrality and cross-provider implications.** Kernel semantics stay neutral
   across model/retrieval/storage/policy/protocol backends. Verify the change does not pull a
   provider's or protocol's native concept (MCP, A2A, a specific SDK) into core. MCP/A2A/Agent
   Skills are compatibility targets, not owners.
7. **Synchronize docs and tests.** When semantics genuinely change, update the owning normative
   doc and the conformance tests in the same change. Keep code, docs, and tests consistent.
8. **Validate proportionally.** For code changes, use targeted conformance tests during iteration,
   then `npm run typecheck` and `npm test`; run `npm run test:evals` when Agent behaviour could be
   affected. For analysis or documentation-only work, validate the cited contracts and changed
   artifacts without running unrelated suites.
9. **Do not import assumptions from similar systems.** Other agent frameworks, workflow engines,
   actor systems, and job queues use overlapping words with different meaning. Ground every rule in
   current ArrokothI docs and tests. Do not freeze terminology beyond what the canonical docs
   currently establish; put speculative vocabulary in `docs/future-plan.md`.
