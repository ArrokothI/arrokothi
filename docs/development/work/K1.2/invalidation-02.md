# K1.2 invalidation notice 02 — accepted correction H held; scope amendment

Owner-instructed administrative record, 2026-09-27 UTC. Written by the Claude Code session
(`claude-opus-5-5`) that produced [K1.2-correction-01 review 04](../K1.2-correction-01/review-04.md),
at the owner's explicit instruction. It is not a review, an implementation or an acceptance.

## What is invalidated

- **Candidate:** K1.2-correction-01 H `312f2584d14b0c168c2152c373a4f07d4a292d74` (payload C
  `6d9fbb3db4955ee2216fedf0d0b69c8e104367bf`, base `a20d278185eaffc7f8b7489345a3624231ff6e6d`,
  correction contract revision 3). Its cumulative tree contains all of K1.2 through H14 plus the
  correction.
- **Historical acceptance:** [review 03](../K1.2-correction-01/review-03.md) ACCEPT, recorded in
  administrative commit `9b496bfc388b0216d30b9483feda650055c6cdfc`. That record stays unchanged as
  the historical verdict for its exact H.
- **Later evidence:** [review 04](../K1.2-correction-01/review-04.md), the owner-requested second
  review of the same H, is CHANGES REQUIRED.
  - K12C1-R4-VALUE-COST-01 (P1; C3): refusing a value root costs several times the memory of
    accepting one at the limits, in violation of `values.md` V-D1. It is reachable before authority
    on the Outcome path.
  - K12C1-R4-EVID-01 (P2): DEC-4's exact retained coordinates are unpinned for unrenderable minted
    IDs.
- **Affected earlier claim:** K1.1-correction-02's V-D1 claim ("refusing a value costs no more time
  or memory than accepting a value at the limits"). Its read-count evidence stands, but issue
  allocation per refused position was never charged. The historical ACCEPT of H
  `719abbf9e55e7489b6255a08cbb9e97a1e960a5e` and its integration stay recorded unchanged. The claim
  is held for the invalid-position family until the correction below is accepted.

## Consequences under 006

- Integration of K1.2 (H14 plus this correction) stays **on hold**; [invalidation-01](invalidation-01.md)
  already holds it. No merge; no K1.3 or other successor release; administrative A `9b496bf` is not
  certified.
- K1.2-correction-01 returns to CHANGES_REQUESTED, and correction continues in the same released
  packet.

## Owner scope amendment (2026-09-27)

The owner chose to close the V-D1 finding inside K1.2-correction-01 rather than in a separate K1.1
packet:

- The next candidate's contract is **revision 4**. It brings the refusal cost of integrated K1.1
  in-process value capture (`packages/kernel/src/values.ts` and its K1.2 consumers) into scope, to
  close K12C1-R4-VALUE-COST-01. This supersedes revision 3's statement that `values.ts` is
  unchanged, for that purpose only.
- Everything else accepted about value capture stays binding unless separately authorized: exact
  accepted values, the four limits, single observation, the ambient-safety rules, the `values.md`
  semantics, and the K1.1/K1.1-correction-02 read-count guarantees.
- The amendment settles no new semantics. V-D1 is already the rule. Revision 4 records how its
  binding meets it.
- The packet's acceptance additionally requires both review-04 findings closed, and the
  K1.1-correction-02 guarantees re-established, on the cumulative corrected tree.
