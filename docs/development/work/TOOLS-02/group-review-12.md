# Group review 12 — recovery family reconciled for building

2026-10-29, implementing Codex GPT-6 session, owner choice 09. Product/test bytes
checked at `782ad658`, unchanged from the prior passing catalog. The whole H1–H22
runner and sealed output remain the fixed source pin/readings in group-review-11.
No historical file is changed.

**At origin 696: five test groups and 67 mutation-adoption cases.** Six new cases
are H7/H17/H18/H20/H21/H22. H2 and H19 retain separate mutants/provenance in existing
planned cases H1 and H16 respectively, under the same input/environment/operation/
required-result rule. No new behavior test is needed in this family.

## Final member readings before execution

| Members | Planned route / current location |
|---|---|
| H1/H2 | One inherited-resultingEpoch adoption, two production mutants. H1 restores the optional read in the History builder. H2 re-anchors it at `plan.history` in state.ts #applyControl. Both are distinguished by protocol-enter/data and its exact History record; retain both source variants, not two cases. |
| H3 | History-before-holds ordering moved to #applyControl. The current negative control 27 swaps exactly those writes; the complete-decision fault check independently forbids a changed hold without its History on a refused/failed call. Retain the existing mechanism/oracle route, with no extra conformance credit from structural evidence. |
| H4/H5 | Direct writes through coordinator mutable records were replaced by the owner boundary. Current state-owner.write-outside-apply and the writer/prepare controls cover that boundary; late History construction is the same atomicity distinction as H3 in the current owner arm. Reader-property TypeErrors are not replacement counterexamples. |
| H6 | Takeover writes moved to #applyTakeover. The oracle's TAKEOVER_APPLY table fixes the current History-before-epoch/grant/Activation order; its apply-sequence control rejects changes. |
| H7 | New adoption: the current recovery return must remain a prebuilt local after state.apply. Re-anchor a late holdsOf(exchange)/ok answer construction at that return. The maintained structural recovery rule and negative control 28 assert the obligation; add a registered production edit against that existing rule. |
| H8 | Existing oracle.recoveryAnswer mutates the returned hold answer and independently compares it with retained state. |
| H9 | Current conditional clearing-record append in #applyTakeover is explicitly required by TAKEOVER_APPLY and its source/sequence check. |
| H10/H11/H12 | Keep the three distinct History-resulting-epoch, control-authority and minted-takeover-receipt cases from group-review-11. H12's two raw matches are disambiguated by the takeover epoch-advance prefix. |
| H13 | Exact current takeover receipt-drop mutation already exists in state-owner.dropped-coupled-field. |
| H14 | Existing takeoverAnswer independently requires one position advance; TAKEOVER_APPLY fixes its current state-owner assignment. |
| H15 | Keep the current controlScopes ambient-inheritance case from group-review-11. |
| H16/H19 | One no-inherited-Driver-safety adoption, two production mutants. H16 bypasses hostMember at the call; H19 lets hostMember walk Object.prototype. The same Driver without a method, request-installed ambient method and zero-call/unsafe-replacement result distinguish both. Retain H19's other current call-site variants in the complete host-members target file. |
| H17 | New mailbox-capacity-option adoption: ordinary optional read consults Object.prototype. Constructor remains current; default mailbox admission is the required result. |
| H18 | New Emission-limit-option adoption: same construction environment, different limit and Outcome-admission result. The maintained leaf asserts both boundaries; each mutation remains separately attributable. |
| H20 | New Function.prototype safety adoption: distinct function-object Driver environment. |
| H21 | New positive-host-prototype adoption: host-owned prototype declarations must work. Keep Driver, caller-scope and options variants in the target file; this is distinct from rejecting ambient inheritance. |
| H22 | New descriptor-own-value-guard adoption in own-array.ts. The maintained ambient-read rule asserts its structural precondition. |

H17–H22's original anchors remain unique. H7 and H2 have the explicit current
relocations above. The remaining existing routes are readings for final P1-M binding,
not a claim that a family with unvalidated new mutants is already closed.

## Build and validation plan

The planned batch adds 49 cases / 51 mutations to the existing mutations.json:
41 cases from group reviews 09–11 plus this reading's six new cases and the two
previously planned reviewer-09 cases (49 unbuilt cases total). H2/H19 are the two
additional mutations sharing cases. Each behavior case names its existing passing
leaf, current anchors and static test import closure. No product changes are needed.

H7 and H22 read source as data. Use the existing state-owner-probe and assertion
reporter with two additional maintained control-spec entries, each naming its complete
current file inventory and the exact rule that must fail. A source-read mechanism
check is not presented as execution reach at a product offset. These remain structural
claims; passing tests or qualifying kills are not independent acceptance.

Fresh clone/npm-ci controls and qualified kills are required before routes bind.
Record every attempt's elapsed runtime, including failed controls and retries.
The two earlier runs total **33.805 seconds**: 5.936 seconds of setup-refused controls
plus 27.869 seconds of successful controls/kills. Runtime extrapolation is not used
for owner choice 09's 600-second stop.

For early cap monitoring using projection 07's unchanged formulas: cumulative
adoptions ceil(67/696 × 1,518) = 147; recent-rate projection from origin 431 is
ceil(67 + 56/265 × 822) = 241, both below 250. Test-group projections remain 11/12.
The next scheduled checkpoint remains origin 1,031; origin 731 is not a scheduled stop.

Resume at `K1.2-correction-01/ablations-07.mjs:1`,
`artifact-d3c77a74ad17db7c908e8b60`, after this build batch. No product/historical
edit, final C/H, self-audit, mappings_complete or CI dispatch is claimed.
