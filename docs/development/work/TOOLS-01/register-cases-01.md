# TOOLS-01 register 01 — step 9, reduced: held-claim witnesses and the case register (item 4)

2026-10-05. Claude Code (`claude-opus-5-5`), implementer. Item 4 under
[owner choice 04](owner-choice-04.md) §2: P1-H witnesses and register classification for V-D1, Proxy,
re-prototyped built-ins and V-ENV. Parent `f9b39b76`. No design 05 §5.3 origin is converted;
K1.1-correction-03 owns those. Incremental checkpoint; no final C/H or acceptance.

**Cause.** P1-H requires that the register of current tests *and cases* observing each held claim be
fully classified. Until now the corpus matched only leaf test registrations and stated "registry
cases are not yet registered" as a limit.

**Fix.**
- The register now also matches every registry case, keyed `case:<id>`. A case's title is its ID and
  assertion. Its body is its stored input, its argv, and the text of each repository file it names or
  runs, except the registry itself. Recipes are unchanged except two file entries: `realm-probe.mjs`
  for V-ENV and `work-charge-probe.mjs` for V-D1. Those are the probes that run every realm case and
  the work-charge case. Without them, 9 realm cases matched no recipe.
- Two new refusals:
  - a `held` or `superseded` case entry needs the case's own witness attribution in the registry
    (`held_witness` or `mechanism_witness`);
  - every attributed case must be registered `held` or `superseded`.
  Both refusals are registered and ablated.

**Classification (one rule, from each case's attribution).**
- The 65 matched cases are exactly the 65 attributed ones, all `held`:
  - 53 realm cases under V-ENV (BINDING-01);
  - 10 re-prototyped-built-in capture cases and 1 Proxy capture case (K1.1-correction-03);
  - the work-charge case under V-D1.
- The 35 unattributed cases (29 oracle, 5 tool-result, 1 identity) match no recipe.

**Witnesses.** The 199 member witnesses imported in item 3 stand:
- 82 V-ENV, 28 V-D1, 13 Proxy and 2 re-prototyped-built-in `held_witness`;
- 74 Proxy `superseded_witness`.

Reproducing a witness earns no conformance, correction or release credit.
The step-9 conversion of the K1.1-correction-03 area (86 + 41 origins) stays with that packet.

**Validation.** See the commit message, including item 3's corpus run in this checkout.
