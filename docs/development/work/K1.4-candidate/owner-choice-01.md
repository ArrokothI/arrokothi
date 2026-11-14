# K1.4-candidate owner choice 01 — roles (design 01 Q7)

Recorded 2026-11-14 by the K1.4-candidate coding agent (Claude Code desktop, `claude-fable-5-2`). The owner
answered in the session. The owner's words are quoted verbatim.

## Context

[Release 01](release-01.md) and [brief 01](brief-01.md) decision 5 name "a fresh Claude Opus 5.5 session" as
implementer, and the owner's teammate's Codex GPT-6 or a Claude Fable 5.2 session for the design check and the
review. The owner assigned the implementation to a Claude Fable 5.2 session, so [design 01](design-01.md) Q7 asked
the owner to confirm the role and noted that a Fable reviewer would share the implementer's model.

## Choice

The owner's message, verbatim:

```text
Owner answer to design 01's Q7, verbatim: "Confirm Q7". Record it: this session implements; the design check and
review go to a Codex GPT-6 session (opus if GPT6 out of quota). Q1–Q6 wait for design check 01; build nothing yet.
```

## Consequences

- **Implementer.** This Claude Fable 5.2 session (`claude-fable-5-2`) implements K1.4-candidate. This amends
  decision 5's "a fresh Claude Opus 5.5 session".
- **Design check and review.** A Codex GPT-6 session does both. If GPT-6 is out of quota, a Claude Opus session
  does them. The reviewer must still be a session that has not worked on this packet and does not read the
  planner's notes directory (decision 5). A Claude Fable 5.2 reviewer is no longer among the options.
- **Q1–Q6 stay open.** They wait for design check 01 and the owner's disposition of it.
- **No build.** No candidate, test or probe code is written before then. Stop conditions S1–S4 of design 01 stand.
- Unchanged: no Prompt E, a fresh session does the Prompt C cleanup, and K1.4-gate and the benchmark's E1 round 3
  are not released.
