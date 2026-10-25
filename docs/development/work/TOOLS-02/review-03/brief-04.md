# Correction brief 04 — TOOLS-02 range 1

Correct the same released packet TOOLS-02 on `claude/tools-02`, **after the owner's next
stop-and-redesign route decision**.
Base `b5daf35aeee37305c1ee41bb626c97d26db94ab2`; reviewed H
`23d65ac332fdbd267b00d12d5b02e3b77ad8923e`; review record
`docs/development/work/TOOLS-02/review-03.md` (this delivery; recording commit not yet assigned).
Open findings: T2-R3-PATH-01 and T2-R3-OPTIONS-01. Prior review-02 concrete witnesses are closed;
the cumulative T2-1 obligation is not. Owner choices 01/03/04 at H remain in force.
Unresolved authority: the new route required by 006 after the third CHANGES REQUIRED.
Read this brief first, answer its design questions, obtain the applicable design check, then build
under 006/012 and report the new C/H using 008. No successor release.

## Goal

Make admitted reads correspond to effective native inputs and tracked entries, or refuse them
explicitly. Default refusal must not sit behind a representation that has already lost the facts
needed to decide whether the input is supported.

## Criteria

| ID | Required result | Closes by |
|---|---|---|
| T2-R3-PATH-01 | A successful alternate filesystem spelling maps to its actual tracked dependency or refuses preservation; it cannot hash an absent decoy path | The retained case-insensitive repeated-edit witness and exact-spelling controls; host-aware deterministic test/refusal and a distinguishing mutant |
| T2-R3-OPTIONS-01 | Effective fd/fs overrides cannot disappear because their properties are inherited or otherwise outside the capture profile | Real-tracer own/inherited option and descriptor witnesses, normal-stream control, explicit supported-shape mechanism and capture-loss mutant |
| T2-1 cumulative | Keep owner choice 01's three classes, named/fixture identities, walk stability, ordinary recursive expansion, and current/pin symlink refusals | Maintained corpus and all 19 read mutants, new corpus entries, whole manifest-delta audit |
| T2-2 cumulative | Keep every declared writer route guarded and regeneration's narrow write scope | Direct route controls, seven ablations, refusal/writer census, clean-C Packet verify |

## Suspect design and questions before code

Design 05 §7.1's own-key schema does not cover the native stream's effective option lookup.
Section 7.2 preserves `..` traversal but still assumes a supplied component spelling is the Git
entry name. Both assumptions can label an unrepresented input as represented.

1. What exact option-object profile is supported, and how is it validated before any capture loss?
   Does the rule cover the native fd and fs selection paths? Conservative refusal is sufficient;
   do not turn this packet into a general descriptor tracker or object analyzer.
2. How does a supported path bind to a tracked entry on each supported host, including alternate
   spelling and aliases? What deterministic check refuses an unrepresentable host/path case?
   Do not assume that POSIX implies case-sensitive filenames.
3. Which raw-to-admission controls distinguish a loss in JavaScript capture from a weakened Python
   predicate? Which nearby consumers depend on the same assumptions?
4. What README/design/corpus/manifest consequences follow? Report every actual status/reason delta
   and ask before disposing of additional complete origins, as owner choice 04 requires.

## Known counterexamples

[Probe](probe-range1.py), [output](probe-range1.json), and review 03 supply the full witnesses:

- On a case-insensitive filesystem, `INPUT.txt` reads tracked `input.txt`. Two committed content
  edits return new bytes but leave `table_current` and `revalidation_complete`, with preservation.
- A production helper returns `Object.create({fd})`; the stream is admitted as its decoy path with
  `keys:[]`, and its member remains preserved despite the promised override refusal.
- A shell-inherited descriptor gives the same lost dependency through two edits. That member is
  held by the existing register: retain the provenance and do not describe it as earned credit.
  Own-fd refusal and decoy-edit invalidation are the positive controls.

Keep all prior review/design-check controls. Account for review 03's separate default-candidate
whitespace diagnostic without claiming its command passed or silently rewriting sealed evidence.

## Bounds and stop conditions

T2-1/T2-2 only. No T2-3, T2-4/design-03 or T2-5 review/build, product patch, new hold release,
origin triage or historical deletion. Do not change the hold classifier to make these probes pass.
No next patch round before the owner chooses the 006 route. A recorded limitation needs owner
approval and truthful claim/credit changes; a smaller matrix still requires effective refusal.
