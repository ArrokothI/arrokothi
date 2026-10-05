# TOOLS-01 — owner decision: area gate scope and the TOOLS-02 backstop

Recorded 2026-10-05 by Claude Code (`claude-opus-5-5`), design author of design 05 and author of
owner choice 04, from the owner's messages in this conversation. It answers
[gate-stop-01](gate-stop-01.md), which stopped item 5 under owner choice 04 §3's 50-origin rule.
The owner was shown gate-stop-01's three options. Option 1 closes the 824 in TOOLS-01; option 2
changes the gate rule; option 3 makes TOOLS-02 precede every packet. The owner was also shown a
recommended form of option 2. Verbatim:

> Draft owner choice 06 and the reply for Claude

Owner approval in the implementer chat, verbatim: "Owner answer to gate-stop-01: option 2, as written in
docs/development/work/TOOLS-01/owner-choice-06.md (drafted by the design author, uncommitted in the
working tree). I approve it as drafted." No hold, credit or acceptance follows from
it; TOOLS-01 remains IN_PROGRESS.

## Cause

The defect is in owner choice 04 §3's rule, not in its implementation. Two parts of the rule
produce the 824:

- **The fallback.** "An origin whose area cannot be derived maps to every area" gates 654 heading
  sections that name no path against every change. That makes TOOLS-02 a prerequisite of every
  packet, which contradicts the split.
- **Citations counted as subjects.** A section that names `007-work-packets.md` or `AGENTS.md` cites
  that file; editing it cannot regress the counterexample the section describes. Ledger and floor
  document edits account for 150 of the 824 (57 and 93).

Design 05 §5.4's samples bound what the gate protects. Only 11–13% of mentions are prose-only
counterexamples, about 110–220 of 1,312. The rest are not counterexamples, or are already covered by
an artifact or a maintained test.

## Decision (option 2)

This replaces owner choice 04 §3's rule where they differ. Everything else in owner choice 04
stands, including the 50-origin stop.

1. **Touched areas come from behaviour-bearing paths only.** A changed path under `docs/` or
   `mental-model/`, or a Markdown file at the repository root, touches no area. Every other changed
   path touches its area, as before. Administrative files therefore touch nothing.
2. **An origin that names nothing is not gated.** An open origin whose area derivation yields no name
   gets no area. It is reported as `ungated` in every gate and `verify` summary, with its count and
   list, and stays TOOLS-02's.
3. **TOOLS-01's own gate excludes the 44 transferred origins.** These are owner choice 04's four
   and owner choice 05's 40. Gating TOOLS-01 on origins the owner told it not to close is
   circular. They still gate every other packet whose areas they share.
4. **Backstop.** TOOLS-02 must be accepted and integrated before K1.4 is accepted. K1.4 closes the
   K1/E1 gate. No K1 closure is claimed while historical K1 evidence remains unreconciled. Until
   then, a regression of an ungated prose counterexample is found late, by TOOLS-02's runs at its
   own C, not lost.

## Measure before building

Before changing the gate, the implementer measures two counts, with rules 1–3 applied at the current
HEAD:

- **(a)** The `pending` origins TOOLS-01's own gate blocks. Owner choice 04's 50-origin stop
  applies unchanged. At 50 or fewer, TOOLS-01 closes them.
- **(b)** The open origins, `pending` and `pending_revalidation`, that a change to any path under
  `packages/kernel/` would block. K1.1-correction-03, BINDING-01 and K1.3 change that package, so
  this is the load they inherit.

If (b) exceeds 200, the implementer stops and reports (a), (b) and the largest contributing areas
before building. The owner then chooses between this blocking gate and an advisory gate. An advisory
gate lists open origins in touched areas but blocks nothing, and leaves enforcement to the backstop
alone. At 200 or fewer, the implementer builds rules 1–3 and continues.

## Contract diff (revision 5 to 6)

The implementer applies this diff to [contract.md](contract.md).

