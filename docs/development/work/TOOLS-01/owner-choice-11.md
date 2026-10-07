# TOOLS-01 — owner decision: three transfers and one listed limited member

Recorded 2026-10-07 by Claude Code (`claude-opus-5-5`), the TOOLS-01 implementer, at the owner's
instruction. It answers the implementer's stop report of the same day, made while building
[owner choice 10](owner-choice-10.md) §2's coarse rule ([design 06](design-06.md) revision 5). It
binds at the commit that adds it. No hold, credit or acceptance follows from it; TOOLS-01 remains
IN_PROGRESS.

## The stop report

The implementer measured the coarse rule in a scratch build at `b7598918` before changing any state:

| Figure | H `7f3a2af4` | Revision 4 prototype | Coarse rule |
|---|---|---|---|
| Census: preserved / held / superseded / refused | 713 / 183 / 74 / 302 | 616 / 314 / 74 / 268 | 49 / 1,095 / 74 / 54 |
| Register / rule-1 entries | 305 / 188 | 393 / 295 | 950 / 853 |
| Target rows | 383 | 315 | 52 |

The implementer then stopped under owner choice 08 §2.5, for two reasons:
- **Three closed origins would lose every route.** Each has one refused member whose only target's
  leaf is now rule-1 held:
  - `artifact-ecb10ef937e0612352e7c7ef` (`ingress.test.ts:381:3`) and
    `artifact-b21077d3d4d8265db9b7c7ab` (`refusals.test.ts:47:3`): their helper `accepted()`
    constructs `new Error(...)` at `harness.ts:548`;
  - `artifact-ee81a9215a4b627e88fda2d5` (`unsupported.test.ts:45:3`): `Object.keys(surface)`.
- **C2-LIMIT could not admit one member.** `kernel-landing-zone.test.ts:1200:9@deedd7950724` becomes
  unbound. Its template title in two nested loops maps through four targets, so C2-LIMIT's
  single-target admission refuses it.

## Owner answers, verbatim

> Owner answers to the coarse-rule stop (2026-10-07):
> 1. Option (a): transfer the three origins artifact-ecb10ef937e0612352e7c7ef,
>    artifact-b21077d3d4d8265db9b7c7ab and artifact-ee81a9215a4b627e88fda2d5 to TOOLS-02 by an owner
>    list, as owner choice 05 did. No new closure route; 107 of 110 stay closed.
> 2. Option (b): list kernel-landing-zone.test.ts:1200:9@deedd7950724 explicitly as an extra limited
>    member. The C2-LIMIT admission rule is unchanged.
> 3. Record the kernel-landing-zone.test.ts:1200:9 listing as an open item for TOOLS-02: when TOOLS-02
>    closes the four limited origins, it binds this member normally or designs multi-leaf target
>    admission if more such members exist by then.
> Record these as owner-choice-11.md, quoting this message verbatim and citing your stop report and the
> coarse-rule figures. Attach pinned JSON lists for the three origins and the one member, in the
> format R1-03's check reads. Embed a contract diff (revision 10 → 11) with real hunk headers that
> updates P1 and P1-R's "4 and 40" exceptions to include owner choice 11's three. Apply it, run the
> suite and refusal registry, commit and push. Then build the coarse rule as instructed, with the
> structural trace and regression corpus, regenerate, and continue to C, verify and H. In H's report,
> propose the 007 TOOLS-02 scope sentence for owner choice 11's three origins alongside the status row.

## Lists

These lists use the format R1-03's check reads: one item per origin, each with `origin`.
- [owner-choice-11/transferred-origins.json](owner-choice-11/transferred-origins.json) names the three
  origins, with provenance and cause. SHA-256 `2ef864e600b2bdc308f6b35201ab479154b1d37e4d6405f1c7f6ac4d32a88ebc`.
- [owner-choice-11/limited-members.json](owner-choice-11/limited-members.json) names the one listed
  extra limited member, its origin and its four targets. SHA-256
  `4189783be683c9fafb70886f2ef6f88d7426d8a7e9613babc488716303f0446d`.

**Open item for TOOLS-02:** when TOOLS-02 closes the four limited origins, it binds
`kernel-landing-zone.test.ts:1200:9@deedd7950724` normally, or designs multi-leaf target admission if
more such members exist by then.

## Contract diff (revision 10 to 11)

The implementer applies this diff to [contract.md](contract.md). It applies with `git apply` and
yields revision 11 (SHA-256 `fc0453fe93392d8721b41cf29a0b203650f1ba2d2f9bd2bc9ae2069a1cf5ebe3`).

