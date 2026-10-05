# TOOLS-01 — owner decision: unbound-member limit and packet split

Recorded 2026-10-05 by Claude Code (`claude-opus-5-5`), design author of design 05, from the owner's
message in this conversation. The owner was shown three options for the 24 repeated-assertion
members of [continuation-stop-01](continuation-stop-01.md) and four scope options (A full scope,
B lazy prose, C B plus routing to correction owners, D packet split) for steps 10–11. Verbatim:

> Option 3 and D, draft owner choice 04.

Owner approval in this Codex implementer chat, verbatim: "yes". It changes the contract by the diff
below and proposes 007 text that the owner applies outside the TOOLS-01 candidate. No hold, credit
or acceptance follows from it; TOOLS-01 remains IN_PROGRESS.

## 1. The 24 unbound members: owner limit (option 3)

- P1-T is unchanged, including its anchor uniqueness rule.
- The 24 members in [unbound-members.json](continuation-stop-01/unbound-members.json) stay `refused`,
  unbound and visible. No test-source edit is authorized to make their assertions unique.
- Their four origins stay `pending_revalidation` under this limit and transfer to TOOLS-02:

  | Origin | File | Members in origin |
  |---|---|---:|
  | `artifact-73555fe668cc180905b1e49a` | `packages/kernel/tests/dispatch.test.ts` | 50 |
  | `artifact-9fd619f5375d598ebb2b88aa` | `tests/conformance/architecture/kernel-landing-zone.test.ts` | 189 |
  | `artifact-d2153e36d9c7464883ecea0b` | `tests/archive/evidence-records.test.ts` | 4 |
  | `artifact-ea5444a6d42154e413fe0f2e` | `packages/kernel/tests/values.test.ts` | 74 |

- Every other member of these origins is still bound or preserved in TOOLS-01 and reported, so the
  remaining work is exactly the 24.
- Options 1 (declaration-scoped anchor identity) and 2 (test-source edit) stay available to the owner
  in TOOLS-02. Neither is selected.

## 2. Packet split (option D)

TOOLS-01 ends with the maintained tooling, the revalidation of the earlier mappings, the held-claim
witnesses and the area gate. TOOLS-02 takes the remaining corpus extraction.

**TOOLS-01 keeps:**

- F1–F6.
- P1-R for the 154 `pending_revalidation` origins (116 suite, 8 case and 30 non-executable rows),
  except the four origins of §1. This includes the rest of step 8 and the repairs of TOOLS-CONT-04
  and TOOLS-CONT-05 under the existing contract.
- P1-T, P1-P and P1-H as they apply to those origins. Step 9 is reduced to the P1-H witnesses and
  register classification for V-D1, Proxy, re-prototyped built-ins and V-ENV. It converts no
  origin of design 05 §5.3.
- P1-C.
- From P1-X, the mechanism only: the area map, area assignment for every origin that is neither
  `complete` nor `triaged`, and the unconditional gate (§3).
- P2 for that scope.

**TOOLS-02 takes:**

- The 1,395 `pending` origins: 82 artifacts, one addition and 1,312 mentions. Among them are the
  26 family origins with their 415 members (P1-M), mention grouping (P1-G) and prose triage (P1-X).
- Sealed-log extraction. Owner choice 02's Q6 answer ("extract sealed logs in TOOLS-01") moves
  with it.
- The four origins of §1.

Design 05 §6 steps 10 and 11 (triage part) become TOOLS-02's. The steps left in TOOLS-01 are the
rest of 8, reduced 9, the gate part of 11, and 12.

## 3. The area gate covers every unclosed origin

Under the split, deferred origins are safe only if no packet can change their area while they
remain open.

- `verify` applies the gate to every packet, unconditionally, from the adoption manifest at C and
  the B..H changed paths. This includes TOOLS-01 and TOOLS-02 themselves.
- The gate fails while a touched area contains any of these:
  - an origin that is `pending` or `pending_revalidation`;
  - a `prose_pending` record.
- An origin limited by §1 counts as open.
- **Area assignment is mechanical and may over-include; under-inclusion is a defect.** An origin
  whose area cannot be derived maps to every area. The implementer states the derivation in a
  short design note before building it. That note is reviewed in the final independent review,
  not in a separate design check.
- **TOOLS-01 gets no exemption.** Open origins in areas TOOLS-01's own B..H touches are closed in
  TOOLS-01. If that would close more than 50 of the 1,395 `pending` origins, the implementer stops
  and reports the count, the areas and the derivation before closing any.
