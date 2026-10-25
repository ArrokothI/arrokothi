# TOOLS-02 — owner choice 05: the cooperative threat model after review 03

**Record type:** owner decision under 006's stop-and-redesign rule. It answers Codex GPT-6's
[review 03](review-03.md) of range 1, which fired the rule again: a third CHANGES REQUIRED, with T2-R3-PATH-01 and
T2-R3-OPTIONS-01 (P2) and T2-R3-ADMIN-01 (P3). It was recorded on 2026-10-25 by the implementer's Claude Code desktop
session (`claude-opus-5-5`), from the owner's message in this conversation. It is not a review, an acceptance or a
release.

**The owner's words**, verbatim:

```text
Owner choice 05: adopt the cooperative threat model, rules P and O, L-18, and a bounded review 04 with no new design check.
```

## Effects

The forwarding message states the effects as follows.

1. **Threat model.** T2-1's threat model is cooperative test code. Forms built to evade the census, beyond rules P and
   O, are [017](../../017-known-limitations.md) L-18: "Read census assumes cooperative test code; fix when a real test
   uses an evading form."
2. **Rule P (path binding).** A successful supported read whose admitted path is not a tracked Git entry at C, under its
   exact spelling, refuses preservation. It applies before identity, fixture classification, the symlink checks and the
   pin comparison.
3. **Rule O (options).** The trace captures whether each options object's prototype is `Object.prototype` or `null`. Any
   other prototype refuses preservation, for every admitted operation that takes options.
4. **T2-R3-ADMIN-01.** The candidate check gets an explicit accommodation, recorded as such. The sealed design 04 text
   is not edited.
5. **Process.** A short addendum to [design 05](design-05.md) states rules P and O, with no new design check. The
   controls run end to end from the tracer:
   - review 03's two probes;
   - exact-spelling positive controls;
   - an own-property options control;
   - a mutant per rule that removes it.

   Measure first: a dry-run regenerate lists every member whose status changes. If a real member loses credit, the
   implementer stops and asks the owner. Then the build of C6, the fresh-clone checks, one Packet verify dispatch,
   implementation 04 as H, and a bounded review 04.

## Not decided here

- Any origin disposition. A real member losing credit returns to the owner first.
- Any acceptance, hold release or successor release. TOOLS-02 stays IN_PROGRESS.
