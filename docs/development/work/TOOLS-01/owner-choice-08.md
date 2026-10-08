# TOOLS-01 — owner decision: correction route after reviews 01 and 02

Recorded 2026-10-05 by Claude Code (`claude-opus-5-5`), design author of design 05 and author of owner
choices 04, 06 and 07. It records the owner's answers after both independent reviews of H
`446dd25820500db4e0eb3d6940ec49e45634f39c` returned CHANGES REQUIRED:

- [review 01](review-01.md) (GPT-6, soundness): R1-01 to R1-04, and stop-and-redesign applies;
- [review 02](review-02.md) (Claude, fidelity): TOOLS01-R2-VENV-01 (P2), and three P3 items. It says
  the rule does not fire.

The design author analysed both reviews and recommended three choices. The owner's answer, verbatim:

> OK, I agree stop and redesign, and take option b for conservative and recorded, and push H now. I
> want a new claude session to be implementor.

This text transcribes those answers; the design author wrote it. It binds at the commit that adds
it, as review 02's TOOLS01-R2-REC-02 asks. No hold, credit or acceptance follows from it; TOOLS-01
remains IN_PROGRESS.

## 1. Stop and redesign, by a correction design note

- 006's stop-and-redesign rule is honoured for this round. The reviews disagree on whether it fires;
  the owner chooses to apply it.
