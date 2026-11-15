# K1.4-candidate owner choice 03 — review 01's correction and the ablation registry

Recorded 2026-11-15 by the K1.4-candidate coding agent (Claude Code desktop, `claude-fable-5-2`). The owner's
message is quoted verbatim.

## Context

[Review 01](https://github.com/ArrokothI/arrokothi/blob/7b8a63fa5f087f870663bc143257e5181d0d385c/docs/development/work/K1.4-candidate/review-01.md)
(Codex GPT-6, `codex/k1.4-candidate-review-01` at `7b8a63fa5f087f870663bc143257e5181d0d385c`) is CHANGES REQUIRED
of H `484afd13d7652958f6496afc56d9aa9c098d58b1`, with three P2 findings: K14C-R01-01, K14C-R01-02 and
K14C-R01-03. Its
[brief 02](https://github.com/ArrokothI/arrokothi/blob/7b8a63fa5f087f870663bc143257e5181d0d385c/docs/development/work/K1.4-candidate/review-01/brief-02.md)
governs this correction. The review, the brief and the probes are read by commit and not merged here.

K14C-R01-02 left the owner a choice: register the five ablations through the existing mutation workflow, or
authorize the maintained-test exception.

## Choice

The owner's message, verbatim:

```text
Review 01 (Codex GPT-6, codex/k1.4-candidate-review-01 at 7b8a63fa) is CHANGES REQUIRED of H 484afd13:
K14C-R01-01..03. Read review-01.md, review-01/brief-02.md and the probes by commit; merge nothing.
Brief 02 governs this correction, in the same packet.

Owner choice 03 (2026-11-15), the owner's selection for K14C-R01-02, verbatim: "Register them (Recommended)".
Register ABL-1..5 in tests/fixtures/packet-tools/mutations.json through the existing workflow (site, obligation,
rejecting test, honest hold records, no invented credit), and keep the maintained test. If registration needs a
packet-tools change or a policy waiver, stop and ask the owner. Update or retire 017 L-44 to match.

- R01-01: keep binding provenance. An explicit name that conflicts with an existing binding must show as an
  identity difference or fail visibly; only a truly unnamed observed timeout gets Q2b's to-<generation>. Promote
  the review's collision and changed-ID probes and adjacent cases (unnamed then named, duplicate or stale fires,
  both alias directions, per Execution) to maintained tests. Fix the mechanism, not the spelling.
- R01-03: rewrite the evidence.md sentence so exclusions are predeclared and within the gate's owner-approved
  scope; missing support never exempts an in-scope obligation. Keep the K1 12/3 decision where it is owned.
- Keep the review's latest-grant mutant as a maintained witness that ABL-2 kills.
Kernel source unchanged. New C, Packet verify via `gh workflow run packet-verify.yml` (check REVISION),
implementation-02.md per 008, new H with 007 WAITING_FOR_REVIEW. No self-acceptance.
```

## Consequences

1. **K14C-R01-02: register.** ABL-1 to ABL-5 become cases of `tests/fixtures/packet-tools/mutations.json`, run by
   the existing `registered-mutants` check. Each records its site, the obligation it removes and the test that
   rejects it. The maintained test `ablations.test.ts` stays. The cases carry the hold records the workflow
   requires and claim no semantic credit. 017 L-44 changes to match.
2. **Stop condition.** If registration needs a change to `scripts/packet_tools.py` or `tests/tooling`, or a
   policy waiver, the build stops and asks the owner.
3. **K14C-R01-01.** The timeout name table keeps where each binding came from. Only a timeout no command has
   named takes Q2 b's `to-<generation>` label. A name that conflicts with an existing binding shows as an
   identity difference. The review's two probes and the adjacent cases become maintained tests.
4. **K14C-R01-03.** The sentence in `mental-model/mechanisms/evidence.md` is rewritten: an exclusion is
   predeclared and lies within the gate's owner-approved scope, and a missing surface never exempts an in-scope
   obligation. The K1 matrix of 12 and 3 stays in 007, the roadmaps and owner choice 02.
5. **The latest-grant mutant** of review 01 becomes a maintained witness: it passes the twelve schedules and
   ABL-2 rejects it.
6. **Lifecycle.** Same packet, round 2. Kernel source stays unchanged. A new C, Packet verify in CI at C,
   implementation report 02, a new H and 007 WAITING_FOR_REVIEW. No self-acceptance.
