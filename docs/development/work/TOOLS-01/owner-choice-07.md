# TOOLS-01 — owner decision: the area gate reports and does not block

Recorded 2026-10-05 by Claude Code (`claude-opus-5-5`), design author of design 05 and author of
owner choices 04 and 06. It answers [gate-stop-02](gate-stop-02.md), which measured owner choice 06's
rules before building them. (a) was 64 against a limit of 50. (b) was 324 against a limit of 200.
Owner choice 06 leaves the choice between a blocking and an advisory gate to the owner in that case.

Owner approval in the implementer chat, verbatim: "Owner answer to gate-stop-02: advisory gate, as written in
docs/development/work/TOOLS-01/owner-choice-07.md (drafted by the design author, uncommitted in the
working tree). I approve it as drafted." No hold, credit or acceptance follows from
it; TOOLS-01 remains IN_PROGRESS.

## Why advisory

- **A blocking gate cannot make the next packets lazy.** K1.1-correction-03, BINDING-01, K1.3 and
  COORD-REFACTOR-01 all change `packages/kernel/`. A change there blocks 324 open origins.
  Per-file areas do not help: `coordinator.ts` alone blocks 144 and `values.ts` 114. Blocking would
  make most of TOOLS-02 a prerequisite of the next Kernel packet. That is the cost the split was
  meant to defer.
- **Blocking measures citations, not subjects.** Area derivation is lexical. 100 of the 324 name
  only kernel directories or absent files. 43 of (a)'s 64 enter only through `package.json` because
  they cite it, as the excluded sections cite 007.
- **The backstop is the enforcement.** Owner choice 06 rule 4 stands: TOOLS-02 must be accepted
  and integrated before K1.4 is accepted. Until then, a regression of an unconverted historical
  counterexample is found late, by TOOLS-02's runs at its own C, not lost. Design 05 §5.4 bounds
  the prose-only counterexamples at about 110–220 of 1,312 mentions.

## Decision

This replaces owner choice 06 rules 1–3, its measure-and-stop step, and owner choice 04 §3's
blocking and closing obligations where they differ.

1. **The gate is advisory for every packet, TOOLS-01 included.** `verify` always runs it, and no
   spec can disable it. It never fails `verify`, and it never requires a packet to close an origin.
2. **What it reports.** For the packet's B..H, `verify`'s summary lists:
   - the open origins (`pending` and `pending_revalidation`) and `prose_pending` records in each
     touched area, with counts;
   - the `ungated` origins, as a count only.

   Touched areas follow owner choice 06 rule 1: changes under `docs/` and `mental-model/`, and root
   Markdown files, touch nothing. Origins follow rule 2: an origin whose derivation yields no name has
   no area and is `ungated`.
3. **What a packet does with it.** The packet's 008 report quotes the summary's counts by area. No
   triage is required. A reviewer may cite a listed origin as a lead.
4. **TOOLS-01 closes no origin for the gate.** Owner choice 04's 50-origin stop and owner choice 06
   rule 3 no longer apply, since nothing blocks.
5. **Unchanged:** the area map, the derivation of names, the K1.4 backstop, and owner choices 04
   and 05's scope.

## Contract diff (revision 6 to 7)

The implementer applies this diff to [contract.md](contract.md).

