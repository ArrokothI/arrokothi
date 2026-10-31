# TOOLS-02 — owner choice 13: runtime cap and family routes after projection 12

Recorded on 2026-10-31 by the implementing Claude Code desktop session (`claude-opus-5-5`), from the owner's reply in
this chat. It answers [projection 12](projection-12.md) at `78a5379ffbe8ab90b8c466fcdab7ea44003098fa`'s two questions.
This is owner direction, not a review or an acceptance.

The owner's words, verbatim:

> Both option A

## Effects

1. **Runtime cap.** The cap of owner choice 11 is raised from 600 to **1,200 seconds** for one complete pass of all
   built adopted cases, controls plus mutants. The per-attempt ledger stays. The measurement is still one fresh-clone
   pass, never a sum of attempts.
2. **Family routes.** A short [design 06](design-06.md) addendum states two P1-M route changes. Review 05 checks it;
   there is no separate design check.
   - A `mutation` route may name the registered mutant of the member that this member `reuses` or adapts.
   - A new `covered` route names an existing scheduled registry case or a passing catalog leaf, with its reading. It
     is counted, never a kill, and checked like S5 pointers.

   Superseded and equivalent members use the existing `no_longer_applicable` and `equivalence` kinds.

## Not changed

The 25 test-group and 250 adoption caps, S1–S6, P1-G, the family rule, and every product, historical-evidence,
new-defect and audit stop. The n = 50, seed 20261026 self-audit, `mappings_complete`, final fresh-clone
verification, Packet verify dispatch without polling and H remain required. No acceptance, hold release or successor
release is supplied by this record.
