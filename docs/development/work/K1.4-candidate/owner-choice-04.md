# K1.4-candidate owner choice 04 — design 03's three questions, and the search's size

Recorded 2026-11-15 by the K1.4-candidate coding agent (Claude Code desktop, `claude-fable-5-2`). The owner's
words are quoted verbatim.

## Context

[Design 03](design-03.md) at `3745cb4bcf12eb36af797b582d5132dc5c0a6ea1` asked the owner three questions, OQ-1 to
OQ-3.
[Design check 03](https://github.com/ArrokothI/arrokothi/blob/62092a70fec6e82ef4dcec17ce27195debf6b5ca/docs/development/work/K1.4-candidate/design-check-03.md)
(Codex GPT-6, `codex/k1.4-candidate-design-check-03` at `62092a70fec6e82ef4dcec17ce27195debf6b5ca`) is APPROVED
WITH REQUIRED CHANGES D03-CHK-01..05 of that design. It is read by commit and not merged here. The owner answered
the three questions in the check session, and the check records the answer.

## Choice

The owner's answer, verbatim, as design check 03 records it:

```text
Accept OQ-1, OQ-2 and OQ-3 as recommended.
```

The owner's message that released the build, verbatim:

```text
Design check 03 (Codex GPT-6, codex/k1.4-candidate-design-check-03 at
62092a70fec6e82ef4dcec17ce27195debf6b5ca) is APPROVED WITH REQUIRED CHANGES D03-CHK-01..05 of design 03
at 3745cb4b. Read it by commit; merge nothing. It records owner choice 04 verbatim: "Accept OQ-1, OQ-2
and OQ-3 as recommended." Record that as owner-choice-04.md, citing the check commit.

1. Write design-03-addendum-01.md disposing CHK-01..05 one by one. No new owner choice is open; if a
   disposition needs one, stop and ask me.
   - CHK-01: association checks (timer/generation/Activation, replay via retiredWaits, the offered
     input name kept separately from the shown name), and the three fault traces as tests.
   - CHK-02: limit the changed-ID claim to IDs already shown, plus the first-exposure control.
   - CHK-03: a complete, non-vacuous oracle with declared legal throws and its own rejection controls.
   - CHK-04: owner direction: keep the search small. Declare exact skeletons, domains and counts;
     calibrate locally (environment, count, elapsed time); keep the full search well inside the
     repository-tests limit, at a few minutes at most. Shrink the declared scope explicitly rather than
     sample. The seven registry cases use the targeted witnesses in the check's table, through the
     existing workflow, with semantic_credit none. If that needs a packet-tools change, stop and ask.
   - CHK-05: the path-level census, with the invariant stated over the translated identity positions.
2. Build round 3 to design 03 plus the addendum. If the search finds an uncovered case, or a supported
   schedule stops passing, stop and report before any patch. Kernel, fixture and packet tools unchanged;
   matrix exactly 12 PASS / 3 REFUSED; ABL-1..5 and the latest-grant witness kept.
3. New C, then `gh workflow run packet-verify.yml` and end your turn. When it finishes, write
   implementation-03.md per 008, then a new H with 007 WAITING_FOR_REVIEW. No self-acceptance.
```

## Consequences

1. **OQ-1: accepted.** A string an Observation has shown never changes. A timeout shown as `to-<generation>`
   keeps that label when a later `deliver_timer` gives it another name. This replaces addendum 01 §A4's reading
   for that one case.
2. **OQ-2: accepted.** `begin` refuses, by command capability, a schedule in which an `await` carries a
   dependency alternative with `eventIdentity`. The pinned verdicts and their first unsupported steps do not
   change.
3. **OQ-3: accepted.** `KERNEL_CANDIDATE_VERSION` stays `arrokothi-k0-kernel-candidate/1`.
4. **The search stays small** (D03-CHK-04). Its skeletons, domains and counts are declared exactly; it runs
   inside `npm test`; a scope that is too large is shrunk in its declaration and never sampled.
5. **The seven mechanism mutants are registry cases** through the existing workflow, each with a targeted
   witness and `semantic_credit: none`. A need for a packet-tools change stops the build for the owner.
6. **Stop conditions for the build.** An uncovered case found by the search, or a supported schedule that stops
   passing, is reported before any patch.
7. **Lifecycle.** [Design 03 addendum 01](design-03-addendum-01.md) disposes D03-CHK-01..05. The build follows
   in this packet. Kernel, fixture and packet tools stay unchanged. A new C, Packet verify in CI at C,
   implementation report 03, a new H and 007 WAITING_FOR_REVIEW. No self-acceptance.