```diff
--- a/docs/development/work/TOOLS-01/contract.md
+++ b/docs/development/work/TOOLS-01/contract.md
@@ -1,2 +1,2 @@
-# TOOLS-01 contract — revision 5
+# TOOLS-01 contract — revision 6

@@ -14,2 +14,4 @@ origins and four limited origins move to TOOLS-02; P1 below applies to the scope
 [Owner choice 05](owner-choice-05.md) also transfers 40 revalidation origins that cannot close here.
+[Owner choice 06](owner-choice-06.md) limits the area gate to behaviour-bearing paths and placeable
+origins, and makes TOOLS-02 precede K1.4's acceptance.

@@ -23,3 +25,3 @@ origins and four limited origins move to TOOLS-02; P1 below applies to the scope
 | F6 | Document use, adoption format 2, corpus migration obligations, validation and an outside-repository handover; no new third-party material. | Source/link checks, tests, exact local commits and clean checkout at handover. No Layer-3 edits: no semantic rule changes. |
-| P1 | Reconcile the 154 revalidation origins under P1-T, P1-P, P1-H, P1-R and P1-C, and build P1-X's area gate over every unclosed origin; preserve the complete-decision oracle and its controls. | Each kept rule closes as stated. No revalidation origin stays pending except the four limited by owner choice 04 and the 40 transferred by owner choice 05. The 1,395 `pending` origins and those 44 stay open, visible and gated for TOOLS-02. Held semantic defects stay attributed to their correction owners. |
+| P1 | Reconcile the 154 revalidation origins under P1-T, P1-P, P1-H, P1-R and P1-C, and build P1-X's area gate over every unclosed origin; preserve the complete-decision oracle and its controls. | Each kept rule closes as stated. No revalidation origin stays pending except the four limited by owner choice 04 and the 40 transferred by owner choice 05. The 1,395 `pending` origins and those 44 stay open and visible for TOOLS-02, gated where owner choice 06 places them. Held semantic defects stay attributed to their correction owners. |
 | P2 | Complete the per-packet verification composition and current-profile corpus integration, negative controls for its own oracles, cumulative self-review and independent acceptance. | Clean-C verification of the completed packet, exact C/H and independent review under 006. Mandatory remainder; research may inform integration choices but does not waive it. |
@@ -43,3 +45,3 @@ made only for that scope.
 | P1-R | Revalidate all 116 suite and eight case mappings and recheck the 30 non-executable dispositions. No grandfathering. | Exact reconciliation against the revision-2 manifest at `0c1d57dd10612e54188c77a1697fd88c017badb3`, then the P1-T, P1-P, P1-H and P1-M checks. Unconverted rows stay `pending_revalidation`; only the four origins of owner choice 04 and the 40 of owner choice 05 may remain so at review-ready. |
-| P1-X | Every prose origin is triaged as no counterexample (with a reason), or as a non-empty set of links to members, records and `prose_pending` records. A `prose_pending` record keeps its input description, provenance and areas from a finite area map. | Under owner choice 04, TOOLS-01 builds the mechanism and TOOLS-02 completes the triage. The area map covers every path in the tree; every origin that is neither `complete` nor `triaged` has areas, derived mechanically, with every area when none can be derived. `verify` applies the area gate to every packet unconditionally, from the adoption manifest at C and the B..H changed paths, and fails while an open origin or a `prose_pending` record in a touched area remains. The owner records this entry check in 007. |
+| P1-X | Every prose origin is triaged as no counterexample (with a reason), or as a non-empty set of links to members, records and `prose_pending` records. A `prose_pending` record keeps its input description, provenance and areas from a finite area map. | Under owner choices 04 and 06, TOOLS-01 builds the mechanism and TOOLS-02 completes the triage. The area map covers every path in the tree; every origin that is neither `complete` nor `triaged` has areas derived mechanically, or none when its derivation yields no name; such an origin is reported as `ungated`, counted and listed. `verify` applies the area gate to every packet unconditionally, from the adoption manifest at C and the B..H changed paths outside `docs/`, `mental-model/` and root Markdown files, and fails while an open origin or a `prose_pending` record in a touched area remains. TOOLS-01's own gate excludes the 44 origins transferred by owner choices 04 and 05. TOOLS-02 is accepted before K1.4. The owner records this entry check in 007. |
 | P1-C | Keep adoption separate from execution and independent acceptance; keep separately profiled commands and their not-run status under owner choice 01. | Negative summary, composition and gate controls for pending origins and members, missing targets, stale results, held or profiled credit and `prose_pending` records. |
```

## 007 text (applied by the design author in this branch on approval, as for owner choice 04)

This includes owner choice 05's still-unapplied 007 text.

- **TOOLS-02 scope:** replace "and the four origins limited by owner choice 04" with "the four
  origins limited by owner choice 04, and the 40 revalidation origins transferred by
  [owner choice 05](work/TOOLS-01/owner-choice-05.md)".
- **TOOLS-02 section:** replace "Not a dependency of K1.3, K1.1-correction-03 or BINDING-01; the
  area gate binds those instead." with:
  > Not a dependency of K1.3, K1.1-correction-03 or BINDING-01; the area gate binds those for the
  > origins it can place ([owner choice 06](work/TOOLS-01/owner-choice-06.md)). It must be accepted
  > and integrated before K1.4 is accepted.
- **K1.4 dependencies:** "K1.3." becomes "K1.3, and TOOLS-02 accepted and integrated
  ([owner choice 06](work/TOOLS-01/owner-choice-06.md))."

The 007 gate entry check is still proposed at item 6, worded to match the gate as built under this
record.

## What it does not decide

- The choice between blocking and advisory if (b) exceeds 200.
- When TOOLS-02 is released.
- How TOOLS-02 closes the 654 ungated sections.
- Any change to the area map, the derivation of names, P1-T or any hold.
