---
name: arrokothi-provider-integration
description: >-
  Use when adding or changing an ArrokothI external integration: model, retrieval, storage,
  Agent-executor, capability, or MCP/A2A/protocol adapter. Find the ArrokothI-owned port first,
  preserve provider neutrality, contain vendor behavior at the boundary, and add boundary-specific
  conformance or canary coverage. Not for changing core kernel semantics themselves (use
  arrokothi-architecture).
---

# ArrokothI provider / integration boundary work

The kernel is deliberately neutral across providers, backends, and protocols. An integration
implements or projects an ArrokothI-owned contract at the boundary; its native object model does not
become kernel semantics. Dependencies point inward toward current core-owned contracts.

## Source of truth

This skill defines workflow, not architecture. Resolve the current concept owner through
`docs/README.md` before relying on architecture-specific wording or examples here; the canonical
owner overrides stale skill text. Using this skill does not justify editing it. Update it only when
an accepted architecture or workflow change makes it materially false, obsolete, misleading, or
incomplete, and never infer permanent policy from implementation observations.

## Procedure

1. **Find the exact contract first.** Locate the current port or projection the integration
   implements, then use `docs/README.md` to find and read its canonical owner and any adjacent
   owners the map identifies. Read `docs/development/002-implemented-kernel-baseline.md` and
   `docs/development/legacy/2026-09-baseline/005-interoperability-baseline-and-next-constraints.md` for current evidence;
   consult `docs/development/001-current-status-and-roadmap.md` for planned work.
2. **Preserve provider neutrality.** Do not add a core field, enum, lifecycle, or identity merely
   because one vendor, framework, database, or protocol has it. Admit a native concept into kernel
   semantics only through an explicitly authorized architectural decision.
3. **Apply the current restrictions of this boundary, not another one.** Discover them from the
   canonical owner, the current port, and its conformance tests. For model-provider work, establish
   the current resolution/invocation boundary from those sources. Do not copy restrictions between
   integration kinds.
4. **Normalize explicitly where the port requires it.** Contain vendor auth, transport, errors,
   retries, schemas, and wire formats at the boundary. Follow the current contract-specific feature
   and failure semantics rather than generalizing one integration's mechanisms to every boundary.
5. **Test the published contract when one exists.** Run the relevant helper or conformance suite
   under `tests/conformance/` and the adapter's `packages/*/tests/`, using deterministic fixtures for
   native normalization. Add an opt-in `.env`-gated live canary only when endpoint drift needs one;
   keep `npm test` offline.
6. **Escalate genuine semantic changes.** If the integration exposes a useful general concept that
   the current port cannot represent, treat that as an architectural decision and follow
   `arrokothi-architecture`; do not reshape core as a side effect of adapter work.
7. **Validate proportionally.** For code changes, run the boundary-specific tests, then
   `npm run typecheck` and `npm test`. For analysis or documentation-only work, validate the cited
   contracts and changed artifacts without unrelated suites.
