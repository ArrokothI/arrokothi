# Owner decision brief 03 — stop and redesign

This is the handoff from [independent review 02](../review-02.md), bound solely to H `41628b8bcfd11c899c2fcf60ef4fb73c0858e298`, with B `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b` and payload C `ad9bc8640d261ace8af5e75c47aad1bad3ca84d7`. It is an owner decision brief, not authorization for another patch round.

006's second-CHANGES-REQUIRED trigger fires in subsystems corrected after review 01. The owner must choose redesign, a refined finishable claim, a split, or an accepted recorded limit before implementation resumes. Redesign requires a new design note and design check. The full root-cause note, evidence and tradeoffs are in the review.

## Goal and suspect design

Bring the evidence's distinctions into agreement with the claimed contract:

- **KC3-R2-EVID-01 (P2):** a test-side import is not assertion origin. Assertions may call subject code and rethrow its error; the harness wrapper also infers origin by reading a condition after an exception.
- **KC3-R2-STOP-02 (P2):** syntactic return checks conflate failed boolean helpers with accepted boolean values. The runtime oracle observes caller reads and counters, but the invariant also forbids post-stop bookkeeping and finalization.
- **KC3-R2-C1-03 (P2):** C1 quantifies preservation per converted test. A kill in another group is packet-level sensitivity and does not, without an owner refinement, close a qualifying ingress group loss.

The current traversal passed source inspection and the new bounded continuation search. Review 01's concrete listing defect, parse/load controls and Q6 prose defect are corrected. Those facts do not establish the failed evidence properties. The required clean-C verify and all maintained corpus/registry runs pass; that green result is part of the evidence, not an override.

## Questions for the owner's selected route

1. What evidence establishes that an intended assertion itself failed, including callback/comparison getters, async rejection and helper failure construction? What inputs/API forms does that mechanism cover, and which must receive no automatic credit?
2. How are stop outcomes distinguished from accepted values across every caller boundary, and how does the closing mechanism observe forbidden bookkeeping/finalization as well as native reads? What bounded future-code claim is actually enforced?
3. Is C1 retained as per-converted-test preservation, or explicitly refined to permit cross-group replacements? If refined, what evidence proves the same interaction/obligation survives at its replacement site?
4. If work is split, who owns each crossing obligation and what combined gate keeps partial completion from releasing the current holds?

## Counterexamples to retain

- `probe-attribution-02.py`: four subject-owned AssertionError routes through assertion callbacks/getters and four harness TypeError routes. Passing, genuine assertion, direct subject and pure hook controls accompany them. Mixed-domain cases are observations, not the false-credit basis.
- `probe-stop-corpus.py`: a one-token boolean stop-sentinel substitution passes the static check and all 475 maintained value tests, but writes/freezes after the byte stop.
- `probe-stop-guard.py` and `probe-stop-forms.py`: null sentinel substitution, ignored nested function return, ignored helper-class return and an alias; a correct control; unmodified maintained checker/oracle plus a separate continuation trace.
- `probe-c1-group.py`: exact O-APPENDOWN-PUSH edit at B and C, direct ingress tests without the adapter. B reaches an explicit harness failure; C throws in the subject before it. Retain the report's nine downgrades, faithful stop-mutant analogues and the real replacement observations rather than erasing them.

All sources, commands and raw results are in this evidence directory and its manifest. After the owner decision, the next authorized build must address the mechanism and add every counterexample to maintained evidence, then undergo cumulative B..new-H review. This brief specifies no patch sequence, changes no candidate file, lifts no hold and releases no successor.
