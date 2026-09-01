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

## Source of truth

This skill defines workflow, not architecture. Resolve the current concept owner through
`docs/README.md` before relying on architecture-specific wording or examples here; the canonical
owner overrides stale skill text. Using this skill does not justify editing it. Update it only when
an accepted architecture or workflow change makes it materially false, obsolete, misleading, or
incomplete, and never infer permanent policy from implementation observations.

## Procedure

1. **Identify the affected abstraction and contracts.** Name the concepts in play using current
   repository terminology, and locate the code contracts that encode them. Treat the examples in
   this skill's description as representative, not exhaustive or permanently frozen.
2. **Find and read the normative doc that owns the concept.** Use the ownership table in
   `docs/README.md`. Read the whole relevant section, plus `docs/mental-model.md` for the
   system-wide invariants. Then check `docs/development/` (start at its `README.md`) for accepted
   decisions and history on this area.
3. **Inspect the implementation and its tests.** Locate the affected implementation under
   `packages/` and its coverage under `tests/conformance/` or `packages/*/tests/`. Read the tests
   that currently pin the behavior.
4. **State the existing invariant before editing it.** Write down what is guaranteed today and
   where that guarantee is asserted. For ordinary implementation, treat it as a constraint. When
   the task explicitly authorizes evaluating or changing it, treat it as the starting contract,
   identify the consequences, and do not let stale skill wording veto the change. If docs, code,
   and tests disagree, report the ambiguity rather than silently choosing one.
5. **Classify the change.** Separate a genuine semantic/API change from an implementation-only,
   naming, packaging, or backend change. Genuine semantic changes require the owning canonical doc
   and conformance coverage to move together. Implementation fixes may add regression coverage
   while preserving the existing documented contract.
6. **Check provider-neutrality and cross-provider implications.** Verify the change does not pull
   a provider's, framework's, or protocol's native concept into core merely because one boundary
   exposes it. Use the current canonical interoperability contract to decide the correct layer.
7. **Synchronize docs and tests.** When semantics genuinely change, update the owning normative
   doc and the conformance tests in the same change. Keep code, docs, and tests consistent.
8. **Validate proportionally.** For code changes, use targeted conformance tests during iteration,
   then `npm run typecheck` and `npm test`; run `npm run test:evals` when Agent behaviour could be
   affected. For analysis or documentation-only work, validate the cited contracts and changed
   artifacts without running unrelated suites.
9. **Do not import assumptions from similar systems.** Other systems use overlapping words with
   different meanings. Ground every rule in current ArrokothI docs and tests. Do not freeze
   terminology beyond what the canonical docs currently establish; put speculative vocabulary in
   `docs/future-plan.md`.
