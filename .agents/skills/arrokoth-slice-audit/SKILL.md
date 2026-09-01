---
name: arrokoth-slice-audit
description: >-
  Use when implementing or independently auditing a scoped ArrokothI development slice or milestone
  (e.g. "Slice D", "D.0.1 retrofit", a roadmap milestone from docs/development/). Covers establishing
  slice scope and acceptance criteria, staying in scope, running targeted conformance/typecheck/eval
  validation, reviewing the resulting diff against canonical invariants, and reporting PASS / FAIL /
  DEFERRED findings for audit tasks. Not for open-ended architecture design (use
  arrokoth-architecture) or single external-integration work (use arrokoth-provider-integration).
---

# ArrokothI slice implementation and audit

The current development roadmap is organized into scoped slices. `docs/development/README.md`
tracks the current sequence and where the work stands; individual `docs/development/NNN-*.md`
notes hold slice decisions. Canonical architecture always outranks a development note when they
disagree.

## Procedure

1. **Establish exact scope and acceptance criteria.** Identify the specific slice note(s) in
   `docs/development/`. Write down what is in scope, what is explicitly deferred, and the concrete
   acceptance criteria. If scope is ambiguous, resolve it before editing — do not infer scope from
   surrounding code.
2. **Identify authoritative contracts.** Map semantic acceptance criteria to the canonical doc
   that owns the concept (`docs/README.md` table), then identify the code contract and existing test
   coverage where implementation is in scope.
3. **Inspect implementation and tests.** Read the relevant `packages/core/src/` modules,
   `packages/*/` adapters, and the tests under `tests/conformance/` and `packages/*/tests/` that
   already pin behaviour in this area.
4. **Stay in scope.** Do not expand to unrelated refactors, renames, or "while I'm here" fixes.
   Note out-of-scope issues for a later slice instead of fixing them now. Respect unrelated
   working-tree changes — inspect `git status` first and do not disturb them.
5. **Validate proportionally.** Prefer the narrowest run that proves the acceptance criteria. For
   code changes, use the relevant conformance or per-package runner during iteration, then run
   `npm run typecheck` and `npm test`; add `npm run test:evals` when Agent behaviour is in scope.
   Documentation or configuration-only slices need artifact-specific validation, not unrelated
   runtime suites.
6. **Inspect the diff.** Run `git diff` and read every change. Confirm each hunk maps to an
   acceptance criterion or a necessary supporting change.
7. **Check invariants and doc consistency.** Verify the protected distinctions in
   `docs/mental-model.md` §10 still hold. If semantics changed, confirm the owning normative doc
   and conformance tests were updated in the same change.
8. **Report findings (audit tasks).** For each acceptance criterion, give a clear verdict:
   - **PASS** — implemented and covered by validation, with the test/evidence named.
   - **FAIL** — missing, incorrect, or breaks an invariant; state the specific gap.
   - **DEFERRED** — intentionally out of this slice per its scope note; cite where it is deferred.
   Do not hard-code any one slice as "the current slice" — always re-derive scope from
   `docs/development/` for the task at hand.