```diff
--- a/docs/development/work/TOOLS-01/contract.md
+++ b/docs/development/work/TOOLS-01/contract.md
@@ -1,2 +1,2 @@
-# TOOLS-01 contract — revision 6
+# TOOLS-01 contract — revision 7

@@ -15,3 +15,4 @@ origins and four limited origins move to TOOLS-02; P1 below applies to the scope
 [Owner choice 06](owner-choice-06.md) limits the area gate to behaviour-bearing paths and placeable
-origins, and makes TOOLS-02 precede K1.4's acceptance.
+origins, and makes TOOLS-02 precede K1.4's acceptance. [Owner choice 07](owner-choice-07.md) makes
+the gate advisory for every packet.

@@ -25,3 +26,3 @@ origins, and makes TOOLS-02 precede K1.4's acceptance.
 | F6 | Document use, adoption format 2, corpus migration obligations, validation and an outside-repository handover; no new third-party material. | Source/link checks, tests, exact local commits and clean checkout at handover. No Layer-3 edits: no semantic rule changes. |
-| P1 | Reconcile the 154 revalidation origins under P1-T, P1-P, P1-H, P1-R and P1-C, and build P1-X's area gate over every unclosed origin; preserve the complete-decision oracle and its controls. | Each kept rule closes as stated. No revalidation origin stays pending except the four limited by owner choice 04 and the 40 transferred by owner choice 05. The 1,395 `pending` origins and those 44 stay open and visible for TOOLS-02, gated where owner choice 06 places them. Held semantic defects stay attributed to their correction owners. |
+| P1 | Reconcile the 154 revalidation origins under P1-T, P1-P, P1-H, P1-R and P1-C, and build P1-X's area gate over every unclosed origin; preserve the complete-decision oracle and its controls. | Each kept rule closes as stated. No revalidation origin stays pending except the four limited by owner choice 04 and the 40 transferred by owner choice 05. The 1,395 `pending` origins and those 44 stay open and visible for TOOLS-02, reported by the advisory gate where owner choice 06 places them. Held semantic defects stay attributed to their correction owners. |
 | P2 | Complete the per-packet verification composition and current-profile corpus integration, negative controls for its own oracles, cumulative self-review and independent acceptance. | Clean-C verification of the completed packet, exact C/H and independent review under 006. Mandatory remainder; research may inform integration choices but does not waive it. |
@@ -45,3 +46,3 @@ made only for that scope.
 | P1-R | Revalidate all 116 suite and eight case mappings and recheck the 30 non-executable dispositions. No grandfathering. | Exact reconciliation against the revision-2 manifest at `0c1d57dd10612e54188c77a1697fd88c017badb3`, then the P1-T, P1-P, P1-H and P1-M checks. Unconverted rows stay `pending_revalidation`; only the four origins of owner choice 04 and the 40 of owner choice 05 may remain so at review-ready. |
-| P1-X | Every prose origin is triaged as no counterexample (with a reason), or as a non-empty set of links to members, records and `prose_pending` records. A `prose_pending` record keeps its input description, provenance and areas from a finite area map. | Under owner choices 04 and 06, TOOLS-01 builds the mechanism and TOOLS-02 completes the triage. The area map covers every path in the tree; every origin that is neither `complete` nor `triaged` has areas derived mechanically, or none when its derivation yields no name; such an origin is reported as `ungated`, counted and listed. `verify` applies the area gate to every packet unconditionally, from the adoption manifest at C and the B..H changed paths outside `docs/`, `mental-model/` and root Markdown files, and fails while an open origin or a `prose_pending` record in a touched area remains. TOOLS-01's own gate excludes the 44 origins transferred by owner choices 04 and 05. TOOLS-02 is accepted before K1.4. The owner records this entry check in 007. |
+| P1-X | Every prose origin is triaged as no counterexample (with a reason), or as a non-empty set of links to members, records and `prose_pending` records. A `prose_pending` record keeps its input description, provenance and areas from a finite area map. | Under owner choices 04 and 06, TOOLS-01 builds the mechanism and TOOLS-02 completes the triage. The area map covers every path in the tree; every origin that is neither `complete` nor `triaged` has areas derived mechanically, or none when its derivation yields no name; such an origin is reported as `ungated`, counted and listed. `verify` runs the area gate for every packet unconditionally, from the adoption manifest at C and the B..H changed paths outside `docs/`, `mental-model/` and root Markdown files. Under owner choice 07 it is advisory: it never fails `verify`, and it lists the open origins and `prose_pending` records in each touched area with counts, and the `ungated` count. TOOLS-02 is accepted before K1.4. The owner records this entry check in 007. |
 | P1-C | Keep adoption separate from execution and independent acceptance; keep separately profiled commands and their not-run status under owner choice 01. | Negative summary, composition and gate controls for pending origins and members, missing targets, stale results, held or profiled credit and `prose_pending` records. |
```

## 007 text (applied by the design author in this branch on approval)

This replaces owner choice 06's 007 text, which was not applied, and includes owner choice 05's.

- **TOOLS-02 scope:** replace "and the four origins limited by owner choice 04" with "the four
  origins limited by owner choice 04, and the 40 revalidation origins transferred by
  [owner choice 05](work/TOOLS-01/owner-choice-05.md)".
- **TOOLS-02 section:** replace "Not a dependency of K1.3, K1.1-correction-03 or BINDING-01; the
  area gate binds those instead." with:
  > Not a dependency of K1.3, K1.1-correction-03 or BINDING-01. Their `verify` summaries list the
  > open origins in the areas they touch, as an advisory report
  > ([owner choice 07](work/TOOLS-01/owner-choice-07.md)). TOOLS-02 must be accepted and integrated
  > before K1.4 is accepted ([owner choice 06](work/TOOLS-01/owner-choice-06.md)).
- **K1.1-correction-03 dependencies:** replace "so that its area gate binds this packet's changed
  paths" with "so that its registry and area report are available".
- **K1.4 dependencies:** "K1.3." becomes "K1.3, and TOOLS-02 accepted and integrated
  ([owner choice 06](work/TOOLS-01/owner-choice-06.md))."

The 007 entry check proposed at item 6 is reworded to match: every packet's report quotes the
gate's counts.

## What it does not decide

- When TOOLS-02 is released.
- How TOOLS-02 closes the open origins.
- Any change to P1-T, the area map, the derivation or any hold.
