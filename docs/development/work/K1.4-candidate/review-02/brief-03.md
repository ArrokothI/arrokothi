# Brief 03 — K1.4-candidate identity-rendering redesign

```text
Correct the same released packet K1.4-candidate on claude/k1.4-candidate.
Base c1951226338de6ccd3e4e6289259549551268f61;
reviewed H 14a7ef485282ab2c16d08702be5d61cfeb9997e7.
Review record docs/development/work/K1.4-candidate/review-02.md on
codex/k1.4-candidate-review-02; pin the full recording commit supplied in its push handoff.
Open finding K14C-R02-01, continuing K14C-R01-01; required outcomes and counterexamples are in that record.
Owner supplemental decision: review-02/owner-choice.md, redesign with a design check.
Unresolved authority: no mapping algorithm approved yet; design check is required before another build.
Read this brief first. Answer its design questions in design-03.md and obtain the new design check.
Apply 006 and 012: fix the mechanism, maintain every counterexample, and re-audit the cumulative packet.
Use 008 for report 03 and 006 for new C/H plus verification/push handoff. No successor release.
```

## Goal and suspect design

Make identity rendering preserve the distinctions in Kernel answers across all permitted laboratory
names, or fail visibly according to a checked mapping rule. Keep the real-Kernel candidate, owner
conventions and evidence contract useful without presenting a partial name table as a total one.

The common assumption in design 01/addendum §A3 and design 02 §1 is false: a prefixed native-ID
string need not differ from an arbitrary laboratory string. Timeout provenance now distinguishes
command/convention/exposed sources, but the final exposed spelling bypasses the collision table.
Execution and generation fallback strings do the same. The new witnesses are in the
[review](../review-02.md#finding-k14c-r02-01--emitted-fallback-strings-bypass-identity-collision-checks).
This corrects an earlier approved design argument; do not stack another special case on it.

006 stop-and-redesign applies. The [owner chose redesign with a design check](owner-choice.md).
Prepare the design and obtain that check before another build. This brief specifies outcomes, not
the only allowed algorithm. A restricted naming domain, changed fixture representation or weaker
claim would need explicit approval of the changed contract and its consequences.

## Questions before code

1. What is the complete set of identity strings the adapter can emit or accept, by family and scope?
   Include direct laboratory names, Q2b labels, exposed/native fallbacks and every projection of
   them. Where can two distinct native IDs share a string? Examine the input-Event/payload path
   alongside timeout Events where their output lists meet; do not assume separate helper tables
   imply separate observation domains.
2. What structural mechanism makes collisions impossible, or visibly refuses them, for every allowed
   name and both arrival orders? State the invariant over the final output mapping, not just
   `#idByName`. Explain why recursively naming an emitted escape/fallback cannot evade it.
3. How do duplicate responses, a changed public ID, stale fires, first explicit naming of an unnamed
   timeout, retained old names and per-Execution state interact with that invariant? Which observed
   changes may legitimately occur under owner-approved Q2b, and which must remain detectable?
4. How do later commands resolve an earlier displayed Execution/generation identity? Prove that
   conflict handling cannot silently make the display and command target mean different identities.
5. Which current README/design/017 claims must change with the mechanism? Does the chosen solution
   need a naming-domain, candidate-version or fixture-contract decision? Ask the owner before
   changing an approved behavior; no new prefix is by itself a proof of disjointness.

## Finishable criteria

| ID | Required outcome | Closure |
|---|---|---|
| R03-1 / K14C-R02-01 | Complete identity-rendering rule across the three translated families and interacting Event output paths; no hidden conflict under the allowed name domain | New design note and design check; structural argument over all emitted forms and deterministic tests of each transition/failure path, including both collision orders and adversarial names generated from prior outputs |
| R03-2 / corpus | Every review-01 and review-02 counterexample becomes a maintained regression, while valid neighboring behavior remains | Tests with distinct real native IDs, plus explicit changed-public-response fault injection and its ordinary-name positive control; map each attached probe to a maintained test |
| R03-3 / claims | Current documentation describes the implemented rule and its precise limits | Bounded check of candidate comments/README, design dispositions, 017 L-39 and related baseline/roadmap references; preserve historical records and distinguish any approved target gap |
| R03-4 / cumulative preservation | KC-1..6, R02-1..4 and every nondeferred D01 check close; prior closed findings stay closed | Clean exact-C verification, C/H scope check, full candidate/fixture corpus and five registered ablations, independent cumulative review; matrix remains exactly 12 PASS / 3 REFUSED |

## Known counterexamples and controls

[probes.mjs](probes.mjs) is executable against reviewed H; [probes.jsonl](probes.jsonl) preserves its
observations. Its assertions intentionally reproduce H's bugs, so an exit 0 is not the corrected
behavior's acceptance test. Translate each into an assertion of the approved outcome:

- Three real timeout Events: expose a name collision, then use that emitted spelling as another
  timeout's command name. Check acknowledged, queued, dispatched and terminal-disposition views.
- Reverse order: an existing command name equals the later exposed timeout spelling.
- Duplicate fire with changed public ID: `kernel-event:review-drift` hides the entire change;
  `ordinary-name` detects the same injection. Keep the original review-01 changed-ID cases too.
- Generation 1 named `kernel-generation:2`, followed by actual generation 2 under the same name;
  a subsequent fire still targets the old generation despite identical live-generation displays.
- Two native Executions created under one laboratory name equal to the second ID's fallback.
- Preserved controls: ordinary named/unnamed timeouts; due-at-registration followed by explicit
  naming; duplicate and ended-generation fires; old label cannot be reused for another identity;
  two Executions with identical names/generations; Unicode and `__proto__` names.

Keep all existing convention/blindness/encoder/locator/import-edge/oracle controls, prior Kernel
corpora, and the latest-grant witness with ABL-2 discrimination. K14C-R01-02 and K14C-R01-03 are
closed at H; their registry/hold/no-credit records and owner-approved gate wording must remain true.

## Bounds and stop conditions

Ownership stays with the test-side adapter, its tests and current claims. Kernel, Runtime/Driver
semantics, package source, fixture scenario/runner/oracle behavior and packet-tool implementation
are not authorized to change for the adapter's convenience. No benchmark work or K1.4-gate release.
D01-CHK-04 remains assigned to K2.4/E2; the three excluded schedules remain refused and visible.

If no complete mapping/failure rule fits the approved port, stop for the owner with the smallest
contract choice and its effects. The owner selected a design/check route, not a scope waiver or
acceptance of a limitation. Do not begin a patch round without that check or self-certify acceptance.
