# K1.0-correction-01 contract — whole-cell inventory fidelity

**Packet:** K1.0-correction-01, a bounded correction of the released packet
[K1.0](../K1.0/contract.md). **Parent milestone:** K1.
**Ledger row:** [007 K1.0-correction-01](../../007-work-packets.md#k10-correction-01--whole-cell-inventory-fidelity).
**Administrative origin:** [handoff-01](handoff-01.md), created by owner-delegated final cleanup
under 006's invalidated-acceptance rule.
**Governing process baseline:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Base commit:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a` (K1.0's own base; correction closure is
reviewed over the cumulative base-to-H interval, not over the correction delta alone).
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Revision 2.**

**Revision 2 changes (same corrective packet, no new criterion).** Round 1 (payload C
`76ce938074ffa910fbd74374e388ba8d226af4c6`, candidate H
`61133e9c8fd6fc80c6995fd26495e11e9f7f2e57`) closed K10-CLEANUP-01's four decoder defects but left
the same silent-discard invariant open one structural level up: independent review
([review-01](review-01.md), CHANGES REQUIRED) found **K10-CORR1-R1-01** — SELF-29 measured excess
cells against the document's mutable header and checked only the header's first cell, so a widened
header and delimiter could authorize an unread body cell. Round 2 reconstructs the table-schema
ownership layer instead: every governed table states an independent schema (`RowSpec.expectedHeader`
plus the declared trailing ungoverned-prose width), header validity and body arity are each checked
against that schema rather than against each other, every body cell is owned either by a governed
decoder or by an explicitly declared ungoverned prose position, and the short-row exception for an
absent trailing prose cell cannot widen the schema. K10-CLEANUP-01's four decoder cases stay closed
and its whole-cell rule is unchanged; the revision-17 prose it relied on is superseded in place by
K1.0 contract revision 18. All identities, holds and limits below are otherwise unchanged.

## What this packet is, and what it is not

It corrects K1.0. It releases no successor, opens no new criterion and weakens none.

The acceptance criteria are **K1.0-C1 … K1.0-C9 exactly as
[K1.0's contract](../K1.0/contract.md#acceptance-criteria) states them**, at revision 17. This
packet adds no criterion of its own, so a reviewer judges it against the same nine obligations the
released packet is judged against, over the whole cumulative interval. Revision 17 records the
correction inside C4 because that is the criterion the defect violates; this file records the scope,
the authority and the identities that revision 17 must not be read as changing.

## Authority and preserved identities

The reopening is owner-delegated, recorded in [cleanup-01](../K1.0/cleanup-01.md), and is an
instruction to correct — not a reviewer finding and not a withdrawal of the historical acceptance.

| Identity | Value | Disposition |
|---|---|---|
| Original base | `c9a9ed7e6e538ab0542fc6a999426264abb6212a` | Unchanged; still exactly remote `main` |
| Historically accepted H | `f3aa29d7ecba2a23aa85788b7efdebdd383cab24` | ACCEPT preserved; C4 claims and integration held |
| Its clean payload C | `d693d59aefe5335c8950d57cec6d6b57e375cadc` | Preserved |
| Acceptance record A | `36595f57d1f8cec8c4bf8a6293e888ca27750fab` | [review-17](../K1.0/review-17.md), preserved byte-unchanged |
| Cleanup and hold | `b8e394dd2a58b839b131943f4ca9b250abff94af` | The pinned head this correction starts from; preserved |
| K1.0 contract at cleanup time | revision 16, SHA-256 `ba4096effcfd70cb87d5c39bc2ad84294d434c520f2bc0ad1df609bf1bdc3e8f` | The digest [cleanup-01](../K1.0/cleanup-01.md) inspected; re-pinned here because revision 17 supersedes it in place, as every prior correction round did |

Review records 14, 15, 16 and 17 are immutable and are not edited. Revision 16's superseded
sentences stay in K1.0's contract marked as superseded rather than rewritten, and revision 17 is
added the same way.

## Scope

**In scope.** K10-CLEANUP-01: the value decoders that turn a governed table cell into a compared
value, across all four keyed inventory tables, and the downstream relation checks that consume them.
Any defect of the same family found while reconstructing that path, recorded with its own self-found
provenance.

**Out of scope.** Any change to Kernel or Execution semantics, to legacy production, provider, SDK
or example code, to the frozen `tests/conformance/k0` fixture, to benchmark preparation, or to the
released packet's criteria. No E1 claim, no K1 closure, no successor.

## Required correction

Derived from K1.0-C4's own obligations — total parsing, malformed-row rejection, and comparison of
the measured file-count / workspace / third-party relations — not from a list of reported strings:

1. **Every asserted value is preserved or rejected.** A governed cell is decoded whole or its row is
   unreadable. No decoder may read a prefix, a substring or a subset of a cell and discard the rest.
2. **The valid and the contradictory forms are derived, not enumerated.** The permitted spellings
   come from the document's own vocabulary; everything outside it is reported, including spellings
   nobody has written down.
3. **The rule is traced through all four tables** and their comparison consumers, and the adjacent
   whole-cell decoders are audited whether or not they had to change.
4. **Positive formatting controls and earlier regressions are preserved**: the permitted padding
   twins, the structural/duplicate/scanner controls, and every closed reviewer finding.
5. **Round 2: no document-controlled width is trusted (K10-CORR1-R1-01).** Every governed table has
   an independent schema, not an arity inferred from the candidate document. Header
   validity and schema arity are checked independently of body data: a header cannot authorize new
   unread columns merely by adding cells, and a broken header cannot turn schema-correct bodies
   into excess. Every body cell is owned either by a governed decoder or by an explicitly declared
   ungoverned prose position; anything else is reported. The deliberately ungoverned trailing prose
   cell may be absent where the contract permits that short form, without permitting arbitrary
   schema widening. Zones, Dependency, Export and Deferred are audited under the same rule, every
   header cell is decided as schema rather than only the first label, and the round-1 whole-cell
   decoders are kept unchanged.

## Evidence and closure

006/008 lifecycle: a new clean payload C, final validation run against the committed C, an 008
report, immutable raw evidence with recorded digests, and an administrative H over that C. The
implementer marks review-ready and never self-certifies. Closure requires a **fresh, separate
independent review of the cumulative interval from the original base to the new H**; a prior PASS on
an earlier candidate exempts no dependency. Integration and any dependent release stay held until
that review returns ACCEPT and the owner acts on it.

- Report: `implementation-01.md` (round 1, now CHANGES REQUIRED under [review-01](review-01.md))
  and `implementation-02.md` (round 2) in this directory.
- Raw evidence: `validation-01/` (round 1) and `validation-02/` (round 2) in this directory, covered
  by the same mechanical digest guard as K1.0's own rounds (`tests/conformance/architecture/evidence-records.test.ts`).

Both are administrative records that belong to the candidate H rather than to the clean payload C,
so they are named here rather than linked: at C they do not yet exist, and a contract that linked
them would be wrong about its own tree.

## Limits

`npm run test:evals` is not run: the correction is confined to the C4 evidence parser and its
controls and reaches no Agent or model-facing behaviour. No E1 result is claimed or implied. This
packet is accepted by nobody. `next_release: none`.
