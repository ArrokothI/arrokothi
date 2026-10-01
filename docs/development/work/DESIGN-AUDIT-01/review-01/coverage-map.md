# Reviewer coverage map (derived from brief-01 at B before reading implementation-01)

| Criterion | Obligation (from brief-01) | Distinguishing check | Plausible wrong implementation it must catch |
|---|---|---|---|
| DA-1 | Every finding ID in review records of K0.1, K0.2, K1.0, K1.1 (+ all corrections + reference), K1.2 (+ correction-01). Closed at 9fd2faa; open at B. Each classified design/evidence/records + subsystem. Script + output + table. | Independent grep over the same trees with a broader grammar; diff vs enumerate.py's set; check for IDs outside `review-*.md` (blockers, cleanup findings, amendments, decision records, nested review dirs, tables); IDs reused across packets; sample >=30 classifications. | Grammar misses unusual prefixes / unprefixed findings; scope omits K1.0 corrections / K1.1-correction-02 / nested review dirs; classifications templated by prefix rather than read. |
| DA-2 | Every family with >=3 findings or findings in >=2 rounds has an entry: design choice (code sites + rule links), why one at a time, >=2 options incl. keep, each with cost, benefit, affected accepted claims. | Recompute families/threshold from DA-1 data; per-family check that sites exist at B and rules link; options distinct. | Families invented post hoc to fit a template; generic "why"; options identical except a clause. |
| DA-3 | Items (a)-(f) covered regardless of DA-2. (a) per option: code/tests/Layer-3/claims changed, K1.1 findings moot, SDK compat, effect on V-D1 & decision-05 meter, DEC-8/9 rules/sweeps/infra kept/simplified/deleted, line counts of defense. (b) own-array + JCS window cost/complexity, what each (a) option removes. (c) O-R8-4. (d) coordinator shape vs K1.3/K2/K3. (e) analyzer/inventory/sweep: protects what, survives (a)?, absorb into TOOLS-01? (f) anything else incl. records/process -> hand to process owner. | Read each entry against the list of required sub-items. | Missing sub-items (e.g. SDK compat, decision-05 meter effect) for some option. |
| DA-4 | Every option row names finishable criteria for its follow-up packet. | Each criterion states closing method (check / mechanism / declared search) and is specific to that option. | Universal claims ("no hostile caller can...") without mechanism; copy-paste criteria. |
| DA-5 | Every quantitative statement backed by small reproducible probe. | Rerun probes; trace each number in register/drafts/report to a probe output; check derivations (ratios, attributions). | Numbers hand-derived, stale, or computed from mislabeled spans. |
| DA-6 | Each item ends in draft owner decision: recommended option + alternatives; audit decides nothing. | Every register item/family has a draft with recommendation + alternatives; no draft asserts adoption or releases. | Missing drafts; drafts that pre-decide; stop-01/invalidation exceeding authority. |
| DA-7 | No production code/test/Layer-3/baseline change; git diff B..H touches only work/DESIGN-AUDIT-01/ and 007's row. | git diff --name-status B H; inspect 007 hunk(s); C..H allowlist per 006. | Extra 007 edits; edits to another row without authority. |

Stop conditions to check: semantic-decision blocker; evidence that an accepted claim is false -> invalidation notice (stop-01 / invalidation-01 for O-R8-4). Verify adoption quote and authority.

Interactions to check:
- (a) options vs (b), (c), (e), F-families that depend on the threat model: one architecture or conflicting?
- O-R8-4 hold vs K1.1 row edit vs DA-7's "007's row" (singular).
- Verdict-flip count vs 016 (4 flips) — definitions.
- Quantities used in recommendations must be reproducible.