- **Consequence the owner accepts:** a later packet that touches an area with open origins must
  close them first. K1.1-correction-03 will close the design 05 §5.3 origins (86 in its named
  sources, 41 in K1.1-correction-02) that its changed paths touch. K1.3 and BINDING-01 will close
  the open origins in the areas they change.

## Contract diff

The implementer applies this diff to [contract.md](contract.md) and raises it to revision 4.
In the P1-X row, only the closing mechanism changes.

```diff
--- a/docs/development/work/TOOLS-01/contract.md
+++ b/docs/development/work/TOOLS-01/contract.md
@@ -1,2 +1,2 @@
-# TOOLS-01 contract — revision 3
+# TOOLS-01 contract — revision 4

@@ -11,2 +11,4 @@ separate profiles and are explicitly reported as not run. No inventory origin is
 [design 05](design-05.md), and in [design 04](design-04.md) where design 05 does not change them.
+[Owner choice 04](owner-choice-04.md) limits 24 members and splits the packet: the 1,395 `pending`
+origins and four limited origins move to TOOLS-02; P1 below applies to the scope it keeps.

@@ -20,3 +22,3 @@ separate profiles and are explicitly reported as not run. No inventory origin is
 | F6 | Document use, adoption format 2, corpus migration obligations, validation and an outside-repository handover; no new third-party material. | Source/link checks, tests, exact local commits and clean checkout at handover. No Layer-3 edits: no semantic rule changes. |
-| P1 | Reconcile every historical origin under P1-G to P1-C below; preserve the complete-decision oracle and its controls. | Each rule closes as stated. No origin, family member or revalidation stays pending; prose-only counterexamples may stay as tagged records only under P1-X. Held semantic defects stay attributed to their correction owners. Mandatory remainder after this build. |
+| P1 | Reconcile the 154 revalidation origins under P1-T, P1-P, P1-H, P1-R and P1-C, and build P1-X's area gate over every unclosed origin; preserve the complete-decision oracle and its controls. | Each kept rule closes as stated. No revalidation origin stays pending except the four limited by owner choice 04. The 1,395 `pending` origins and those four stay open, visible and gated for TOOLS-02. Held semantic defects stay attributed to their correction owners. |
 | P2 | Complete the per-packet verification composition and current-profile corpus integration, negative controls for its own oracles, cumulative self-review and independent acceptance. | Clean-C verification of the completed packet, exact C/H and independent review under 006. Mandatory remainder; research may inform integration choices but does not waive it. |
@@ -39,9 +41,9 @@ made only for that scope.
 | P1-M | Each mutation-runner family lists its members from a census recomputed over pinned bytes, or is marked `census: reading` and counted. Each member maps to a registered mutation with a qualifying named kill, an attributed witness, a reasoned no-longer-applicable disposition, an equivalence argument, or a non-equivalent survivor recorded as a finding for its owner or as an owner-recorded limit; otherwise it stays pending. | Census equality with the member list, with the runner's own count assertions and with any complete sealed run output; fresh control, applicability, reach and qualifying named failure for each kill. Distinct mutations, case/mutation pairs and family links are counted separately. Reading closures, equivalence arguments, survivor records and invalid runs never count as kills. |
-| P1-R | Revalidate all 116 suite and eight case mappings and recheck the 30 non-executable dispositions. No grandfathering. | Exact reconciliation against the revision-2 manifest at `0c1d57dd10612e54188c77a1697fd88c017badb3`, then the P1-T, P1-P, P1-H and P1-M checks. Unconverted rows stay `pending_revalidation`. |
-| P1-X | Every prose origin is triaged as no counterexample (with a reason), or as a non-empty set of links to members, records and `prose_pending` records. A `prose_pending` record keeps its input description, provenance and areas from a finite area map. | Triage completeness; the area map covers every path in the tree. `verify` applies the area gate to every packet unconditionally, from the adoption manifest at C and the B..H changed paths, and fails while a `prose_pending` record in a touched area remains. The owner records this entry check in 007. |
+| P1-R | Revalidate all 116 suite and eight case mappings and recheck the 30 non-executable dispositions. No grandfathering. | Exact reconciliation against the revision-2 manifest at `0c1d57dd10612e54188c77a1697fd88c017badb3`, then the P1-T, P1-P, P1-H and P1-M checks. Unconverted rows stay `pending_revalidation`; only the four origins of owner choice 04 may remain so at review-ready. |
+| P1-X | Every prose origin is triaged as no counterexample (with a reason), or as a non-empty set of links to members, records and `prose_pending` records. A `prose_pending` record keeps its input description, provenance and areas from a finite area map. | Under owner choice 04, TOOLS-01 builds the mechanism and TOOLS-02 completes the triage. The area map covers every path in the tree; every origin that is neither `complete` nor `triaged` has areas, derived mechanically, with every area when none can be derived. `verify` applies the area gate to every packet unconditionally, from the adoption manifest at C and the B..H changed paths, and fails while an open origin or a `prose_pending` record in a touched area remains. The owner records this entry check in 007. |
 | P1-C | Keep adoption separate from execution and independent acceptance; keep separately profiled commands and their not-run status under owner choice 01. | Negative summary, composition and gate controls for pending origins and members, missing targets, stale results, held or profiled credit and `prose_pending` records. |

-Foundation F1–F6 is an incremental delivery within TOOLS-01, not a new acceptance gate or a split
-that silently defers P1/P2. The full packet stays IN_PROGRESS. No semantic benchmark credit or
-hold release follows from tool verification. Human review still judges authorization, prose
-semantics, claim coverage and acceptance; a hash or allowlist cannot establish those judgments.
+Foundation F1–F6 is an incremental delivery within TOOLS-01, not a new acceptance gate. The split
+to TOOLS-02 is owner choice 04's, recorded and gated, not a silent deferral. No semantic benchmark
+credit or hold release follows from tool verification. Human review still judges authorization,
+prose semantics, claim coverage and acceptance; a hash or allowlist cannot establish those judgments.
```

