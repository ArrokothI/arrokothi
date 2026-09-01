---
name: arrokoth-provider-integration
description: >-
  Use when adding or changing an ArrokothI external integration: model, retrieval, storage,
  Agent-executor, capability, or MCP/A2A/protocol adapter. Find the Arrokoth-owned port first,
  preserve provider neutrality, contain vendor behavior at the boundary, and add boundary-specific
  conformance or canary coverage. Not for changing core kernel semantics themselves (use
  arrokoth-architecture).
---

# ArrokothI provider / integration boundary work

The kernel is deliberately neutral across providers, backends, and protocols. An integration
implements or projects an Arrokoth-owned contract at the boundary; its native object model does not
become kernel semantics. Imports point inward toward `@agent-sdk/core`.

## Procedure

1. **Find the exact contract first.** Locate the port or projection the integration implements and
   read its canonical concept owner from `docs/README.md`. Use `docs/interoperability.md` and
   `docs/authority.md` for protocol exposure; use the runtime, memory, or composition owner for
   storage, retrieval, capability, or Agent-executor boundaries. Check the relevant
   `docs/development/` history after the canonical docs.
2. **Preserve provider neutrality.** Do not add a core field, enum, lifecycle, or identity merely
   because one vendor, framework, database, or protocol has it. Keep native types and wire objects
   out of semantic Definitions and Execution context.
3. **Apply the restrictions of this boundary, not another one.** Model resolution and invocation
   remain separate, and those model contracts cannot reach the Harness, `RuntimeStore`, Effect
   processor, or `CapabilityExecutor` (`docs/development/006-provider-foundation-decisions.md`). An
   Agent executor, `RuntimeStore` implementation, retrieval capability, or protocol adapter has a
   different port and must be checked against its own contract and architecture tests.
4. **Normalize explicitly where the port requires it.** Contain vendor auth, transport, errors,
   retries, schemas, and wire formats at the boundary. Follow contract-specific feature and failure
   semantics. For example, required/optional feature resolution and missing-option metadata belong
   to the model contract; do not generalize that mechanism to every integration.
5. **Test the published contract when one exists.** Run the relevant helper or conformance suite
   under `tests/conformance/` and the adapter's `packages/*/tests/`, using deterministic fixtures for
   native normalization. Add an opt-in `.env`-gated live canary only when endpoint drift needs one;
   keep `npm test` offline.
6. **Escalate genuine semantic changes.** If the integration exposes a useful general concept that
   the current port cannot represent, treat that as an architectural decision and follow
   `arrokoth-architecture`; do not reshape core as a side effect of adapter work.
7. **Validate proportionally.** For code changes, run the boundary-specific tests, then
   `npm run typecheck` and `npm test`. For analysis or documentation-only work, validate the cited
   contracts and changed artifacts without unrelated suites.
