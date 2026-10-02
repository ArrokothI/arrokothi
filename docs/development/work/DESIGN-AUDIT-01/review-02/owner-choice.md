# Owner choice after review 02's root-cause note

Recorded by the review-02 session (Claude Code desktop, `claude-opus-5-5`), 2026-10-01, at the owner's request.
Access: local clone with shell and network. This is a transcription of an owner message. It is not a review,
an implementation or an acceptance.

**Provenance.** The owner's message in that Claude Code session, 2026-10-01, replying to the root-cause note in
[review-02](../review-02.md#root-cause-note-006-stop-and-redesign-fires): "ok, let's go with a."

**Decision.** Under 006 stop-and-redesign, the owner selects option **(a), refined finishable claim**, for
DA01-R2-REALM-01. The next round is a bounded correction in the threat-model option evaluation:
- the realm-hardening poison corpus is defined as every recorded K1.1 hostile counterexample, including
  global-binding replacement for each binding in `values.ts:1130–1137`, tried mid-capture from a coherent
  Proxy trap;
- the A-hard and B-hard options either require those bindings to be pinned or captured at load, with that
  tested, or narrow V-ENV integrity explicitly;
- `realm-hardening.md:7,15` is corrected;
- the Proxy-forwarded exotic witness (DA01-R2-PROXY-01) is added to the C-brand and F02K closures, with the
  expected result left as an owner question.

[brief-03](brief-03.md) carries the work. It applies the corpus rule to all 16 labels the audit marks `hostile_only`, from K1.1 and K1.2-correction-01, which includes every recorded K1.1 hostile counterexample.

**Unchanged.** Options (b), (c) and (d) were not taken. The audit still decides nothing, and both claim holds
(invalidation-01, invalidation-02) remain. No successor is released, and no accepted decision is amended.