- **The common mechanism** (review 01's root-cause note): the tool treats a check's non-recognition
  as permission for positive credit.
- **The principle for the correction:** a positive result needs evidence the tool positively
  recognized. Anything unrecognized, uncertain or unparsed earns no credit. It refuses, or it stays
  open and visible.
- Before any code, the implementer writes `design-06.md`, at most two pages. It applies the principle
  to each finding below and answers review 01's design questions for that finding. The owner sends
  it to the review-01 reviewer (GPT-6) for a design check. Code starts after that check approves.
  There is no separate full redesign round.
- **The findings, and the direction each fix takes.** The design note decides the mechanism.

  | Finding | Direction |
  |---|---|
  | R1-01 | Widen the V-ENV recipe. It must catch writes to built-in intrinsics through TypeScript casts, ordinary aliases, imported helpers and generated source (review 01's probe variants). Matches are held under §2. |
  | R1-02 | One fence parser, shared by the inventory and the minimum-context reader. A fence or section it cannot parse with certainty grants no closure. |
  | R1-03 | A transferred or limited origin must be listed by its cited decision, in that decision's machine-readable list. The implementer may attach a JSON list to owner choice 04 that restates its §1 table exactly. Owner choice 05 already has one. |
  | R1-04 | A target-set kill needs an observed assertion failure in the declared target leaf. A skip, todo, cancellation, or an error before or outside the assertion is no kill. Keep the existing wrong-leaf and reach controls. |
  | VENV-01 | §2 (option b). |
  | P3 items | Fix in the next report. Cite node-floor-04 for the conformance-test edit (REC-01). New owner-record diffs carry real hunk headers (REC-02). |

## 2. V-ENV: conservative and recorded (review 02's option b)

1. **Scope.** Every hold-register entry that the V-ENV recipe, widened under §1, matches at the
   correction's C is `held` under V-ENV by this record. No per-test reading is required in TOOLS-01.
   The report lists these entries and gives their count against review 02's 44.
2. **Owner of the classification.** Per-test classification of these entries transfers to
   BINDING-01. BINDING-01 owns V-ENV and rewrites the capture path. It may reclassify any of them as
   `not_held` with a reading. An earlier per-test reading in an entry's reason, such as "not value
   capture or its serializer window", is kept as a note for BINDING-01. It does not override this
   record.
3. **Structural check** (review 02's brief, C2-VENV, adapted):
   - Every `held` or `superseded` register entry names either its reading or its governing owner
     decision.
   - V-ENV entries under rule 1 name this record.
   - Category entries name their existing decision: owner decision-01 for Proxy and re-prototyped
     built-ins, decision-05 or invalidation-02 for V-D1.
   - The register refuses an entry that names neither.
4. **Limited members.** Owner choice 04 §1's "exactly the 24" is amended to the 24 plus every refused
   member of those four origins that rule 1 leaves unbound. The known one is
   `packages/kernel/tests/dispatch.test.ts:1363:3@5a8d958ffdab`. The report lists each, and the C2-LIMIT
   check binds the limited set to that list.
5. **Stop condition.** If the widened recipe would reopen any of the 110 closed origins, the
   implementer stops and reports which ones and why, before changing their state.

## 3. Handoff

- H `446dd258` is published on `codex/tools-01`. The design author pushed it at the owner's direction
  ("push H now") with a force-with-lease over `fb410cb9`. That resolves review 02's
  TOOLS01-R2-HANDOFF-01. Reviews 01 and 02 are recorded on the branch after H, and the correction's C
  descends from them.
- A new Claude Code session is the implementer. It must have had no part in items 2–6 or in either
  review.
- Each reviewer and each long verify runs in its own clone or worktree. Review 02 records two verify
  runs overlapping in one checkout. Review 01's poison-sweep timeout did not reproduce in isolation,
  and review 02's solo run passed. A timeout that reproduces in a solo run is a finding.
- 007 is unchanged here. The next H again needs the report and the 007 status-row change in the same
  commit (verification.json), so the implementer proposes the row and the design author applies it.

## Contract diff (revision 7 to 8)

The implementer applies this diff to [contract.md](contract.md).

```diff
--- a/docs/development/work/TOOLS-01/contract.md
+++ b/docs/development/work/TOOLS-01/contract.md
@@ -1,2 +1,2 @@
-# TOOLS-01 contract — revision 7
+# TOOLS-01 contract — revision 8

@@ -16,3 +16,4 @@ origins and four limited origins move to TOOLS-02; P1 below applies to the scope
 origins, and makes TOOLS-02 precede K1.4's acceptance. [Owner choice 07](owner-choice-07.md) makes
-the gate advisory for every packet.
+the gate advisory for every packet. [Owner choice 08](owner-choice-08.md) holds every V-ENV recipe match
+by record, transfers its per-test classification to BINDING-01, and sets this round's correction route.

@@ -43,3 +44,3 @@ made only for that scope.
 | P1-P | A historical test member closes as `preserved` when, at C: its command selects its file and runs each file in its own process; its title, or for a generated title its declaration site, yields at least one leaf and only passing leaves; every test-side module its file imports, transitively, is byte-identical, or for a literal title a counted helper review covers each changed module, top-level code included; its file's traced run reads no changed test fixture; and its whole file is byte-identical, or its own span is and every difference in its prefix is an inert declaration that nothing live in the prefix references. The prefix is the file's load-time code (everything outside test and hook callbacks), earlier tests in source order, and the hooks that run before or around the member. | Deterministic identity, prefix, read, selection, catalog and closure checks, fresh at every C; design 05 defines the prefix, inert declarations, references and fixtures. Preservation claims the same test-side code, fixtures and assertion, not discrimination. Imported production modules and other repository data the run reads that changed since the pin are listed and counted separately; reads the trace cannot observe are a stated limit. Passes through P1-H. |
-| P1-H | Held or superseded required results become attributed witness records, never suite or preserved credit. V-D1, Proxy and re-prototyped built-ins stay with K1.1-correction-03; V-ENV stays with BINDING-01. A register of current tests and cases that observe each held claim is fully classified. Its title, body and file recipes match registration spans and the same-file and test-side helpers they call; they may widen, never narrow below design 05's minimum. | Structural destination checks; register recomputed at C; credit into a registered member needs its hold or a counted `not_held` reason. Reproducing a witness earns no conformance, correction or release credit. Unregistered held behaviour is a stated gap. |
+| P1-H | Held or superseded required results become attributed witness records, never suite or preserved credit. V-D1, Proxy and re-prototyped built-ins stay with K1.1-correction-03; V-ENV stays with BINDING-01. A register of current tests and cases that observe each held claim is fully classified. Its title, body and file recipes match registration spans and the same-file and test-side helpers they call; they may widen, never narrow below design 05's minimum. Every `held` or `superseded` entry names its reading or its governing owner decision; V-ENV recipe matches are held by owner choice 08, and their per-test classification is BINDING-01's. | Structural destination checks; register recomputed at C; credit into a registered member needs its hold or a counted `not_held` reason; the register refuses a `held` or `superseded` entry that names neither a reading nor an owner decision. Reproducing a witness earns no conformance, correction or release credit. Unregistered held behaviour is a stated gap. |
 | P1-M | Each mutation-runner family lists its members from a census recomputed over pinned bytes, or is marked `census: reading` and counted. Each member maps to a registered mutation with a qualifying named kill, an attributed witness, a reasoned no-longer-applicable disposition, an equivalence argument, or a non-equivalent survivor recorded as a finding for its owner or as an owner-recorded limit; otherwise it stays pending. | Census equality with the member list, with the runner's own count assertions and with any complete sealed run output; fresh control, applicability, reach and qualifying named failure for each kill. Distinct mutations, case/mutation pairs and family links are counted separately. Reading closures, equivalence arguments, survivor records and invalid runs never count as kills. |
```

## What it does not decide

- Any change to the area gate, the split, the 44 transferred origins, P1-T or any hold's scope.
- How BINDING-01 classifies the V-ENV entries.
- Acceptance, or the release of any successor.