```diff
--- a/docs/development/work/TOOLS-01/contract.md
+++ b/docs/development/work/TOOLS-01/contract.md
@@ -1,2 +1,2 @@
-# TOOLS-01 contract — revision 10
+# TOOLS-01 contract — revision 11

@@ -30,3 +30,3 @@ credits a member only when every intrinsic reference in its run set sits in a li
 | F6 | Document use, adoption format 2, corpus migration obligations, validation and an outside-repository handover; no new third-party material. | Source/link checks, tests, exact local commits and clean checkout at handover. No Layer-3 edits: no semantic rule changes. |
-| P1 | Reconcile the 154 revalidation origins under P1-T, P1-P, P1-H, P1-R and P1-C, and build P1-X's area gate over every unclosed origin; preserve the complete-decision oracle and its controls. | Each kept rule closes as stated. No revalidation origin stays pending except the four limited by owner choice 04 and the 40 transferred by owner choice 05. The 1,395 `pending` origins and those 44 stay open and visible for TOOLS-02, reported by the advisory gate where owner choice 06 places them. Held semantic defects stay attributed to their correction owners. |
+| P1 | Reconcile the 154 revalidation origins under P1-T, P1-P, P1-H, P1-R and P1-C, and build P1-X's area gate over every unclosed origin; preserve the complete-decision oracle and its controls. | Each kept rule closes as stated. No revalidation origin stays pending except the four limited by owner choice 04, the 40 transferred by owner choice 05 and the three transferred by owner choice 11. The 1,395 `pending` origins and those 47 stay open and visible for TOOLS-02, reported by the advisory gate where owner choice 06 places them. Held semantic defects stay attributed to their correction owners. |
 | P2 | Complete the per-packet verification composition and current-profile corpus integration, negative controls for its own oracles, cumulative self-review and independent acceptance. | Clean-C verification of the completed packet, exact C/H and independent review under 006. Mandatory remainder; research may inform integration choices but does not waive it. |
@@ -49,3 +49,3 @@ made only for that scope.
 | P1-M | Each mutation-runner family lists its members from a census recomputed over pinned bytes, or is marked `census: reading` and counted. Each member maps to a registered mutation with a qualifying named kill, an attributed witness, a reasoned no-longer-applicable disposition, an equivalence argument, or a non-equivalent survivor recorded as a finding for its owner or as an owner-recorded limit; otherwise it stays pending. | Census equality with the member list, with the runner's own count assertions and with any complete sealed run output; fresh control, applicability, reach and qualifying named failure for each kill. Distinct mutations, case/mutation pairs and family links are counted separately. Reading closures, equivalence arguments, survivor records and invalid runs never count as kills. |
-| P1-R | Revalidate all 116 suite and eight case mappings and recheck the 30 non-executable dispositions. No grandfathering. | Exact reconciliation against the revision-2 manifest at `0c1d57dd10612e54188c77a1697fd88c017badb3`, then the P1-T, P1-P, P1-H and P1-M checks. Unconverted rows stay `pending_revalidation`; only the four origins of owner choice 04 and the 40 of owner choice 05 may remain so at review-ready. |
+| P1-R | Revalidate all 116 suite and eight case mappings and recheck the 30 non-executable dispositions. No grandfathering. | Exact reconciliation against the revision-2 manifest at `0c1d57dd10612e54188c77a1697fd88c017badb3`, then the P1-T, P1-P, P1-H and P1-M checks. Unconverted rows stay `pending_revalidation`; only the four origins of owner choice 04, the 40 of owner choice 05 and the three of owner choice 11 may remain so at review-ready. |
 | P1-X | Every prose origin is triaged as no counterexample (with a reason), or as a non-empty set of links to members, records and `prose_pending` records. A `prose_pending` record keeps its input description, provenance and areas from a finite area map. | Under owner choices 04 and 06, TOOLS-01 builds the mechanism and TOOLS-02 completes the triage. The area map covers every path in the tree; every origin that is neither `complete` nor `triaged` has areas derived mechanically, or none when its derivation yields no name; such an origin is reported as `ungated`, counted and listed. `verify` runs the area gate for every packet unconditionally, from the adoption manifest at C and the B..H changed paths outside `docs/`, `mental-model/` and root Markdown files. Under owner choice 07 it is advisory: it never fails `verify`, and it lists the open origins and `prose_pending` records in each touched area with counts, and the `ungated` count. TOOLS-02 is accepted before K1.4. The owner records this entry check in 007. |
```

## What it does not decide

- Any other hold, transfer or closure route; P1-T; owner choice 09's target-set rule; owner choice
  10's coarse rule.
- C2-LIMIT's admission rule for other extras, which is unchanged.
- BINDING-01's per-test classification.
- Acceptance, or the release of any successor.
