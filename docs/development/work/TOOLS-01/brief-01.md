# Brief 01 — TOOLS-01

## Goal

Make packet identity and evidence provenance mechanically checkable, and provide one maintained
interface for registered counterexamples and mutations. Start with the research-independent
foundation under [release 01](release-01.md); preserve every held case and make remaining work visible.

## Criteria (finishable)

[The contract](contract.md) owns F1–F6 for this build and P1–P2 for the whole packet. F1–F6 close
by deterministic fixtures and the stated scope; P1–P2 remain mandatory before review-ready.
No green foundation summary means that the full historical corpus was adopted or Kernel claims fixed.

## Known counterexamples

- The audit's [208 artifact/fence entries](../DESIGN-AUDIT-01/evidence-inventory.json) and
  [1,333 prose locators](../DESIGN-AUDIT-01/evidence-mentions.json), pinned to their original revisions.
- [Review-03 intake](../DESIGN-AUDIT-01/cleanup-01.md#carried-p3-items-intake-for-tools-01-or-the-successor-corpus):
  global binding forms, the freeze witness, RM1/RM2/RM3/RM5 closed by reading and the Proxy clarification.
- [Identity part boundaries](../../../../packages/kernel/src/identity.ts): naive concatenation can
  collapse different request parts; use it as the first real mutation-runner case.
- Invalid candidate ancestry, extra C..H payload, missing/changed evidence, unapplied mutations,
  failing controls, unreached code, setup errors, timeout and surviving oracle mutants.

## Suspect design

Current packet-local verifiers hardcode individual rounds and combine provenance, execution and
human judgments. The audit catalog's dispositions are filename-based recommendations; a catalog
entry is not a maintained runnable case. A nonzero test exit alone is not a mutation kill.
The [complete-decision oracle](../../../../packages/kernel/tests/sweep/fault-oracle.ts) already
compares useful independent observations; keep its scope and exceptions when adopting it later.

## Questions before code

1. How are immutable source facts separated from declared policy and reviewer authority?
2. How do unclassified/extraction-pending entries stay visible instead of counting as coverage?
3. How do mutations establish applicability, reach and a named independent assertion failure?
4. How are runs isolated from the user's checkout and global-poison cases from each other?

[Design 01](design-01.md) answers these for the foundation. This build changes no Kernel semantics
and requires no new owner policy choice. The owner authorized starting this independent work;
009 Prompt A requires a separate pre-build design check for semantic changes or an explicit brief
gate, neither of which this foundation introduces. Independent acceptance is still required later.

## Bounds

Use Python's standard library and the existing Node runtime; add no dependency. Keep canonical
owners, production packages, historical evidence and process policy unchanged. Do not adopt the
bytes-core draft, select Proxy policy, replace the serializer, alter cost claims, retire hostile
cases or the analyzer, implement waits, or run legacy mutation scripts on the shared checkout.
Keep the branch available and clean at handover; save a second handover outside the repository.

## Stop conditions

Ask before changing accepted semantic behavior, introducing a new dependency, or reducing a
mandatory corpus obligation. A historical source without an executable fixture stays pending with
its provenance; do not invent a passed test. Continue independent mappings when another item
requires the pending research. Never mark the whole packet review-ready while P1/P2 remain open.
