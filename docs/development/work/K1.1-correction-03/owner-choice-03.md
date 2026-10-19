# K1.1-correction-03 — owner choice 03: scope freeze

**Record type:** owner decision. It narrows how this packet finishes the build that
[owner choice 02](owner-choice-02.md) and the [design 03 check](design-03-check.md) approved, and
replaces owner choice 02's two acceptance reviews with one. It is not a review, an implementation, a
design check or an acceptance. It lifts no hold and releases no other packet.

**Provenance:** the owner's handoff prompt of 2026-10-17 to a Claude Code desktop session
(`claude-opus-5-5`). That session takes over the build from the Codex GPT-6 build session, whose quota
ran out, and records the decision verbatim in its first commit. Background: the owner's
limitations register `docs/development/017-known-limitations.md` (branch `claude/known-limitations`,
not part of this packet) and its entries L-04 to L-12.

The prompt introduces it as "Owner decision, scope freeze (owner, 2026-10-17)". The decision, verbatim:

```text
1. No new mechanisms. Finish the approved design-03 build as it stands: run the B/C requalification,
the prescribed verify and implementation-04.md.
2. If requalification shows a mutant or C1 loss without a qualifying kill, do not build new tooling.
List it as uncredited in the report and transfer it to TOOLS-02, unless it reveals a production
defect, which must be fixed.
3. For this packet's next review, a blocking finding (P0–P2) is limited to (a) a Kernel production
defect shown by a concrete input against the candidate code: wrong accept or refuse, wrong bytes or
diagnostics, a crash, a state change, or a work-meter violation in unmodified code; or (b) a false
current claim in Layer 3, BASELINE or 007. Evidence-tooling gaps without such a demonstration (mutant
credit, static-guard completeness for hypothetical code, ledger or census bookkeeping) are recorded
as P3, transferred to TOOLS-02, and neither block acceptance nor fire stop-and-redesign.
4. One independent review replaces owner-choice-02's two: a fresh Codex GPT-6 session with that
remit, or a fresh Claude Code session that did not implement, if Codex is unavailable.
5. Hold releases are requested on acceptance as before.
```

Stop conditions are unchanged: the build stops and asks if a fix would change accepted values, bytes,
diagnostic meaning, the work budget or the residuals.