## Proposed 007 text (owner applies, outside the TOOLS-01 candidate)

The TOOLS-01 contract forbids 007 edits by its implementer. The owner applies the following text,
or asks the design author to, on a separate branch. The gate entry check is added once the gate
exists, worded to match what was built (owner choice 02, Q5).

- **TOOLS-01 scope**, replacing "Complete corpus extraction and integration remain mandatory
  within this packet before review-ready; no held Kernel claim is changed.":
  > Under [owner choice 04](work/TOOLS-01/owner-choice-04.md), it revalidates the 154 earlier mappings,
  > builds the held-claim witnesses and the area gate over every unclosed origin, and leaves the
  > remaining corpus extraction to TOOLS-02. No held Kernel claim is changed.
- **New TOOLS-02 section**, after TOOLS-01:
  > ### TOOLS-02 — Remaining corpus extraction
  >
  > **Owner direction:** 2026-10-05, [owner choice 04](work/TOOLS-01/owner-choice-04.md).
  > **Dependencies:** TOOLS-01 accepted and integrated. **Scope:** the origins TOOLS-01 leaves open,
  > closed under its contract's P1 rules with its tooling: the 1,395 `pending` origins, including the
  > 26 families, mention triage and sealed-log extraction, and the four origins limited by owner
  > choice 04. Origins already closed by packets that touched their areas are not reopened.
  > **Acceptance:** P1/P2 for that scope, clean-C verification and independent exact-candidate review.
  > Not a dependency of K1.3, K1.1-correction-03 or BINDING-01; the area gate binds those instead.
- **K1.1-correction-03 dependencies**, adding: "TOOLS-01 accepted and integrated, so that its area
  gate binds this packet's changed paths (owner choice 04)."
- **Status table:** a `TOOLS-02 | PLANNED | Owner choice 04, 2026-10-05. Not released.` row.

## What it does not decide

- When TOOLS-02 is released, or whether it runs alongside K1.3.
- Anchor options 1 and 2 for the 24 members.
- BINDING-01's dependency, which stays "TOOLS-01 and K1.1-correction-03, both accepted and
  integrated".
- Any hold release, Kernel claim or successor release.

## Application of the 007 text (2026-10-05)

The owner then directed the design author to apply the 007 text in this branch instead of a
separate one. Verbatim: "Can't we do in the same branch?", then "let's first apply decision 4? seems
like we already make the decision? How to apply? Can you do for me?" Reason: the new 007 text links
to this record, which exists only on `codex/tools-01` until TOOLS-01 integrates.

The design author (Claude Code, `claude-opus-5-5`) applied the four items above exactly, in the
commit that adds this section, as part of the TOOLS-01 candidate. The gate entry check is still
added once the gate exists. The TOOLS-01 implementer makes no other 007 edit.
