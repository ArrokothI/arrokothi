---
name: arrokothi-slice-audit
description: >-
  Use when implementing or independently auditing a scoped ArrokothI development milestone.
  Covers establishing
  slice scope and acceptance criteria, staying in scope, running targeted conformance/typecheck/eval
  validation, reviewing the resulting diff against canonical invariants, and reporting PASS / FAIL /
  DEFERRED findings for audit tasks. Not for open-ended architecture design (use
  arrokothi-architecture) or single external-integration work (use arrokothi-provider-integration).
---

# ArrokothI slice implementation and audit

For a scoped slice or milestone, `docs/development/README.md`,
`docs/development/002-implemented-kernel-baseline.md`, and
`docs/development/001-current-status-and-roadmap.md` establish the current implementation, sequence,
scope, and acceptance criteria. Specialized active documents add boundary-specific guidance. None
overrides canonical architecture.

## Source of truth

This skill defines workflow, not architecture. Resolve the current concept owner through
`docs/README.md` before relying on architecture-specific wording or examples here; the canonical
owner overrides stale skill text. Using this skill does not justify editing it. Update it only when
an accepted architecture or workflow change makes it materially false, obsolete, misleading, or
incomplete, and never infer permanent policy from implementation observations.

## Procedure

1. **Establish exact scope and acceptance criteria.** Start with the active baseline and roadmap.
   Identify the current tranche and specialized active guidance, then write down what is in scope,
   explicitly deferred, and required for acceptance. Do not infer current scope from a superseded
   milestone record merely because its header once said “accepted”.
2. **Identify authoritative contracts.** Map semantic acceptance criteria to the canonical doc
   that owns the concept (`docs/README.md` table), then identify the code contract and existing test
   coverage where implementation is in scope.
3. **Inspect implementation and tests.** Read the relevant modules under `packages/` and the tests
   under `tests/conformance/` and `packages/*/tests/` that already pin behaviour in this area.
4. **Stay in scope.** Do not expand to unrelated refactors, renames, or "while I'm here" fixes.
   Note out-of-scope issues for a later milestone instead of fixing them now. Respect unrelated
   working-tree changes — inspect `git status` first and do not disturb them.
5. **Validate proportionally.** Prefer the narrowest run that proves the acceptance criteria. For
   code changes, use the relevant conformance or per-package runner during iteration, then run
   `npm run typecheck` and `npm test`; add `npm run test:evals` when Agent behaviour is in scope.
   Documentation or configuration-only slices need artifact-specific validation, not unrelated
   runtime suites.
6. **Inspect the diff.** Run `git diff` and read every change. Confirm each hunk maps to an
   acceptance criterion or a necessary supporting change.
7. **Check invariants and doc consistency.** Re-derive the current protected distinctions from
   `docs/mental-model.md` and the owning canonical documents. If semantics changed, confirm the
   owning normative doc and conformance tests were updated in the same change.
8. **Report findings (audit tasks).** For each acceptance criterion, give a clear verdict:
   - **PASS** — implemented and covered by validation, with the test/evidence named.
   - **FAIL** — missing, incorrect, or breaks an invariant; state the specific gap.
   - **DEFERRED** — intentionally out of the scoped milestone; cite where it is deferred.
   Preserve review independence: implementation claims are not acceptance evidence until the
   reviewer checks the diff and validation directly. Do not hard-code any one slice as “current” —
   always re-derive scope from the active roadmap and repository state.
