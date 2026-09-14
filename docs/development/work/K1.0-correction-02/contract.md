# K1.0-correction-02 contract — collection identity in relation comparison

**Packet:** K1.0-correction-02, a bounded correction of the released packet
[K1.0](../K1.0/contract.md). **Parent milestone:** K1.
**Ledger row:** [007 K1.0-correction-02](../../007-work-packets.md#k10-correction-02--collection-identity-in-inventory-comparison).
**Administrative origin:** [handoff-01](handoff-01.md), created by owner-delegated final cleanup
under 006's invalidated-acceptance rule.
**Governing process baseline:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Base commit:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a` (K1.0's own base; correction closure is
reviewed over the cumulative base-to-H interval, not over the correction delta alone).
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Revision 1.**

## What this packet is, and what it is not

It corrects K1.0. It releases no successor, opens no new criterion and weakens none.

The acceptance criteria are **K1.0-C1 … K1.0-C9 exactly as
[K1.0's contract](../K1.0/contract.md#acceptance-criteria) states them**, at revision 19. This
packet adds no criterion of its own, so a reviewer judges it against the same nine obligations the
released packet is judged against, over the whole cumulative interval. Revision 19 records the
correction inside C4 because that is the criterion the defect violates; this file records the
scope, the authority and the identities that revision 19 must not be read as changing.

## Authority and preserved identities

The reopening is owner-delegated, recorded in
[K1.0-correction-01/cleanup-01](../K1.0-correction-01/cleanup-01.md), and is an instruction to
correct — not a reviewer finding and not a withdrawal of any historical acceptance. No unresolved
architecture decision is identified for this finding, so no blocker state applies.

| Identity | Value | Disposition |
|---|---|---|
| Original base | `c9a9ed7e6e538ab0542fc6a999426264abb6212a` | Unchanged; still exactly remote `main` |
| K1.0's own accepted H | `f3aa29d7ecba2a23aa85788b7efdebdd383cab24` | ACCEPT preserved ([review-17](../K1.0/review-17.md)); C4 claims and integration held |
| Correction-01's accepted H | `1295c68b03ae5d8eb0bbb86e974353402ff9a518` | ACCEPT preserved; C4 claims and integration held |
| Its clean payload C | `36460438e95e968beec0b354b07a616b53981256` | Preserved |
| Acceptance record A | `41728edfc3cfc5c745e4293c511a740942f7b631` | [review-02](../K1.0-correction-01/review-02.md), preserved byte-unchanged |
| Cleanup, invalidation and hold | `968d74605cd34b30541bfd868b30bb1d0868cc41` | The pinned head this correction starts from; preserved |
| K1.0 contract at the reopening | revision 18 | Superseded in place by revision 19, as every prior correction round did |

Review records 14 through 17, K1.0's cleanup-01, and correction-01's review-01, review-02 and
cleanup-01 are immutable and are not edited. Superseded sentences stay in K1.0's contract marked as
superseded rather than rewritten, and revision 19 is added the same way. The historical ACCEPT of
correction-01 at H and its subsequent invalidation notice both stand: this packet is the corrective
packet that notice required, not a re-litigation of it.

The existing K1.0 release and its one owner amendment — the unaccepted, already-built E1 fixture
preparation recorded in
[K1.0's release provenance](../K1.0/contract.md#release-provenance-and-the-e1-dependency-decision) —
still apply unchanged. No E1 result is claimed.

## Scope

**In scope.** K10-CORR1-CLEANUP-01: the equality that decides whether an asserted collection agrees
with the enforced one, and every consumer of that equality across all four keyed inventory tables —
the Zones roots, the Export subpaths, and the two cross-boundary dependency columns that compared
outside the oracle. The representations a decoded relation passes through on the way to that
comparison, and the diagnostic that reports the result. Any defect of the same family found while
reconstructing that path, recorded with its own self-found provenance. The evidence guard's work
roots, widened to cover this packet's own validation directory.

**Out of scope.** Any change to Kernel or Execution semantics, to legacy production, provider, SDK
or example code, to the frozen `tests/conformance/k0` fixture, to benchmark preparation, or to the
released packet's criteria. The ownership inventory document itself is unchanged: the document is
correct and the oracle that checked it was not. No E1 claim, no K1 closure, no successor.

## Required correction

Derived from K1.0-C4's own obligation — that agreement is checked *per row relation*, in both
directions, against the executable policy and the actual manifests — not from a list of reported
strings:

1. **Two collections agree only when they are the same collection.** Same cardinality, same
   members. No rendering of a collection may stand in for the collection in a comparison, because
   rendering is not injective and a collision in it is a false agreement about the relation.
2. **The invariant holds in both directions.** The documented side can lose members by merging them
   and the enforced side can lose them by being split; neither may be reachable. A rule about which
   bytes a member may contain is not this invariant and does not establish it.
3. **One comparison serves every collection-valued relation.** Zones, Export and both dependency
   columns compare through the same rule, so no table keeps a weaker hand-written loop of its own,
   and nothing between the decoded cell and that rule may change a relation's shape — no set, no
   joined string, no other lossy representation.
4. **The diagnostic preserves what the comparison saw.** A message that cannot distinguish a
   two-member collection from the one-member collection holding their joined text carries the same
   defect into the place the result is read.
5. **Reordering stays a permitted spelling, and every earlier obligation is preserved.** The
   permitted padding twins, the whole-cell decoders, the schema/arity ownership, the
   structural/duplicate/scanner controls and every closed reviewer finding are re-asserted, not
   relaxed. The Deferred scalar tuple is audited and left unchanged.

## Evidence and closure

006/008 lifecycle: a new clean payload C, final validation run against the committed C, an 008
report, immutable raw evidence with recorded digests, and an administrative H over that C. The
implementer marks review-ready and never self-certifies. Closure requires a **fresh, separate
independent review of the cumulative interval from the original base to the new H**; a prior PASS
on an earlier candidate exempts no dependency. Integration and any dependent release stay held
until that review returns ACCEPT and the owner acts on it.

- Report: `implementation-01.md` in this directory.
- Raw evidence: `validation-01/` in this directory, covered by the same mechanical digest guard as
  K1.0's own rounds and correction-01's (`tests/conformance/architecture/evidence-records.test.ts`).

Both are administrative records that belong to the candidate H rather than to the clean payload C,
so they are named here rather than linked: at C they do not yet exist, and a contract that linked
them would be wrong about its own tree.

## Limits

`npm run test:evals` is not run: the correction is confined to the C4 evidence oracle and its
controls and reaches no Agent or model-facing behaviour. No E1 result is claimed or implied. This
packet is accepted by nobody. `next_release: none`.
